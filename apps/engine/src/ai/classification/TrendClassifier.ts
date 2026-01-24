/**
 * Trend Classifier
 *
 * Analyzes Reddit trends to determine content type and recommend
 * optimal script format based on trend characteristics.
 *
 * @module ai/classification/TrendClassifier
 */

import type {
    TrendData,
    TrendType,
    ContentFormat,
    TrendClassification,
    ContentCategory,
} from '@icerik/shared';
import { TREND_TYPE_KEYWORDS, TREND_TYPE_FORMATS } from '@icerik/shared';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('trendClassifier');

/**
 * Classification weights for different signals
 */
const SIGNAL_WEIGHTS = {
    titleKeyword: 3,      // Keyword found in title
    subredditBias: 2,     // Subreddit typically has certain content
    engagementPattern: 1, // High comments = discussion/controversy
};

/**
 * Subreddit to likely trend type mapping
 */
const SUBREDDIT_TYPE_BIAS: Record<string, TrendType[]> = {
    // Drama subreddits → story type
    'AmItheAsshole': ['story', 'controversy'],
    'relationship_advice': ['story'],
    'tifu': ['story'],
    'confessions': ['story'],

    // News subreddits → breaking_news type
    'worldnews': ['breaking_news', 'discussion'],
    'news': ['breaking_news'],
    'technology': ['breaking_news', 'announcement', 'discussion'],

    // Discussion subreddits
    'AskReddit': ['discussion'],
    'unpopularopinion': ['controversy'],

    // Entertainment → meme/review
    'memes': ['meme'],
    'funny': ['meme'],
    'movies': ['review', 'discussion'],
    'gaming': ['announcement', 'review', 'meme'],

    // Finance → analysis/controversy
    'wallstreetbets': ['controversy', 'meme'],
    'stocks': ['discussion', 'breaking_news'],
    'cryptocurrency': ['breaking_news', 'discussion'],

    // Lifestyle → tutorial
    'LifeProTips': ['tutorial'],
    'todayilearned': ['discussion'],
};

/**
 * Category fallback types when no specific signals found
 */
const CATEGORY_DEFAULT_TYPE: Record<ContentCategory, TrendType> = {
    technology: 'announcement',
    finance: 'discussion',
    entertainment: 'review',
    gaming: 'announcement',
    lifestyle: 'tutorial',
    news: 'breaking_news',
    drama: 'story',
    sports: 'breaking_news',
    science: 'discussion',
    other: 'discussion',
};

/**
 * Trend Classifier
 * 
 * Analyzes trend characteristics (title, subreddit, engagement metrics)
 * to determine the content type and recommend the optimal format.
 */
export class TrendClassifier {
    /**
     * Classify a trend and recommend content format
     */
    classify(trend: TrendData): TrendClassification {
        const scores: Record<TrendType, number> = {
            controversy: 0,
            breaking_news: 0,
            tutorial: 0,
            story: 0,
            review: 0,
            discussion: 0,
            meme: 0,
            announcement: 0,
        };

        const detectedKeywords: string[] = [];
        const titleLower = trend.title.toLowerCase();

        // 1. Keyword matching in title
        for (const [type, keywords] of Object.entries(TREND_TYPE_KEYWORDS)) {
            for (const keyword of keywords) {
                if (titleLower.includes(keyword.toLowerCase())) {
                    scores[type as TrendType] += SIGNAL_WEIGHTS.titleKeyword;
                    detectedKeywords.push(keyword);
                }
            }
        }

        // 2. Subreddit bias
        const subredditTypes = SUBREDDIT_TYPE_BIAS[trend.subreddit];
        if (subredditTypes) {
            for (const type of subredditTypes) {
                scores[type] += SIGNAL_WEIGHTS.subredditBias;
            }
        }

        // 3. Engagement pattern analysis
        const commentRatio = trend.numComments / Math.max(trend.score, 1);

        // High comment ratio suggests controversy or discussion
        if (commentRatio > 0.5) {
            scores.controversy += SIGNAL_WEIGHTS.engagementPattern;
            scores.discussion += SIGNAL_WEIGHTS.engagementPattern;
        }

        // Very high controversy factor suggests hot topic
        if (trend.controversyFactor > 1.5) {
            scores.controversy += SIGNAL_WEIGHTS.engagementPattern * 2;
        }

        // 4. Time-based signals (new posts more likely breaking news)
        if (trend.ageHours < 4) {
            scores.breaking_news += SIGNAL_WEIGHTS.engagementPattern;
        }

        // Find winner
        let maxScore = 0;
        let winningType: TrendType = CATEGORY_DEFAULT_TYPE[trend.category];
        let totalScore = 0;

        for (const [type, score] of Object.entries(scores)) {
            totalScore += score;
            if (score > maxScore) {
                maxScore = score;
                winningType = type as TrendType;
            }
        }

        // If no signals found, use category default
        if (maxScore === 0) {
            winningType = CATEGORY_DEFAULT_TYPE[trend.category];
        }

        // Calculate confidence (0-1)
        const confidence = totalScore > 0
            ? Math.min(1, maxScore / (totalScore * 0.5))
            : 0.5; // Default 50% confidence if no signals

        // Get recommended format
        const formatConfig = TREND_TYPE_FORMATS[winningType];

        logger.debug({
            trendId: trend.id,
            trendType: winningType,
            confidence,
            scores,
            keywords: detectedKeywords,
        }, 'Trend classified');

        return {
            trendType: winningType,
            confidence,
            recommendedFormat: formatConfig.primaryFormat,
            formatRationale: formatConfig.structureGuidance,
            keywords: detectedKeywords,
        };
    }

    /**
     * Get all format options for a trend type
     */
    getFormatOptions(trendType: TrendType): {
        primary: ContentFormat;
        alternatives: ContentFormat[];
        hookStyle: string;
        structureGuidance: string;
    } {
        const config = TREND_TYPE_FORMATS[trendType];
        return {
            primary: config.primaryFormat,
            alternatives: config.alternativeFormats,
            hookStyle: config.hookStyle,
            structureGuidance: config.structureGuidance,
        };
    }

    /**
     * Batch classify multiple trends
     */
    classifyBatch(trends: TrendData[]): Map<string, TrendClassification> {
        const results = new Map<string, TrendClassification>();

        for (const trend of trends) {
            results.set(trend.id, this.classify(trend));
        }

        logger.info({ count: trends.length }, 'Batch classification complete');
        return results;
    }
}

/**
 * Singleton instance
 */
let classifierInstance: TrendClassifier | null = null;

/**
 * Get singleton classifier
 */
export function getTrendClassifier(): TrendClassifier {
    if (!classifierInstance) {
        classifierInstance = new TrendClassifier();
    }
    return classifierInstance;
}

/**
 * Reset classifier instance (for testing)
 */
export function resetTrendClassifier(): void {
    classifierInstance = null;
}
