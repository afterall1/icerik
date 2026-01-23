/**
 * Background Worker
 * 
 * Manages background polling operations for trend data.
 * Handles graceful shutdown and integrates with cache service.
 * 
 * @module worker/worker
 */

import type { SubredditConfig, TrendData } from '@icerik/shared';
import { getScheduler, PollingScheduler } from './scheduler.js';
import { getRedditFetcher } from '../ingestion/index.js';
import { getNesCalculator, getTrendAggregator } from '../processing/index.js';
import { getCacheService, closeDatabase } from '../cache/index.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('worker');

/**
 * Worker configuration options
 */
export interface WorkerOptions {
    /** Whether to start polling immediately */
    autoStart: boolean;
    /** Enable graceful shutdown handlers */
    enableShutdownHandlers: boolean;
}

/**
 * Default worker options
 */
const DEFAULT_OPTIONS: WorkerOptions = {
    autoStart: true,
    enableShutdownHandlers: true,
};

/**
 * Background Worker Class
 * 
 * Orchestrates background polling, data processing, and caching.
 * Handles signal-based graceful shutdown.
 */
export class BackgroundWorker {
    private scheduler: PollingScheduler;
    private options: WorkerOptions;
    private isShuttingDown: boolean = false;
    private shutdownPromise: Promise<void> | null = null;

    constructor(options: Partial<WorkerOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.scheduler = getScheduler({
            autoStart: false,
            jitterPercent: 10,
            maxRetries: 3,
            retryDelayMs: 5000,
        });
    }

    /**
     * Initializes and starts the worker
     */
    async start(): Promise<void> {
        logger.info('Starting background worker...');

        // Set up the polling callback
        this.scheduler.setCallback(this.pollSubreddits.bind(this));

        // Initialize scheduler with subreddit configuration
        this.scheduler.initialize();

        // Register shutdown handlers
        if (this.options.enableShutdownHandlers) {
            this.registerShutdownHandlers();
        }

        // Start polling if autoStart is enabled
        if (this.options.autoStart) {
            this.scheduler.startAll();
        }

        logger.info({
            stats: this.scheduler.getStats(),
        }, 'Background worker started');
    }

    /**
     * Polls subreddits and caches the results
     * This is the main work function called by the scheduler
     * 
     * @param subreddits - List of subreddits to poll
     */
    private async pollSubreddits(subreddits: SubredditConfig[]): Promise<void> {
        if (this.isShuttingDown) {
            logger.info('Skipping poll - worker is shutting down');
            return;
        }

        const startTime = Date.now();
        const subredditNames = subreddits.map(s => s.name);

        logger.info({
            subredditCount: subreddits.length,
            subreddits: subredditNames,
        }, 'Polling subreddits...');

        try {
            const fetcher = getRedditFetcher();
            const nesCalculator = getNesCalculator();
            const aggregator = getTrendAggregator();
            const cache = getCacheService();

            // Fetch posts from Reddit
            const postsMap = await fetcher.fetchMultipleSubreddits(
                subredditNames,
                { sort: 'hot', limit: 50 }
            );

            // Process each subreddit's posts
            const trendsBySubreddit = new Map<string, TrendData[]>();
            let totalPosts = 0;

            for (const [subreddit, posts] of postsMap) {
                totalPosts += posts.length;

                // Calculate NES for each post
                const trends = nesCalculator.processPostBatch(posts);
                trendsBySubreddit.set(subreddit, trends);

                // Update subreddit statistics for baseline calculations
                if (posts.length > 0) {
                    const avgScore = posts.reduce((sum, p) => sum + p.score, 0) / posts.length;
                    const avgComments = posts.reduce((sum, p) => sum + p.num_comments, 0) / posts.length;
                    cache.updateSubredditStats(subreddit, avgScore, avgComments, posts.length);
                }
            }

            // Aggregate and cache trends by category
            const allTrends = aggregator.aggregateTrends(trendsBySubreddit);
            const uniqueTrends = aggregator.deduplicateTrends(allTrends);

            // Group by category and cache each group
            const trendsByCategory = new Map<string, TrendData[]>();
            for (const trend of uniqueTrends) {
                const category = trend.category;
                if (!trendsByCategory.has(category)) {
                    trendsByCategory.set(category, []);
                }
                trendsByCategory.get(category)!.push(trend);
            }

            // Cache trends for each category with multiple sort variants
            // This enables instant response for different sort options in dashboard
            const sortVariants: Array<'nes' | 'score' | 'comments'> = ['nes', 'score', 'comments'];

            for (const [category, categoryTrends] of trendsByCategory) {
                for (const sortBy of sortVariants) {
                    // Sort trends according to the variant
                    const sortedTrends = [...categoryTrends].sort((a, b) => {
                        if (sortBy === 'nes') return b.nes - a.nes;
                        if (sortBy === 'score') return b.score - a.score;
                        return b.numComments - a.numComments;
                    });

                    const query = {
                        category: category as SubredditConfig['category'],
                        timeRange: 'day' as const,
                        limit: 50,
                        sortBy,
                    };
                    cache.setTrends(query, sortedTrends);
                }
            }

            // Cache all trends without category filter
            const allQuery = {
                timeRange: 'day' as const,
                limit: 100,
                sortBy: 'nes' as const,
            };
            cache.setTrends(allQuery, uniqueTrends.slice(0, 100));

            // Generate and cache summary
            const summary = aggregator.generateSummary(uniqueTrends);
            cache.setSummary(summary);

            // Clean up expired cache entries periodically
            cache.cleanupExpired();

            const duration = Date.now() - startTime;

            logger.info({
                subredditCount: subreddits.length,
                totalPosts,
                uniqueTrends: uniqueTrends.length,
                categoriesCached: trendsByCategory.size,
                durationMs: duration,
            }, 'Poll completed successfully');

        } catch (error) {
            const duration = Date.now() - startTime;

            logger.error({
                error,
                subredditCount: subreddits.length,
                durationMs: duration,
            }, 'Poll failed');

            throw error; // Re-throw so scheduler can retry
        }
    }

    /**
     * Registers signal handlers for graceful shutdown
     */
    private registerShutdownHandlers(): void {
        const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGHUP'];

        for (const signal of signals) {
            process.on(signal, () => {
                logger.info({ signal }, 'Received shutdown signal');
                this.shutdown().then(() => {
                    process.exit(0);
                }).catch((error) => {
                    logger.error({ error }, 'Error during shutdown');
                    process.exit(1);
                });
            });
        }

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error({ error }, 'Uncaught exception');
            this.shutdown().finally(() => {
                process.exit(1);
            });
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error({ reason, promise }, 'Unhandled promise rejection');
        });

        logger.info('Shutdown handlers registered');
    }

    /**
     * Gracefully shuts down the worker
     */
    async shutdown(): Promise<void> {
        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }

        this.isShuttingDown = true;

        this.shutdownPromise = this.performShutdown();
        return this.shutdownPromise;
    }

    /**
     * Performs the actual shutdown sequence
     */
    private async performShutdown(): Promise<void> {
        logger.info('Initiating graceful shutdown...');

        // Stop the scheduler
        this.scheduler.stopAll();
        logger.info('Scheduler stopped');

        // Close database connection
        closeDatabase();
        logger.info('Database connection closed');

        logger.info('Graceful shutdown complete');
    }

    /**
     * Gets the current worker status
     */
    getStatus(): {
        isRunning: boolean;
        isShuttingDown: boolean;
        scheduler: ReturnType<PollingScheduler['getStats']>;
        jobs: ReturnType<PollingScheduler['getStatus']>;
    } {
        return {
            isRunning: this.scheduler.isActive(),
            isShuttingDown: this.isShuttingDown,
            scheduler: this.scheduler.getStats(),
            jobs: this.scheduler.getStatus(),
        };
    }

    /**
     * Forces immediate execution of a specific tier
     * @param tier - Tier to execute immediately
     */
    async forceRun(tier: 1 | 2 | 3): Promise<void> {
        await this.scheduler.forceRun(tier);
    }

    /**
     * Starts the scheduler if not already running
     */
    startPolling(): void {
        if (!this.scheduler.isActive()) {
            this.scheduler.startAll();
            logger.info('Polling started');
        }
    }

    /**
     * Stops the scheduler
     */
    stopPolling(): void {
        if (this.scheduler.isActive()) {
            this.scheduler.stopAll();
            logger.info('Polling stopped');
        }
    }
}

/**
 * Singleton worker instance
 */
let workerInstance: BackgroundWorker | null = null;

/**
 * Gets the singleton worker instance
 * @param options - Optional configuration options
 * @returns BackgroundWorker instance
 */
export function getWorker(options?: Partial<WorkerOptions>): BackgroundWorker {
    if (!workerInstance) {
        workerInstance = new BackgroundWorker(options);
    }
    return workerInstance;
}

/**
 * Resets the worker instance (for testing)
 */
export function resetWorker(): void {
    if (workerInstance) {
        workerInstance.shutdown().catch(() => { });
        workerInstance = null;
    }
}
