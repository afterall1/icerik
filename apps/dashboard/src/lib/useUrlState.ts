/**
 * useUrlState Hook
 * 
 * Bidirectional sync between filterStore and URL search params.
 * Enables deep linking and browser back/forward navigation support.
 * 
 * @module lib/useUrlState
 */

import { useEffect, useRef, useCallback } from 'react';
import { useFilterStore, type SortType, type TimeRange } from '../stores/filterStore';

// ============================================================
// Types
// ============================================================

interface UrlParams {
    category?: string;
    subreddit?: string;
    sort?: SortType;
    time?: TimeRange;
    q?: string;
}

// ============================================================
// Constants
// ============================================================

const VALID_SORT_TYPES: readonly SortType[] = ['hot', 'rising', 'top', 'new'];
const VALID_TIME_RANGES: readonly TimeRange[] = ['hour', 'day', 'week', 'month'];

// ============================================================
// Utility Functions
// ============================================================

/**
 * Parse URL search params into typed object
 */
function parseUrlParams(): UrlParams {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    const result: UrlParams = {};

    const category = params.get('category');
    if (category) result.category = category;

    const subreddit = params.get('subreddit');
    if (subreddit) result.subreddit = subreddit;

    const sort = params.get('sort') as SortType | null;
    if (sort && VALID_SORT_TYPES.includes(sort)) {
        result.sort = sort;
    }

    const time = params.get('time') as TimeRange | null;
    if (time && VALID_TIME_RANGES.includes(time)) {
        result.time = time;
    }

    const q = params.get('q');
    if (q) result.q = q;

    return result;
}

/**
 * Build URL search string from params
 */
function buildUrlString(params: UrlParams): string {
    const searchParams = new URLSearchParams();

    if (params.category) searchParams.set('category', params.category);
    if (params.subreddit) searchParams.set('subreddit', params.subreddit);
    if (params.sort && params.sort !== 'hot') searchParams.set('sort', params.sort);
    if (params.time && params.time !== 'day') searchParams.set('time', params.time);
    if (params.q) searchParams.set('q', params.q);

    const str = searchParams.toString();
    return str ? `?${str}` : '';
}

// ============================================================
// Hook
// ============================================================

interface UseUrlStateOptions {
    /** External search query state (from component) */
    searchQuery?: string;
    /** Callback when URL search query changes */
    onSearchQueryChange?: (query: string) => void;
}

/**
 * Hook to sync filterStore with URL search params
 * 
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * useUrlState({ searchQuery, onSearchQueryChange: setSearchQuery });
 * ```
 */
export function useUrlState(options: UseUrlStateOptions = {}) {
    const { searchQuery, onSearchQueryChange } = options;

    const {
        selectedCategory,
        selectedSubreddit,
        sortType,
        timeRange,
        setSelectedCategory,
        setSelectedSubreddit,
        setSortType,
        setTimeRange,
    } = useFilterStore();

    // Track if we're currently syncing to prevent loops
    const isSyncingRef = useRef(false);
    // Track if initial load has happened
    const isInitializedRef = useRef(false);

    // ============================================================
    // Initialize from URL on mount
    // ============================================================

    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const params = parseUrlParams();
        isSyncingRef.current = true;

        try {
            if (params.category) {
                setSelectedCategory(params.category);
            }
            if (params.subreddit) {
                setSelectedSubreddit(params.subreddit);
            }
            if (params.sort) {
                setSortType(params.sort);
            }
            if (params.time) {
                setTimeRange(params.time);
            }
            if (params.q && onSearchQueryChange) {
                onSearchQueryChange(params.q);
            }
        } finally {
            // Delay to allow state updates to propagate
            setTimeout(() => {
                isSyncingRef.current = false;
            }, 100);
        }
    }, [setSelectedCategory, setSelectedSubreddit, setSortType, setTimeRange, onSearchQueryChange]);

    // ============================================================
    // Sync store changes to URL
    // ============================================================

    const updateUrl = useCallback(() => {
        if (isSyncingRef.current) return;
        if (typeof window === 'undefined') return;

        const newParams: UrlParams = {
            category: selectedCategory || undefined,
            subreddit: selectedSubreddit || undefined,
            sort: sortType,
            time: timeRange,
            q: searchQuery || undefined,
        };

        const newUrl = buildUrlString(newParams);
        const currentUrl = window.location.search || '';

        // Only update if URL actually changed
        if (newUrl !== currentUrl) {
            const fullUrl = `${window.location.pathname}${newUrl}`;
            window.history.replaceState(null, '', fullUrl);
        }
    }, [selectedCategory, selectedSubreddit, sortType, timeRange, searchQuery]);

    // Update URL when any filter changes
    useEffect(() => {
        updateUrl();
    }, [updateUrl]);

    // ============================================================
    // Handle browser back/forward navigation
    // ============================================================

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handlePopState = () => {
            const params = parseUrlParams();
            isSyncingRef.current = true;

            try {
                setSelectedCategory(params.category || null);
                setSelectedSubreddit(params.subreddit || null);

                if (params.sort) {
                    setSortType(params.sort);
                }
                if (params.time) {
                    setTimeRange(params.time);
                }
                if (onSearchQueryChange) {
                    onSearchQueryChange(params.q || '');
                }
            } finally {
                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 100);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [setSelectedCategory, setSelectedSubreddit, setSortType, setTimeRange, onSearchQueryChange]);

    // ============================================================
    // Expose manual URL update for external use
    // ============================================================

    const getShareableUrl = useCallback((): string => {
        if (typeof window === 'undefined') return '';

        const params: UrlParams = {
            category: selectedCategory || undefined,
            subreddit: selectedSubreddit || undefined,
            sort: sortType !== 'hot' ? sortType : undefined,
            time: timeRange !== 'day' ? timeRange : undefined,
            q: searchQuery || undefined,
        };

        return `${window.location.origin}${window.location.pathname}${buildUrlString(params)}`;
    }, [selectedCategory, selectedSubreddit, sortType, timeRange, searchQuery]);

    return {
        /** Get full shareable URL with current filters */
        getShareableUrl,
        /** Current URL params (for debugging) */
        currentParams: parseUrlParams(),
    };
}
