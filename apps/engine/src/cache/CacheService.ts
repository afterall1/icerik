/**
 * Cache Service
 * 
 * High-level caching operations for trend data and subreddit statistics.
 * Implements TTL-based expiration and cache invalidation strategies.
 * 
 * @module cache/CacheService
 */

import type { TrendData, ContentCategory, TrendQuery } from '@icerik/shared';
import { getDatabase } from './database.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('cache');

/**
 * Default cache TTL values in seconds
 */
export const CACHE_TTL = {
    /** Trend data TTL - 5 minutes */
    TRENDS: 5 * 60,
    /** Subreddit stats TTL - 1 hour */
    SUBREDDIT_STATS: 60 * 60,
    /** Summary data TTL - 10 minutes */
    SUMMARY: 10 * 60,
} as const;

/**
 * Cache entry structure for stored data
 */
interface CacheEntry<T> {
    data: T;
    cachedAt: string;
    expiresAt: string;
    hitCount: number;
}

/**
 * Cache result with metadata
 */
export interface CacheResult<T> {
    data: T;
    hit: boolean;
    cachedAt?: string;
    hitCount?: number;
}

/**
 * Generates a deterministic cache key from query parameters
 * @param prefix - Cache key prefix (e.g., 'trends', 'summary')
 * @param params - Query parameters to include in key
 * @returns Deterministic cache key string
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
    // Sort keys for deterministic ordering
    const sortedParams = Object.keys(params)
        .sort()
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map(key => `${key}=${String(params[key])}`)
        .join('&');

    return `${prefix}:${sortedParams || 'default'}`;
}

/**
 * CacheService class for managing cached data
 */
export class CacheService {
    private db = getDatabase();

    /**
     * Gets cached trend data if available and not expired
     * @param query - Trend query parameters
     * @param subreddit - Optional specific subreddit
     * @returns Cache result with data or null
     */
    getTrends(query: TrendQuery, subreddit?: string): CacheResult<TrendData[]> | null {
        const cacheKey = generateCacheKey('trends', {
            category: query.category,
            timeRange: query.timeRange,
            limit: query.limit,
            minScore: query.minScore,
            sortBy: query.sortBy,
            subreddit,
        });

        return this.get<TrendData[]>(cacheKey);
    }

    /**
     * Stores trend data in cache
     * @param query - Trend query parameters
     * @param data - Trend data to cache
     * @param subreddit - Optional specific subreddit
     * @param ttlSeconds - TTL in seconds (default: CACHE_TTL.TRENDS)
     */
    setTrends(
        query: TrendQuery,
        data: TrendData[],
        subreddit?: string,
        ttlSeconds: number = CACHE_TTL.TRENDS
    ): void {
        const cacheKey = generateCacheKey('trends', {
            category: query.category,
            timeRange: query.timeRange,
            limit: query.limit,
            minScore: query.minScore,
            sortBy: query.sortBy,
            subreddit,
        });

        this.set(cacheKey, data, ttlSeconds);
    }

    /**
     * Gets cached summary data if available
     * @returns Cache result with summary data or null
     */
    getSummary(): CacheResult<unknown> | null {
        return this.get('summary:default');
    }

    /**
     * Stores summary data in cache
     * @param data - Summary data to cache
     * @param ttlSeconds - TTL in seconds (default: CACHE_TTL.SUMMARY)
     */
    setSummary(data: unknown, ttlSeconds: number = CACHE_TTL.SUMMARY): void {
        this.set('summary:default', data, ttlSeconds);
    }

    /**
     * Generic get operation for any cached data
     * @param cacheKey - Cache key to retrieve
     * @returns Cache result with data or null if not found/expired
     */
    get<T>(cacheKey: string): CacheResult<T> | null {
        try {
            const stmt = this.db.prepare(`
                SELECT data, created_at, expires_at, hit_count
                FROM trend_cache
                WHERE cache_key = ?
                AND datetime(expires_at) > datetime('now')
            `);

            const row = stmt.get(cacheKey) as {
                data: string;
                created_at: string;
                expires_at: string;
                hit_count: number;
            } | undefined;

            if (!row) {
                logger.debug({ cacheKey }, 'Cache miss');
                return null;
            }

            // Increment hit count
            this.db.prepare(`
                UPDATE trend_cache 
                SET hit_count = hit_count + 1 
                WHERE cache_key = ?
            `).run(cacheKey);

            const data = JSON.parse(row.data) as T;

            logger.debug({ cacheKey, hitCount: row.hit_count + 1 }, 'Cache hit');

            return {
                data,
                hit: true,
                cachedAt: row.created_at,
                hitCount: row.hit_count + 1,
            };
        } catch (error) {
            logger.error({ error, cacheKey }, 'Cache get error');
            return null;
        }
    }

    /**
     * Generic set operation for any data
     * @param cacheKey - Cache key to store under
     * @param data - Data to cache
     * @param ttlSeconds - Time to live in seconds
     */
    set<T>(cacheKey: string, data: T, ttlSeconds: number): void {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

            const stmt = this.db.prepare(`
                INSERT INTO trend_cache (cache_key, data, created_at, expires_at, hit_count)
                VALUES (?, ?, ?, ?, 0)
                ON CONFLICT(cache_key) DO UPDATE SET
                    data = excluded.data,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at,
                    hit_count = 0
            `);

            stmt.run(
                cacheKey,
                JSON.stringify(data),
                now.toISOString(),
                expiresAt.toISOString()
            );

            logger.debug({ cacheKey, ttlSeconds }, 'Cache set');
        } catch (error) {
            logger.error({ error, cacheKey }, 'Cache set error');
            // Don't throw - cache failures shouldn't break the application
        }
    }

    /**
     * Deletes a specific cache entry
     * @param cacheKey - Cache key to delete
     */
    delete(cacheKey: string): void {
        try {
            this.db.prepare('DELETE FROM trend_cache WHERE cache_key = ?').run(cacheKey);
            logger.debug({ cacheKey }, 'Cache entry deleted');
        } catch (error) {
            logger.error({ error, cacheKey }, 'Cache delete error');
        }
    }

    /**
     * Invalidates all cache entries matching a prefix
     * @param prefix - Cache key prefix to invalidate (e.g., 'trends')
     */
    invalidateByPrefix(prefix: string): void {
        try {
            const result = this.db.prepare(`
                DELETE FROM trend_cache 
                WHERE cache_key LIKE ?
            `).run(`${prefix}:%`);

            logger.info({ prefix, deleted: result.changes }, 'Cache invalidated by prefix');
        } catch (error) {
            logger.error({ error, prefix }, 'Cache invalidation error');
        }
    }

    /**
     * Invalidates cache entries for a specific category
     * @param category - Content category to invalidate
     */
    invalidateByCategory(category: ContentCategory): void {
        try {
            const result = this.db.prepare(`
                DELETE FROM trend_cache 
                WHERE cache_key LIKE ?
            `).run(`%category=${category}%`);

            logger.info({ category, deleted: result.changes }, 'Cache invalidated by category');
        } catch (error) {
            logger.error({ error, category }, 'Cache invalidation error');
        }
    }

    /**
     * Cleans up expired cache entries
     * Should be called periodically to prevent database bloat
     */
    cleanupExpired(): number {
        try {
            const result = this.db.prepare(`
                DELETE FROM trend_cache 
                WHERE datetime(expires_at) <= datetime('now')
            `).run();

            if (result.changes > 0) {
                logger.info({ deleted: result.changes }, 'Expired cache entries cleaned up');
            }

            return result.changes;
        } catch (error) {
            logger.error({ error }, 'Cache cleanup error');
            return 0;
        }
    }

    /**
     * Logs a request for analytics
     * @param endpoint - API endpoint
     * @param cacheHit - Whether the response was from cache
     * @param responseTimeMs - Response time in milliseconds
     */
    logRequest(endpoint: string, cacheHit: boolean, responseTimeMs: number): void {
        try {
            this.db.prepare(`
                INSERT INTO request_log (endpoint, cache_hit, response_time_ms)
                VALUES (?, ?, ?)
            `).run(endpoint, cacheHit ? 1 : 0, responseTimeMs);
        } catch (error) {
            logger.error({ error }, 'Request log error');
        }
    }

    /**
     * Gets cache statistics for monitoring
     */
    getStats(): {
        totalEntries: number;
        totalHits: number;
        avgHitsPerEntry: number;
        expiredCount: number;
        cacheHitRate: number;
    } {
        const totalEntries = (this.db.prepare(`
            SELECT COUNT(*) as count FROM trend_cache
        `).get() as { count: number }).count;

        const totalHits = (this.db.prepare(`
            SELECT SUM(hit_count) as total FROM trend_cache
        `).get() as { total: number | null }).total ?? 0;

        const expiredCount = (this.db.prepare(`
            SELECT COUNT(*) as count FROM trend_cache 
            WHERE datetime(expires_at) <= datetime('now')
        `).get() as { count: number }).count;

        // Calculate cache hit rate from request log (last 24 hours)
        const requestStats = this.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(cache_hit) as hits
            FROM request_log
            WHERE datetime(created_at) > datetime('now', '-1 day')
        `).get() as { total: number; hits: number | null };

        const cacheHitRate = requestStats.total > 0
            ? ((requestStats.hits ?? 0) / requestStats.total) * 100
            : 0;

        return {
            totalEntries,
            totalHits,
            avgHitsPerEntry: totalEntries > 0 ? totalHits / totalEntries : 0,
            expiredCount,
            cacheHitRate,
        };
    }

    /**
     * Updates subreddit statistics for NES baseline calculations
     * @param subreddit - Subreddit name
     * @param avgScore - Average post score
     * @param avgComments - Average comment count
     * @param postCount - Number of posts analyzed
     */
    updateSubredditStats(
        subreddit: string,
        avgScore: number,
        avgComments: number,
        postCount: number
    ): void {
        try {
            this.db.prepare(`
                INSERT INTO subreddit_stats (subreddit, avg_score, avg_comments, post_count, last_updated)
                VALUES (?, ?, ?, ?, datetime('now'))
                ON CONFLICT(subreddit) DO UPDATE SET
                    avg_score = excluded.avg_score,
                    avg_comments = excluded.avg_comments,
                    post_count = excluded.post_count,
                    last_updated = datetime('now')
            `).run(subreddit, avgScore, avgComments, postCount);

            logger.debug({ subreddit, avgScore, avgComments, postCount }, 'Subreddit stats updated');
        } catch (error) {
            logger.error({ error, subreddit }, 'Subreddit stats update error');
        }
    }

    /**
     * Gets subreddit statistics
     * @param subreddit - Subreddit name
     * @returns Stats or null if not found
     */
    getSubredditStats(subreddit: string): {
        avgScore: number;
        avgComments: number;
        postCount: number;
        lastUpdated: string;
    } | null {
        try {
            const row = this.db.prepare(`
                SELECT avg_score, avg_comments, post_count, last_updated
                FROM subreddit_stats
                WHERE subreddit = ?
            `).get(subreddit) as {
                avg_score: number;
                avg_comments: number;
                post_count: number;
                last_updated: string;
            } | undefined;

            if (!row) {
                return null;
            }

            return {
                avgScore: row.avg_score,
                avgComments: row.avg_comments,
                postCount: row.post_count,
                lastUpdated: row.last_updated,
            };
        } catch (error) {
            logger.error({ error, subreddit }, 'Get subreddit stats error');
            return null;
        }
    }
}

/**
 * Singleton instance for application-wide use
 */
let cacheServiceInstance: CacheService | null = null;

/**
 * Gets the singleton CacheService instance
 * @returns CacheService instance
 */
export function getCacheService(): CacheService {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new CacheService();
    }
    return cacheServiceInstance;
}

/**
 * Resets the cache service instance (for testing)
 */
export function resetCacheService(): void {
    cacheServiceInstance = null;
}
