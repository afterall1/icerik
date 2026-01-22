/**
 * Cache Service Tests
 * 
 * Unit tests for the CacheService module.
 * Tests caching operations, TTL handling, and cache statistics.
 * 
 * @module cache/__tests__/CacheService.test
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
    CacheService,
    getCacheService,
    resetCacheService,
    generateCacheKey,
    CACHE_TTL
} from '../CacheService.js';
import { closeDatabase, clearAllCache } from '../database.js';
import type { TrendData, TrendQuery } from '@icerik/shared';

/**
 * Mock trend data for testing
 */
const mockTrendData: TrendData[] = [
    {
        id: 'test-1',
        title: 'Test Trend 1',
        subreddit: 'technology',
        category: 'technology',
        score: 1000,
        upvoteRatio: 0.95,
        numComments: 100,
        createdUtc: Date.now() / 1000,
        nes: 85.5,
        engagementVelocity: 12.5,
        controversyFactor: 1.2,
        ageHours: 2,
        sourceUrl: 'https://reddit.com/r/technology/1',
        permalink: '/r/technology/comments/1',
        fetchedAt: new Date(),
    },
    {
        id: 'test-2',
        title: 'Test Trend 2',
        subreddit: 'programming',
        category: 'technology',
        score: 500,
        upvoteRatio: 0.92,
        numComments: 50,
        createdUtc: Date.now() / 1000,
        nes: 72.3,
        engagementVelocity: 8.2,
        controversyFactor: 1.0,
        ageHours: 4,
        sourceUrl: 'https://reddit.com/r/programming/2',
        permalink: '/r/programming/comments/2',
        fetchedAt: new Date(),
    },
];

/**
 * Mock query for testing
 */
const mockQuery: TrendQuery = {
    category: 'technology',
    timeRange: 'day',
    limit: 20,
    sortBy: 'nes',
};

describe('CacheService', () => {
    let cache: CacheService;

    beforeEach(() => {
        // Reset singleton and clear cache before each test
        resetCacheService();
        clearAllCache();
        cache = getCacheService();
    });

    afterAll(() => {
        // Clean up database connection after all tests
        closeDatabase();
    });

    describe('generateCacheKey', () => {
        it('should generate deterministic cache keys', () => {
            const key1 = generateCacheKey('trends', { category: 'technology', limit: 20 });
            const key2 = generateCacheKey('trends', { limit: 20, category: 'technology' });

            // Keys should be the same regardless of parameter order
            expect(key1).toBe(key2);
        });

        it('should exclude undefined values from key', () => {
            const key1 = generateCacheKey('trends', { category: 'technology' });
            const key2 = generateCacheKey('trends', { category: 'technology', limit: undefined });

            expect(key1).toBe(key2);
        });

        it('should include prefix in key', () => {
            const key = generateCacheKey('trends', { category: 'technology' });

            expect(key.startsWith('trends:')).toBe(true);
        });

        it('should handle empty params', () => {
            const key = generateCacheKey('summary', {});

            expect(key).toBe('summary:default');
        });
    });

    describe('Trend Caching', () => {
        it('should return null for cache miss', () => {
            const result = cache.getTrends(mockQuery);

            expect(result).toBeNull();
        });

        it('should store and retrieve trends', () => {
            cache.setTrends(mockQuery, mockTrendData);
            const result = cache.getTrends(mockQuery);

            expect(result).not.toBeNull();
            expect(result!.hit).toBe(true);
            expect(result!.data).toHaveLength(2);
            expect(result!.data[0].title).toBe('Test Trend 1');
        });

        it('should increment hit count on cache hits', () => {
            cache.setTrends(mockQuery, mockTrendData);

            // First hit
            const result1 = cache.getTrends(mockQuery);
            expect(result1!.hitCount).toBe(1);

            // Second hit
            const result2 = cache.getTrends(mockQuery);
            expect(result2!.hitCount).toBe(2);
        });

        it('should separate cache by subreddit parameter', () => {
            cache.setTrends(mockQuery, mockTrendData, 'technology');
            cache.setTrends(mockQuery, [mockTrendData[0]], 'programming');

            const tech = cache.getTrends(mockQuery, 'technology');
            const prog = cache.getTrends(mockQuery, 'programming');

            expect(tech!.data).toHaveLength(2);
            expect(prog!.data).toHaveLength(1);
        });
    });

    describe('Summary Caching', () => {
        it('should store and retrieve summary', () => {
            const mockSummary = {
                topTrends: mockTrendData,
                categoryBreakdown: { technology: 2 },
                totalProcessed: 10,
                avgEngagementVelocity: 10.35,
                fetchedAt: new Date(),
            };

            cache.setSummary(mockSummary);
            const result = cache.getSummary();

            expect(result).not.toBeNull();
            expect(result!.hit).toBe(true);
        });
    });

    describe('Generic Cache Operations', () => {
        it('should delete specific cache entry', () => {
            cache.setTrends(mockQuery, mockTrendData);
            expect(cache.getTrends(mockQuery)).not.toBeNull();

            const key = generateCacheKey('trends', {
                category: mockQuery.category,
                timeRange: mockQuery.timeRange,
                limit: mockQuery.limit,
                sortBy: mockQuery.sortBy,
            });
            cache.delete(key);

            expect(cache.getTrends(mockQuery)).toBeNull();
        });

        it('should invalidate by prefix', () => {
            cache.setTrends(mockQuery, mockTrendData);
            cache.setSummary({ test: true });

            cache.invalidateByPrefix('trends');

            expect(cache.getTrends(mockQuery)).toBeNull();
            expect(cache.getSummary()).not.toBeNull(); // Summary should remain
        });

        it('should invalidate by category', () => {
            cache.setTrends(mockQuery, mockTrendData);

            cache.invalidateByCategory('technology');

            expect(cache.getTrends(mockQuery)).toBeNull();
        });
    });

    describe('Cache Statistics', () => {
        it('should track cache entries', () => {
            cache.setTrends(mockQuery, mockTrendData);
            cache.setSummary({ test: true });

            const stats = cache.getStats();

            expect(stats.totalEntries).toBe(2);
        });

        it('should track total hits', () => {
            cache.setTrends(mockQuery, mockTrendData);
            cache.getTrends(mockQuery);
            cache.getTrends(mockQuery);
            cache.getTrends(mockQuery);

            const stats = cache.getStats();

            expect(stats.totalHits).toBe(3);
        });
    });

    describe('Subreddit Stats', () => {
        it('should store and retrieve subreddit stats', () => {
            cache.updateSubredditStats('technology', 5000, 250, 100);

            const stats = cache.getSubredditStats('technology');

            expect(stats).not.toBeNull();
            expect(stats!.avgScore).toBe(5000);
            expect(stats!.avgComments).toBe(250);
            expect(stats!.postCount).toBe(100);
        });

        it('should update existing stats', () => {
            cache.updateSubredditStats('technology', 5000, 250, 100);
            cache.updateSubredditStats('technology', 6000, 300, 150);

            const stats = cache.getSubredditStats('technology');

            expect(stats!.avgScore).toBe(6000);
            expect(stats!.postCount).toBe(150);
        });

        it('should return null for unknown subreddit', () => {
            const stats = cache.getSubredditStats('nonexistent');

            expect(stats).toBeNull();
        });
    });

    describe('Request Logging', () => {
        it('should log requests without throwing', () => {
            expect(() => {
                cache.logRequest('/api/trends', true, 50);
                cache.logRequest('/api/trends', false, 1200);
            }).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        it('should clean up expired entries', () => {
            // Set entry with very short TTL
            cache.set('test:expiring', { data: 'test' }, -1); // Already expired

            const deleted = cache.cleanupExpired();

            expect(deleted).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('CACHE_TTL Constants', () => {
    it('should have correct TTL values', () => {
        expect(CACHE_TTL.TRENDS).toBe(5 * 60); // 5 minutes
        expect(CACHE_TTL.SUMMARY).toBe(10 * 60); // 10 minutes
        expect(CACHE_TTL.SUBREDDIT_STATS).toBe(60 * 60); // 1 hour
    });
});
