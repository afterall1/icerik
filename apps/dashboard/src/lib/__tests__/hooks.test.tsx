/**
 * React Query Hooks Tests
 * 
 * Unit tests for API data fetching hooks.
 * Tests loading states, error handling, and data transformation.
 * 
 * @module lib/__tests__/hooks.test
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import {
    useCategories,
    useTrends,
    useScriptGenerator,
    queryKeys,
} from '../hooks';

// ============================================================
// Test Utilities
// ============================================================

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}

function createWrapper() {
    const testQueryClient = createTestQueryClient();
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={testQueryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

// ============================================================
// Mock Data
// ============================================================

const mockCategories = [
    { id: 'technology', label: 'Teknoloji', subredditCount: 5, videoFormats: ['Explainer'] },
    { id: 'finance', label: 'Finans', subredditCount: 3, videoFormats: ['Analysis'] },
];

const mockTrends = [
    {
        id: 'trend-1',
        title: 'Test Trend 1',
        subreddit: 'technology',
        category: 'technology',
        score: 1000,
        upvoteRatio: 0.95,
        numComments: 100,
        createdUtc: Date.now() / 1000,
        nes: 85.5,
        engagementVelocity: 12.5,
        controversyFactor: 1.2,
        ageHours: 2,
        sourceUrl: 'https://reddit.com/r/technology/1',
        permalink: '/r/technology/comments/1',
        fetchedAt: new Date().toISOString(),
    },
];

const mockGeneratedScript = {
    script: 'Test script content',
    title: 'Test Video Title',
    hashtags: ['#tech', '#viral'],
    estimatedDurationSeconds: 60,
    sections: {
        hook: 'Hook text',
        body: 'Body text',
        cta: 'Call to action',
    },
    metadata: {
        format: 'Explainer' as const,
        platform: 'tiktok',
        generatedAt: new Date().toISOString(),
        trendId: 'trend-1',
        category: 'technology',
    },
};

// ============================================================
// Tests: Query Keys
// ============================================================

describe('queryKeys', () => {
    it('should generate consistent category keys', () => {
        const key1 = queryKeys.categories();
        const key2 = queryKeys.categories();
        expect(key1).toEqual(key2);
        expect(key1).toEqual(['trends', 'categories']);
    });

    it('should generate unique trend keys for different filters', () => {
        const key1 = queryKeys.trends({ category: 'tech' });
        const key2 = queryKeys.trends({ category: 'finance' });
        expect(key1).not.toEqual(key2);
    });

    it('should include all base key in trend keys', () => {
        const key = queryKeys.trends({ category: 'tech' });
        expect(key[0]).toBe('trends');
        expect(key[1]).toBe('list');
    });
});

// ============================================================
// Tests: useCategories
// ============================================================

describe('useCategories', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should fetch categories successfully', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: mockCategories,
                timestamp: new Date().toISOString(),
            }),
        });

        const { result } = renderHook(() => useCategories(), {
            wrapper: createWrapper(),
        });

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockCategories);
        expect(result.current.data).toHaveLength(2);
    });

    it('should handle API errors', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        const { result } = renderHook(() => useCategories(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeDefined();
    });

    it('should handle network errors', async () => {
        (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useCategories(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.error?.message).toContain('Network error');
    });
});

// ============================================================
// Tests: useTrends
// ============================================================

describe('useTrends', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should fetch trends with default filters', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: mockTrends,
                timestamp: new Date().toISOString(),
            }),
        });

        const { result } = renderHook(() => useTrends(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockTrends);
    });

    it('should include category in fetch URL', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: mockTrends,
                timestamp: new Date().toISOString(),
            }),
        });

        renderHook(() => useTrends({ category: 'technology' }), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        const fetchUrl = (global.fetch as Mock).mock.calls[0][0];
        expect(fetchUrl).toContain('category=technology');
    });

    it('should handle empty results', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: [],
                timestamp: new Date().toISOString(),
            }),
        });

        const { result } = renderHook(() => useTrends({ category: 'nonexistent' }), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual([]);
    });

    it('should refetch when filters change', async () => {
        (global.fetch as Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: mockTrends,
                timestamp: new Date().toISOString(),
            }),
        });

        const { result, rerender } = renderHook(
            ({ filters }) => useTrends(filters),
            {
                wrapper: createWrapper(),
                initialProps: { filters: { category: 'tech' } },
            }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        rerender({ filters: { category: 'finance' } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });
});

// ============================================================
// Tests: useScriptGenerator
// ============================================================

describe('useScriptGenerator', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should generate script successfully', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: mockGeneratedScript,
                timestamp: new Date().toISOString(),
            }),
        });

        const { result } = renderHook(() => useScriptGenerator(), {
            wrapper: createWrapper(),
        });

        expect(result.current.isPending).toBe(false);

        result.current.mutate({
            trend: mockTrends[0],
            options: { format: 'Explainer', platform: 'tiktok' },
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.script).toBe('Test script content');
        expect(result.current.data?.hashtags).toContain('#tech');
    });

    it('should handle generation errors', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'AI service unavailable' }),
        });

        const { result } = renderHook(() => useScriptGenerator(), {
            wrapper: createWrapper(),
        });

        result.current.mutate({
            trend: mockTrends[0],
            options: { format: 'Explainer' },
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeDefined();
    });

    it('should not retry on failure', async () => {
        (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useScriptGenerator(), {
            wrapper: createWrapper(),
        });

        result.current.mutate({ trend: mockTrends[0] });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        // Should only be called once (no retry)
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should call correct API endpoint', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: mockGeneratedScript,
                timestamp: new Date().toISOString(),
            }),
        });

        const { result } = renderHook(() => useScriptGenerator(), {
            wrapper: createWrapper(),
        });

        result.current.mutate({ trend: mockTrends[0] });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        const [url, options] = (global.fetch as Mock).mock.calls[0];
        expect(url).toBe('/api/generate-script');
        expect(options.method).toBe('POST');
        expect(options.headers['Content-Type']).toBe('application/json');
    });
});
