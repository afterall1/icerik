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

---

## 7. Observatory Endpoints

**Phase 19**

### GET /api/observatory/metrics

Proje metrikleri döner.

**Response:**
```typescript
{
    version: string;
    projectName: string;
    totalPhases: number;
    completedPhases: number;
    totalEndpoints: number;
    totalPlatforms: number;
    totalCategories: number;
    totalSubreddits: number;
    knowledgeFiles: number;
    lastUpdate: string;
    autoUpdated: boolean;
}
```

---

### GET /api/observatory/prompts

AI prompt envanteri döner.

**Response:**
```typescript
{
    knowledgePrompts: {
        id: string;
        name: string;
        category: 'platform' | 'content-pattern';
        description: string;
        content: string;
        source: string;
        wordCount: number;
    }[];
    embeddedPrompts: {
        id: string;
        name: string;
        type: 'category' | 'tone' | 'language' | 'few-shot';
        entries: { key: string; value: string }[];
    }[];
    summary: {
        totalKnowledgeFiles: number;
        totalEmbeddedTypes: number;
        totalWords: number;
    };
    autoUpdated: boolean;
}
```

---

### GET /api/observatory/endpoints

API endpoint kataloğu döner (auto-updated from endpoints.md).

**Response:**
```typescript
{
    endpoints: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        path: string;
        description: string;
        phase: number;
        category: string;
    }[];
    grouped: Record<string, Endpoint[]>;
    summary: {
        total: number;
        byCategory: Record<string, number>;
    };
    autoUpdated: boolean;
}
```

---

### GET /api/observatory/architecture

Mimari dokümantasyonu döner (auto-updated from memory/architecture/).

**Response:**
```typescript
{
    systems: {
        name: string;
        description: string;
        docFile: string;
        status: 'active' | 'planned';
    }[];
    adrs: {
        id: string;
        title: string;
        status: 'accepted' | 'deprecated' | 'proposed';
        summary: string;
    }[];
    components: {
        backend: string[];
        frontend: string[];
        shared: string[];
    };
    autoUpdated: boolean;
}
```

---

### GET /api/observatory/roadmap

Roadmap ve faz durumları döner (auto-updated from roadmap.md).

**Response:**
```typescript
{
    phases: {
        phase: number;
        name: string;
        status: 'complete' | 'in-progress' | 'planned';
        features: string[];
    }[];
    futureIdeas: string[];
    summary: {
        totalPhases: number;
        completed: number;
        inProgress: number;
        completionPercentage: number;
    };
    autoUpdated: boolean;
}
```

---

## 8. Image Discovery Endpoints (Phase 21)

### GET /api/images/search

Query parametresi ile görsel arama.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | - | Arama sorgusu (zorunlu) |
| `count` | number | 6 | Sonuç sayısı (max 12) |
| `validate` | boolean | true | Gemini ile metin kontrolü |

**Response:**
```typescript
{
    query: string;
    images: ValidatedImage[];
    totalFound: number;
    validCount: number;
    invalidCount: number;
    cachedAt?: number;
}
```

---

### POST /api/images/search-for-content

Trend/script içeriğine göre görsel arama.

**Request Body:**
```typescript
{
    title: string;       // Trend başlığı (zorunlu)
    category?: string;   // Kategori
    hookContent?: string; // Script hook'u
    count?: number;      // Sonuç sayısı (default: 6)
    validate?: boolean;  // Metin kontrolü (default: true)
}
```

---

### POST /api/images/validate

Tek görselde metin kontrolü.

**Request Body:**
```typescript
{
    imageUrl: string;    // Görsel URL'i (zorunlu)
}
```

**Response:**
```typescript
{
    imageUrl: string;
    isClean: boolean;
    hasText: boolean;
    hasOverlay: boolean;
    confidenceScore: number;
    detectedElements: string[];
}
```

---

### GET /api/images/suggestions/:category

Kategori için arama önerileri.

**Response:**
```typescript
{
    category: string;
    suggestions: string[];
}
```

---

### GET /api/images/status

Image servis durumu.

**Response:**
```typescript
{
    configured: boolean;
    cache: {
        size: number;
        hits: number;
        misses: number;
    };
}
```

---

## 9. Voice Generation Endpoints (Phase 24)

### POST /api/voice/generate

TTS ile metin-ses dönüşümü.

**Request Body:**
```typescript
{
    text: string;              // Seslendirilecek metin (zorunlu, max 10000 char)
    voiceId: string;           // Ses ID'si (zorunlu)
    provider?: 'elevenlabs' | 'fishaudio';  // TTS sağlayıcı
    settings?: {
        stability?: number;     // 0-1, ses tutarlılığı
        similarityBoost?: number; // 0-1, ses benzerliği
        speed?: number;         // Konuşma hızı
        style?: number;         // 0-1, stil yoğunluğu
    };
    format?: 'mp3' | 'wav' | 'ogg';  // Çıktı formatı (default: mp3)
}
```

**Response:** Binary audio stream

**Response Headers:**
- `Content-Type`: `audio/mpeg` | `audio/wav` | `audio/ogg`
- `X-Voice-Provider`: Kullanılan sağlayıcı
- `X-Audio-Duration`: Ses süresi (saniye)
- `X-Characters-Used`: Kullanılan karakter sayısı

---

### GET /api/voice/status

TTS sağlayıcı durumu ve kota bilgisi.

**Response:**
```typescript
{
    providers: {
        elevenlabs: {
            configured: boolean;
            voices: Array<{
                voiceId: string;
                name: string;
                category: string;
                previewUrl?: string;
            }>;
        };
        fishaudio: {
            configured: boolean;
            voices: Array<{ ... }>;
        };
    };
    cache: {
        totalEntries: number;
        hitRate: number;
        sizeBytes: number;
    };
}
```

---

### GET /api/voice/preview/:voiceId

Ses önizleme - 7 gün cache ile base64 data URL.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `provider` | `'elevenlabs' \| 'fishaudio'` | Sağlayıcı seçimi |

**Response:**
```typescript
{
    audio: string;   // "data:audio/mpeg;base64,..." format
    cached: boolean; // Cache'den mi geldi
}
```

---

### POST /api/voice/cache/clear

Ses cache'ini temizle.

**Response:**
```typescript
{
    deleted: number;  // Silinen kayıt sayısı
}
```

---

## Video Generation (Phase 26)

### POST /api/video/generate

Video üretimi başlat.

**Request Body:**
```typescript
{
    id?: string;                      // Optional job ID
    platform: 'tiktok' | 'reels' | 'shorts';
    title: string;
    script: {
        hook: string;
        body: string;
        cta: string;
    };
    images: {
        hook: string[];               // Hook için görsel paths
        body: string[];               // Body için görsel paths
        cta: string[];                // CTA için görsel paths
    };
    audio: {
        voiceoverPath: string;        // TTS ses dosyası path
        voiceoverDuration: number;    // Ses süresi (saniye)
        backgroundMusicPath?: string; // Opsiyonel arka plan müziği
    };
    options?: {
        captionStyle?: 'hormozi' | 'classic' | 'minimal';
        transitionStyle?: 'smooth' | 'dynamic' | 'minimal';
        kenBurnsEnabled?: boolean;
        backgroundMusicVolume?: number;  // 0-1, default 0.15
        audioDucking?: boolean;          // default true
    };
}
```

**Response:**
```typescript
{
    success: boolean;
    jobId: string;
    outputPath?: string;      // Video output path (if success)
    duration?: number;        // Video duration in seconds
    fileSize?: number;        // Output file size in bytes
    processingTimeMs: number; // Total processing time
    error?: string;           // Error message (if failed)
}
```

---

### GET /api/video/status/:jobId

Video üretim durumu.

**Response:**
```typescript
{
    jobId: string;
    status: 'queued' | 'building-timeline' | 'generating-captions' | 
            'composing-video' | 'encoding' | 'complete' | 'failed';
    progress: number;     // 0-100
    currentStep: string;  // Human-readable step description
}
```

---

### GET /api/video/jobs

Tüm video job'larını listele.

**Response:**
```typescript
{
    data: Array<{
        jobId: string;
        status: VideoJobStatus;
        progress: number;
        currentStep: string;
    }>;
}
```

---

### POST /api/video/jobs/cleanup

Tamamlanmış job'ları temizle.

**Response:**
```typescript
{
    cleaned: number;  // Silinen job sayısı
}
```

