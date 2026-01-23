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

