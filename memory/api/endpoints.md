# API Contracts - Endpoints

> **Son Güncelleme**: 22 Ocak 2026

Bu dosya, tüm REST API endpoint'lerinin kontratlarını tanımlar.

---

## Base Configuration

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **Response Format**: `{ success: boolean, data?: T, error?: string, timestamp: string }`

---

## Core Endpoints

### GET /api/trends

Trend listesi döner.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | - | Filter by category |
| `subreddit` | string | - | Filter by specific subreddit |
| `timeRange` | `hour\|day\|week\|month` | `day` | Time range |
| `limit` | number | 20 | Max results |
| `minScore` | number | - | Minimum Reddit score |
| `sortBy` | `nes\|score\|velocity\|comments` | `nes` | Sort field |
| `sortType` | `hot\|rising\|top\|new` | `hot` | Reddit sort type |
| `bypass` | boolean | false | Bypass cache |

**Response Headers:**
- `X-Cache`: `HIT` | `MISS` | `BYPASS`
- `X-Response-Time`: e.g., `150ms`

**Response:**
```typescript
interface TrendData {
    id: string;
    title: string;
    subreddit: string;
    category: ContentCategory;
    score: number;
    upvoteRatio: number;
    numComments: number;
    createdUtc: number;
    nes: number;
    engagementVelocity: number;
    controversyFactor: number;
    ageHours: number;
    sourceUrl: string;
    permalink: string;
    fetchedAt: Date;
}
```

---

### GET /api/trends/summary

Trend özeti döner.

**Response:**
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

### GET /api/categories

Mevcut kategorileri döner.

**Response:**
```typescript
interface Category {
    id: string;
    label: string;  // Turkish label
    subredditCount: number;
    videoFormats: string[];
}
```

---

### GET /api/subreddits

Subreddit konfigürasyonlarını döner.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category |

**Response:**
```typescript
interface Subreddit {
    name: string;
    category: ContentCategory;
    tier: 1 | 2 | 3;
    subscribers: number;
    baselineScore: number;
}
```

---

### GET /api/status

Engine durumu döner.

**Response:**
```typescript
interface EngineStatus {
    rateLimit: RateLimitStatus;
    cache: {
        totalEntries: number;
        hitRate: string;
        totalHits: number;
        expiredCount: number;
        dbSizeKB: number;
    };
    subreddits: {
        total: number;
        tier1: number;
        tier2: number;
        tier3: number;
    };
    method: string;
}
```

---

### GET /api/health

Health check endpoint.

**Response:**
```typescript
{
    status: 'ok' | 'degraded';
    timestamp: string;
    version: string;
    rateLimit: RateLimitStatus;
    cache: CacheStats;
}
```

---

## Cache Management

### POST /api/cache/invalidate

Cache'i invalidate eder.

**Request Body:**
```typescript
{
    all?: boolean;        // Invalidate everything
    prefix?: string;      // Invalidate by prefix (e.g., 'trends')
    category?: string;    // Invalidate by category
}
```

---

### POST /api/cache/cleanup

Expired cache entry'leri temizler.

**Response:**
```typescript
{ success: true, deleted: number }
```

---

## Worker Management

> **Note**: Bu endpoint'ler sadece `--with-worker` mode'da aktif.

### GET /api/worker/status

Worker durumu döner.

### POST /api/worker/start

Worker polling'i başlatır.

### POST /api/worker/stop

Worker polling'i durdurur.

### POST /api/worker/force-run/:tier

Belirtilen tier'ı hemen poll eder.

---

## AI Content Generation

### POST /api/generate-script

AI ile video scripti üretir.

**Request Body:**
```typescript
{
    trend: TrendData;
    options?: {
        format?: VideoFormat;
        durationSeconds?: number;  // 15-180
        platform?: 'tiktok' | 'reels' | 'shorts' | 'all';
        tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
        language?: 'en' | 'tr';
        includeCta?: boolean;
        includeHook?: boolean;
    };
}
```

**Response:**
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

### GET /api/ai/status

AI servis durumunu döner.

**Response:**
```typescript
{
    configured: boolean;
    rateLimit: {
        requestsInLastMinute: number;
        maxRequestsPerMinute: number;
        isLimited: boolean;
        backoffRemainingMs: number;
    };
}
```

---

### GET /api/ai/formats/:category

Kategori için mevcut video formatlarını döner.

**Response:**
```typescript
{
    category: string;
    formats: VideoFormat[];
}
```
