/**
 * Reddit Post Data Types
 * Represents the structure of data we receive from Reddit's JSON API
 */

/**
 * Raw Reddit post data from the API
 */
export interface RedditPost {
    id: string;
    title: string;
    selftext: string;
    author: string;
    subreddit: string;
    score: number;
    upvote_ratio: number;
    num_comments: number;
    created_utc: number;
    url: string;
    permalink: string;
    is_video: boolean;
    domain: string;
    over_18: boolean;
    spoiler: boolean;
    stickied: boolean;
}

/**
 * Processed trend data with calculated metrics
 */
export interface TrendData {
    id: string;
    title: string;
    subreddit: string;
    category: ContentCategory;

    // Raw metrics
    score: number;
    upvoteRatio: number;
    numComments: number;
    createdUtc: number;

    // Calculated metrics
    nes: number;  // Normalized Engagement Score
    engagementVelocity: number;
    controversyFactor: number;
    ageHours: number;

    // Metadata
    sourceUrl: string;
    permalink: string;
    fetchedAt: Date;
}

/**
 * Content categories for filtering trends
 */
export type ContentCategory =
    | 'technology'
    | 'finance'
    | 'entertainment'
    | 'gaming'
    | 'lifestyle'
    | 'news'
    | 'drama'
    | 'sports'
    | 'science'
    | 'other';

/**
 * Subreddit configuration for category mapping
 */
export interface SubredditConfig {
    name: string;
    category: ContentCategory;
    tier: 1 | 2 | 3;  // Polling frequency tier
    baselineScore: number;  // Average post score for normalization
    subscribers: number;
}

/**
 * Time range for trend queries
 */
export type TimeRange = 'hour' | 'day' | 'week' | 'month';

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

/**
 * Trend query parameters
 */
export interface TrendQuery {
    category?: ContentCategory;
    timeRange: TimeRange;
    limit?: number;
    minScore?: number;
    sortBy?: 'nes' | 'score' | 'velocity' | 'comments';
}

/**
 * Aggregated trend summary
 */
export interface TrendSummary {
    topTrends: TrendData[];
    categoryBreakdown: Record<ContentCategory, number>;
    totalProcessed: number;
    avgEngagementVelocity: number;
    fetchedAt: Date;
}
