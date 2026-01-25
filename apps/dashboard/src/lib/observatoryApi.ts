/**
 * Observatory API Client
 * 
 * Fetches data for the Project Observatory dashboard.
 * 
 * @module lib/observatoryApi
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Observatory metrics
 */
export interface ObservatoryMetrics {
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
}

/**
 * AI Prompt from knowledge base
 */
export interface AIPrompt {
    id: string;
    name: string;
    category: 'platform' | 'content-pattern' | 'embedded';
    description: string;
    content: string;
    source: string;
    wordCount: number;
}

/**
 * Embedded prompt from code
 */
export interface EmbeddedPrompt {
    id: string;
    name: string;
    type: 'category' | 'tone' | 'language' | 'few-shot';
    entries: { key: string; value: string }[];
}

/**
 * Prompts response
 */
export interface PromptsResponse {
    knowledgePrompts: AIPrompt[];
    embeddedPrompts: EmbeddedPrompt[];
    summary: {
        totalKnowledgeFiles: number;
        totalEmbeddedTypes: number;
        totalWords: number;
    };
}

/**
 * API Endpoint documentation
 */
export interface EndpointDoc {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    phase: number;
    category: string;
}

/**
 * Endpoints response
 */
export interface EndpointsResponse {
    endpoints: EndpointDoc[];
    grouped: Record<string, EndpointDoc[]>;
    summary: {
        total: number;
        byCategory: Record<string, number>;
    };
}

/**
 * Architecture system
 */
export interface ArchitectureSystem {
    name: string;
    description: string;
    docFile: string;
    status: 'active' | 'planned';
}

/**
 * ADR record
 */
export interface ADRRecord {
    id: string;
    title: string;
    status: 'accepted' | 'deprecated' | 'proposed';
    summary: string;
}

/**
 * Architecture response
 */
export interface ArchitectureResponse {
    systems: ArchitectureSystem[];
    adrs: ADRRecord[];
    components: {
        backend: string[];
        frontend: string[];
        shared: string[];
    };
}

/**
 * Roadmap phase
 */
export interface RoadmapPhase {
    phase: number;
    name: string;
    status: 'complete' | 'in-progress' | 'planned';
    features: string[];
}

/**
 * Roadmap response
 */
export interface RoadmapResponse {
    phases: RoadmapPhase[];
    futureIdeas: string[];
    summary: {
        totalPhases: number;
        completed: number;
        inProgress: number;
        completionPercentage: number;
    };
}

/**
 * Generic API response wrapper
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

/**
 * Fetch helper with error handling
 */
async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json() as ApiResponse<T>;

    if (!json.success) {
        throw new Error(json.error || 'API request failed');
    }

    return json.data as T;
}

/**
 * Observatory API client
 */
export const observatoryApi = {
    /**
     * Get project metrics
     */
    async getMetrics(): Promise<ObservatoryMetrics> {
        return fetchJson<ObservatoryMetrics>(`${API_BASE}/observatory/metrics`);
    },

    /**
     * Get all AI prompts
     */
    async getPrompts(): Promise<PromptsResponse> {
        return fetchJson<PromptsResponse>(`${API_BASE}/observatory/prompts`);
    },

    /**
     * Get API endpoint documentation
     */
    async getEndpoints(): Promise<EndpointsResponse> {
        return fetchJson<EndpointsResponse>(`${API_BASE}/observatory/endpoints`);
    },

    /**
     * Get architecture documentation
     */
    async getArchitecture(): Promise<ArchitectureResponse> {
        return fetchJson<ArchitectureResponse>(`${API_BASE}/observatory/architecture`);
    },

    /**
     * Get roadmap and feature status
     */
    async getRoadmap(): Promise<RoadmapResponse> {
        return fetchJson<RoadmapResponse>(`${API_BASE}/observatory/roadmap`);
    },
};
