/**
 * İçerik Trend Engine - Main Entry Point
 * 
 * Starts the HTTP server and optionally the background polling worker.
 * Use --with-worker flag to enable background polling.
 * 
 * @module index
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createApiRouter } from './api/index.js';
import { getWorker } from './worker/index.js';
import { closeDatabase, getDatabaseStats } from './cache/index.js';
import { createChildLogger } from './utils/logger.js';
import { getEnv } from './utils/env.js';

const appLogger = createChildLogger('app');

/**
 * Parse command line arguments
 */
function parseArgs(): { withWorker: boolean } {
    const args = process.argv.slice(2);
    return {
        withWorker: args.includes('--with-worker') || args.includes('-w'),
    };
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
    try {
        const env = getEnv();
        const args = parseArgs();

        appLogger.info({ withWorker: args.withWorker }, '🚀 Starting Trend Engine...');

        // Create Hono app
        const app = new Hono();

        // Mount API routes
        const api = createApiRouter();
        app.route('/api', api);

        // Root endpoint with enhanced status
        app.get('/', (c) => {
            const dbStats = getDatabaseStats();
            let workerStatus = null;

            if (args.withWorker) {
                try {
                    const worker = getWorker({ autoStart: false, enableShutdownHandlers: false });
                    workerStatus = worker.getStatus();
                } catch {
                    workerStatus = { error: 'Worker not initialized' };
                }
            }

            return c.json({
                name: 'İçerik Trend Engine',
                version: '1.0.0',
                description: 'Reddit-based viral trend detection engine',
                environment: env.NODE_ENV,
                uptime: process.uptime(),
                endpoints: {
                    trends: '/api/trends',
                    summary: '/api/trends/summary',
                    subreddits: '/api/subreddits',
                    categories: '/api/categories',
                    status: '/api/status',
                    health: '/api/health',
                    cacheInvalidate: 'POST /api/cache/invalidate',
                    cacheCleanup: 'POST /api/cache/cleanup',
                },
                cache: {
                    dbSizeKB: Math.round(dbStats.dbSizeBytes / 1024),
                    trendCacheEntries: dbStats.trendCacheCount,
                    subredditStats: dbStats.subredditStatsCount,
                    requestLogs: dbStats.requestLogCount,
                },
                worker: workerStatus,
            });
        });

        // Worker management endpoints (only if worker is enabled)
        if (args.withWorker) {
            app.get('/api/worker/status', (c) => {
                try {
                    const worker = getWorker({ autoStart: false, enableShutdownHandlers: false });
                    return c.json({
                        success: true,
                        data: worker.getStatus(),
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

            app.post('/api/worker/start', (c) => {
                try {
                    const worker = getWorker({ autoStart: false, enableShutdownHandlers: false });
                    worker.startPolling();
                    return c.json({
                        success: true,
                        message: 'Worker polling started',
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

            app.post('/api/worker/stop', (c) => {
                try {
                    const worker = getWorker({ autoStart: false, enableShutdownHandlers: false });
                    worker.stopPolling();
                    return c.json({
                        success: true,
                        message: 'Worker polling stopped',
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

            app.post('/api/worker/force-run/:tier', async (c) => {
                try {
                    const tier = parseInt(c.req.param('tier')) as 1 | 2 | 3;
                    if (![1, 2, 3].includes(tier)) {
                        return c.json({
                            success: false,
                            error: 'Invalid tier. Must be 1, 2, or 3',
                            timestamp: new Date().toISOString(),
                        }, 400);
                    }

                    const worker = getWorker({ autoStart: false, enableShutdownHandlers: false });
                    await worker.forceRun(tier);

                    return c.json({
                        success: true,
                        message: `Tier ${tier} polling executed`,
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
        }

        // Start server
        const port = env.PORT;

        const server = serve({
            fetch: app.fetch,
            port,
        }, () => {
            const workerMode = args.withWorker ? '✓ ENABLED' : '✗ DISABLED';

            appLogger.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🔥 İÇERİK TREND ENGINE                                     ║
║                                                              ║
║   Server running at: http://localhost:${String(port).padEnd(5)}                ║
║   Environment: ${env.NODE_ENV.padEnd(10)}                              ║
║   Background Worker: ${workerMode.padEnd(12)}                        ║
║                                                              ║
║   Endpoints:                                                 ║
║   • GET  /api/trends          - Fetch trending topics        ║
║   • GET  /api/trends/summary  - Get trend summary            ║
║   • GET  /api/subreddits      - List subreddits              ║
║   • GET  /api/categories      - List categories              ║
║   • GET  /api/status          - Engine & cache status        ║
║   • GET  /api/health          - Health check                 ║
║   • POST /api/cache/invalidate - Invalidate cache            ║
║   • POST /api/cache/cleanup   - Clean expired cache          ║${args.withWorker ? `
║                                                              ║
║   Worker Endpoints:                                          ║
║   • GET  /api/worker/status   - Worker status                ║
║   • POST /api/worker/start    - Start polling                ║
║   • POST /api/worker/stop     - Stop polling                 ║
║   • POST /api/worker/force-run/:tier - Force poll tier       ║` : ''}
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
        });

        // Start background worker if enabled
        if (args.withWorker) {
            appLogger.info('Initializing background worker...');
            const worker = getWorker({
                autoStart: true,
                enableShutdownHandlers: true,
            });
            await worker.start();
            appLogger.info('Background worker started');
        }

        // Graceful shutdown handling (when worker is not managing it)
        if (!args.withWorker) {
            const shutdown = async (signal: string) => {
                appLogger.info({ signal }, 'Received shutdown signal');

                // Close server
                server.close(() => {
                    appLogger.info('HTTP server closed');
                });

                // Close database
                closeDatabase();
                appLogger.info('Database connection closed');

                process.exit(0);
            };

            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT', () => shutdown('SIGINT'));
        }

    } catch (error) {
        appLogger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}

// Start the application
main();
