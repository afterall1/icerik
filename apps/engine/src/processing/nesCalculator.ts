import { createChildLogger } from '../utils/logger.js';
import { SUBREDDIT_CONFIG, NES_CONSTANTS } from '@icerik/shared';
import type { RedditPost, TrendData, ContentCategory, SubredditConfig } from '@icerik/shared';

const logger = createChildLogger('nes-calculator');

/**
 * Normalized Engagement Score (NES) Calculator
 * 
 * Formula: NES = (score × engagement_velocity × controversy_factor) / subreddit_baseline
 * 
 * - Engagement Velocity: How fast the post is gaining engagement relative to its age
 * - Controversy Factor: Higher weight for controversial posts (balanced upvotes/downvotes)
 * - Subreddit Baseline: Normalizes scores across different-sized subreddits
 */
export class NesCalculator {
    private subredditConfigMap: Map<string, SubredditConfig>;

    constructor() {
        this.subredditConfigMap = new Map(
            SUBREDDIT_CONFIG.map(config => [config.name.toLowerCase(), config])
        );

        logger.info({ subredditCount: this.subredditConfigMap.size }, 'NES Calculator initialized');
    }

    /**
     * Calculate NES score for a single post
     */
    calculateNes(post: RedditPost): TrendData {
        const now = Date.now() / 1000; // Current time in seconds
        const ageHours = Math.max((now - post.created_utc) / 3600, 0.1); // Minimum 6 minutes

        // Get subreddit configuration
        const subredditConfig = this.subredditConfigMap.get(post.subreddit.toLowerCase());
        const baselineScore = subredditConfig?.baselineScore || 1000;
        const category = subredditConfig?.category || 'other';

        // Calculate components
        const engagementVelocity = this.calculateEngagementVelocity(post.score, post.num_comments, ageHours);
        const controversyFactor = this.calculateControversyFactor(post.upvote_ratio);
        const normalizedScore = post.score / baselineScore;

        // Final NES calculation
        const nes = normalizedScore * engagementVelocity * controversyFactor;

        return {
            id: post.id,
            title: post.title,
            subreddit: post.subreddit,
            category: category as ContentCategory,

            // Raw metrics
            score: post.score,
            upvoteRatio: post.upvote_ratio,
            numComments: post.num_comments,
            createdUtc: post.created_utc,

            // Calculated metrics
            nes: Math.round(nes * 1000) / 1000, // Round to 3 decimal places
            engagementVelocity: Math.round(engagementVelocity * 100) / 100,
            controversyFactor: Math.round(controversyFactor * 100) / 100,
            ageHours: Math.round(ageHours * 10) / 10,

            // Metadata
            sourceUrl: post.url,
            permalink: post.permalink,
            fetchedAt: new Date(),
        };
    }

    /**
     * Calculate engagement velocity
     * How fast is the post gaining traction?
     */
    private calculateEngagementVelocity(score: number, comments: number, ageHours: number): number {
        // Total engagement = score + weighted comments (comments are more valuable)
        const totalEngagement = score + (comments * 2);

        // Apply time decay - older posts need higher absolute numbers to have same velocity
        const decayFactor = Math.pow(0.9, ageHours / NES_CONSTANTS.VELOCITY_DECAY_HOURS);

        // Velocity = engagement per hour, with decay
        const rawVelocity = totalEngagement / ageHours;

        return rawVelocity * decayFactor;
    }

    /**
     * Calculate controversy factor
     * Posts with more balanced upvotes/downvotes get higher scores
     */
    private calculateControversyFactor(upvoteRatio: number): number {
        // upvote_ratio: 1.0 = 100% upvotes, 0.5 = 50/50 split
        // We want to boost posts that are somewhat controversial (0.5-0.7 range)
        // but not pure downvote magnets (<0.4)

        if (upvoteRatio < 0.4) {
            // Too controversial / disliked - reduce score
            return 0.5;
        } else if (upvoteRatio < 0.7) {
            // Sweet spot - controversial but engaging
            return 1 + (1 - upvoteRatio) * NES_CONSTANTS.CONTROVERSY_WEIGHT;
        } else {
            // Normal post - no boost
            return 1;
        }
    }

    /**
     * Batch process multiple posts
     */
    processPostBatch(posts: RedditPost[]): TrendData[] {
        const trends = posts
            .filter(post => {
                // Filter out stickied posts and low-score posts
                if (post.stickied) return false;
                if (post.score < NES_CONSTANTS.MIN_SCORE_THRESHOLD) return false;
                return true;
            })
            .map(post => this.calculateNes(post));

        logger.debug({ inputCount: posts.length, outputCount: trends.length }, 'Processed post batch');

        return trends;
    }

    /**
     * Get category for a subreddit
     */
    getCategoryForSubreddit(subreddit: string): ContentCategory {
        const config = this.subredditConfigMap.get(subreddit.toLowerCase());
        return config?.category || 'other';
    }
}

// Singleton instance
let calculatorInstance: NesCalculator | null = null;

export function getNesCalculator(): NesCalculator {
    if (!calculatorInstance) {
        calculatorInstance = new NesCalculator();
    }
    return calculatorInstance;
}
