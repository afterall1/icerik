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

export const api = new ApiClient();
