/**
 * SQLite Database Connection Manager
 * 
 * Provides singleton database connection with automatic schema initialization.
 * Uses better-sqlite3 for synchronous operations which is ideal for caching.
 * 
 * @module cache/database
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('database');

/**
 * Database file location - stored in project root's data directory
 */
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'cache.db');

/**
 * Singleton database instance
 */
let dbInstance: Database.Database | null = null;

/**
 * Schema version for migrations
 */
const SCHEMA_VERSION = 1;

/**
 * SQL statements for schema initialization
 */
const SCHEMA_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trend cache table
-- Stores processed trend data with TTL support
CREATE TABLE IF NOT EXISTS trend_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0
);

-- Index for fast cache key lookups
CREATE INDEX IF NOT EXISTS idx_trend_cache_key ON trend_cache(cache_key);

-- Index for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_trend_cache_expires ON trend_cache(expires_at);

-- Subreddit statistics cache
-- Stores aggregated stats per subreddit for NES baseline calculations
CREATE TABLE IF NOT EXISTS subreddit_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subreddit TEXT NOT NULL UNIQUE,
    avg_score REAL NOT NULL DEFAULT 0,
    avg_comments REAL NOT NULL DEFAULT 0,
    post_count INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for subreddit lookups
CREATE INDEX IF NOT EXISTS idx_subreddit_stats_name ON subreddit_stats(subreddit);

-- Request log for analytics and rate limit tracking
CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    cache_hit INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for time-based queries on request log
CREATE INDEX IF NOT EXISTS idx_request_log_created ON request_log(created_at);
`;

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        logger.info({ path: DATA_DIR }, 'Created data directory');
    }
}

/**
 * Initializes the database schema
 * @param db - Database instance
 */
function initializeSchema(db: Database.Database): void {
    // Check current schema version
    const versionTable = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='schema_version'
    `).get();

    let currentVersion = 0;
    if (versionTable) {
        const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number } | undefined;
        currentVersion = row?.version ?? 0;
    }

    if (currentVersion < SCHEMA_VERSION) {
        logger.info({ currentVersion, targetVersion: SCHEMA_VERSION }, 'Initializing database schema');

        // Execute schema creation in a transaction
        db.exec('BEGIN TRANSACTION');
        try {
            db.exec(SCHEMA_SQL);

            // Record schema version
            db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);

            db.exec('COMMIT');
            logger.info({ version: SCHEMA_VERSION }, 'Database schema initialized successfully');
        } catch (error) {
            db.exec('ROLLBACK');
            logger.error({ error }, 'Failed to initialize database schema');
            throw error;
        }
    } else {
        logger.debug({ version: currentVersion }, 'Database schema is up to date');
    }
}

/**
 * Gets or creates the singleton database instance
 * @returns Database instance
 */
export function getDatabase(): Database.Database {
    if (dbInstance) {
        return dbInstance;
    }

    ensureDataDirectory();

    try {
        dbInstance = new Database(DB_PATH, {
            // Enable WAL mode for better concurrent read performance
            // This is important for a caching layer
        });

        // Enable WAL mode for better performance
        dbInstance.pragma('journal_mode = WAL');

        // Enable foreign keys
        dbInstance.pragma('foreign_keys = ON');

        // Optimize for speed over durability (acceptable for cache)
        dbInstance.pragma('synchronous = NORMAL');

        initializeSchema(dbInstance);

        logger.info({ path: DB_PATH }, 'Database connection established');

        return dbInstance;
    } catch (error) {
        logger.error({ error, path: DB_PATH }, 'Failed to connect to database');
        throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Closes the database connection
 * Should be called during graceful shutdown
 */
export function closeDatabase(): void {
    if (dbInstance) {
        try {
            dbInstance.close();
            dbInstance = null;
            logger.info('Database connection closed');
        } catch (error) {
            logger.error({ error }, 'Error closing database connection');
        }
    }
}

/**
 * Clears all cache data (useful for testing or manual reset)
 */
export function clearAllCache(): void {
    const db = getDatabase();

    db.exec('BEGIN TRANSACTION');
    try {
        db.exec('DELETE FROM trend_cache');
        db.exec('DELETE FROM subreddit_stats');
        db.exec('DELETE FROM request_log');
        db.exec('COMMIT');
        logger.info('All cache data cleared');
    } catch (error) {
        db.exec('ROLLBACK');
        logger.error({ error }, 'Failed to clear cache data');
        throw error;
    }
}

/**
 * Gets database statistics for monitoring
 */
export function getDatabaseStats(): {
    trendCacheCount: number;
    subredditStatsCount: number;
    requestLogCount: number;
    dbSizeBytes: number;
} {
    const db = getDatabase();

    const trendCacheCount = (db.prepare('SELECT COUNT(*) as count FROM trend_cache').get() as { count: number }).count;
    const subredditStatsCount = (db.prepare('SELECT COUNT(*) as count FROM subreddit_stats').get() as { count: number }).count;
    const requestLogCount = (db.prepare('SELECT COUNT(*) as count FROM request_log').get() as { count: number }).count;

    let dbSizeBytes = 0;
    try {
        const stats = fs.statSync(DB_PATH);
        dbSizeBytes = stats.size;
    } catch {
        // File might not exist yet
    }

    return {
        trendCacheCount,
        subredditStatsCount,
        requestLogCount,
        dbSizeBytes,
    };
}
