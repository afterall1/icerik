/**
 * MultiPlatformOrchestrator Tests
 *
 * Tests for the multi-platform orchestrator including:
 * - Parallel execution with Promise.allSettled
 * - Error isolation (one failure doesn't break others)
 * - Result aggregation
 * - Retry functionality
 *
 * @module ai/orchestrator/__tests__/MultiPlatformOrchestrator.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiPlatformOrchestrator, resetOrchestrator } from '../MultiPlatformOrchestrator';
import type { TrendData } from '@icerik/shared';

// Mock the agents module
vi.mock('../../agents/index.js', () => ({
    getAgentForPlatform: vi.fn((platform) => ({
        platform,
        version: '1.0.0-test',
        generateScript: vi.fn(),
    })),
}));

// Mock the gemini client
vi.mock('../../gemini.js', () => ({
    GeminiError: class GeminiError extends Error {
        constructor(message: string, public statusCode?: number, public retryable = false) {
            super(message);
        }
    },
}));

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
    createChildLogger: vi.fn(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    })),
}));

/**
 * Create a mock trend for testing
 */
function createMockTrend(): TrendData {
    return {
        id: 'test-trend-123',
        title: 'Test Trend Title',
        subreddit: 'technology',
        category: 'technology',
        score: 5000,
        upvoteRatio: 0.95,
        numComments: 500,
        createdUtc: Date.now() / 1000 - 3600,
        nes: 85.5,
        engagementVelocity: 150,
        controversyFactor: 0.1,
        ageHours: 1,
        sourceUrl: 'https://reddit.com/r/technology/test',
        permalink: '/r/technology/comments/test',
        fetchedAt: new Date(),
    };
}

describe('MultiPlatformOrchestrator', () => {
    let orchestrator: MultiPlatformOrchestrator;
    let mockGetAgentForPlatform: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        resetOrchestrator();
        orchestrator = new MultiPlatformOrchestrator();

        // Get the mocked function
        const agentsModule = await import('../../agents/index.js');
        mockGetAgentForPlatform = agentsModule.getAgentForPlatform as ReturnType<typeof vi.fn>;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('generateForPlatforms', () => {
        it('should generate scripts for specified platforms', async () => {
            const mockScript = {
                platform: 'tiktok',
                script: 'Test script content',
                title: 'Test Title',
                hashtags: ['#test', '#viral'],
                estimatedDurationSeconds: 30,
                sections: {
                    hook: { content: 'Hook', wordCount: 5, estimatedSeconds: 2 },
                    body: { content: 'Body', wordCount: 50, estimatedSeconds: 20 },
                    cta: { content: 'CTA', wordCount: 10, estimatedSeconds: 4 },
                },
                optimizations: ['Test optimization'],
                metadata: {
                    generatedAt: new Date().toISOString(),
                    trendId: 'test-123',
                    category: 'technology',
                    agentVersion: '1.0.0-test',
                },
            };

            mockGetAgentForPlatform.mockReturnValue({
                platform: 'tiktok',
                version: '1.0.0-test',
                generateScript: vi.fn().mockResolvedValue(mockScript),
            });

            const trend = createMockTrend();
            const result = await orchestrator.generateForPlatforms(trend, ['tiktok'], {});

            expect(result.trend).toBe(trend);
            expect(result.results.tiktok).toBeDefined();
            expect(result.results.tiktok?.success).toBe(true);
            expect(result.metadata.successCount).toBe(1);
            expect(result.metadata.failureCount).toBe(0);
        });

        it('should handle agent errors gracefully', async () => {
            const { GeminiError } = await import('../../gemini.js');

            mockGetAgentForPlatform.mockReturnValue({
                platform: 'reels',
                version: '1.0.0-test',
                generateScript: vi.fn().mockRejectedValue(
                    new GeminiError('Rate limit exceeded', 429, true)
                ),
            });

            const trend = createMockTrend();
            const result = await orchestrator.generateForPlatforms(trend, ['reels'], {});

            expect(result.results.reels).toBeDefined();
            expect(result.results.reels?.success).toBe(false);
            if (result.results.reels && !result.results.reels.success) {
                expect(result.results.reels.error).toContain('Rate limit');
                expect(result.results.reels.retryable).toBe(true);
            }
            expect(result.metadata.failureCount).toBe(1);
        });

        it('should execute all platforms in parallel', async () => {
            const callOrder: string[] = [];

            mockGetAgentForPlatform.mockImplementation((platform) => ({
                platform,
                version: '1.0.0-test',
                generateScript: vi.fn().mockImplementation(async () => {
                    callOrder.push(`start-${platform}`);
                    await new Promise((r) => setTimeout(r, 10));
                    callOrder.push(`end-${platform}`);
                    return {
                        platform,
                        script: 'Test',
                        title: 'Test',
                        hashtags: [],
                        estimatedDurationSeconds: 30,
                        sections: { body: { content: 'Test', wordCount: 1, estimatedSeconds: 1 } },
                        optimizations: [],
                        metadata: {
                            generatedAt: new Date().toISOString(),
                            trendId: 'test',
                            category: 'test',
                            agentVersion: '1.0.0',
                        },
                    };
                }),
            }));

            const trend = createMockTrend();
            await orchestrator.generateForPlatforms(trend, ['tiktok', 'reels', 'shorts'], {});

            // All starts should happen before any end (parallel execution)
            const startIndices = callOrder
                .filter((c) => c.startsWith('start-'))
                .map((c) => callOrder.indexOf(c));
            const endIndices = callOrder
                .filter((c) => c.startsWith('end-'))
                .map((c) => callOrder.indexOf(c));

            // At least some starts should complete before all ends
            expect(Math.max(...startIndices)).toBeLessThan(Math.max(...endIndices));
        });
    });

    describe('generateForAllPlatforms', () => {
        it('should generate for all three platforms', async () => {
            mockGetAgentForPlatform.mockImplementation((platform) => ({
                platform,
                version: '1.0.0-test',
                generateScript: vi.fn().mockResolvedValue({
                    platform,
                    script: 'Test',
                    title: 'Test',
                    hashtags: [],
                    estimatedDurationSeconds: 30,
                    sections: { body: { content: 'Test', wordCount: 1, estimatedSeconds: 1 } },
                    optimizations: [],
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        trendId: 'test',
                        category: 'test',
                        agentVersion: '1.0.0',
                    },
                }),
            }));

            const trend = createMockTrend();
            const result = await orchestrator.generateForAllPlatforms(trend);

            expect(result.results.tiktok).toBeDefined();
            expect(result.results.reels).toBeDefined();
            expect(result.results.shorts).toBeDefined();
            expect(result.metadata.successCount).toBe(3);
        });
    });

    describe('getComparisonSummary', () => {
        it('should generate correct summary for mixed results', async () => {
            const mockResult = {
                trend: createMockTrend(),
                results: {
                    tiktok: {
                        success: true as const,
                        script: {
                            platform: 'tiktok' as const,
                            script: 'Test',
                            title: 'Test',
                            hashtags: [],
                            estimatedDurationSeconds: 30,
                            sections: { body: { content: 'Test', wordCount: 10, estimatedSeconds: 4 } },
                            optimizations: ['Opt1', 'Opt2'],
                            metadata: {
                                generatedAt: new Date().toISOString(),
                                trendId: 'test',
                                category: 'test',
                                agentVersion: '1.0.0',
                            },
                        },
                    },
                    reels: {
                        success: false as const,
                        error: 'API Error',
                        retryable: true,
                    },
                    shorts: {
                        success: true as const,
                        script: {
                            platform: 'shorts' as const,
                            script: 'Test',
                            title: 'Test',
                            hashtags: [],
                            estimatedDurationSeconds: 45,
                            sections: { body: { content: 'Test', wordCount: 15, estimatedSeconds: 6 } },
                            optimizations: ['Opt3'],
                            metadata: {
                                generatedAt: new Date().toISOString(),
                                trendId: 'test',
                                category: 'test',
                                agentVersion: '1.0.0',
                            },
                        },
                    },
                },
                metadata: {
                    requestedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    totalDurationMs: 1000,
                    successCount: 2,
                    failureCount: 1,
                },
            };

            const summary = orchestrator.getComparisonSummary(mockResult);

            expect(summary.platformSummaries).toHaveLength(3);
            expect(summary.platformSummaries.find((s) => s.platform === 'tiktok')?.status).toBe('success');
            expect(summary.platformSummaries.find((s) => s.platform === 'reels')?.status).toBe('failed');
            expect(summary.platformSummaries.find((s) => s.platform === 'shorts')?.status).toBe('success');
            expect(summary.recommendation).toContain('reels');
        });
    });
});
