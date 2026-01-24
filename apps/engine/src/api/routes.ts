import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { getRedditFetcher, RedditFetchError } from '../ingestion/index.js';
import { getNesCalculator, getTrendAggregator } from '../processing/index.js';
import { getCacheService, getDatabaseStats, CACHE_TTL } from '../cache/index.js';
import { getTrendClassifier } from '../ai/classification/index.js';
import { getAlgorithmScorer } from '../ai/scoring/index.js';
import { getAIMetrics } from '../ai/metrics/index.js';
import { getScriptIterator, type IterationTarget } from '../ai/iteration/index.js';
import { getVariantGenerator } from '../ai/variants/index.js';
import { SUBREDDIT_CONFIG, CATEGORY_LABELS, CATEGORY_VIDEO_FORMATS } from '@icerik/shared';
import type { TrendQuery, ContentCategory, ApiResponse, TrendSummary, TrendData, SubredditConfig } from '@icerik/shared';
import type { VideoFormat } from '../ai/scriptGenerator.js';
import { createChildLogger } from '../utils/logger.js';
import { createObservatoryRouter } from './observatory.js';
import { getEnv } from '../utils/env.js';
import { getImageSearchService, PexelsError, VisualSequenceBuilder } from '../images/index.js';

// Security imports
import {
    createSecurityMiddleware,
    createRateLimiter
} from './securityMiddleware.js';
import {
    validateRequest,
    trendQuerySchema,
    generateScriptBodySchema,
    generateScriptsBodySchema,
    cacheInvalidateBodySchema,
    classifyTrendBodySchema,
    scoreScriptBodySchema,
    iterateScriptBodySchema,
    generateVariantsBodySchema,
    getValidatedData,
    type TrendQueryInput,
    type GenerateScriptInput,
} from './inputValidator.js';
import { getSecurityStats } from '../utils/securityLogger.js';

const logger = createChildLogger('api');

/**
 * Response metadata including cache status
 */
interface ResponseMeta {
    cacheStatus: 'HIT' | 'MISS' | 'BYPASS';
    cachedAt?: string;
    responseTimeMs?: number;
}

/**
 * Creates the main API router with all endpoints
 * Security-hardened with rate limiting, input validation, and security headers
 * @returns Configured Hono router
 */
export function createApiRouter(): Hono {
    const api = new Hono();
    const cache = getCacheService();
    const env = getEnv();
    const isProduction = env.NODE_ENV === 'production';

    // ============================================
    // SECURITY MIDDLEWARE STACK
    // ============================================

    const security = createSecurityMiddleware({
        enableHsts: isProduction,
        generalRateLimit: { maxRequests: 100, windowMs: 60000 },
        aiRateLimit: { maxRequests: 20, windowMs: 60000 },
        maxBodySize: 102400, // 100KB
    });

    // 1. Security headers (first, always applied)
    api.use('*', security.headers());

    // 2. Error handler (catches and sanitizes errors)
    api.use('*', security.errorHandler());

    // 3. Body size limit
    api.use('*', security.bodyLimit());

    // 4. CORS - tightened configuration
    const allowedOrigins = isProduction
        ? (env.CORS_ORIGINS?.split(',').map(o => o.trim()) || ['https://localhost'])
        : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

    api.use('*', cors({
        origin: allowedOrigins,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
        credentials: false,
    }));

    // 5. Request logger
    api.use('*', honoLogger());

    // 6. Rate limiting - general endpoints
    api.use('/trends*', security.generalLimiter());
    api.use('/categories*', security.generalLimiter());
    api.use('/subreddits*', security.generalLimiter());
    api.use('/status*', security.generalLimiter());

    // 7. Rate limiting - AI endpoints (stricter)
    api.use('/generate-script*', security.aiLimiter());
    api.use('/scripts/*', security.aiLimiter());
    api.use('/ai/*', security.aiLimiter());
    api.use('/images/*', security.generalLimiter());

    // Mount Observatory router
    const observatoryRouter = createObservatoryRouter();
    api.route('/observatory', observatoryRouter);

    /**
     * GET /api/health
     * Health check endpoint with cache and rate limit status
     */
    api.get('/health', (c) => {
        const fetcher = getRedditFetcher();
        const rateLimitStatus = fetcher.getRateLimitStatus();
        const cacheStats = cache.getStats();
        const dbStats = getDatabaseStats();

        return c.json({
            status: rateLimitStatus.isHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            rateLimit: rateLimitStatus,
            cache: {
                ...cacheStats,
                dbSizeBytes: dbStats.dbSizeBytes,
            },
        });
    });

    /**
     * GET /api/trends
     * Fetch current trends with optional filtering
     * Implements cache-first strategy with 5-minute TTL
     */
    api.get('/trends', async (c) => {
        const startTime = Date.now();
        let cacheStatus: ResponseMeta['cacheStatus'] = 'MISS';
        let cachedAt: string | undefined;

        try {
            const subredditParam = c.req.query('subreddit');
            const bypassCache = c.req.query('bypass') === 'true';

            const query: TrendQuery = {
                category: c.req.query('category') as ContentCategory | undefined,
                timeRange: (c.req.query('timeRange') || 'day') as TrendQuery['timeRange'],
                limit: parseInt(c.req.query('limit') || '20'),
                minScore: c.req.query('minScore') ? parseInt(c.req.query('minScore')!) : undefined,
                sortBy: (c.req.query('sortBy') || 'nes') as TrendQuery['sortBy'],
            };

            // Handle both category ID and label (e.g., both 'technology' and 'Teknoloji')
            if (query.category) {
                const labelToId: Record<string, ContentCategory> = {};
                for (const [id, label] of Object.entries(CATEGORY_LABELS)) {
                    labelToId[label] = id as ContentCategory;
                    labelToId[id] = id as ContentCategory; // Also map ID to itself
                }
                query.category = labelToId[query.category] || query.category;
            }

            const sortType = (c.req.query('sortType') || 'hot') as 'hot' | 'rising' | 'top' | 'new';

            // Check cache first (unless bypass requested)
            if (!bypassCache) {
                const cached = cache.getTrends(query, subredditParam);
                if (cached) {
                    cacheStatus = 'HIT';
                    cachedAt = cached.cachedAt;

                    const responseTimeMs = Date.now() - startTime;
                    cache.logRequest('/api/trends', true, responseTimeMs);

                    logger.info({
                        query,
                        subreddit: subredditParam,
                        cacheStatus,
                        responseTimeMs,
                        hitCount: cached.hitCount
                    }, 'Trends served from cache');

                    c.header('X-Cache', 'HIT');
                    c.header('X-Cache-Age', cachedAt || '');
                    c.header('X-Response-Time', `${responseTimeMs}ms`);

                    return c.json({
                        success: true,
                        data: cached.data,
                        timestamp: new Date().toISOString(),
                        meta: { cacheStatus, cachedAt, responseTimeMs },
                    });
                }
            } else {
                cacheStatus = 'BYPASS';
            }

            logger.info({ query, subreddit: subredditParam, sortType, cacheStatus }, 'Fetching trends from Reddit');

            const fetcher = getRedditFetcher();
            const nesCalculator = getNesCalculator();
            const aggregator = getTrendAggregator();

            // Determine which subreddits to fetch
            let subredditsToFetch: string[];

            if (subredditParam) {
                subredditsToFetch = [subredditParam];
            } else {
                let subreddits: SubredditConfig[] = [...SUBREDDIT_CONFIG];
                if (query.category) {
                    subreddits = subreddits.filter((s: SubredditConfig) => s.category === query.category);
                }
                subreddits = subreddits.filter((s: SubredditConfig) => s.tier <= 2).slice(0, 8);
                subredditsToFetch = subreddits.map((s: SubredditConfig) => s.name);
            }

            if (subredditsToFetch.length === 0) {
                c.header('X-Cache', 'BYPASS');
                return c.json({
                    success: true,
                    data: [],
                    message: 'No subreddits found for the specified category',
                    timestamp: new Date().toISOString(),
                });
            }

            // Fetch from Reddit
            const postsMap = await fetcher.fetchMultipleSubreddits(
                subredditsToFetch,
                { sort: sortType, timeRange: query.timeRange, limit: 50 }
            );

            // Process posts through NES calculator
            const trendsBySubreddit = new Map<string, TrendData[]>();
            for (const [subreddit, posts] of postsMap) {
                const trends = nesCalculator.processPostBatch(posts);
                trendsBySubreddit.set(subreddit, trends);

                // Update subreddit stats for future baseline calculations
                if (posts.length > 0) {
                    const avgScore = posts.reduce((sum, p) => sum + p.score, 0) / posts.length;
                    const avgComments = posts.reduce((sum, p) => sum + p.num_comments, 0) / posts.length;
                    cache.updateSubredditStats(subreddit, avgScore, avgComments, posts.length);
                }
            }

            // Aggregate and deduplicate
            let allTrends = aggregator.aggregateTrends(trendsBySubreddit);
            allTrends = aggregator.deduplicateTrends(allTrends);

            // Apply filters
            const filtered = aggregator.filterTrends(allTrends, query);

            // Store in cache
            cache.setTrends(query, filtered, subredditParam, CACHE_TTL.TRENDS);

            const responseTimeMs = Date.now() - startTime;
            cache.logRequest('/api/trends', false, responseTimeMs);

            logger.info({
                query,
                subreddit: subredditParam,
                resultCount: filtered.length,
                responseTimeMs,
                cacheStatus
            }, 'Trends fetched and cached');

            c.header('X-Cache', cacheStatus);
            c.header('X-Response-Time', `${responseTimeMs}ms`);

            const response: ApiResponse<TrendData[]> & { meta?: ResponseMeta } = {
                success: true,
                data: filtered,
                timestamp: new Date().toISOString(),
                meta: { cacheStatus, responseTimeMs },
            };

            return c.json(response);

        } catch (error) {
            const responseTimeMs = Date.now() - startTime;
            cache.logRequest('/api/trends', false, responseTimeMs);

            logger.error({ error, responseTimeMs }, 'Failed to fetch trends');

            const errorMessage = error instanceof RedditFetchError
                ? `Reddit error: ${error.message}`
                : error instanceof Error
                    ? error.message
                    : 'Unknown error';

            c.header('X-Cache', 'ERROR');
            c.header('X-Response-Time', `${responseTimeMs}ms`);

            const response: ApiResponse<null> = {
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString(),
            };

            return c.json(response, 500);
        }
    });

    /**
     * GET /api/subreddits
     * List subreddits, optionally filtered by category
     */
    api.get('/subreddits', (c) => {
        const categoryParam = c.req.query('category') as ContentCategory | undefined;

        let subreddits = SUBREDDIT_CONFIG.map((s: SubredditConfig) => ({
            name: s.name,
            category: s.category,
            tier: s.tier,
            subscribers: s.subscribers || 0,
            baselineScore: s.baselineScore,
        }));

        if (categoryParam) {
            subreddits = subreddits.filter((s) => s.category === categoryParam);
        }

        subreddits.sort((a, b) => {
            if (a.tier !== b.tier) return a.tier - b.tier;
            return b.subscribers - a.subscribers;
        });

        return c.json({
            success: true,
            data: subreddits,
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * GET /api/trends/summary
     * Get a summary of current trends with caching
     */
    api.get('/trends/summary', async (c) => {
        const startTime = Date.now();
        let cacheStatus: ResponseMeta['cacheStatus'] = 'MISS';

        try {
            const bypassCache = c.req.query('bypass') === 'true';

            // Check cache first
            if (!bypassCache) {
                const cached = cache.getSummary();
                if (cached) {
                    cacheStatus = 'HIT';
                    const responseTimeMs = Date.now() - startTime;
                    cache.logRequest('/api/trends/summary', true, responseTimeMs);

                    c.header('X-Cache', 'HIT');
                    c.header('X-Response-Time', `${responseTimeMs}ms`);

                    return c.json({
                        success: true,
                        data: cached.data,
                        timestamp: new Date().toISOString(),
                        meta: { cacheStatus, cachedAt: cached.cachedAt, responseTimeMs },
                    });
                }
            } else {
                cacheStatus = 'BYPASS';
            }

            const fetcher = getRedditFetcher();
            const nesCalculator = getNesCalculator();
            const aggregator = getTrendAggregator();

            const topSubreddits = SUBREDDIT_CONFIG
                .filter((s: SubredditConfig) => s.tier === 1)
                .slice(0, 5);

            const postsMap = await fetcher.fetchMultipleSubreddits(
                topSubreddits.map((s: SubredditConfig) => s.name),
                { sort: 'hot', limit: 25 }
            );

            const trendsBySubreddit = new Map<string, TrendData[]>();
            for (const [subreddit, posts] of postsMap) {
                const trends = nesCalculator.processPostBatch(posts);
                trendsBySubreddit.set(subreddit, trends);
            }

            const allTrends = aggregator.aggregateTrends(trendsBySubreddit);
            const uniqueTrends = aggregator.deduplicateTrends(allTrends);
            const summary = aggregator.generateSummary(uniqueTrends);

            // Store in cache
            cache.setSummary(summary, CACHE_TTL.SUMMARY);

            const responseTimeMs = Date.now() - startTime;
            cache.logRequest('/api/trends/summary', false, responseTimeMs);

            c.header('X-Cache', cacheStatus);
            c.header('X-Response-Time', `${responseTimeMs}ms`);

            const response: ApiResponse<TrendSummary> = {
                success: true,
                data: summary,
                timestamp: new Date().toISOString(),
            };

            return c.json(response);

        } catch (error) {
            const responseTimeMs = Date.now() - startTime;
            cache.logRequest('/api/trends/summary', false, responseTimeMs);

            logger.error({ error }, 'Failed to generate summary');

            c.header('X-Cache', 'ERROR');
            c.header('X-Response-Time', `${responseTimeMs}ms`);

            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/categories
     * List available categories with metadata
     */
    api.get('/categories', (c) => {
        const categories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
            id: key,
            label,
            subredditCount: SUBREDDIT_CONFIG.filter((s: SubredditConfig) => s.category === key).length,
            videoFormats: CATEGORY_VIDEO_FORMATS[key as ContentCategory],
        }));

        return c.json({
            success: true,
            data: categories,
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * GET /api/status
     * Get engine status including rate limits and cache stats
     */
    api.get('/status', (c) => {
        const fetcher = getRedditFetcher();
        const rateLimitStatus = fetcher.getRateLimitStatus();
        const cacheStats = cache.getStats();
        const dbStats = getDatabaseStats();

        return c.json({
            success: true,
            data: {
                rateLimit: rateLimitStatus,
                cache: {
                    totalEntries: cacheStats.totalEntries,
                    hitRate: `${cacheStats.cacheHitRate.toFixed(1)}%`,
                    totalHits: cacheStats.totalHits,
                    expiredCount: cacheStats.expiredCount,
                    dbSizeKB: Math.round(dbStats.dbSizeBytes / 1024),
                },
                subreddits: {
                    total: SUBREDDIT_CONFIG.length,
                    tier1: SUBREDDIT_CONFIG.filter((s: SubredditConfig) => s.tier === 1).length,
                    tier2: SUBREDDIT_CONFIG.filter((s: SubredditConfig) => s.tier === 2).length,
                    tier3: SUBREDDIT_CONFIG.filter((s: SubredditConfig) => s.tier === 3).length,
                },
                method: '.json URL append (no API key)',
            },
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * POST /api/cache/invalidate
     * Manually invalidate cache entries
     */
    api.post('/cache/invalidate', async (c) => {
        try {
            const body = await c.req.json() as { prefix?: string; category?: ContentCategory; all?: boolean };

            if (body.all === true) {
                cache.invalidateByPrefix('trends');
                cache.invalidateByPrefix('summary');
                logger.info('All cache entries invalidated');
                return c.json({ success: true, message: 'All cache invalidated' });
            }

            if (body.prefix) {
                cache.invalidateByPrefix(body.prefix);
                logger.info({ prefix: body.prefix }, 'Cache invalidated by prefix');
                return c.json({ success: true, message: `Cache invalidated for prefix: ${body.prefix}` });
            }

            if (body.category) {
                cache.invalidateByCategory(body.category);
                logger.info({ category: body.category }, 'Cache invalidated by category');
                return c.json({ success: true, message: `Cache invalidated for category: ${body.category}` });
            }

            return c.json({ success: false, error: 'Specify prefix, category, or all: true' }, 400);

        } catch (error) {
            logger.error({ error }, 'Cache invalidation failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }, 500);
        }
    });

    /**
     * POST /api/cache/cleanup
     * Clean up expired cache entries
     */
    api.post('/cache/cleanup', (c) => {
        const deleted = cache.cleanupExpired();
        logger.info({ deleted }, 'Cache cleanup completed');
        return c.json({ success: true, deleted });
    });

    // ============================================
    // AI CONTENT GENERATION ENDPOINTS
    // ============================================

    /**
     * POST /api/generate-script
     * Generate a video script from trend data using Gemini AI
     */
    api.post('/generate-script', async (c) => {
        try {
            // Dynamic import to avoid loading AI module if not needed
            const { getScriptGenerator, getGeminiClient } = await import('../ai/index.js');

            const gemini = getGeminiClient();

            // Check if AI is configured
            if (!gemini.isConfigured()) {
                return c.json({
                    success: false,
                    error: 'AI features are not configured. Please set GEMINI_API_KEY in environment.',
                    timestamp: new Date().toISOString(),
                }, 503);
            }

            const body = await c.req.json() as {
                trend: TrendData;
                options?: {
                    format?: VideoFormat;
                    durationSeconds?: number;
                    platform?: 'tiktok' | 'reels' | 'shorts' | 'all';
                    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
                    language?: 'en' | 'tr';
                    includeCta?: boolean;
                    includeHook?: boolean;
                };
            };

            if (!body.trend || !body.trend.id) {
                return c.json({
                    success: false,
                    error: 'Invalid request: trend data is required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const generator = getScriptGenerator();

            // Validate options
            if (body.options) {
                const validation = generator.validateOptions(body.options);
                if (!validation.valid) {
                    return c.json({
                        success: false,
                        error: `Invalid options: ${validation.errors.join(', ')}`,
                        timestamp: new Date().toISOString(),
                    }, 400);
                }
            }

            logger.info({
                trendId: body.trend.id,
                category: body.trend.category,
                format: body.options?.format,
            }, 'Generating script...');

            const script = await generator.generateScript(body.trend, body.options);

            return c.json({
                success: true,
                data: script,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            // Dynamic import for error type check
            const { GeminiError } = await import('../ai/index.js');

            logger.error({ error }, 'Script generation failed');

            if (error instanceof GeminiError) {
                const statusCode = error.statusCode === 429 ? 429 : 500;
                return c.json({
                    success: false,
                    error: error.message,
                    retryable: error.retryable,
                    timestamp: new Date().toISOString(),
                }, statusCode);
            }

            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/ai/status
     * Get AI service status and rate limits
     */
    api.get('/ai/status', async (c) => {
        try {
            const { getGeminiClient } = await import('../ai/index.js');
            const gemini = getGeminiClient();

            return c.json({
                success: true,
                data: {
                    configured: gemini.isConfigured(),
                    rateLimit: gemini.getRateLimitStatus(),
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/ai/formats/:category
     * Get available video formats for a category
     */
    api.get('/ai/formats/:category', async (c) => {
        const category = c.req.param('category') as ContentCategory;

        const validCategories = Object.keys(CATEGORY_LABELS);
        if (!validCategories.includes(category)) {
            return c.json({
                success: false,
                error: `Invalid category. Valid categories: ${validCategories.join(', ')}`,
                timestamp: new Date().toISOString(),
            }, 400);
        }

        const { getScriptGenerator } = await import('../ai/index.js');
        const generator = getScriptGenerator();
        const formats = generator.getFormatsForCategory(category);

        return c.json({
            success: true,
            data: {
                category,
                formats,
            },
            timestamp: new Date().toISOString(),
        });
    });

    // ============================================
    // MULTI-PLATFORM AI GENERATION ENDPOINTS
    // ============================================

    /**
     * POST /api/generate-scripts
     * Generate video scripts for multiple platforms simultaneously
     */
    api.post('/generate-scripts', async (c) => {
        try {
            const { getGeminiClient } = await import('../ai/index.js');
            const { getOrchestrator } = await import('../ai/orchestrator/index.js');
            const { ALL_PLATFORMS } = await import('@icerik/shared');

            const gemini = getGeminiClient();

            if (!gemini.isConfigured()) {
                return c.json({
                    success: false,
                    error: 'AI features are not configured. Please set GEMINI_API_KEY in environment.',
                    timestamp: new Date().toISOString(),
                }, 503);
            }

            const body = await c.req.json() as {
                trend: TrendData;
                platforms?: ('tiktok' | 'reels' | 'shorts')[];
                options?: {
                    durationSeconds?: number;
                    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
                    language?: 'en' | 'tr';
                    includeCta?: boolean;
                    includeHook?: boolean;
                };
            };

            if (!body.trend || !body.trend.id) {
                return c.json({
                    success: false,
                    error: 'Invalid request: trend data is required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const platforms = body.platforms || [...ALL_PLATFORMS];

            logger.info({
                trendId: body.trend.id,
                category: body.trend.category,
                platforms,
            }, 'Generating multi-platform scripts...');

            const orchestrator = getOrchestrator();
            const result = await orchestrator.generateForPlatforms(
                body.trend,
                platforms,
                body.options || {}
            );

            const summary = orchestrator.getComparisonSummary(result);

            return c.json({
                success: true,
                data: {
                    ...result,
                    summary,
                },
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            const { GeminiError } = await import('../ai/index.js');

            logger.error({ error }, 'Multi-platform script generation failed');

            if (error instanceof GeminiError) {
                const statusCode = error.statusCode === 429 ? 429 : 500;
                return c.json({
                    success: false,
                    error: error.message,
                    retryable: error.retryable,
                    timestamp: new Date().toISOString(),
                }, statusCode);
            }

            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * POST /api/generate-scripts/retry
     * Retry failed platform generations from a previous result
     */
    api.post('/generate-scripts/retry', async (c) => {
        try {
            const { getGeminiClient } = await import('../ai/index.js');
            const { getOrchestrator } = await import('../ai/orchestrator/index.js');

            const gemini = getGeminiClient();

            if (!gemini.isConfigured()) {
                return c.json({
                    success: false,
                    error: 'AI features are not configured.',
                    timestamp: new Date().toISOString(),
                }, 503);
            }

            const body = await c.req.json() as {
                previousResult: Awaited<ReturnType<InstanceType<typeof import('../ai/orchestrator/index.js').MultiPlatformOrchestrator>['generateForAllPlatforms']>>;
                options?: {
                    durationSeconds?: number;
                    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
                    language?: 'en' | 'tr';
                };
            };

            if (!body.previousResult || !body.previousResult.trend) {
                return c.json({
                    success: false,
                    error: 'Invalid request: previousResult with trend data is required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            logger.info({
                trendId: body.previousResult.trend.id,
            }, 'Retrying failed platforms...');

            const orchestrator = getOrchestrator();
            const result = await orchestrator.retryFailed(
                body.previousResult,
                body.options || {}
            );

            const summary = orchestrator.getComparisonSummary(result);

            return c.json({
                success: true,
                data: {
                    ...result,
                    summary,
                },
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Retry generation failed');

            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/platforms
     * Get available platforms and their capabilities
     */
    api.get('/platforms', async (c) => {
        const { ALL_PLATFORMS, PLATFORM_LABELS, PLATFORM_ALGORITHM_FOCUS, PLATFORM_COLORS } = await import('@icerik/shared');

        const platforms = ALL_PLATFORMS.map(platform => ({
            id: platform,
            label: PLATFORM_LABELS[platform],
            algorithmFocus: PLATFORM_ALGORITHM_FOCUS[platform],
            colors: PLATFORM_COLORS[platform],
        }));

        return c.json({
            success: true,
            data: platforms,
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * GET /api/platforms/:platform/tips
     * Get platform-specific optimization tips
     */
    api.get('/platforms/:platform/tips', async (c) => {
        const platform = c.req.param('platform') as 'tiktok' | 'reels' | 'shorts';
        const { ALL_PLATFORMS, PLATFORM_LABELS, PLATFORM_ALGORITHM_FOCUS } = await import('@icerik/shared');

        if (!ALL_PLATFORMS.includes(platform)) {
            return c.json({
                success: false,
                error: `Invalid platform. Valid platforms: ${ALL_PLATFORMS.join(', ')}`,
                timestamp: new Date().toISOString(),
            }, 400);
        }

        const focus = PLATFORM_ALGORITHM_FOCUS[platform];

        const tips: Record<'tiktok' | 'reels' | 'shorts', string[]> = {
            tiktok: [
                'Hook viewers in the first 1 second - no slow intros',
                'Use pattern interrupts every 2-3 seconds to maintain attention',
                'Design your ending to loop seamlessly back to the beginning',
                'Target 15-30 seconds for optimal completion rate',
                'Use trending sounds to boost discoverability',
                'Include comment-bait questions to drive engagement',
            ],
            reels: [
                'Create shareable content - "Send this to someone who..."',
                'Design a grid-friendly cover frame for your profile',
                'Pack value into your content to encourage saves',
                'Keep captions engaging with strong first line',
                'Use 5-10 relevant hashtags in your caption',
                'Cross-promote to Stories for additional reach',
            ],
            shorts: [
                'Prevent swipe-away in first 3 seconds with bold hooks',
                'Target 70%+ viewed rate (not swiped away)',
                'Design for 100%+ retention through seamless loops',
                'Include natural subscribe prompts throughout',
                'Optimize title and description for YouTube search',
                'Bridge to your long-form content when relevant',
            ],
        };

        return c.json({
            success: true,
            data: {
                platform,
                label: PLATFORM_LABELS[platform],
                algorithmFocus: focus,
                tips: tips[platform],
            },
            timestamp: new Date().toISOString(),
        });
    });

    // ============================================
    // PHASE 14: TREND INTELLIGENCE ENDPOINTS
    // ============================================

    /**
     * POST /api/trends/:id/classify
     * Classify a trend and get recommended content format
     */
    api.post('/trends/:id/classify', async (c) => {
        try {
            const trendId = c.req.param('id');

            // Get trend from request body (since we may not have it cached)
            const body = await c.req.json() as { trend?: TrendData };

            if (!body.trend) {
                // Try to get from cache (if available via other means)
                return c.json({
                    success: false,
                    error: 'Trend data is required in request body',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const classifier = getTrendClassifier();
            const classification = classifier.classify(body.trend);
            const formatOptions = classifier.getFormatOptions(classification.trendType);

            logger.info({
                trendId,
                trendType: classification.trendType,
                confidence: classification.confidence,
                format: classification.recommendedFormat,
            }, 'Trend classified');

            return c.json({
                success: true,
                data: {
                    trendId,
                    trend: body.trend,
                    classification,
                    formatOptions,
                },
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Trend classification failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * POST /api/scripts/score
     * Score an existing script for viral potential
     */
    api.post('/scripts/score', async (c) => {
        try {
            const body = await c.req.json() as { script: import('@icerik/shared').PlatformScript };

            if (!body.script || !body.script.platform) {
                return c.json({
                    success: false,
                    error: 'Valid PlatformScript is required in request body',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const scorer = getAlgorithmScorer();
            const algorithmScore = scorer.score(body.script);
            const viralLabel = scorer.getViralLabel(algorithmScore.overallScore);
            const category = scorer.getScoreCategory(algorithmScore.overallScore);

            logger.info({
                platform: body.script.platform,
                overallScore: algorithmScore.overallScore,
                category,
            }, 'Script scored');

            return c.json({
                success: true,
                data: {
                    algorithmScore,
                    viralPotential: viralLabel,
                    category,
                },
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Script scoring failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    // ============================================================
    // Phase 15: AI Quality Enhancement Endpoints
    // ============================================================

    /**
     * GET /api/ai/metrics
     * Get AI operations metrics and summary
     */
    api.get('/ai/metrics', (c) => {
        const metrics = getAIMetrics();
        const since = c.req.query('since')
            ? parseInt(c.req.query('since')!, 10)
            : undefined;

        const summary = metrics.getSummary(since);
        const recentOperations = metrics.getRecentMetrics(20);

        return c.json({
            success: true,
            data: {
                summary,
                recentOperations,
                inProgress: metrics.getInProgressCount(),
            },
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * POST /api/scripts/iterate
     * Iterate on a specific section of a script
     */
    api.post('/scripts/iterate', async (c) => {
        try {
            const body = await c.req.json() as {
                originalScript: import('@icerik/shared').PlatformScript;
                target: IterationTarget;
                newTone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
                additionalInstructions?: string;
            };

            if (!body.originalScript || !body.target) {
                return c.json({
                    success: false,
                    error: 'originalScript and target are required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const validTargets: IterationTarget[] = [
                'hook', 'body', 'cta', 'title', 'hashtags',
                'shorten', 'lengthen', 'change_tone', 'add_hooks'
            ];

            if (!validTargets.includes(body.target)) {
                return c.json({
                    success: false,
                    error: `Invalid target. Must be one of: ${validTargets.join(', ')}`,
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const iterator = getScriptIterator();
            const result = await iterator.iterate({
                originalScript: body.originalScript,
                target: body.target,
                newTone: body.newTone,
                additionalInstructions: body.additionalInstructions,
            });

            logger.info({
                target: body.target,
                platform: body.originalScript.platform,
                durationMs: result.metadata.durationMs,
            }, 'Script iteration completed');

            return c.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Script iteration failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * POST /api/generate-script-variants
     * Generate A/B script variants with different styles
     */
    api.post('/generate-script-variants', async (c) => {
        try {
            const body = await c.req.json() as {
                trend: TrendData;
                platform: import('@icerik/shared').Platform;
                styles?: import('../ai/variants/index.js').VariantStyle[];
                durationSeconds?: number;
                tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
                calculateScores?: boolean;
            };

            if (!body.trend || !body.platform) {
                return c.json({
                    success: false,
                    error: 'trend and platform are required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const validPlatforms = ['tiktok', 'reels', 'shorts'];
            if (!validPlatforms.includes(body.platform)) {
                return c.json({
                    success: false,
                    error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const generator = getVariantGenerator();
            const result = await generator.generateVariants(
                body.trend,
                body.platform,
                {
                    styles: body.styles ?? ['high_energy', 'story_driven'],
                    durationSeconds: body.durationSeconds,
                    tone: body.tone,
                    calculateScores: body.calculateScores ?? true,
                }
            );

            logger.info({
                trendId: body.trend.id,
                platform: body.platform,
                variantCount: result.variants.length,
                recommended: result.recommended,
            }, 'Variant generation completed');

            return c.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Variant generation failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    // ============================================
    // IMAGE DISCOVERY ENDPOINTS
    // ============================================

    /**
     * GET /api/images/search
     * Search images by query with optional validation
     */
    api.get('/images/search', async (c) => {
        try {
            const imageService = getImageSearchService();

            if (!imageService.isConfigured()) {
                return c.json({
                    success: false,
                    error: 'Image search not configured. Please set PEXELS_API_KEY.',
                    timestamp: new Date().toISOString(),
                }, 503);
            }

            const query = c.req.query('query');
            const count = parseInt(c.req.query('count') || '6', 10);
            const validate = c.req.query('validate') !== 'false';

            if (!query) {
                return c.json({
                    success: false,
                    error: 'Query parameter is required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const result = await imageService.searchByQuery(query, {
                count: Math.min(count, 12),
                validateImages: validate,
            });

            return c.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Image search failed');

            if (error instanceof PexelsError) {
                const statusCode = error.statusCode === 429 ? 429 : 500;
                return c.json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                }, statusCode as 429 | 500);
            }

            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * POST /api/images/search-for-content
     * Search images based on trend/script content with keyword extraction
     */
    api.post('/images/search-for-content', async (c) => {
        try {
            const imageService = getImageSearchService();

            if (!imageService.isConfigured()) {
                return c.json({
                    success: false,
                    error: 'Image search not configured. Please set PEXELS_API_KEY.',
                    timestamp: new Date().toISOString(),
                }, 503);
            }

            const body = await c.req.json<{
                title: string;
                category?: string;
                hookContent?: string;
                count?: number;
                validate?: boolean;
                orientation?: 'portrait' | 'landscape' | 'square';
            }>();

            if (!body.title) {
                return c.json({
                    success: false,
                    error: 'Title is required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const result = await imageService.searchForContent(
                {
                    title: body.title,
                    category: body.category,
                    hookContent: body.hookContent,
                },
                {
                    count: Math.min(body.count || 6, 12),
                    validateImages: body.validate !== false,
                    orientation: body.orientation || 'portrait', // Default portrait for reels
                }
            );

            return c.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Content-based image search failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * POST /api/images/validate
     * Validate a single image for text/overlay content
     */
    api.post('/images/validate', async (c) => {
        try {
            const imageService = getImageSearchService();

            const body = await c.req.json<{
                imageUrl: string;
            }>();

            if (!body.imageUrl) {
                return c.json({
                    success: false,
                    error: 'imageUrl is required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            // Basic URL validation
            try {
                new URL(body.imageUrl);
            } catch {
                return c.json({
                    success: false,
                    error: 'Invalid imageUrl format',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const result = await imageService.validateSingleImage(body.imageUrl);

            return c.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            logger.error({ error }, 'Image validation failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/images/suggestions
     * Get search suggestions for a category
     */
    api.get('/images/suggestions/:category', (c) => {
        const imageService = getImageSearchService();
        const category = c.req.param('category');

        const suggestions = imageService.getSuggestions(category);

        return c.json({
            success: true,
            data: {
                category,
                suggestions,
            },
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * GET /api/images/status
     * Get image service status and cache stats
     */
    api.get('/images/status', (c) => {
        const imageService = getImageSearchService();

        return c.json({
            success: true,
            data: {
                configured: imageService.isConfigured(),
                cache: imageService.getCacheStats(),
            },
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * POST /api/images/sequence
     * Generate visual sequence for a platform script (Phase 22)
     * Scene-by-scene semantic matching with coherence scoring
     */
    api.post('/images/sequence', async (c) => {
        try {
            const body = await c.req.json();
            const { script, category, options } = body;

            if (!script || !script.sections) {
                return c.json({
                    success: false,
                    error: 'Script with sections is required',
                    timestamp: new Date().toISOString(),
                }, 400);
            }

            const builder = new VisualSequenceBuilder(options);
            const sequence = await builder.buildSequence(script, category || 'general');

            return c.json({
                success: true,
                data: {
                    sequence,
                    sceneCount: sequence.sceneVisuals.length,
                    avgMatchScore: sequence.metadata.avgMatchScore,
                    coherenceScore: sequence.coherenceScore,
                    warnings: sequence.warnings,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error({ error }, 'Visual sequence generation failed');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    return api;
}
