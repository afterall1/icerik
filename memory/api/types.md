# Shared Types Contract

> **Package**: `@icerik/shared`  
> **Location**: `packages/shared/src/types.ts`  
> **Son Güncelleme**: 24 Ocak 2026

---

## Content Category

```typescript
type ContentCategory =
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
```

---

## Reddit Post (Raw)

```typescript
interface RedditPost {
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
```

---

## Trend Data (Processed)

```typescript
interface TrendData {
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
```

---

## Subreddit Config

```typescript
interface SubredditConfig {
    name: string;
    category: ContentCategory;
    tier: 1 | 2 | 3;  // Polling frequency tier
    baselineScore: number;  // Average post score for normalization
    subscribers: number;
}
```

---

## Time Range

```typescript
type TimeRange = 'hour' | 'day' | 'week' | 'month';
```

---

## API Response Wrapper

```typescript
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}
```

---

## Trend Query

```typescript
interface TrendQuery {
    category?: ContentCategory;
    timeRange: TimeRange;
    limit?: number;
    minScore?: number;
    sortBy?: 'nes' | 'score' | 'velocity' | 'comments';
}
```

---

## Trend Summary

```typescript
interface TrendSummary {
    topTrends: TrendData[];
    categoryBreakdown: Record<ContentCategory, number>;
    totalProcessed: number;
    avgEngagementVelocity: number;
    fetchedAt: Date;
}
```

---

## Video Format (AI Module)

```typescript
type VideoFormat = 
    | 'Explainer'
    | 'News Commentary'
    | 'Review'
    | 'Hot Take'
    | 'Analysis'
    | 'Recreation'
    | 'Commentary'
    | 'Reaction'
    | 'Tips'
    | 'How-To'
    | 'Story-time'
    | 'Highlights'
    | 'Deep Dive';
```

---

## Script Options (AI Module)

```typescript
interface ScriptOptions {
    format: VideoFormat;
    durationSeconds: number;  // 15-180
    platform: 'tiktok' | 'reels' | 'shorts' | 'all';
    tone: 'casual' | 'professional' | 'humorous' | 'dramatic';
    language: 'en' | 'tr';
    includeCta: boolean;
    includeHook: boolean;
}
```

---

## Generated Script (AI Module)

```typescript
interface GeneratedScript {
    script: string;
    title: string;
    hashtags: string[];
    estimatedDurationSeconds: number;
    sections: {
        hook?: string;
        body: string;
        cta?: string;
    };
    metadata: {
        format: VideoFormat;
        platform: string;
        generatedAt: string;
        trendId: string;
        category: ContentCategory;
    };
}
```

---

## Trend Type (Phase 14)

```typescript
type TrendType =
    | 'controversy'    // Hot takes, debates, divisive opinions
    | 'breaking_news'  // Time-sensitive, just happened
    | 'tutorial'       // How-to, step-by-step, tips
    | 'story'          // Personal narrative, TIFU, relationship drama
    | 'review'         // Product/media reviews, ratings
    | 'discussion'     // Open-ended community discussions
    | 'meme'           // Humor, jokes, viral moments
    | 'announcement';  // Official releases, launches
```

---

## Content Format (Phase 14)

```typescript
type ContentFormat =
    | 'hot_take'       // Bold statement + defense
    | 'urgency'        // Time-sensitive hook + facts
    | 'step_by_step'   // Numbered list structure
    | 'narrative_arc'  // Story with tension + resolution
    | 'comparison'     // Pros/cons, before/after
    | 'reaction'       // Opinion + audience engagement
    | 'entertainment'; // Pure fun, humor-first
```

---

## Trend Classification (Phase 14)

```typescript
interface TrendClassification {
    trendType: TrendType;
    confidence: number;         // 0-1 confidence score
    recommendedFormat: ContentFormat;
    formatRationale: string;    // Why this format was recommended
    keywords: string[];         // Detected classification keywords
}
```

---

## Algorithm Score (Phase 14)

```typescript
interface AlgorithmScore {
    hookStrength: number;           // 0-100
    completionPotential: number;    // 0-100
    engagementTriggers: number;     // 0-100
    platformOptimization: number;   // 0-100
    loopPotential: number;          // 0-100
    overallScore: number;           // 0-100
    breakdown: {
        metric: string;
        score: number;
        feedback: string;
    }[];
    improvements: string[];
}
```

---

## Variant Style (Phase 15)

```typescript
type VariantStyle =
    | 'high_energy'    // Fast-paced, quick cuts, dynamic
    | 'story_driven'   // Narrative arc, emotional journey
    | 'controversial'  // Debate-starter, hot take, opinion
    | 'educational'    // Explainer, tutorial, informative
    | 'reaction';      // Reaction-style, commentary, humor
```

---

## Iteration Target (Phase 15)

```typescript
type IterationTarget =
    | 'hook'        // Just the hook
    | 'body'        // Just the body  
    | 'cta'         // Just the CTA
    | 'title'       // Just the title
    | 'hashtags'    // Just hashtags
    | 'shorten'     // Make 20% shorter
    | 'lengthen'    // Make 20% longer
    | 'change_tone' // Change tone
    | 'add_hooks';  // Add more re-hooks
```

---

## Script Variant (Phase 15)

```typescript
interface ScriptVariant<TScript = unknown> {
    variantId: string;
    style: VariantStyle;
    script: TScript;
    algorithmScore?: AlgorithmScore;
    differentiator: string;
}
```

---

## Iteration Result (Phase 15)

```typescript
interface IterationResult<TScript = unknown> {
    updatedScript: TScript;
    changedSections: string[];
    metadata: {
        iterationType: IterationTarget;
        tokensUsed: number;
        durationMs: number;
    };
}
```

