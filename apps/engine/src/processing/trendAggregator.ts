import { createChildLogger } from '../utils/logger.js';
import type { TrendData, TrendQuery, TrendSummary, ContentCategory } from '@icerik/shared';

const logger = createChildLogger('trend-aggregator');

/**
 * Trend Aggregator
 * Aggregates, sorts, and filters trends across multiple sources
 */
export class TrendAggregator {

    /**
     * Aggregate trends from multiple subreddits and sort by NES
     */
    aggregateTrends(trendsBySubreddit: Map<string, TrendData[]>): TrendData[] {
        const allTrends: TrendData[] = [];

        for (const [_subreddit, trends] of trendsBySubreddit) {
            allTrends.push(...trends);
        }

        // Sort by NES score (descending)
        allTrends.sort((a, b) => b.nes - a.nes);

        logger.info({ totalTrends: allTrends.length }, 'Aggregated trends');

        return allTrends;
    }

    /**
     * Filter trends based on query parameters
     */
    filterTrends(trends: TrendData[], query: TrendQuery): TrendData[] {
        let filtered = [...trends];

        // Filter by category
        if (query.category) {
            filtered = filtered.filter(t => t.category === query.category);
        }

        // Filter by minimum score
        if (query.minScore) {
            filtered = filtered.filter(t => t.score >= query.minScore!);
        }

        // Filter by time range
        const now = Date.now() / 1000;
        const maxAgeHours = this.getMaxAgeHours(query.timeRange);
        filtered = filtered.filter(t => {
            const ageHours = (now - t.createdUtc) / 3600;
            return ageHours <= maxAgeHours;
        });

        // Sort by specified field
        if (query.sortBy) {
            filtered.sort((a, b) => {
                switch (query.sortBy) {
                    case 'score':
                        return b.score - a.score;
                    case 'velocity':
                        return b.engagementVelocity - a.engagementVelocity;
                    case 'comments':
                        return b.numComments - a.numComments;
                    case 'nes':
                    default:
                        return b.nes - a.nes;
                }
            });
        }

        // Apply limit
        if (query.limit) {
            filtered = filtered.slice(0, query.limit);
        }

        logger.debug({
            input: trends.length,
            output: filtered.length,
            query
        }, 'Filtered trends');

        return filtered;
    }

    /**
     * Generate a summary of trends
     */
    generateSummary(trends: TrendData[], limit = 10): TrendSummary {
        // Get top trends
        const topTrends = trends.slice(0, limit);

        // Category breakdown
        const categoryBreakdown: Record<ContentCategory, number> = {
            technology: 0,
            finance: 0,
            entertainment: 0,
            gaming: 0,
            lifestyle: 0,
            news: 0,
            drama: 0,
            sports: 0,
            science: 0,
            other: 0,
        };

        for (const trend of trends) {
            categoryBreakdown[trend.category]++;
        }

        // Average engagement velocity
        const avgVelocity = trends.length > 0
            ? trends.reduce((sum, t) => sum + t.engagementVelocity, 0) / trends.length
            : 0;

        return {
            topTrends,
            categoryBreakdown,
            totalProcessed: trends.length,
            avgEngagementVelocity: Math.round(avgVelocity * 100) / 100,
            fetchedAt: new Date(),
        };
    }

    /**
     * Deduplicate trends by title similarity
     */
    deduplicateTrends(trends: TrendData[]): TrendData[] {
        const seen = new Set<string>();
        const unique: TrendData[] = [];

        for (const trend of trends) {
            // Create a simplified key from the title
            const key = this.normalizeTitle(trend.title);

            if (!seen.has(key)) {
                seen.add(key);
                unique.push(trend);
            }
        }

        logger.debug({
            input: trends.length,
            output: unique.length,
            duplicatesRemoved: trends.length - unique.length
        }, 'Deduplicated trends');

        return unique;
    }

    /**
     * Get max age in hours for a time range
     */
    private getMaxAgeHours(timeRange: TrendQuery['timeRange']): number {
        switch (timeRange) {
            case 'hour':
                return 1;
            case 'day':
                return 24;
            case 'week':
                return 168;
            case 'month':
                return 720;
            default:
                return 24;
        }
    }

    /**
     * Normalize title for deduplication
     */
    private normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 50);
    }
}

// Singleton instance
let aggregatorInstance: TrendAggregator | null = null;

export function getTrendAggregator(): TrendAggregator {
    if (!aggregatorInstance) {
        aggregatorInstance = new TrendAggregator();
    }
    return aggregatorInstance;
}
