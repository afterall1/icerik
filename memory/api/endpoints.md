# API Contracts - Endpoints

> **Son Güncelleme**: 24 Ocak 2026

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

---

### GET /api/trends/summary

Trend özeti döner.

---

### GET /api/categories

Mevcut kategorileri döner.

---

### GET /api/subreddits

Subreddit konfigürasyonlarını döner.

---

### GET /api/status

Engine durumu döner.

---

### GET /api/health

Health check endpoint.

---

## Cache Management

### POST /api/cache/invalidate

Cache'i invalidate eder.

### POST /api/cache/cleanup

Expired cache entry'leri temizler.

---

## Worker Management

### GET /api/worker/status
### POST /api/worker/start
### POST /api/worker/stop
### POST /api/worker/force-run/:tier

---

## AI Content Generation

### POST /api/generate-script

Single platform script generation.

---

### POST /api/generate-scripts (Phase 11)

Multi-platform script generation with platform agents.

**Request Body:**
```typescript
{
    trend: TrendData;
    platforms?: ('tiktok' | 'reels' | 'shorts')[]; // Default: all
    options?: {
        durationSeconds?: number;
        tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
        language?: 'tr' | 'en';
        includeCta?: boolean;
        includeHook?: boolean;
    };
}
```

**Response:**
```typescript
{
    success: boolean;
    data: {
        trend: TrendData;
        scripts: PlatformScript[];
        errors: { platform: string; error: string }[];
        summary: ComparisonSummary;
    };
}
```

---

### POST /api/generate-scripts/retry (Phase 11)

Retry failed platform generations from a previous result.

**Request Body:**
```typescript
{
    previousResult: GenerationResult;
    options?: {
        durationSeconds?: number;
        tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
        language?: 'en' | 'tr';
    };
}
```

---

### GET /api/platforms (Phase 11)

List all available platforms and their capabilities.

**Response:**
```typescript
{
    success: boolean;
    data: {
        id: Platform;
        label: string;
        algorithmFocus: PlatformAlgorithmFocus;
        colors: { primary: string; gradient: string };
    }[];
}
```

---

### GET /api/platforms/:platform/tips (Phase 11)

Get platform-specific optimization tips.

**Response:**
```typescript
{
    success: boolean;
    data: {
        platform: Platform;
        label: string;
        algorithmFocus: PlatformAlgorithmFocus;
        tips: string[];
    };
}
```

---

### GET /api/ai/status

AI servis durumunu döner.

---

### GET /api/ai/formats/:category

Kategori için mevcut video formatlarını döner.

---

## Trend Intelligence (Phase 14)

### POST /api/trends/:id/classify

Trend'i sınıflandır ve format önerileri al.

**Response:**
```typescript
{
    classification: {
        trendType: TrendType;
        confidence: number;
        recommendedFormats: ContentFormat[];
        signals: { type: string; weight: number }[];
    };
}
```

---

### POST /api/scripts/score

Script'in viral potansiyelini skorla.

**Request Body:**
```typescript
{
    script: PlatformScript;
    trend?: TrendData;
}
```

**Response:**
```typescript
{
    score: {
        hookStrength: { score: number; details: string[] };
        completionPotential: { score: number; details: string[] };
        engagementTriggers: { score: number; details: string[] };
        platformOptimization: { score: number; details: string[] };
        loopPotential: { score: number; details: string[] };
        overall: number;
        improvements: string[];
    };
}
```

---

## AI Quality Enhancement (Phase 15)

### GET /api/ai/metrics

AI operasyon metriklerini döner.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `since` | string (ISO) | Filter by start time |
| `platform` | string | Filter by platform |
| `operation` | string | Filter by operation type |

**Response:**
```typescript
{
    summary: {
        totalOperations: number;
        avgLatencyMs: number;
        avgQualityScore: number;
        cacheHitRate: number;
        totalTokensUsed: number;
        byPlatform: Record<string, { count: number; avgLatency: number }>;
        byOperation: Record<string, { count: number; avgLatency: number }>;
    };
}
```

---

### POST /api/scripts/iterate

Script'in belirli bölümünü yeniden üret.

**Request Body:**
```typescript
{
    script: PlatformScript;
    target: 'hook' | 'body' | 'cta' | 'title' | 'hashtags' | 'shorten' | 'lengthen' | 'change_tone' | 'add_hooks';
    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    additionalInstructions?: string;
}
```

**Response:**
```typescript
{
    iteration: {
        originalScript: PlatformScript;
        updatedScript: PlatformScript;
        target: string;
        changes: string[];
    };
}
```

---

### POST /api/generate-script-variants

A/B varyant scriptler üret.

**Request Body:**
```typescript
{
    trend: TrendData;
    options: MultiPlatformOptions;
    variantOptions: {
        styles?: ('high_energy' | 'story_driven' | 'controversial' | 'educational' | 'reaction')[];
        platform?: 'tiktok' | 'reels' | 'shorts';
        countPerStyle?: number;
        includeScoring?: boolean;
    };
}
```

**Response:**
```typescript
{
    variants: {
        variantId: string;
        style: string;
        script: PlatformScript;
        algorithmScore?: AlgorithmScore;
        differentiator: string;
    }[];
}
```

