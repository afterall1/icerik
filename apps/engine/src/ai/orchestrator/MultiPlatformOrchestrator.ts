/**
 * Multi-Platform Orchestrator
 *
 * Coordinates parallel script generation across multiple platform agents.
 * Handles error isolation, result aggregation, and comprehensive logging.
 *
 * @module ai/orchestrator/MultiPlatformOrchestrator
 */

import type { TrendData } from '@icerik/shared';
import type {
    Platform,
    PlatformScript,
    MultiPlatformResult,
    MultiPlatformOptions,
    PlatformScriptResult,
} from '@icerik/shared';
import { ALL_PLATFORMS, DEFAULT_MULTI_PLATFORM_OPTIONS } from '@icerik/shared';
import { getAgentForPlatform } from '../agents/index.js';
import { GeminiError } from '../gemini.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('orchestrator');

/**
 * Multi-Platform Orchestrator
 *
 * Coordinates parallel execution of platform-specific agents
 * for simultaneous content generation across TikTok, Reels, and Shorts.
 */
export class MultiPlatformOrchestrator {
    /**
     * Generate scripts for all platforms simultaneously
     */
    async generateForAllPlatforms(
        trend: TrendData,
        options: Partial<MultiPlatformOptions> = {}
    ): Promise<MultiPlatformResult> {
        return this.generateForPlatforms(trend, [...ALL_PLATFORMS], options);
    }

    /**
     * Generate scripts for specified platforms
     */
    async generateForPlatforms(
        trend: TrendData,
        platforms: Platform[],
        options: Partial<MultiPlatformOptions> = {}
    ): Promise<MultiPlatformResult> {
        const opts: MultiPlatformOptions = {
            ...DEFAULT_MULTI_PLATFORM_OPTIONS,
            ...options,
            platforms,
        };

        const requestedAt = new Date().toISOString();
        const startTime = Date.now();

        logger.info({
            trendId: trend.id,
            platforms,
            category: trend.category,
        }, 'Starting multi-platform generation');

        // Execute all platform generations in parallel
        const results = await this.executeParallel(trend, platforms, opts);

        const completedAt = new Date().toISOString();
        const totalDurationMs = Date.now() - startTime;

        // Count successes and failures
        const successCount = Object.values(results).filter(
            (r): r is { success: true; script: PlatformScript } => r?.success === true
        ).length;
        const failureCount = platforms.length - successCount;

        logger.info({
            trendId: trend.id,
            successCount,
            failureCount,
            totalDurationMs,
        }, 'Multi-platform generation complete');

        return {
            trend,
            results,
            metadata: {
                requestedAt,
                completedAt,
                totalDurationMs,
                successCount,
                failureCount,
            },
        };
    }

    /**
     * Execute platform agents in parallel with error isolation
     */
    private async executeParallel(
        trend: TrendData,
        platforms: Platform[],
        options: MultiPlatformOptions
    ): Promise<MultiPlatformResult['results']> {
        // Create generation tasks for each platform
        const tasks = platforms.map(platform =>
            this.generateForPlatform(trend, platform, options)
        );

        // Execute all in parallel, allowing individual failures
        const settled = await Promise.allSettled(tasks);

        // Map results back to platform keys
        const results: MultiPlatformResult['results'] = {};

        platforms.forEach((platform, index) => {
            const result = settled[index];

            if (result.status === 'fulfilled') {
                results[platform] = result.value;
            } else {
                // Promise was rejected (unexpected error)
                const error = result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason);

                results[platform] = {
                    success: false,
                    error: `Unexpected error: ${error}`,
                    retryable: true,
                };

                logger.error({
                    platform,
                    error: result.reason,
                    trendId: trend.id,
                }, 'Unexpected error in parallel execution');
            }
        });

        return results;
    }

    /**
     * Generate script for a single platform with error handling
     */
    private async generateForPlatform(
        trend: TrendData,
        platform: Platform,
        options: MultiPlatformOptions
    ): Promise<PlatformScriptResult> {
        try {
            const agent = getAgentForPlatform(platform);
            const script = await agent.generateScript(trend, options);

            return {
                success: true,
                script,
            };
        } catch (error) {
            // Handle known error types
            if (error instanceof GeminiError) {
                return {
                    success: false,
                    error: error.message,
                    retryable: error.retryable,
                };
            }

            // Handle generic errors
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message,
                retryable: false,
            };
        }
    }

    /**
     * Retry failed platforms from a previous result
     */
    async retryFailed(
        previousResult: MultiPlatformResult,
        options: Partial<MultiPlatformOptions> = {}
    ): Promise<MultiPlatformResult> {
        // Find failed platforms that are retryable
        const failedPlatforms: Platform[] = [];

        for (const [platform, result] of Object.entries(previousResult.results)) {
            if (result && !result.success && result.retryable) {
                failedPlatforms.push(platform as Platform);
            }
        }

        if (failedPlatforms.length === 0) {
            logger.info({ trendId: previousResult.trend.id }, 'No retryable failures found');
            return previousResult;
        }

        logger.info({
            trendId: previousResult.trend.id,
            retryingPlatforms: failedPlatforms,
        }, 'Retrying failed platforms');

        // Generate for failed platforms
        const retryResult = await this.generateForPlatforms(
            previousResult.trend,
            failedPlatforms,
            options
        );

        // Merge results
        const mergedResults: MultiPlatformResult['results'] = {
            ...previousResult.results,
            ...retryResult.results,
        };

        // Recalculate success/failure counts
        const successCount = Object.values(mergedResults).filter(
            (r): r is { success: true; script: PlatformScript } => r?.success === true
        ).length;

        return {
            trend: previousResult.trend,
            results: mergedResults,
            metadata: {
                requestedAt: previousResult.metadata.requestedAt,
                completedAt: retryResult.metadata.completedAt,
                totalDurationMs:
                    previousResult.metadata.totalDurationMs + retryResult.metadata.totalDurationMs,
                successCount,
                failureCount: Object.keys(mergedResults).length - successCount,
            },
        };
    }

    /**
     * Get comparison summary between platform scripts
     */
    getComparisonSummary(result: MultiPlatformResult): {
        platformSummaries: Array<{
            platform: Platform;
            status: 'success' | 'failed';
            estimatedDuration?: number;
            optimizations?: string[];
            error?: string;
        }>;
        recommendation: string;
    } {
        const summaries: Array<{
            platform: Platform;
            status: 'success' | 'failed';
            estimatedDuration?: number;
            optimizations?: string[];
            error?: string;
        }> = [];

        for (const platform of ALL_PLATFORMS) {
            const platformResult = result.results[platform];

            if (!platformResult) {
                continue;
            }

            if (platformResult.success) {
                summaries.push({
                    platform,
                    status: 'success',
                    estimatedDuration: platformResult.script.estimatedDurationSeconds,
                    optimizations: platformResult.script.optimizations,
                });
            } else {
                summaries.push({
                    platform,
                    status: 'failed',
                    error: platformResult.error,
                });
            }
        }

        // Generate recommendation based on results
        const successfulPlatforms = summaries.filter(s => s.status === 'success');
        let recommendation = '';

        if (successfulPlatforms.length === 0) {
            recommendation = 'All platform generations failed. Please check API configuration and try again.';
        } else if (successfulPlatforms.length < summaries.length) {
            const failed = summaries.filter(s => s.status === 'failed').map(s => s.platform);
            recommendation = `Generated successfully for ${successfulPlatforms.length} platform(s). Failed for: ${failed.join(', ')}. Consider retrying failed platforms.`;
        } else {
            recommendation = 'All platforms generated successfully! Review each script and publish to your preferred platform first.';
        }

        return {
            platformSummaries: summaries,
            recommendation,
        };
    }
}

/**
 * Singleton instance
 */
let orchestratorInstance: MultiPlatformOrchestrator | null = null;

/**
 * Get singleton orchestrator
 */
export function getOrchestrator(): MultiPlatformOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new MultiPlatformOrchestrator();
    }
    return orchestratorInstance;
}

/**
 * Reset orchestrator instance (for testing)
 */
export function resetOrchestrator(): void {
    orchestratorInstance = null;
}
