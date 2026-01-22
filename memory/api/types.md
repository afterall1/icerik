# Shared Types Contract

> **Package**: `@icerik/shared`  
> **Location**: `packages/shared/src/types.ts`  
> **Son Güncelleme**: 22 Ocak 2026

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
