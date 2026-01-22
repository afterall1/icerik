import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createApiRouter } from './api/index.js';
import { createChildLogger } from './utils/logger.js';
import { getEnv } from './utils/env.js';

const appLogger = createChildLogger('app');

async function main() {
    try {
        const env = getEnv();

        appLogger.info('🚀 Starting Trend Engine...');

        // Create Hono app
        const app = new Hono();

        // Mount API routes
        const api = createApiRouter();
        app.route('/api', api);

        // Root endpoint
        app.get('/', (c) => {
            return c.json({
                name: 'İçerik Trend Engine',
                version: '1.0.0',
                description: 'Reddit-based viral trend detection engine',
                endpoints: {
                    trends: '/api/trends',
                    summary: '/api/trends/summary',
                    categories: '/api/categories',
                    status: '/api/status',
                    health: '/api/health',
                },
            });
        });

        // Start server
        const port = env.PORT;

        serve({
            fetch: app.fetch,
            port,
        }, () => {
            appLogger.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🔥 İÇERİK TREND ENGINE                                     ║
║                                                              ║
║   Server running at: http://localhost:${port}                  ║
║   Environment: ${env.NODE_ENV.padEnd(10)}                              ║
║                                                              ║
║   Endpoints:                                                 ║
║   • GET /api/trends          - Fetch trending topics         ║
║   • GET /api/trends/summary  - Get trend summary             ║
║   • GET /api/categories      - List categories               ║
║   • GET /api/status          - Engine status                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
        });

    } catch (error) {
        appLogger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}

main();
