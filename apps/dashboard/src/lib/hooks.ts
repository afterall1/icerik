/**
 * React Query Hooks for API Data Fetching
 * 
 * Provides type-safe hooks for fetching data from the Trend Engine API.
 * Includes automatic caching, refetching, and loading states.
 * 
 * @module lib/hooks
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api, type Category, type Subreddit, type TrendData, type EngineStatus } from './api';

/**
 * Query key factory for consistent key management
 */
export const queryKeys = {
    all: ['trends'] as const,
    categories: () => [...queryKeys.all, 'categories'] as const,
    subreddits: (category?: string) => [...queryKeys.all, 'subreddits', { category }] as const,
    trends: (filters: TrendFilters) => [...queryKeys.all, 'list', filters] as const,
    status: () => [...queryKeys.all, 'status'] as const,
    health: () => [...queryKeys.all, 'health'] as const,
};

/**
 * Filter options for trend queries
 */
export interface TrendFilters {
    category?: string;
    subreddit?: string;
    sortType?: string;
    timeRange?: string;
    minUpvotes?: number;
    minComments?: number;
    limit?: number;
}

/**
 * Default stale times for different query types
 */
const STALE_TIMES = {
    categories: 5 * 60 * 1000, // 5 minutes
    subreddits: 5 * 60 * 1000, // 5 minutes  
    trends: 1 * 60 * 1000,     // 1 minute
    status: 30 * 1000,          // 30 seconds
    health: 10 * 1000,          // 10 seconds
};

/**
 * Hook to fetch all categories
 */
export function useCategories(options?: Omit<UseQueryOptions<Category[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.categories(),
        queryFn: () => api.getCategories(),
        staleTime: STALE_TIMES.categories,
        ...options,
    });
}

/**
 * Hook to fetch subreddits, optionally filtered by category
 */
export function useSubreddits(
    category?: string,
    options?: Omit<UseQueryOptions<Subreddit[], Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.subreddits(category),
        queryFn: () => api.getSubreddits(category),
        staleTime: STALE_TIMES.subreddits,
        ...options,
    });
}

/**
 * Hook to fetch trends with filters
 */
export function useTrends(
    filters: TrendFilters = {},
    options?: Omit<UseQueryOptions<TrendData[], Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.trends(filters),
        queryFn: () => api.getTrends(filters),
        staleTime: STALE_TIMES.trends,
        ...options,
    });
}

/**
 * Hook to fetch engine status
 */
export function useEngineStatus(
    options?: Omit<UseQueryOptions<EngineStatus, Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.status(),
        queryFn: () => api.getStatus(),
        staleTime: STALE_TIMES.status,
        refetchInterval: 30000, // Auto-refetch every 30 seconds
        ...options,
    });
}

/**
 * Hook to fetch health status
 */
export function useHealth(
    options?: Omit<UseQueryOptions<{ status: string; rateLimit: { isHealthy: boolean } }, Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.health(),
        queryFn: () => api.getHealth(),
        staleTime: STALE_TIMES.health,
        refetchInterval: 10000, // Auto-refetch every 10 seconds
        ...options,
    });
}

/**
 * Hook to invalidate and refetch trends
 */
export function useRefreshTrends() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.all });
        },
    });
}

/**
 * Hook to prefetch trends for a category
 */
export function usePrefetchTrends() {
    const queryClient = useQueryClient();

    return (filters: TrendFilters) => {
        return queryClient.prefetchQuery({
            queryKey: queryKeys.trends(filters),
            queryFn: () => api.getTrends(filters),
            staleTime: STALE_TIMES.trends,
        });
    };
}

/**
 * Hook to check if any trend queries are loading
 */
export function useTrendsLoading() {
    const queryClient = useQueryClient();
    return queryClient.isFetching({ queryKey: queryKeys.all }) > 0;
}
