/**
 * useScriptRating Hook
 *
 * Manages script ratings and feedback using IndexedDB.
 * Tracks user satisfaction with generated scripts.
 *
 * @module lib/hooks/useScriptRating
 */

import { useState, useCallback, useEffect } from 'react';
import type { Platform } from './api';

const DB_NAME = 'icerik_analytics';
const STORE_NAME = 'ratings';
const DB_VERSION = 1;

/**
 * Rating types
 */
export type RatingType = 'like' | 'dislike';

/**
 * Script rating entry
 */
export interface ScriptRating {
    id: string;
    scriptId: string;
    trendId: string;
    trendTitle: string;
    platform: Platform;
    rating: RatingType;
    stars?: number; // 1-5 optional
    feedback?: string;
    createdAt: string;
}

/**
 * Rating statistics
 */
export interface RatingStats {
    totalRatings: number;
    likes: number;
    dislikes: number;
    likePercentage: number;
    averageStars: number;
    byPlatform: Record<Platform, { likes: number; dislikes: number }>;
}

/**
 * Hook return type
 */
interface UseScriptRatingReturn {
    /** All ratings */
    ratings: ScriptRating[];
    /** Submit a rating */
    submitRating: (rating: Omit<ScriptRating, 'id' | 'createdAt'>) => void;
    /** Get rating for a specific script */
    getRating: (scriptId: string) => ScriptRating | undefined;
    /** Update existing rating */
    updateRating: (id: string, updates: Partial<Pick<ScriptRating, 'rating' | 'stars' | 'feedback'>>) => void;
    /** Delete a rating */
    deleteRating: (id: string) => void;
    /** Get statistics */
    getStats: () => RatingStats;
    /** Export all ratings as JSON */
    exportRatings: () => string;
    /** Loading state */
    isLoading: boolean;
}

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('scriptId', 'scriptId', { unique: false });
                store.createIndex('trendId', 'trendId', { unique: false });
                store.createIndex('platform', 'platform', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

/**
 * Generate unique ID
 */
function generateId(): string {
    return `rating_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Custom hook for managing script ratings
 *
 * @example
 * const { submitRating, getStats, getRating } = useScriptRating();
 * submitRating({ scriptId, trendId, platform, rating: 'like' });
 */
export function useScriptRating(): UseScriptRatingReturn {
    const [ratings, setRatings] = useState<ScriptRating[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load ratings from IndexedDB on mount
    useEffect(() => {
        async function loadRatings() {
            try {
                const db = await openDB();
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => {
                    setRatings(request.result || []);
                    setIsLoading(false);
                };

                request.onerror = () => {
                    console.error('Failed to load ratings:', request.error);
                    setIsLoading(false);
                };
            } catch (error) {
                console.error('Failed to open ratings DB:', error);
                setIsLoading(false);
            }
        }

        loadRatings();
    }, []);

    // Submit a new rating
    const submitRating = useCallback(
        async (ratingData: Omit<ScriptRating, 'id' | 'createdAt'>): Promise<void> => {
            try {
                const rating: ScriptRating = {
                    ...ratingData,
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                };

                const db = await openDB();
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.add(rating);

                setRatings((prev) => [...prev, rating]);
            } catch (error) {
                console.error('Failed to submit rating:', error);
            }
        },
        []
    );

    // Get rating for a specific script
    const getRating = useCallback(
        (scriptId: string): ScriptRating | undefined => {
            return ratings.find((r) => r.scriptId === scriptId);
        },
        [ratings]
    );

    // Update existing rating
    const updateRating = useCallback(
        async (
            id: string,
            updates: Partial<Pick<ScriptRating, 'rating' | 'stars' | 'feedback'>>
        ): Promise<void> => {
            try {
                const db = await openDB();
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const existing = ratings.find((r) => r.id === id);

                if (existing) {
                    const updated = { ...existing, ...updates };
                    store.put(updated);
                    setRatings((prev) =>
                        prev.map((r) => (r.id === id ? updated : r))
                    );
                }
            } catch (error) {
                console.error('Failed to update rating:', error);
            }
        },
        [ratings]
    );

    // Delete a rating
    const deleteRating = useCallback(async (id: string): Promise<void> => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(id);

            setRatings((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            console.error('Failed to delete rating:', error);
        }
    }, []);

    // Get statistics
    const getStats = useCallback((): RatingStats => {
        const totalRatings = ratings.length;
        const likes = ratings.filter((r) => r.rating === 'like').length;
        const dislikes = ratings.filter((r) => r.rating === 'dislike').length;
        const starsRatings = ratings.filter((r) => r.stars !== undefined);
        const averageStars = starsRatings.length > 0
            ? starsRatings.reduce((sum, r) => sum + (r.stars || 0), 0) / starsRatings.length
            : 0;

        const byPlatform: Record<Platform, { likes: number; dislikes: number }> = {
            tiktok: { likes: 0, dislikes: 0 },
            reels: { likes: 0, dislikes: 0 },
            shorts: { likes: 0, dislikes: 0 },
        };

        ratings.forEach((r) => {
            if (r.rating === 'like') {
                byPlatform[r.platform].likes++;
            } else {
                byPlatform[r.platform].dislikes++;
            }
        });

        return {
            totalRatings,
            likes,
            dislikes,
            likePercentage: totalRatings > 0 ? (likes / totalRatings) * 100 : 0,
            averageStars,
            byPlatform,
        };
    }, [ratings]);

    // Export all ratings
    const exportRatings = useCallback((): string => {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            totalRatings: ratings.length,
            stats: getStats(),
            ratings,
        }, null, 2);
    }, [ratings, getStats]);

    return {
        ratings,
        submitRating,
        getRating,
        updateRating,
        deleteRating,
        getStats,
        exportRatings,
        isLoading,
    };
}

export type { UseScriptRatingReturn };
