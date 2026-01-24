/**
 * Pexels API Client
 * 
 * Provides access to free, high-quality stock images from Pexels.
 * No attribution required.
 * 
 * @module images/PexelsClient
 */

import { createChildLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';

const logger = createChildLogger('pexels');

/**
 * Pexels API Configuration
 */
const PEXELS_CONFIG = {
    BASE_URL: 'https://api.pexels.com/v1',
    DEFAULT_PER_PAGE: 6,
    MAX_PER_PAGE: 80,
    TIMEOUT_MS: 10000,
    MAX_RETRIES: 2,
    RETRY_DELAY_MS: 500,
} as const;

/**
 * Pexels Photo object from API
 */
export interface PexelsPhoto {
    id: number;
    width: number;
    height: number;
    url: string;  // Pexels page URL
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    avg_color: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
        tiny: string;
    };
    alt: string;
}

/**
 * Pexels API response for search
 */
interface PexelsSearchResponse {
    total_results: number;
    page: number;
    per_page: number;
    photos: PexelsPhoto[];
    next_page?: string;
}

/**
 * Normalized image result for our application
 */
export interface ImageResult {
    id: string;
    source: 'pexels';
    thumbnailUrl: string;
    previewUrl: string;
    fullUrl: string;
    width: number;
    height: number;
    alt: string;
    photographer: string;
    photographerUrl: string;
    avgColor: string;
    pageUrl: string;
}

/**
 * Pexels API Error
 */
export class PexelsError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'PexelsError';
    }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pexels API Client Class
 */
export class PexelsClient {
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || getEnv().PEXELS_API_KEY || '';

        if (!this.apiKey) {
            logger.warn('Pexels API key not configured - image search will be disabled');
        }
    }

    /**
     * Checks if the client is properly configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Search photos by query
     * @param query - Search query
     * @param options - Search options
     */
    async searchPhotos(
        query: string,
        options: {
            perPage?: number;
            page?: number;
            orientation?: 'landscape' | 'portrait' | 'square';
            size?: 'large' | 'medium' | 'small';
        } = {}
    ): Promise<{
        photos: ImageResult[];
        totalResults: number;
        page: number;
        perPage: number;
    }> {
        if (!this.isConfigured()) {
            throw new PexelsError('Pexels API key not configured', undefined, false);
        }

        const {
            perPage = PEXELS_CONFIG.DEFAULT_PER_PAGE,
            page = 1,
            orientation,
            size,
        } = options;

        const params = new URLSearchParams({
            query,
            per_page: String(Math.min(perPage, PEXELS_CONFIG.MAX_PER_PAGE)),
            page: String(page),
        });

        if (orientation) params.set('orientation', orientation);
        if (size) params.set('size', size);

        const url = `${PEXELS_CONFIG.BASE_URL}/search?${params.toString()}`;

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= PEXELS_CONFIG.MAX_RETRIES; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), PEXELS_CONFIG.TIMEOUT_MS);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Authorization: this.apiKey,
                    },
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new PexelsError('Rate limit exceeded', 429, true);
                    }

                    if (response.status >= 500) {
                        throw new PexelsError(`Server error: ${response.status}`, response.status, true);
                    }

                    throw new PexelsError(
                        `API error: ${response.status}`,
                        response.status,
                        false
                    );
                }

                const data: PexelsSearchResponse = await response.json();

                const photos: ImageResult[] = data.photos.map(photo => this.normalizePhoto(photo));

                logger.info({
                    query,
                    totalResults: data.total_results,
                    returnedCount: photos.length,
                    page: data.page,
                }, 'Pexels search completed');

                return {
                    photos,
                    totalResults: data.total_results,
                    page: data.page,
                    perPage: data.per_page,
                };

            } catch (error) {
                lastError = error as Error;

                if (error instanceof PexelsError) {
                    if (!error.retryable) {
                        throw error;
                    }

                    if (attempt < PEXELS_CONFIG.MAX_RETRIES) {
                        const delay = PEXELS_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                        logger.warn({ attempt, delay }, 'Retrying Pexels request');
                        await sleep(delay);
                        continue;
                    }
                }

                if (error instanceof Error && error.name === 'AbortError') {
                    throw new PexelsError('Request timed out', undefined, true);
                }

                logger.error({ error, attempt }, 'Pexels API call failed');
            }
        }

        throw lastError || new PexelsError('Unknown error after retries', undefined, false);
    }

    /**
     * Get curated photos (popular/trending)
     */
    async getCuratedPhotos(
        options: {
            perPage?: number;
            page?: number;
        } = {}
    ): Promise<{
        photos: ImageResult[];
        page: number;
        perPage: number;
    }> {
        if (!this.isConfigured()) {
            throw new PexelsError('Pexels API key not configured', undefined, false);
        }

        const { perPage = PEXELS_CONFIG.DEFAULT_PER_PAGE, page = 1 } = options;

        const params = new URLSearchParams({
            per_page: String(Math.min(perPage, PEXELS_CONFIG.MAX_PER_PAGE)),
            page: String(page),
        });

        const url = `${PEXELS_CONFIG.BASE_URL}/curated?${params.toString()}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PEXELS_CONFIG.TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: this.apiKey,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new PexelsError(`API error: ${response.status}`, response.status, false);
            }

            const data: PexelsSearchResponse = await response.json();

            const photos: ImageResult[] = data.photos.map(photo => this.normalizePhoto(photo));

            return {
                photos,
                page: data.page,
                perPage: data.per_page,
            };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof PexelsError) throw error;
            throw new PexelsError(
                error instanceof Error ? error.message : 'Unknown error',
                undefined,
                false
            );
        }
    }

    /**
     * Normalize Pexels photo to our ImageResult format
     */
    private normalizePhoto(photo: PexelsPhoto): ImageResult {
        return {
            id: String(photo.id),
            source: 'pexels',
            thumbnailUrl: photo.src.small,
            previewUrl: photo.src.medium,
            fullUrl: photo.src.large,
            width: photo.width,
            height: photo.height,
            alt: photo.alt || '',
            photographer: photo.photographer,
            photographerUrl: photo.photographer_url,
            avgColor: photo.avg_color,
            pageUrl: photo.url,
        };
    }
}

/**
 * Singleton Pexels client instance
 */
let pexelsInstance: PexelsClient | null = null;

/**
 * Gets the singleton Pexels client
 */
export function getPexelsClient(): PexelsClient {
    if (!pexelsInstance) {
        pexelsInstance = new PexelsClient();
    }
    return pexelsInstance;
}

/**
 * Resets the Pexels client instance (for testing)
 */
export function resetPexelsClient(): void {
    pexelsInstance = null;
}
