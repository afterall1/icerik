/**
 * Image Search Service
 * 
 * Orchestrates image search, validation, and caching for script content.
 * 
 * @module images/ImageSearchService
 */

import { createChildLogger } from '../utils/logger.js';
import { getPexelsClient, type ImageResult, PexelsError } from './PexelsClient.js';
import { getImageValidator, type ImageValidationResult } from './ImageValidator.js';
import { getKeywordExtractor, type KeywordExtractionInput } from './KeywordExtractor.js';

const logger = createChildLogger('image-search');

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
    TTL_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ENTRIES: 100,
} as const;

/**
 * Validated image with search metadata
 */
export interface ValidatedImage extends ImageResult {
    validation: ImageValidationResult;
    searchQuery: string;
}

/**
 * Image search result
 */
export interface ImageSearchResult {
    query: string;
    images: ValidatedImage[];
    totalFound: number;
    validCount: number;
    invalidCount: number;
    cachedAt?: number;
}

/**
 * Cache entry
 */
interface CacheEntry {
    result: ImageSearchResult;
    timestamp: number;
}

/**
 * In-memory cache for search results
 */
const searchCache: Map<string, CacheEntry> = new Map();

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of searchCache.entries()) {
        if (now - entry.timestamp > CACHE_CONFIG.TTL_MS) {
            searchCache.delete(key);
        }
    }

    // If still too many entries, remove oldest
    if (searchCache.size > CACHE_CONFIG.MAX_ENTRIES) {
        const entries = Array.from(searchCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = entries.slice(0, searchCache.size - CACHE_CONFIG.MAX_ENTRIES);
        toRemove.forEach(([key]) => searchCache.delete(key));
    }
}

/**
 * Image Search Service Class
 */
export class ImageSearchService {
    private pexelsClient = getPexelsClient();
    private validator = getImageValidator();
    private keywordExtractor = getKeywordExtractor();

    /**
     * Check if the service is configured
     */
    isConfigured(): boolean {
        return this.pexelsClient.isConfigured();
    }

    /**
     * Search images for trend/script content
     */
    async searchForContent(
        input: KeywordExtractionInput,
        options: {
            count?: number;
            validateImages?: boolean;
            useCache?: boolean;
        } = {}
    ): Promise<ImageSearchResult> {
        const {
            count = 6,
            validateImages = true,
            useCache = true,
        } = options;

        // Extract keywords
        const keywords = this.keywordExtractor.extract(input);
        const cacheKey = `${keywords.searchQuery}:${count}:${validateImages}`;

        // Check cache
        if (useCache) {
            const cached = searchCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL_MS) {
                logger.debug({ query: keywords.searchQuery }, 'Returning cached search result');
                return {
                    ...cached.result,
                    cachedAt: cached.timestamp,
                };
            }
        }

        try {
            // Search Pexels
            const searchResult = await this.pexelsClient.searchPhotos(
                keywords.searchQuery,
                {
                    perPage: Math.min(count * 2, 15), // Fetch more for filtering
                    orientation: 'landscape', // Better for video backgrounds
                }
            );

            let validatedImages: ValidatedImage[];

            if (validateImages && this.validator.isConfigured()) {
                // Validate images for text/overlay
                const imageUrls = searchResult.photos.map(p => p.previewUrl);
                const validationResults = await this.validator.validateImages(imageUrls);

                // Combine images with validation results
                validatedImages = searchResult.photos.map((photo, index) => ({
                    ...photo,
                    validation: validationResults[index],
                    searchQuery: keywords.searchQuery,
                }));

                // Sort by validation status (clean first) and then by original order
                validatedImages.sort((a, b) => {
                    if (a.validation.isClean && !b.validation.isClean) return -1;
                    if (!a.validation.isClean && b.validation.isClean) return 1;
                    return 0;
                });

            } else {
                // No validation, assume all clean
                validatedImages = searchResult.photos.map(photo => ({
                    ...photo,
                    validation: {
                        imageUrl: photo.previewUrl,
                        isClean: true,
                        hasText: false,
                        hasOverlay: false,
                        confidenceScore: 0,
                        detectedElements: [],
                    },
                    searchQuery: keywords.searchQuery,
                }));
            }

            // Limit to requested count
            const limitedImages = validatedImages.slice(0, count);

            const result: ImageSearchResult = {
                query: keywords.searchQuery,
                images: limitedImages,
                totalFound: searchResult.totalResults,
                validCount: limitedImages.filter(i => i.validation.isClean).length,
                invalidCount: limitedImages.filter(i => !i.validation.isClean).length,
            };

            // Update cache
            cleanExpiredCache();
            searchCache.set(cacheKey, {
                result,
                timestamp: Date.now(),
            });

            logger.info({
                query: keywords.searchQuery,
                totalFound: result.totalFound,
                returned: limitedImages.length,
                valid: result.validCount,
                invalid: result.invalidCount,
            }, 'Image search completed');

            return result;

        } catch (error) {
            if (error instanceof PexelsError) {
                throw error;
            }
            logger.error({ error, query: keywords.searchQuery }, 'Image search failed');
            throw new Error(`Image search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Search with a direct query string
     */
    async searchByQuery(
        query: string,
        options: {
            count?: number;
            validateImages?: boolean;
        } = {}
    ): Promise<ImageSearchResult> {
        return this.searchForContent(
            { title: query },
            options
        );
    }

    /**
     * Validate a single image URL
     */
    async validateSingleImage(imageUrl: string): Promise<ImageValidationResult> {
        if (!this.validator.isConfigured()) {
            return {
                imageUrl,
                isClean: true,
                hasText: false,
                hasOverlay: false,
                confidenceScore: 0,
                detectedElements: [],
            };
        }

        return this.validator.validateImage(imageUrl);
    }

    /**
     * Get search suggestions based on category
     */
    getSuggestions(category: string): string[] {
        const suggestions: Record<string, string[]> = {
            technology: ['technology abstract', 'digital innovation', 'futuristic tech'],
            gaming: ['gaming setup', 'esports arena', 'video game controller'],
            science: ['science research', 'laboratory', 'scientific discovery'],
            business: ['modern office', 'business meeting', 'corporate teamwork'],
            entertainment: ['entertainment show', 'concert crowd', 'movie premiere'],
            sports: ['sports action', 'athletic competition', 'stadium crowd'],
            lifestyle: ['modern lifestyle', 'urban living', 'aesthetic home'],
            food: ['gourmet food', 'restaurant cuisine', 'cooking preparation'],
            travel: ['travel destination', 'adventure landscape', 'exotic location'],
            health: ['health wellness', 'fitness workout', 'healthy lifestyle'],
        };

        return suggestions[category.toLowerCase()] || [`${category} background`, `${category} abstract`];
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        entries: number;
        maxEntries: number;
        ttlMs: number;
    } {
        return {
            entries: searchCache.size,
            maxEntries: CACHE_CONFIG.MAX_ENTRIES,
            ttlMs: CACHE_CONFIG.TTL_MS,
        };
    }

    /**
     * Clear the search cache
     */
    clearCache(): void {
        searchCache.clear();
        logger.info('Image search cache cleared');
    }
}

/**
 * Singleton Image Search Service instance
 */
let serviceInstance: ImageSearchService | null = null;

/**
 * Gets the singleton Image Search Service
 */
export function getImageSearchService(): ImageSearchService {
    if (!serviceInstance) {
        serviceInstance = new ImageSearchService();
    }
    return serviceInstance;
}

/**
 * Resets the Image Search Service instance (for testing)
 */
export function resetImageSearchService(): void {
    serviceInstance = null;
    searchCache.clear();
}
