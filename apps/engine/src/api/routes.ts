import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { getRedditFetcher, RedditFetchError } from '../ingestion/index.js';
import { getNesCalculator, getTrendAggregator } from '../processing/index.js';
import { SUBREDDIT_CONFIG, CATEGORY_LABELS, CATEGORY_VIDEO_FORMATS } from '@icerik/shared';
import type { TrendQuery, ContentCategory, ApiResponse, TrendSummary, TrendData, SubredditConfig } from '@icerik/shared';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('api');

export function createApiRouter() {
    const api = new Hono();

    api.use('*', cors());
    api.use('*', honoLogger());

    api.get('/health', (c) => {
        const fetcher = getRedditFetcher();
        const status = fetcher.getRateLimitStatus();

        return c.json({
            status: status.isHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            rateLimit: status,
        });
    });

    /**
     * GET /api/trends
     * Fetch current trends with optional filtering
     */
    api.get('/trends', async (c) => {
        try {
            const subredditParam = c.req.query('subreddit');
            const query: TrendQuery = {
                category: c.req.query('category') as ContentCategory | undefined,
                timeRange: (c.req.query('timeRange') || 'day') as TrendQuery['timeRange'],
                limit: parseInt(c.req.query('limit') || '20'),
                minScore: c.req.query('minScore') ? parseInt(c.req.query('minScore')!) : undefined,
                sortBy: (c.req.query('sortBy') || 'nes') as TrendQuery['sortBy'],
            };

            const sortType = (c.req.query('sortType') || 'hot') as 'hot' | 'rising' | 'top' | 'new';

            logger.info({ query, subreddit: subredditParam, sortType }, 'Fetching trends');

            const fetcher = getRedditFetcher();
            const nesCalculator = getNesCalculator();
            const aggregator = getTrendAggregator();

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
                return c.json({
                    success: true,
                    data: [],
                    message: 'No subreddits found for the specified category',
                    timestamp: new Date().toISOString(),
                });
            }

            const postsMap = await fetcher.fetchMultipleSubreddits(
                subredditsToFetch,
                { sort: sortType, timeRange: query.timeRange, limit: 50 }
            );

            const trendsBySubreddit = new Map<string, TrendData[]>();
            for (const [subreddit, posts] of postsMap) {
                const trends = nesCalculator.processPostBatch(posts);
                trendsBySubreddit.set(subreddit, trends);
            }

            let allTrends = aggregator.aggregateTrends(trendsBySubreddit);
            allTrends = aggregator.deduplicateTrends(allTrends);

            const filtered = aggregator.filterTrends(allTrends, query);

            const response: ApiResponse<TrendData[]> = {
                success: true,
                data: filtered,
                timestamp: new Date().toISOString(),
            };

            return c.json(response);

        } catch (error) {
            logger.error({ error }, 'Failed to fetch trends');

            const errorMessage = error instanceof RedditFetchError
                ? `Reddit error: ${error.message}`
                : error instanceof Error
                    ? error.message
                    : 'Unknown error';

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
     * Get a summary of current trends
     */
    api.get('/trends/summary', async (c) => {
        try {
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

            const response: ApiResponse<TrendSummary> = {
                success: true,
                data: summary,
                timestamp: new Date().toISOString(),
            };

            return c.json(response);

        } catch (error) {
            logger.error({ error }, 'Failed to generate summary');

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
     * Get engine status including rate limits
     */
    api.get('/status', (c) => {
        const fetcher = getRedditFetcher();
        const rateLimitStatus = fetcher.getRateLimitStatus();

        return c.json({
            success: true,
            data: {
                rateLimit: rateLimitStatus,
                subredditCount: SUBREDDIT_CONFIG.length,
                tier1Count: SUBREDDIT_CONFIG.filter((s: SubredditConfig) => s.tier === 1).length,
                tier2Count: SUBREDDIT_CONFIG.filter((s: SubredditConfig) => s.tier === 2).length,
                tier3Count: SUBREDDIT_CONFIG.filter((s: SubredditConfig) => s.tier === 3).length,
                method: '.json URL append (no API key)',
            },
            timestamp: new Date().toISOString(),
        });
    });

    return api;
}
