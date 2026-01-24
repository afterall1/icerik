/**
 * Example Selector Module
 *
 * Dynamically selects the most relevant few-shot examples based on
 * trend characteristics for improved AI script generation.
 *
 * @module ai/examples/ExampleSelector
 */

import type { ContentCategory, TrendData, AlgorithmScore } from '@icerik/shared';
import type { Platform, PlatformScript } from '@icerik/shared';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('exampleSelector');

/**
 * Stored script example for few-shot learning
 */
export interface ScriptExample {
    /** Unique example ID */
    id: string;
    /** Source trend metadata */
    trend: {
        title: string;
        subreddit: string;
        category: ContentCategory;
        nes: number;
        engagementVelocity: number;
    };
    /** Target platform */
    platform: Platform;
    /** Script sections */
    script: {
        hook: string;
        body: string;
        cta: string;
    };
    /** Performance metrics */
    performance: {
        algorithmScore: number;
        userRating?: number;  // Future: user feedback integration
    };
    /** When the example was added */
    createdAt: string;
    /** Keywords for matching */
    keywords: string[];
}

/**
 * Example selection criteria
 */
export interface ExampleSelectionCriteria {
    /** Target category */
    category?: ContentCategory;
    /** NES score range */
    nesRange?: { min: number; max: number };
    /** Preferred subreddits */
    subreddits?: string[];
    /** Minimum algorithm score */
    minAlgorithmScore?: number;
    /** Target platform */
    platform?: Platform;
}

/**
 * Weights for similarity calculation
 */
const SIMILARITY_WEIGHTS = {
    category: 0.35,      // Same category is important
    nesProximity: 0.20,  // Similar NES score
    subreddit: 0.25,     // Same or similar subreddit
    keywords: 0.20,      // Keyword overlap
} as const;

/**
 * Example Selector
 *
 * Selects contextually relevant script examples for few-shot prompting.
 * Uses similarity scoring based on category, NES, subreddit, and keywords.
 */
export class ExampleSelector {
    private examples: ScriptExample[] = [];
    private readonly maxExamples: number = 100;

    /**
     * Add a successful script as an example
     */
    addExample(example: ScriptExample): void {
        // Avoid duplicates
        const existingIndex = this.examples.findIndex(e => e.id === example.id);
        if (existingIndex >= 0) {
            this.examples[existingIndex] = example;
            logger.debug({ id: example.id }, 'Updated existing example');
        } else {
            this.examples.push(example);
            logger.debug({ id: example.id }, 'Added new example');
        }

        // Keep only highest performing examples
        if (this.examples.length > this.maxExamples) {
            this.examples.sort((a, b) =>
                b.performance.algorithmScore - a.performance.algorithmScore
            );
            this.examples = this.examples.slice(0, this.maxExamples);
        }
    }

    /**
     * Create an example from a generated script with its score
     */
    createExampleFromScript(
        trend: TrendData,
        script: PlatformScript,
        score: AlgorithmScore
    ): ScriptExample {
        const id = `ex_${trend.id}_${script.platform}_${Date.now()}`;

        return {
            id,
            trend: {
                title: trend.title,
                subreddit: trend.subreddit,
                category: trend.category,
                nes: trend.nes,
                engagementVelocity: trend.engagementVelocity,
            },
            platform: script.platform,
            script: {
                hook: script.sections.hook?.content ?? '',
                body: script.sections.body.content,
                cta: script.sections.cta?.content ?? '',
            },
            performance: {
                algorithmScore: score.overallScore,
            },
            keywords: this.extractKeywords(trend.title),
            createdAt: new Date().toISOString(),
        };
    }

    /**
     * Get best matching examples for a trend
     */
    selectExamples(
        trend: TrendData,
        count: number = 2,
        criteria?: ExampleSelectionCriteria
    ): ScriptExample[] {
        let candidates = [...this.examples];

        // Apply hard filters from criteria
        if (criteria) {
            if (criteria.category) {
                candidates = candidates.filter(e => e.trend.category === criteria.category);
            }
            if (criteria.nesRange) {
                candidates = candidates.filter(e =>
                    e.trend.nes >= criteria.nesRange!.min &&
                    e.trend.nes <= criteria.nesRange!.max
                );
            }
            if (criteria.subreddits?.length) {
                candidates = candidates.filter(e =>
                    criteria.subreddits!.includes(e.trend.subreddit)
                );
            }
            if (criteria.minAlgorithmScore !== undefined) {
                candidates = candidates.filter(e =>
                    e.performance.algorithmScore >= criteria.minAlgorithmScore!
                );
            }
            if (criteria.platform) {
                candidates = candidates.filter(e => e.platform === criteria.platform);
            }
        }

        // Score remaining candidates
        const scored = candidates.map(example => ({
            example,
            score: this.calculateSimilarity(trend, example),
        }));

        // Sort by similarity score (highest first)
        scored.sort((a, b) => b.score - a.score);

        // Return top N
        return scored.slice(0, count).map(s => s.example);
    }

    /**
     * Get examples for a specific category (legacy compatibility)
     */
    getExamplesForCategory(
        category: ContentCategory,
        platform?: Platform,
        count: number = 2
    ): ScriptExample[] {
        let filtered = this.examples.filter(e => e.trend.category === category);

        if (platform) {
            filtered = filtered.filter(e => e.platform === platform);
        }

        // Sort by algorithm score
        filtered.sort((a, b) =>
            b.performance.algorithmScore - a.performance.algorithmScore
        );

        return filtered.slice(0, count);
    }

    /**
     * Format examples for prompt injection
     */
    formatExamplesForPrompt(examples: ScriptExample[]): string {
        if (examples.length === 0) {
            return '';
        }

        const formatted = examples.map((ex, i) => `
## Example ${i + 1} (Score: ${ex.performance.algorithmScore}/100)
**Trend**: ${ex.trend.title}
**Category**: ${ex.trend.category} | NES: ${ex.trend.nes.toFixed(1)}

[HOOK]
${ex.script.hook}

[BODY]
${ex.script.body}

[CTA]
${ex.script.cta}
`).join('\n---\n');

        return `
# High-Performing Script Examples
These examples scored well with the algorithm. Learn from their patterns:

${formatted}
`;
    }

    /**
     * Calculate similarity score between trend and example
     */
    private calculateSimilarity(trend: TrendData, example: ScriptExample): number {
        let score = 0;

        // Category match (exact match only)
        if (trend.category === example.trend.category) {
            score += SIMILARITY_WEIGHTS.category;
        }

        // NES proximity (closer = better, normalized to 0-1)
        const nesDiff = Math.abs(trend.nes - example.trend.nes);
        const nesScore = Math.max(0, 1 - nesDiff / 100);
        score += SIMILARITY_WEIGHTS.nesProximity * nesScore;

        // Subreddit match
        if (trend.subreddit === example.trend.subreddit) {
            score += SIMILARITY_WEIGHTS.subreddit;
        } else {
            // Partial credit for similar subreddits (same first 3 chars)
            if (trend.subreddit.slice(0, 3).toLowerCase() ===
                example.trend.subreddit.slice(0, 3).toLowerCase()) {
                score += SIMILARITY_WEIGHTS.subreddit * 0.3;
            }
        }

        // Keyword overlap
        const trendKeywords = this.extractKeywords(trend.title);
        const overlap = this.calculateKeywordOverlap(trendKeywords, example.keywords);
        score += SIMILARITY_WEIGHTS.keywords * overlap;

        // Boost for high-performing examples
        if (example.performance.algorithmScore >= 80) {
            score *= 1.2;
        } else if (example.performance.algorithmScore >= 60) {
            score *= 1.1;
        }

        return Math.min(1, score);
    }

    /**
     * Extract keywords from title
     */
    private extractKeywords(title: string): string[] {
        // Remove common words and extract meaningful tokens
        const stopWords = new Set([
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'must', 'shall', 'can',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
            'as', 'or', 'and', 'but', 'if', 'so', 'yet', 'both', 'either',
            'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
            'i', 'me', 'my', 'you', 'your', 'he', 'she', 'we', 'us', 'our',
        ]);

        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
    }

    /**
     * Calculate keyword overlap ratio
     */
    private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
        if (keywords1.length === 0 || keywords2.length === 0) {
            return 0;
        }

        const set1 = new Set(keywords1);
        const set2 = new Set(keywords2);
        const intersection = [...set1].filter(k => set2.has(k));

        // Jaccard similarity
        const union = new Set([...set1, ...set2]);
        return intersection.length / union.size;
    }

    /**
     * Get statistics about stored examples
     */
    getStats(): {
        totalExamples: number;
        byCategory: Record<string, number>;
        byPlatform: Record<string, number>;
        avgAlgorithmScore: number;
    } {
        const byCategory: Record<string, number> = {};
        const byPlatform: Record<string, number> = {};
        let totalScore = 0;

        for (const ex of this.examples) {
            byCategory[ex.trend.category] = (byCategory[ex.trend.category] || 0) + 1;
            byPlatform[ex.platform] = (byPlatform[ex.platform] || 0) + 1;
            totalScore += ex.performance.algorithmScore;
        }

        return {
            totalExamples: this.examples.length,
            byCategory,
            byPlatform,
            avgAlgorithmScore: this.examples.length > 0
                ? Math.round(totalScore / this.examples.length)
                : 0,
        };
    }

    /**
     * Clear all examples (for testing)
     */
    clearExamples(): void {
        this.examples = [];
        logger.info('All examples cleared');
    }

    /**
     * Get example count
     */
    getExampleCount(): number {
        return this.examples.length;
    }

    /**
     * Export examples (for persistence)
     */
    exportExamples(): ScriptExample[] {
        return [...this.examples];
    }

    /**
     * Import examples (from persistence)
     */
    importExamples(examples: ScriptExample[]): void {
        this.examples = [...examples];
        logger.info({ count: examples.length }, 'Imported examples');
    }
}

// ============================================================
// Singleton Instance
// ============================================================

let selectorInstance: ExampleSelector | null = null;

/**
 * Get the singleton ExampleSelector instance
 */
export function getExampleSelector(): ExampleSelector {
    if (!selectorInstance) {
        selectorInstance = new ExampleSelector();
    }
    return selectorInstance;
}

/**
 * Reset the example selector (for testing)
 */
export function resetExampleSelector(): void {
    if (selectorInstance) {
        selectorInstance.clearExamples();
    }
    selectorInstance = null;
}
