/**
 * Voice Cache Service
 * 
 * SQLite-based caching for generated audio to reduce API costs
 * and improve response times.
 * 
 * @module voice/VoiceCache
 */

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { createChildLogger } from '../utils/logger.js';
import type { CachedAudio, VoiceProvider } from './voiceTypes.js';

const logger = createChildLogger('voice-cache');

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
    /** TTL in days */
    ttlDays: 30,
    /** Max cache size in bytes (500MB) */
    maxSizeBytes: 500 * 1024 * 1024,
    /** Cleanup interval (check every N inserts) */
    cleanupInterval: 50,
};

/**
 * Generate hash from text content for cache key
 */
export function generateTextHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 32);
}

/**
 * Generate cache ID from text hash and voice ID
 */
export function generateCacheId(textHash: string, voiceId: string): string {
    return crypto.createHash('sha256').update(`${textHash}:${voiceId}`).digest('hex').substring(0, 32);
}

/**
 * Voice Cache Service
 */
export class VoiceCache {
    private db: Database.Database;
    private insertCount: number = 0;

    constructor(dbPath?: string) {
        const finalPath = dbPath || path.join(process.cwd(), 'data', 'voice-cache.db');

        // Ensure directory exists
        const dir = path.dirname(finalPath);
        import('fs').then(fs => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        this.db = new Database(finalPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        this.initializeSchema();
        logger.info({ path: finalPath }, 'Voice cache initialized');
    }

    /**
     * Initialize database schema
     */
    private initializeSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS voice_cache (
                id TEXT PRIMARY KEY,
                text_hash TEXT NOT NULL,
                voice_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                audio_base64 TEXT NOT NULL,
                content_type TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                size_bytes INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                last_accessed_at TEXT NOT NULL,
                access_count INTEGER DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_voice_cache_text_hash ON voice_cache(text_hash);
            CREATE INDEX IF NOT EXISTS idx_voice_cache_voice_id ON voice_cache(voice_id);
            CREATE INDEX IF NOT EXISTS idx_voice_cache_created_at ON voice_cache(created_at);
            CREATE INDEX IF NOT EXISTS idx_voice_cache_last_accessed ON voice_cache(last_accessed_at);
        `);
    }

    /**
     * Get cached audio by text and voice
     */
    get(text: string, voiceId: string): CachedAudio | null {
        const textHash = generateTextHash(text);
        const cacheId = generateCacheId(textHash, voiceId);

        try {
            const row = this.db.prepare(`
                SELECT * FROM voice_cache WHERE id = ?
            `).get(cacheId) as CachedAudio | undefined;

            if (!row) return null;

            // Check TTL
            const createdAt = new Date(row.createdAt);
            const expiresAt = new Date(createdAt.getTime() + CACHE_CONFIG.ttlDays * 24 * 60 * 60 * 1000);

            if (new Date() > expiresAt) {
                // Expired, delete and return null
                this.delete(cacheId);
                logger.debug({ cacheId }, 'Cache entry expired');
                return null;
            }

            // Update access count and time
            this.db.prepare(`
                UPDATE voice_cache 
                SET last_accessed_at = ?, access_count = access_count + 1
                WHERE id = ?
            `).run(new Date().toISOString(), cacheId);

            logger.debug({ cacheId, accessCount: row.accessCount + 1 }, 'Cache HIT');
            return row;
        } catch (error) {
            logger.error({ error, cacheId }, 'Failed to get cache entry');
            return null;
        }
    }

    /**
     * Store audio in cache
     */
    set(
        text: string,
        voiceId: string,
        provider: VoiceProvider,
        audioBuffer: Buffer,
        contentType: string,
        durationSeconds: number
    ): CachedAudio {
        const textHash = generateTextHash(text);
        const cacheId = generateCacheId(textHash, voiceId);
        const now = new Date().toISOString();

        const entry: CachedAudio = {
            id: cacheId,
            textHash,
            voiceId,
            provider,
            audioBase64: audioBuffer.toString('base64'),
            contentType,
            durationSeconds,
            sizeBytes: audioBuffer.length,
            createdAt: now,
            lastAccessedAt: now,
            accessCount: 1,
        };

        try {
            this.db.prepare(`
                INSERT OR REPLACE INTO voice_cache 
                (id, text_hash, voice_id, provider, audio_base64, content_type, 
                 duration_seconds, size_bytes, created_at, last_accessed_at, access_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                entry.id,
                entry.textHash,
                entry.voiceId,
                entry.provider,
                entry.audioBase64,
                entry.contentType,
                entry.durationSeconds,
                entry.sizeBytes,
                entry.createdAt,
                entry.lastAccessedAt,
                entry.accessCount
            );

            logger.debug({ cacheId, sizeBytes: entry.sizeBytes }, 'Cache SET');

            // Periodic cleanup
            this.insertCount++;
            if (this.insertCount >= CACHE_CONFIG.cleanupInterval) {
                this.insertCount = 0;
                this.cleanup();
            }

            return entry;
        } catch (error) {
            logger.error({ error, cacheId }, 'Failed to set cache entry');
            throw error;
        }
    }

    /**
     * Delete a cache entry
     */
    delete(cacheId: string): boolean {
        try {
            const result = this.db.prepare(`DELETE FROM voice_cache WHERE id = ?`).run(cacheId);
            return result.changes > 0;
        } catch (error) {
            logger.error({ error, cacheId }, 'Failed to delete cache entry');
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): { totalEntries: number; totalSizeBytes: number; oldestEntry: string | null } {
        try {
            const stats = this.db.prepare(`
                SELECT 
                    COUNT(*) as total_entries,
                    COALESCE(SUM(size_bytes), 0) as total_size_bytes,
                    MIN(created_at) as oldest_entry
                FROM voice_cache
            `).get() as { total_entries: number; total_size_bytes: number; oldest_entry: string | null };

            return {
                totalEntries: stats.total_entries,
                totalSizeBytes: stats.total_size_bytes,
                oldestEntry: stats.oldest_entry,
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get cache stats');
            return { totalEntries: 0, totalSizeBytes: 0, oldestEntry: null };
        }
    }

    /**
     * Cleanup expired entries and enforce size limit
     */
    cleanup(): { deletedExpired: number; deletedForSize: number } {
        const result = { deletedExpired: 0, deletedForSize: 0 };

        try {
            // Delete expired entries
            const expiryDate = new Date(Date.now() - CACHE_CONFIG.ttlDays * 24 * 60 * 60 * 1000).toISOString();
            const expiredResult = this.db.prepare(`
                DELETE FROM voice_cache WHERE created_at < ?
            `).run(expiryDate);
            result.deletedExpired = expiredResult.changes;

            // Check total size and delete oldest if over limit
            let stats = this.getStats();
            while (stats.totalSizeBytes > CACHE_CONFIG.maxSizeBytes && stats.totalEntries > 0) {
                // Delete oldest entry
                const oldest = this.db.prepare(`
                    SELECT id FROM voice_cache ORDER BY last_accessed_at ASC LIMIT 1
                `).get() as { id: string } | undefined;

                if (oldest) {
                    this.delete(oldest.id);
                    result.deletedForSize++;
                }

                stats = this.getStats();
            }

            if (result.deletedExpired > 0 || result.deletedForSize > 0) {
                logger.info(result, 'Voice cache cleanup completed');
            }

            return result;
        } catch (error) {
            logger.error({ error }, 'Failed to cleanup cache');
            return result;
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): number {
        try {
            const result = this.db.prepare(`DELETE FROM voice_cache`).run();
            logger.info({ deleted: result.changes }, 'Voice cache cleared');
            return result.changes;
        } catch (error) {
            logger.error({ error }, 'Failed to clear cache');
            return 0;
        }
    }

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
        logger.info('Voice cache closed');
    }
}

// Singleton instance
let instance: VoiceCache | null = null;

/**
 * Get the singleton VoiceCache instance
 */
export function getVoiceCache(): VoiceCache {
    if (!instance) {
        instance = new VoiceCache();
    }
    return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetVoiceCache(): void {
    if (instance) {
        instance.close();
        instance = null;
    }
}
