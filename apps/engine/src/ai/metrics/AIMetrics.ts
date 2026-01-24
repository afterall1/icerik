/**
 * AI Metrics Collector
 *
 * Tracks and aggregates metrics for all AI operations.
 * Provides observability for script generation, scoring, and classification.
 *
 * @module ai/metrics/AIMetrics
 */

import type { Platform } from '@icerik/shared';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('aiMetrics');

/**
 * AI operation types
 */
export type AIOperationType =
    | 'generate'
    | 'generate_variants'
    | 'iterate'
    | 'score'
    | 'classify'
    | 'validate';

/**
 * AI operation metrics record
 */
export interface AIOperationMetrics {
    /** Unique operation identifier */
    operationId: string;
    /** Type of AI operation */
    operationType: AIOperationType;
    /** Target platform (if applicable) */
    platform?: Platform;
    /** Content category (if applicable) */
    category?: string;

    // Timing
    /** Operation start time (epoch ms) */
    startTime: number;
    /** Operation end time (epoch ms) */
    endTime: number;
    /** Total duration in milliseconds */
    durationMs: number;

    // Token usage
    /** Prompt token count */
    promptTokens: number;
    /** Response token count */
    responseTokens: number;
    /** Total token count */
    totalTokens: number;

    // Quality metrics
    /** Validation score (0-100) */
    validationScore?: number;
    /** Algorithm score (0-100) */
    algorithmScore?: number;
    /** Number of retries needed */
    retryCount: number;

    // Knowledge system
    /** Whether knowledge cache was hit */
    knowledgeCacheHit: boolean;
    /** Knowledge loading time in ms */
    knowledgeLoadTimeMs: number;

    // Status
    /** Whether operation succeeded */
    success: boolean;
    /** Error type if failed */
    errorType?: string;
    /** Error message if failed */
    errorMessage?: string;
}

/**
 * Aggregated metrics summary
 */
export interface AIMetricsSummary {
    /** Total operations tracked */
    totalOperations: number;
    /** Successful operations */
    successfulOperations: number;
    /** Failed operations */
    failedOperations: number;
    /** Success rate (0-1) */
    successRate: number;

    // Averages
    /** Average duration in ms */
    avgDurationMs: number;
    /** Average tokens per operation */
    avgTokensPerOperation: number;
    /** Average validation score */
    avgValidationScore: number;
    /** Average algorithm score */
    avgAlgorithmScore: number;

    // Cache
    /** Knowledge cache hit rate (0-1) */
    knowledgeCacheHitRate: number;

    // Breakdown by type
    operationsByType: Record<AIOperationType, number>;

    // Breakdown by platform
    operationsByPlatform: Record<string, number>;

    // Time range
    /** Earliest operation timestamp */
    earliestOperation: number;
    /** Latest operation timestamp */
    latestOperation: number;
}

/**
 * In-progress operation tracker
 */
interface InProgressOperation {
    operationId: string;
    operationType: AIOperationType;
    platform?: Platform;
    category?: string;
    startTime: number;
    knowledgeCacheHit?: boolean;
    knowledgeLoadTimeMs?: number;
}

/**
 * Maximum number of metrics to keep in memory
 */
const MAX_METRICS_HISTORY = 1000;

/**
 * AI Metrics Collector
 *
 * Singleton class for tracking AI operation metrics.
 */
export class AIMetricsCollector {
    private metrics: AIOperationMetrics[] = [];
    private inProgress: Map<string, InProgressOperation> = new Map();
    private operationCounter = 0;

    /**
     * Start tracking a new AI operation
     *
     * @param type - Type of operation
     * @param options - Additional operation context
     * @returns Operation ID for tracking
     */
    startOperation(
        type: AIOperationType,
        options: {
            platform?: Platform;
            category?: string;
        } = {}
    ): string {
        const operationId = `op_${Date.now()}_${++this.operationCounter}`;

        const operation: InProgressOperation = {
            operationId,
            operationType: type,
            platform: options.platform,
            category: options.category,
            startTime: Date.now(),
        };

        this.inProgress.set(operationId, operation);

        logger.debug({
            operationId,
            type,
            platform: options.platform,
        }, 'AI operation started');

        return operationId;
    }

    /**
     * Record knowledge cache status for an operation
     */
    recordKnowledgeLoad(
        operationId: string,
        cacheHit: boolean,
        loadTimeMs: number
    ): void {
        const operation = this.inProgress.get(operationId);
        if (operation) {
            operation.knowledgeCacheHit = cacheHit;
            operation.knowledgeLoadTimeMs = loadTimeMs;
        }
    }

    /**
     * Complete an AI operation with results
     *
     * @param operationId - Operation ID from startOperation
     * @param result - Operation results
     */
    endOperation(
        operationId: string,
        result: {
            success: boolean;
            promptTokens?: number;
            responseTokens?: number;
            validationScore?: number;
            algorithmScore?: number;
            retryCount?: number;
            errorType?: string;
            errorMessage?: string;
        }
    ): void {
        const operation = this.inProgress.get(operationId);

        if (!operation) {
            logger.warn({ operationId }, 'Attempted to end unknown operation');
            return;
        }

        const endTime = Date.now();
        const durationMs = endTime - operation.startTime;

        const metrics: AIOperationMetrics = {
            operationId: operation.operationId,
            operationType: operation.operationType,
            platform: operation.platform,
            category: operation.category,
            startTime: operation.startTime,
            endTime,
            durationMs,
            promptTokens: result.promptTokens ?? 0,
            responseTokens: result.responseTokens ?? 0,
            totalTokens: (result.promptTokens ?? 0) + (result.responseTokens ?? 0),
            validationScore: result.validationScore,
            algorithmScore: result.algorithmScore,
            retryCount: result.retryCount ?? 0,
            knowledgeCacheHit: operation.knowledgeCacheHit ?? false,
            knowledgeLoadTimeMs: operation.knowledgeLoadTimeMs ?? 0,
            success: result.success,
            errorType: result.errorType,
            errorMessage: result.errorMessage,
        };

        this.metrics.push(metrics);
        this.inProgress.delete(operationId);

        // Trim history if needed
        if (this.metrics.length > MAX_METRICS_HISTORY) {
            this.metrics = this.metrics.slice(-MAX_METRICS_HISTORY);
        }

        logger.info({
            operationId,
            type: operation.operationType,
            durationMs,
            success: result.success,
            tokens: metrics.totalTokens,
        }, 'AI operation completed');
    }

    /**
     * Cancel an in-progress operation (e.g., due to timeout)
     */
    cancelOperation(operationId: string, reason: string): void {
        const operation = this.inProgress.get(operationId);

        if (operation) {
            this.endOperation(operationId, {
                success: false,
                errorType: 'cancelled',
                errorMessage: reason,
            });
        }
    }

    /**
     * Get all recorded metrics, optionally filtered
     */
    getMetrics(filter?: {
        operationType?: AIOperationType;
        platform?: Platform;
        success?: boolean;
        since?: number;
    }): AIOperationMetrics[] {
        let result = [...this.metrics];

        if (filter) {
            if (filter.operationType) {
                result = result.filter(m => m.operationType === filter.operationType);
            }
            if (filter.platform) {
                result = result.filter(m => m.platform === filter.platform);
            }
            if (filter.success !== undefined) {
                result = result.filter(m => m.success === filter.success);
            }
            if (filter.since !== undefined) {
                result = result.filter(m => m.startTime >= filter.since!);
            }
        }

        return result;
    }

    /**
     * Get recent metrics (last N operations)
     */
    getRecentMetrics(count: number = 20): AIOperationMetrics[] {
        return this.metrics.slice(-count);
    }

    /**
     * Get aggregated metrics summary
     */
    getSummary(since?: number): AIMetricsSummary {
        const metrics = since
            ? this.metrics.filter(m => m.startTime >= since)
            : this.metrics;

        if (metrics.length === 0) {
            return this.getEmptySummary();
        }

        const successful = metrics.filter(m => m.success);
        const withValidation = metrics.filter(m => m.validationScore !== undefined);
        const withAlgorithm = metrics.filter(m => m.algorithmScore !== undefined);

        // Operation type breakdown
        const operationsByType = {} as Record<AIOperationType, number>;
        for (const m of metrics) {
            operationsByType[m.operationType] = (operationsByType[m.operationType] || 0) + 1;
        }

        // Platform breakdown
        const operationsByPlatform: Record<string, number> = {};
        for (const m of metrics) {
            const platform = m.platform || 'unknown';
            operationsByPlatform[platform] = (operationsByPlatform[platform] || 0) + 1;
        }

        return {
            totalOperations: metrics.length,
            successfulOperations: successful.length,
            failedOperations: metrics.length - successful.length,
            successRate: successful.length / metrics.length,
            avgDurationMs: Math.round(
                metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length
            ),
            avgTokensPerOperation: Math.round(
                metrics.reduce((sum, m) => sum + m.totalTokens, 0) / metrics.length
            ),
            avgValidationScore: withValidation.length > 0
                ? Math.round(
                    withValidation.reduce((sum, m) => sum + (m.validationScore ?? 0), 0) /
                    withValidation.length
                )
                : 0,
            avgAlgorithmScore: withAlgorithm.length > 0
                ? Math.round(
                    withAlgorithm.reduce((sum, m) => sum + (m.algorithmScore ?? 0), 0) /
                    withAlgorithm.length
                )
                : 0,
            knowledgeCacheHitRate:
                metrics.filter(m => m.knowledgeCacheHit).length / metrics.length,
            operationsByType,
            operationsByPlatform,
            earliestOperation: Math.min(...metrics.map(m => m.startTime)),
            latestOperation: Math.max(...metrics.map(m => m.startTime)),
        };
    }

    /**
     * Clear all metrics (for testing)
     */
    clearMetrics(): void {
        this.metrics = [];
        this.inProgress.clear();
        this.operationCounter = 0;
        logger.info('AI metrics cleared');
    }

    /**
     * Get count of in-progress operations
     */
    getInProgressCount(): number {
        return this.inProgress.size;
    }

    /**
     * Get empty summary for no data case
     */
    private getEmptySummary(): AIMetricsSummary {
        return {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            successRate: 0,
            avgDurationMs: 0,
            avgTokensPerOperation: 0,
            avgValidationScore: 0,
            avgAlgorithmScore: 0,
            knowledgeCacheHitRate: 0,
            operationsByType: {} as Record<AIOperationType, number>,
            operationsByPlatform: {},
            earliestOperation: 0,
            latestOperation: 0,
        };
    }
}

// ============================================================
// Singleton Instance
// ============================================================

let metricsInstance: AIMetricsCollector | null = null;

/**
 * Get the singleton AIMetricsCollector instance
 */
export function getAIMetrics(): AIMetricsCollector {
    if (!metricsInstance) {
        metricsInstance = new AIMetricsCollector();
    }
    return metricsInstance;
}

/**
 * Reset the metrics collector (for testing)
 */
export function resetAIMetrics(): void {
    if (metricsInstance) {
        metricsInstance.clearMetrics();
    }
    metricsInstance = null;
}
