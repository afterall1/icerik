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

/**
 * Trend content types based on structural analysis
 */
export type TrendType =
    | 'controversy'    // Hot takes, debates, divisive opinions
    | 'breaking_news'  // Time-sensitive, just happened
    | 'tutorial'       // How-to, step-by-step, tips
    | 'story'          // Personal narrative, TIFU, relationship drama
    | 'review'         // Product/media reviews, ratings
    | 'discussion'     // Open-ended community discussions
    | 'meme'           // Humor, jokes, viral moments
    | 'announcement';  // Official releases, launches

/**
 * Recommended content format based on trend type
 */
export type ContentFormat =
    | 'hot_take'       // Bold statement + defense
    | 'urgency'        // Time-sensitive hook + facts
    | 'step_by_step'   // Numbered list structure
    | 'narrative_arc'  // Story with tension + resolution
    | 'comparison'     // Pros/cons, before/after
    | 'reaction'       // Opinion + audience engagement
    | 'entertainment'; // Pure fun, humor-first

/**
 * Trend classification result
 */
export interface TrendClassification {
    trendType: TrendType;
    confidence: number;         // 0-1 confidence score
    recommendedFormat: ContentFormat;
    formatRationale: string;    // Why this format was recommended
    keywords: string[];         // Detected classification keywords
}

/**
 * Algorithm-driven script scoring
 */
export interface AlgorithmScore {
    /** Hook strength - attention grabbing potential (0-100) */
    hookStrength: number;
    /** Completion potential - will viewers watch to end (0-100) */
    completionPotential: number;
    /** Engagement triggers - comment/share bait effectiveness (0-100) */
    engagementTriggers: number;
    /** Platform optimization - algorithm compliance (0-100) */
    platformOptimization: number;
    /** Loop potential - rewatchability (0-100) */
    loopPotential: number;
    /** Overall viral score (0-100) */
    overallScore: number;
    /** Detailed breakdown */
    breakdown: {
        metric: string;
        score: number;
        feedback: string;
    }[];
    /** Improvement suggestions */
    improvements: string[];
}

/**
 * Extended TrendData with classification
 */
export interface ClassifiedTrend extends TrendData {
    classification?: TrendClassification;
}

// ============================================================
// Phase 15: AI Quality Enhancement Types
// ============================================================

/**
 * Re-hook point type - pattern interrupts within script
 */
export type ReHookType =
    | 'question'    // Engage curiosity ("But here's the twist...")
    | 'reveal'      // Maintain attention ("Wait for this...")
    | 'twist'       // Pattern break ("Actually, it gets worse")
    | 'callback'    // Reward retention ("Remember what I said?")
    | 'visual_cue'; // Visual interrupt [ZOOM], [CUT], [TEXT]

/**
 * Re-hook point in script - pattern interrupts every 3-5 seconds
 */
export interface ReHookPoint {
    /** Position in script (seconds from start) */
    position: number;
    /** Re-hook content */
    content: string;
    /** Type of pattern interrupt */
    type: ReHookType;
    /** Visual indicator suggestion */
    visualCue?: string;
}

/**
 * Script variant styles for A/B testing
 */
export type VariantStyle =
    | 'high_energy'    // Fast-paced, quick cuts, dynamic
    | 'story_driven'   // Narrative arc, emotional journey
    | 'controversial'  // Debate-starter, hot take, opinion
    | 'educational'    // Explainer, tutorial, informative
    | 'reaction';      // Reaction-style, commentary, humor

/**
 * Iteration target - which part to regenerate
 */
export type IterationTarget =
    | 'hook'        // Just the hook
    | 'body'        // Just the body  
    | 'cta'         // Just the CTA
    | 'title'       // Just the title
    | 'hashtags'    // Just hashtags
    | 'shorten'     // Make 20% shorter
    | 'lengthen'    // Make 20% longer
    | 'change_tone' // Change tone
    | 'add_hooks';  // Add more re-hooks

/**
 * Enhanced script sections with re-hooks
 */
export interface EnhancedScriptSections {
    hook: string;
    body: string;
    cta?: string;
    reHooks: ReHookPoint[];
}

/**
 * Script variant result (generic version)
 * Use ScriptVariantWithScript from platformTypes.ts for full type safety
 */
export interface ScriptVariant<TScript = unknown> {
    /** Unique variant identifier */
    variantId: string;
    /** Variant style */
    style: VariantStyle;
    /** Generated script */
    script: TScript;
    /** Algorithm score (if calculated) */
    algorithmScore?: AlgorithmScore;
    /** What makes this variant unique */
    differentiator: string;
}

/**
 * Variant generation options
 */
export interface VariantGenerationOptions {
    /** Variant styles to generate */
    styles: VariantStyle[];
    /** Duration in seconds */
    durationSeconds?: number;
    /** Tone of the content */
    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    /** Language */
    language?: 'en' | 'tr';
    /** Calculate algorithm scores for each */
    calculateScores?: boolean;
}

/**
 * Iteration request (generic version)
 * Use IterationRequestWithScript from platformTypes.ts for full type safety
 */
export interface IterationRequest<TScript = unknown> {
    /** Original script to iterate on */
    originalScript: TScript;
    /** Target section to regenerate */
    target: IterationTarget;
    /** New tone (if target is change_tone) */
    newTone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    /** Additional instructions for AI */
    additionalInstructions?: string;
}

/**
 * Iteration result (generic version)
 * Use IterationResultWithScript from platformTypes.ts for full type safety
 */
export interface IterationResult<TScript = unknown> {
    /** Updated script with changes */
    updatedScript: TScript;
    /** Which sections were changed */
    changedSections: string[];
    /** Iteration metadata */
    metadata: {
        iterationType: IterationTarget;
        tokensUsed: number;
        durationMs: number;
    };
}

