const API_BASE = '/api';

export interface Category {
    id: string;
    label: string;
    subredditCount: number;
    videoFormats: string[];
}

export interface Subreddit {
    name: string;
    category: string;
    tier: 1 | 2 | 3;
    subscribers: number;
    baselineScore: number;
}

export interface TrendData {
    id: string;
    title: string;
    subreddit: string;
    category: string;
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
    fetchedAt: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

export interface RateLimitStatus {
    requestsInLastMinute: number;
    backoffMultiplier: number;
    consecutiveErrors: number;
    isHealthy: boolean;
}

export interface EngineStatus {
    rateLimit: RateLimitStatus;
    subredditCount: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    method: string;
}

class ApiClient {
    private async fetchJson<T>(url: string): Promise<T> {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data: ApiResponse<T> = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown API error');
        }

        return data.data as T;
    }

    async getCategories(): Promise<Category[]> {
        return this.fetchJson<Category[]>(`${API_BASE}/categories`);
    }

    async getSubreddits(category?: string): Promise<Subreddit[]> {
        const params = category ? `?category=${category}` : '';
        return this.fetchJson<Subreddit[]>(`${API_BASE}/subreddits${params}`);
    }

    async getTrends(options: {
        category?: string;
        subreddit?: string;
        sortType?: string;
        timeRange?: string;
        minUpvotes?: number;
        minComments?: number;
        limit?: number;
    }): Promise<TrendData[]> {
        const params = new URLSearchParams();

        if (options.category) params.set('category', options.category);
        if (options.subreddit) params.set('subreddit', options.subreddit);
        if (options.sortType) params.set('sortBy', options.sortType);
        if (options.timeRange) params.set('timeRange', options.timeRange);
        if (options.minUpvotes) params.set('minScore', options.minUpvotes.toString());
        if (options.minComments) params.set('minComments', options.minComments.toString());
        if (options.limit) params.set('limit', options.limit.toString());

        return this.fetchJson<TrendData[]>(`${API_BASE}/trends?${params.toString()}`);
    }

    async getStatus(): Promise<EngineStatus> {
        return this.fetchJson<EngineStatus>(`${API_BASE}/status`);
    }

    async getHealth(): Promise<{ status: string; rateLimit: RateLimitStatus }> {
        return this.fetchJson<{ status: string; rateLimit: RateLimitStatus }>(`${API_BASE}/health`);
    }
}

/**
 * Video format types for script generation
 */
export type VideoFormat =
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

/**
 * Script generation options
 */
export interface ScriptOptions {
    format: VideoFormat;
    durationSeconds: number;
    platform: 'tiktok' | 'reels' | 'shorts' | 'all';
    tone: 'casual' | 'professional' | 'humorous' | 'dramatic';
    language: 'en' | 'tr';
    includeCta: boolean;
    includeHook: boolean;
}

/**
 * Generated script response
 */
export interface GeneratedScript {
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
        category: string;
    };
}

/**
 * AI service status
 */
export interface AIStatus {
    configured: boolean;
    rateLimit: {
        requestsInLastMinute: number;
        maxRequestsPerMinute: number;
        isLimited: boolean;
        backoffRemainingMs: number;
    };
}

/**
 * Script generation request payload
 */
export interface GenerateScriptRequest {
    trend: TrendData;
    options?: Partial<ScriptOptions>;
}

export const api = new ApiClient();

/**
 * Extended API client for AI operations
 */
export const aiApi = {
    /**
     * Generate a video script from a trend
     */
    async generateScript(request: GenerateScriptRequest): Promise<GeneratedScript> {
        const response = await fetch(`${API_BASE}/generate-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Script generation failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<GeneratedScript> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Script generation failed');
        }

        return data.data as GeneratedScript;
    },

    /**
     * Get AI service status
     */
    async getStatus(): Promise<AIStatus> {
        const response = await fetch(`${API_BASE}/ai/status`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse<AIStatus> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get AI status');
        }

        return data.data as AIStatus;
    },

    /**
     * Get available video formats for a category
     */
    async getFormatsForCategory(category: string): Promise<VideoFormat[]> {
        const response = await fetch(`${API_BASE}/ai/formats/${category}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse<{ formats: VideoFormat[] }> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get formats');
        }

        return data.data?.formats || [];
    },
};

// ============================================================
// Multi-Platform Script Generation Types
// ============================================================

/**
 * Platform types for multi-platform generation
 */
export type Platform = 'tiktok' | 'reels' | 'shorts';

/**
 * All available platforms
 */
export const ALL_PLATFORMS: Platform[] = ['tiktok', 'reels', 'shorts'];

/**
 * Platform display labels
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
    tiktok: 'TikTok',
    reels: 'Instagram Reels',
    shorts: 'YouTube Shorts',
};

/**
 * Platform brand colors for UI theming
 */
export const PLATFORM_COLORS: Record<Platform, { primary: string; gradient: string }> = {
    tiktok: { primary: '#000000', gradient: 'from-black to-pink-600' },
    reels: { primary: '#E4405F', gradient: 'from-pink-500 to-purple-600' },
    shorts: { primary: '#FF0000', gradient: 'from-red-600 to-red-800' },
};

/**
 * Platform icons for UI
 */
export const PLATFORM_ICONS: Record<Platform, string> = {
    tiktok: '🎵',
    reels: '📸',
    shorts: '▶️',
};

/**
 * Script section with metadata
 */
export interface PlatformScriptSection {
    content: string;
    wordCount: number;
    estimatedSeconds: number;
}

/**
 * Platform-specific generated script
 */
export interface PlatformScript {
    platform: Platform;
    script: string;
    title: string;
    hashtags: string[];
    estimatedDurationSeconds: number;
    sections: {
        hook?: PlatformScriptSection;
        body: PlatformScriptSection;
        cta?: PlatformScriptSection;
    };
    optimizations: string[];
    /** Warnings about script quality (e.g., truncation, missing sections) */
    warnings?: string[];
    metadata: {
        generatedAt: string;
        trendId: string;
        category: string;
        agentVersion: string;
    };
}


/**
 * Individual platform result (success or failure)
 */
export type PlatformScriptResult =
    | { success: true; script: PlatformScript }
    | { success: false; error: string; retryable: boolean };

/**
 * Platform comparison summary
 */
export interface PlatformComparisonSummary {
    platformSummaries: Array<{
        platform: Platform;
        status: 'success' | 'failed';
        estimatedDuration?: number;
        optimizations?: string[];
        error?: string;
    }>;
    recommendation: string;
}

/**
 * Multi-platform generation result
 */
export interface MultiPlatformResult {
    trend: TrendData;
    results: {
        tiktok?: PlatformScriptResult;
        reels?: PlatformScriptResult;
        shorts?: PlatformScriptResult;
    };
    metadata: {
        requestedAt: string;
        completedAt: string;
        totalDurationMs: number;
        successCount: number;
        failureCount: number;
    };
    summary: PlatformComparisonSummary;
}

/**
 * Multi-platform generation options
 */
export interface MultiPlatformOptions {
    platforms?: Platform[];
    durationSeconds?: number;
    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    language?: 'en' | 'tr';
    includeCta?: boolean;
    includeHook?: boolean;
}

/**
 * Multi-platform generation request
 */
export interface MultiPlatformRequest {
    trend: TrendData;
    platforms?: Platform[];
    options?: MultiPlatformOptions;
}

/**
 * Platform info from API
 */
export interface PlatformInfo {
    id: Platform;
    label: string;
    algorithmFocus: {
        primaryMetrics: string[];
        optimalDuration: { min: number; max: number; ideal: number };
        hookTiming: { criticalSeconds: number; description: string };
        loopStrategy: { recommended: boolean; description: string };
        ctaGuidance: string;
        hashtagStrategy: { count: { min: number; max: number }; style: string };
    };
    colors: { primary: string; secondary: string };
}

/**
 * Platform tips response
 */
export interface PlatformTips {
    platform: Platform;
    label: string;
    algorithmFocus: PlatformInfo['algorithmFocus'];
    tips: string[];
}

/**
 * Multi-Platform API client
 */
export const multiPlatformApi = {
    /**
     * Generate scripts for multiple platforms simultaneously
     */
    async generateScripts(request: MultiPlatformRequest): Promise<MultiPlatformResult> {
        const response = await fetch(`${API_BASE}/generate-scripts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Multi-platform generation failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<MultiPlatformResult> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Multi-platform generation failed');
        }

        return data.data as MultiPlatformResult;
    },

    /**
     * Retry failed platform generations
     */
    async retryFailed(previousResult: MultiPlatformResult, options?: MultiPlatformOptions): Promise<MultiPlatformResult> {
        const response = await fetch(`${API_BASE}/generate-scripts/retry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previousResult, options }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Retry failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<MultiPlatformResult> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Retry failed');
        }

        return data.data as MultiPlatformResult;
    },

    /**
     * Get all platforms with their capabilities
     */
    async getPlatforms(): Promise<PlatformInfo[]> {
        const response = await fetch(`${API_BASE}/platforms`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse<PlatformInfo[]> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get platforms');
        }

        return data.data as PlatformInfo[];
    },

    /**
     * Get optimization tips for a specific platform
     */
    async getPlatformTips(platform: Platform): Promise<PlatformTips> {
        const response = await fetch(`${API_BASE}/platforms/${platform}/tips`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse<PlatformTips> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get platform tips');
        }

        return data.data as PlatformTips;
    },
};

// ============================================================
// Trend Classification Types (Phase 14)
// ============================================================

/**
 * Content types for trend classification
 */
export type TrendType =
    | 'controversy'
    | 'breaking_news'
    | 'tutorial'
    | 'story'
    | 'review'
    | 'discussion'
    | 'meme'
    | 'announcement';

/**
 * Recommended content formats
 */
export type ContentFormat =
    | 'hot_take'
    | 'urgency'
    | 'step_by_step'
    | 'narrative_arc'
    | 'comparison'
    | 'reaction'
    | 'entertainment';

/**
 * Display configuration for trend types
 */
export const TREND_TYPE_CONFIG: Record<TrendType, { label: string; emoji: string; colorClass: string }> = {
    controversy: { label: 'Tartışma', emoji: '🔥', colorClass: 'bg-red-900/60 text-red-300 border-red-700/50' },
    breaking_news: { label: 'Son Dakika', emoji: '⚡', colorClass: 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50' },
    tutorial: { label: 'Rehber', emoji: '📚', colorClass: 'bg-blue-900/60 text-blue-300 border-blue-700/50' },
    story: { label: 'Hikaye', emoji: '📖', colorClass: 'bg-purple-900/60 text-purple-300 border-purple-700/50' },
    review: { label: 'İnceleme', emoji: '⭐', colorClass: 'bg-amber-900/60 text-amber-300 border-amber-700/50' },
    discussion: { label: 'Sohbet', emoji: '💬', colorClass: 'bg-slate-800/60 text-slate-300 border-slate-600/50' },
    meme: { label: 'Meme', emoji: '😂', colorClass: 'bg-pink-900/60 text-pink-300 border-pink-700/50' },
    announcement: { label: 'Duyuru', emoji: '📢', colorClass: 'bg-green-900/60 text-green-300 border-green-700/50' },
};

/**
 * Classification result from API
 */
export interface TrendClassification {
    trendType: TrendType;
    confidence: number;
    recommendedFormat: ContentFormat;
    formatRationale: string;
    keywords: string[];
}

/**
 * Format options for a trend type
 */
export interface FormatOptions {
    primary: ContentFormat;
    alternatives: ContentFormat[];
    hookStyle: string;
    structureGuidance: string;
}

/**
 * Classification API response
 */
export interface ClassificationResult {
    trendId: string;
    trend: TrendData;
    classification: TrendClassification;
    formatOptions: FormatOptions;
}

// ============================================================
// Algorithm Scoring Types (Phase 14)
// ============================================================

/**
 * Algorithm score breakdown item
 */
export interface ScoreBreakdownItem {
    metric: string;
    score: number;
    feedback: string;
}

/**
 * Full algorithm score result
 */
export interface AlgorithmScore {
    hookStrength: number;
    completionPotential: number;
    engagementTriggers: number;
    platformOptimization: number;
    loopPotential: number;
    overallScore: number;
    breakdown: ScoreBreakdownItem[];
    improvements: string[];
}

/**
 * Viral potential label
 */
export interface ViralPotentialLabel {
    label: string;
    emoji: string;
    color: 'green' | 'blue' | 'yellow' | 'orange' | 'red';
}

/**
 * Score API response
 */
export interface ScoreResult {
    algorithmScore: AlgorithmScore;
    viralPotential: ViralPotentialLabel;
    category: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
}

/**
 * Classification & Scoring API client
 */
export const classificationApi = {
    /**
     * Classify a trend and get format recommendations
     */
    async classifyTrend(trend: TrendData): Promise<ClassificationResult> {
        const response = await fetch(`${API_BASE}/trends/${trend.id}/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trend }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Classification failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<ClassificationResult> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Classification failed');
        }

        return data.data as ClassificationResult;
    },

    /**
     * Score a platform script for viral potential
     */
    async scoreScript(script: PlatformScript): Promise<ScoreResult> {
        const response = await fetch(`${API_BASE}/scripts/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Scoring failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<ScoreResult> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Scoring failed');
        }

        return data.data as ScoreResult;
    },
};

// ============================================================
// Phase 15: AI Quality Enhancement API
// ============================================================

/**
 * Iteration target - which part to regenerate
 */
export type IterationTarget =
    | 'hook'
    | 'body'
    | 'cta'
    | 'title'
    | 'hashtags'
    | 'shorten'
    | 'lengthen'
    | 'change_tone'
    | 'add_hooks';

/**
 * Iteration request
 */
export interface IterationRequest {
    originalScript: PlatformScript;
    target: IterationTarget;
    newTone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    additionalInstructions?: string;
}

/**
 * Iteration result
 */
export interface IterationResult {
    updatedScript: PlatformScript;
    changedSections: string[];
    metadata: {
        iterationType: IterationTarget;
        tokensUsed: number;
        durationMs: number;
    };
}

/**
 * Script variant styles
 */
export type VariantStyle =
    | 'high_energy'
    | 'story_driven'
    | 'controversial'
    | 'educational'
    | 'reaction';

/**
 * Variant style configuration for UI display
 */
export const VARIANT_STYLE_CONFIG: Record<VariantStyle, { label: string; emoji: string; description: string }> = {
    high_energy: { label: 'Enerjik', emoji: '⚡', description: 'Hızlı tempo, keskin geçişler' },
    story_driven: { label: 'Hikaye', emoji: '📖', description: 'Duygusal anlatı, dramatik yapı' },
    controversial: { label: 'Tartışmalı', emoji: '🔥', description: 'Cesur görüş, tartışma başlatıcı' },
    educational: { label: 'Eğitici', emoji: '🎓', description: 'Açıklayıcı, adım adım' },
    reaction: { label: 'Tepki', emoji: '😲', description: 'Yorum, mizah, kişisel görüş' },
};

/**
 * Script variant result
 */
export interface ScriptVariant {
    variantId: string;
    style: VariantStyle;
    script: PlatformScript;
    algorithmScore?: AlgorithmScore;
    differentiator: string;
}

/**
 * Variant generation options
 */
export interface VariantGenerationOptions {
    styles: VariantStyle[];
    durationSeconds?: number;
    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    calculateScores?: boolean;
}

/**
 * Variant generation result
 */
export interface VariantGenerationResult {
    trend: TrendData;
    platform: Platform;
    variants: ScriptVariant[];
    recommended: string;
    metadata: {
        generatedAt: string;
        totalDurationMs: number;
        variantCount: number;
    };
}

/**
 * AI operation type
 */
export type AIOperationType = 'generate' | 'generate_variants' | 'iterate' | 'score' | 'classify' | 'validate';

/**
 * AI operation metrics
 */
export interface AIOperationMetrics {
    operationId: string;
    operationType: AIOperationType;
    platform?: Platform;
    category?: string;
    startTime: number;
    endTime: number;
    durationMs: number;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    validationScore?: number;
    algorithmScore?: number;
    retryCount: number;
    knowledgeCacheHit: boolean;
    knowledgeLoadTimeMs: number;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
}

/**
 * AI metrics summary
 */
export interface AIMetricsSummary {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    successRate: number;
    avgDurationMs: number;
    avgTokensPerOperation: number;
    avgValidationScore: number;
    avgAlgorithmScore: number;
    knowledgeCacheHitRate: number;
    operationsByType: Partial<Record<AIOperationType, number>>;
    operationsByPlatform: Record<string, number>;
    earliestOperation: number;
    latestOperation: number;
}

/**
 * AI metrics response
 */
export interface AIMetricsResponse {
    summary: AIMetricsSummary;
    recentOperations: AIOperationMetrics[];
    inProgress: number;
}

/**
 * Script Iteration API client
 */
export const iterationApi = {
    /**
     * Iterate on a script section
     */
    async iterateScript(request: IterationRequest): Promise<IterationResult> {
        const response = await fetch(`${API_BASE}/scripts/iterate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Iteration failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<IterationResult> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Iteration failed');
        }

        return data.data as IterationResult;
    },
};

/**
 * Variant Generation API client
 */
export const variantApi = {
    /**
     * Generate A/B script variants
     */
    async generateVariants(
        trend: TrendData,
        platform: Platform,
        options: VariantGenerationOptions
    ): Promise<VariantGenerationResult> {
        const response = await fetch(`${API_BASE}/generate-script-variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trend,
                platform,
                styles: options.styles,
                durationSeconds: options.durationSeconds,
                tone: options.tone,
                calculateScores: options.calculateScores ?? true,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Variant generation failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<VariantGenerationResult> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Variant generation failed');
        }

        return data.data as VariantGenerationResult;
    },
};

/**
 * AI Metrics API client
 */
export const metricsApi = {
    /**
     * Get AI operation metrics
     */
    async getMetrics(since?: number): Promise<AIMetricsResponse> {
        const params = since ? `?since=${since}` : '';
        const response = await fetch(`${API_BASE}/ai/metrics${params}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to fetch metrics' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<AIMetricsResponse> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch metrics');
        }

        return data.data as AIMetricsResponse;
    },
};

// ============================================================
// Video Generation Types & API (Phase 26)
// ============================================================

/**
 * Video job status
 */
export type VideoJobStatus =
    | 'queued'
    | 'building-timeline'
    | 'generating-captions'
    | 'composing-video'
    | 'encoding'
    | 'complete'
    | 'failed';

/**
 * Caption style type
 */
export type CaptionStyleType = 'hormozi' | 'classic' | 'minimal';

/**
 * Transition style type
 */
export type TransitionStyleType = 'smooth' | 'dynamic' | 'minimal';

/**
 * Video generation options
 */
export interface VideoGenerationOptions {
    captionStyle: CaptionStyleType;
    transitionStyle: TransitionStyleType;
    kenBurnsEnabled: boolean;
    backgroundMusicVolume: number;
    audioDucking: boolean;
}

/**
 * Video project input
 */
export interface VideoProjectInput {
    id?: string;
    platform: Platform;
    title: string;
    script: {
        hook: string;
        body: string;
        cta: string;
    };
    images: {
        hook: string[];
        body: string[];
        cta: string[];
    };
    audio: {
        voiceoverPath?: string;
        voiceoverData?: string; // Base64 encoded audio
        voiceoverDuration: number;
        backgroundMusicPath?: string;
    };
    options?: Partial<VideoGenerationOptions>;
}

/**
 * Video generation result
 */
export interface VideoGenerationResult {
    success: boolean;
    jobId: string;
    outputPath?: string;
    duration?: number;
    fileSize?: number;
    error?: string;
    processingTimeMs?: number;
}

/**
 * Video generation progress
 */
export interface VideoGenerationProgress {
    jobId: string;
    status: VideoJobStatus;
    progress: number;
    currentStep: string;
    estimatedTimeRemaining?: number;
}

/**
 * Status step configuration for UI
 */
export const VIDEO_STATUS_STEPS: Array<{ status: VideoJobStatus; label: string; emoji: string }> = [
    { status: 'queued', label: 'Sırada', emoji: '⏳' },
    { status: 'building-timeline', label: 'Timeline', emoji: '📐' },
    { status: 'generating-captions', label: 'Altyazı', emoji: '💬' },
    { status: 'composing-video', label: 'Birleştirme', emoji: '🎬' },
    { status: 'encoding', label: 'Encode', emoji: '📦' },
    { status: 'complete', label: 'Tamamlandı', emoji: '✅' },
    { status: 'failed', label: 'Hata', emoji: '❌' },
];

/**
 * Default video generation options
 */
export const DEFAULT_VIDEO_OPTIONS: VideoGenerationOptions = {
    captionStyle: 'hormozi',
    transitionStyle: 'smooth',
    kenBurnsEnabled: true,
    backgroundMusicVolume: 0.15,
    audioDucking: true,
};

/**
 * Video Generation API client
 */
export const videoApi = {
    /**
     * Generate a video from script, images, and audio
     */
    async generate(project: VideoProjectInput): Promise<VideoGenerationResult> {
        const response = await fetch(`${API_BASE}/video/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...project,
                options: {
                    ...DEFAULT_VIDEO_OPTIONS,
                    ...project.options,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Video generation failed' }));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        const data: ApiResponse<VideoGenerationResult> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Video generation failed');
        }

        return data.data as VideoGenerationResult;
    },

    /**
     * Get video generation job status
     */
    async getStatus(jobId: string): Promise<VideoGenerationProgress> {
        const response = await fetch(`${API_BASE}/video/status/${jobId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Job not found');
            }
            throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse<VideoGenerationProgress> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get job status');
        }

        return data.data as VideoGenerationProgress;
    },

    /**
     * Get all video generation jobs
     */
    async getJobs(): Promise<VideoGenerationProgress[]> {
        const response = await fetch(`${API_BASE}/video/jobs`);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse<VideoGenerationProgress[]> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get jobs');
        }

        return data.data as VideoGenerationProgress[];
    },

    /**
     * Clean up completed video generation jobs
     */
    async cleanup(): Promise<{ cleaned: number }> {
        const response = await fetch(`${API_BASE}/video/jobs/cleanup`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse<{ cleaned: number }> = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to cleanup jobs');
        }

        return data.data as { cleaned: number };
    },
};
