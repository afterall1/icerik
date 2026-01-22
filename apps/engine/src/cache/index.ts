/**
 * Cache Module Public API
 * 
 * Exports all cache-related functionality for use throughout the application.
 * 
 * @module cache
 */

// Database operations
export {
    getDatabase,
    closeDatabase,
    clearAllCache,
    getDatabaseStats
} from './database.js';

// Cache service
export {
    CacheService,
    getCacheService,
    resetCacheService,
    generateCacheKey,
    CACHE_TTL,
    type CacheResult
} from './CacheService.js';
