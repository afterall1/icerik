/**
 * useVisualSearch Hook
 * 
 * Provides visual search functionality for script sections.
 * Uses the /api/images/search-for-content endpoint.
 * 
 * @module lib/useVisualSearch
 */

import { useState, useCallback } from 'react';

/**
 * Validated image from the API
 */
export interface ValidatedImage {
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
    validation?: {
        isClean: boolean;
        hasText: boolean;
        hasOverlay: boolean;
        confidenceScore: number;
        detectedElements: string[];
    };
    searchQuery?: string;
}

/**
 * Visual search result
 */
export interface VisualSearchResult {
    images: ValidatedImage[];
    query: string;
    totalFound: number;
    searchTimeMs: number;
    cacheHit: boolean;
}

/**
 * Hook parameters
 */
interface UseVisualSearchParams {
    /** Content to search visuals for */
    content: string;
    /** Optional category for better matching */
    category?: string;
    /** Number of results to fetch */
    count?: number;
    /** Whether to validate images with AI */
    validateImages?: boolean;
}

/**
 * Hook return type
 */
interface UseVisualSearchReturn {
    /** Found images */
    images: ValidatedImage[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Original search query used */
    query: string;
    /** Whether search has been performed */
    hasSearched: boolean;
    /** Trigger search */
    searchImages: () => Promise<void>;
    /** Clear results */
    clearResults: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Hook for searching visuals for script sections
 */
export function useVisualSearch({
    content,
    category = 'general',
    count = 9,
    validateImages = false,
}: UseVisualSearchParams): UseVisualSearchReturn {
    const [images, setImages] = useState<ValidatedImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const searchImages = useCallback(async () => {
        if (!content.trim()) {
            setError('İçerik boş olamaz');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/images/search-for-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: content,
                    category,
                    count,
                    validateImages,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
                throw new Error(errorData.error || `API hatası: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Görsel arama başarısız');
            }

            const data = result.data as VisualSearchResult;
            setImages(data.images || []);
            setQuery(data.query || '');
            setHasSearched(true);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Görsel arama sırasında hata oluştu';
            setError(message);
            setImages([]);
        } finally {
            setIsLoading(false);
        }
    }, [content, category, count, validateImages]);

    const clearResults = useCallback(() => {
        setImages([]);
        setError(null);
        setQuery('');
        setHasSearched(false);
    }, []);

    return {
        images,
        isLoading,
        error,
        query,
        hasSearched,
        searchImages,
        clearResults,
    };
}
