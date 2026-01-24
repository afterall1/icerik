/**
 * useAnalytics Hook
 *
 * Tracks user interactions and script usage analytics.
 * Stores aggregated data in localStorage for performance insights.
 *
 * @module lib/hooks/useAnalytics
 */

import { useCallback, useEffect, useState } from 'react';
import type { Platform } from './api';

const STORAGE_KEY = 'icerik_analytics';

/**
 * Analytics event types
 */
export type AnalyticsEvent =
    | 'script_generated'
    | 'script_copied'
    | 'script_exported'
    | 'script_iterated'
    | 'modal_opened'
    | 'modal_closed'
    | 'trend_favorited'
    | 'trend_unfavorited';

/**
 * Analytics data structure
 */
export interface AnalyticsData {
    // Counters
    totalScriptsGenerated: number;
    totalCopies: number;
    totalExports: number;
    totalIterations: number;
    totalModalOpens: number;
    totalFavorites: number;

    // By platform
    byPlatform: Record<Platform, {
        generated: number;
        copied: number;
        exported: number;
        iterated: number;
    }>;

    // By category
    byCategory: Record<string, number>;

    // Session tracking
    sessionsCount: number;
    lastSessionAt: string;
    totalModalTimeSeconds: number;

    // First/last activity
    firstActivityAt: string;
    lastActivityAt: string;
}

/**
 * Hook return type
 */
interface UseAnalyticsReturn {
    /** Current analytics data */
    data: AnalyticsData;
    /** Track an event */
    track: (event: AnalyticsEvent, metadata?: { platform?: Platform; category?: string }) => void;
    /** Track modal time */
    trackModalTime: (seconds: number) => void;
    /** Get summary statistics */
    getSummary: () => AnalyticsSummary;
    /** Export analytics as JSON */
    exportAnalytics: () => string;
    /** Reset all analytics */
    resetAnalytics: () => void;
}

/**
 * Analytics summary for display
 */
export interface AnalyticsSummary {
    scriptsGenerated: number;
    copyRate: number; // percentage
    exportRate: number; // percentage
    iterationRate: number; // percentage
    avgModalTimeSeconds: number;
    mostUsedPlatform: Platform | null;
    mostUsedCategory: string | null;
}

/**
 * Default analytics data
 */
function getDefaultData(): AnalyticsData {
    return {
        totalScriptsGenerated: 0,
        totalCopies: 0,
        totalExports: 0,
        totalIterations: 0,
        totalModalOpens: 0,
        totalFavorites: 0,
        byPlatform: {
            tiktok: { generated: 0, copied: 0, exported: 0, iterated: 0 },
            reels: { generated: 0, copied: 0, exported: 0, iterated: 0 },
            shorts: { generated: 0, copied: 0, exported: 0, iterated: 0 },
        },
        byCategory: {},
        sessionsCount: 0,
        lastSessionAt: '',
        totalModalTimeSeconds: 0,
        firstActivityAt: '',
        lastActivityAt: '',
    };
}

/**
 * Load analytics from localStorage
 */
function loadAnalytics(): AnalyticsData {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return getDefaultData();
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields
        return { ...getDefaultData(), ...parsed };
    } catch (error) {
        console.error('Failed to load analytics:', error);
        return getDefaultData();
    }
}

/**
 * Save analytics to localStorage
 */
function saveAnalytics(data: AnalyticsData): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save analytics:', error);
    }
}

/**
 * Custom hook for tracking analytics
 *
 * @example
 * const { track, getSummary } = useAnalytics();
 * track('script_copied', { platform: 'tiktok' });
 */
export function useAnalytics(): UseAnalyticsReturn {
    const [data, setData] = useState<AnalyticsData>(() => loadAnalytics());

    // Track new session on mount
    useEffect(() => {
        const now = new Date().toISOString();
        const isNewSession = !data.lastSessionAt ||
            new Date(now).getTime() - new Date(data.lastSessionAt).getTime() > 30 * 60 * 1000; // 30 min

        if (isNewSession) {
            setData((prev) => {
                const updated = {
                    ...prev,
                    sessionsCount: prev.sessionsCount + 1,
                    lastSessionAt: now,
                    firstActivityAt: prev.firstActivityAt || now,
                };
                saveAnalytics(updated);
                return updated;
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Track an event
    const track = useCallback(
        (event: AnalyticsEvent, metadata?: { platform?: Platform; category?: string }): void => {
            setData((prev) => {
                const updated = { ...prev };
                const now = new Date().toISOString();
                updated.lastActivityAt = now;
                if (!updated.firstActivityAt) {
                    updated.firstActivityAt = now;
                }

                // Update counters based on event
                switch (event) {
                    case 'script_generated':
                        updated.totalScriptsGenerated++;
                        if (metadata?.platform) {
                            updated.byPlatform[metadata.platform].generated++;
                        }
                        if (metadata?.category) {
                            updated.byCategory[metadata.category] =
                                (updated.byCategory[metadata.category] || 0) + 1;
                        }
                        break;
                    case 'script_copied':
                        updated.totalCopies++;
                        if (metadata?.platform) {
                            updated.byPlatform[metadata.platform].copied++;
                        }
                        break;
                    case 'script_exported':
                        updated.totalExports++;
                        if (metadata?.platform) {
                            updated.byPlatform[metadata.platform].exported++;
                        }
                        break;
                    case 'script_iterated':
                        updated.totalIterations++;
                        if (metadata?.platform) {
                            updated.byPlatform[metadata.platform].iterated++;
                        }
                        break;
                    case 'modal_opened':
                        updated.totalModalOpens++;
                        break;
                    case 'trend_favorited':
                        updated.totalFavorites++;
                        break;
                    case 'trend_unfavorited':
                        updated.totalFavorites = Math.max(0, updated.totalFavorites - 1);
                        break;
                    default:
                        break;
                }

                saveAnalytics(updated);
                return updated;
            });
        },
        []
    );

    // Track modal time
    const trackModalTime = useCallback((seconds: number): void => {
        setData((prev) => {
            const updated = {
                ...prev,
                totalModalTimeSeconds: prev.totalModalTimeSeconds + seconds,
            };
            saveAnalytics(updated);
            return updated;
        });
    }, []);

    // Get summary statistics
    const getSummary = useCallback((): AnalyticsSummary => {
        const scriptsGenerated = data.totalScriptsGenerated;
        const copyRate = scriptsGenerated > 0 ? (data.totalCopies / scriptsGenerated) * 100 : 0;
        const exportRate = scriptsGenerated > 0 ? (data.totalExports / scriptsGenerated) * 100 : 0;
        const iterationRate = scriptsGenerated > 0 ? (data.totalIterations / scriptsGenerated) * 100 : 0;
        const avgModalTimeSeconds = data.totalModalOpens > 0
            ? data.totalModalTimeSeconds / data.totalModalOpens
            : 0;

        // Find most used platform
        let mostUsedPlatform: Platform | null = null;
        let maxGenerated = 0;
        (Object.entries(data.byPlatform) as [Platform, typeof data.byPlatform[Platform]][]).forEach(
            ([platform, stats]) => {
                if (stats.generated > maxGenerated) {
                    maxGenerated = stats.generated;
                    mostUsedPlatform = platform;
                }
            }
        );

        // Find most used category
        let mostUsedCategory: string | null = null;
        let maxCategory = 0;
        Object.entries(data.byCategory).forEach(([category, count]) => {
            if (count > maxCategory) {
                maxCategory = count;
                mostUsedCategory = category;
            }
        });

        return {
            scriptsGenerated,
            copyRate,
            exportRate,
            iterationRate,
            avgModalTimeSeconds,
            mostUsedPlatform,
            mostUsedCategory,
        };
    }, [data]);

    // Export analytics as JSON
    const exportAnalytics = useCallback((): string => {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            summary: getSummary(),
            data,
        }, null, 2);
    }, [data, getSummary]);

    // Reset all analytics
    const resetAnalytics = useCallback((): void => {
        const fresh = getDefaultData();
        setData(fresh);
        saveAnalytics(fresh);
    }, []);

    return {
        data,
        track,
        trackModalTime,
        getSummary,
        exportAnalytics,
        resetAnalytics,
    };
}

export type { UseAnalyticsReturn };
