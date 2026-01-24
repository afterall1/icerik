/**
 * useFavorites Hook
 *
 * Manages favorite trends using localStorage.
 * Provides add, remove, and check functionality with persistence.
 *
 * @module lib/hooks/useFavorites
 */

import { useState, useCallback, useEffect } from 'react';
import type { TrendData } from './api';

const FAVORITES_KEY = 'icerik_favorites';
const MAX_FAVORITES = 100;

/**
 * Favorite trend entry
 */
interface FavoriteTrend {
    id: string;
    title: string;
    subreddit: string;
    category: string;
    nes: number;
    savedAt: string;
}

/**
 * Hook return type
 */
interface UseFavoritesReturn {
    /** List of favorite trends */
    favorites: FavoriteTrend[];
    /** Check if a trend is favorited */
    isFavorite: (trendId: string) => boolean;
    /** Add a trend to favorites */
    addFavorite: (trend: TrendData) => void;
    /** Remove a trend from favorites */
    removeFavorite: (trendId: string) => void;
    /** Toggle favorite status */
    toggleFavorite: (trend: TrendData) => void;
    /** Clear all favorites */
    clearFavorites: () => void;
    /** Number of favorites */
    count: number;
}

/**
 * Load favorites from localStorage
 */
function loadFavorites(): FavoriteTrend[] {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (error) {
        console.error('Failed to load favorites:', error);
        return [];
    }
}

/**
 * Save favorites to localStorage
 */
function saveFavorites(favorites: FavoriteTrend[]): void {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
        console.error('Failed to save favorites:', error);
    }
}

/**
 * Custom hook for managing favorite trends
 *
 * @example
 * const { favorites, isFavorite, toggleFavorite } = useFavorites();
 * <button onClick={() => toggleFavorite(trend)}>
 *   {isFavorite(trend.id) ? '★' : '☆'}
 * </button>
 */
export function useFavorites(): UseFavoritesReturn {
    const [favorites, setFavorites] = useState<FavoriteTrend[]>(() => loadFavorites());

    // Sync with localStorage on changes
    useEffect(() => {
        saveFavorites(favorites);
    }, [favorites]);

    // Check if a trend is favorited
    const isFavorite = useCallback(
        (trendId: string): boolean => {
            return favorites.some((f) => f.id === trendId);
        },
        [favorites]
    );

    // Add a trend to favorites
    const addFavorite = useCallback((trend: TrendData): void => {
        setFavorites((prev) => {
            // Already exists
            if (prev.some((f) => f.id === trend.id)) {
                return prev;
            }

            const newFavorite: FavoriteTrend = {
                id: trend.id,
                title: trend.title,
                subreddit: trend.subreddit,
                category: trend.category,
                nes: trend.nes,
                savedAt: new Date().toISOString(),
            };

            // Limit to max favorites (remove oldest)
            const updated = [newFavorite, ...prev];
            if (updated.length > MAX_FAVORITES) {
                return updated.slice(0, MAX_FAVORITES);
            }
            return updated;
        });
    }, []);

    // Remove a trend from favorites
    const removeFavorite = useCallback((trendId: string): void => {
        setFavorites((prev) => prev.filter((f) => f.id !== trendId));
    }, []);

    // Toggle favorite status
    const toggleFavorite = useCallback(
        (trend: TrendData): void => {
            if (isFavorite(trend.id)) {
                removeFavorite(trend.id);
            } else {
                addFavorite(trend);
            }
        },
        [isFavorite, addFavorite, removeFavorite]
    );

    // Clear all favorites
    const clearFavorites = useCallback((): void => {
        setFavorites([]);
    }, []);

    return {
        favorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        clearFavorites,
        count: favorites.length,
    };
}

export type { FavoriteTrend, UseFavoritesReturn };
