/**
 * useVideoJobs Hook
 * 
 * Global hook for tracking all video generation jobs.
 * Provides polling, job categorization, and lifecycle management.
 * 
 * @module lib/useVideoJobs
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { videoApi, type VideoGenerationProgress, type VideoJobStatus } from './api';

// =============================================================================
// Constants
// =============================================================================

/** Polling interval for job status (ms) */
const POLLING_INTERVAL = 30000;

/** Active job statuses */
const ACTIVE_STATUSES: VideoJobStatus[] = [
    'queued',
    'building-timeline',
    'generating-captions',
    'composing-video',
    'encoding'
];

// =============================================================================
// Types
// =============================================================================

export interface VideoJobEvent {
    type: 'started' | 'completed' | 'failed';
    job: VideoGenerationProgress;
    timestamp: Date;
}

export interface UseVideoJobsOptions {
    /** Enable polling */
    enabled?: boolean;
    /** Callback when job completes */
    onJobComplete?: (job: VideoGenerationProgress) => void;
    /** Callback when job fails */
    onJobFailed?: (job: VideoGenerationProgress) => void;
}

export interface UseVideoJobsReturn {
    /** All jobs */
    jobs: VideoGenerationProgress[];
    /** Jobs currently processing */
    activeJobs: VideoGenerationProgress[];
    /** Successfully completed jobs */
    completedJobs: VideoGenerationProgress[];
    /** Failed jobs */
    failedJobs: VideoGenerationProgress[];
    /** Whether any jobs are active */
    hasActiveJobs: boolean;
    /** Count of active jobs */
    activeCount: number;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: string | null;
    /** Manual refetch */
    refetch: () => Promise<void>;
    /** Cleanup completed jobs */
    cleanup: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useVideoJobs(options: UseVideoJobsOptions = {}): UseVideoJobsReturn {
    const { enabled = true, onJobComplete, onJobFailed } = options;

    const [jobs, setJobs] = useState<VideoGenerationProgress[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track previous job states to detect transitions
    const previousJobsRef = useRef<Map<string, VideoJobStatus>>(new Map());
    const isVisibleRef = useRef(true);
    const isFetchingRef = useRef(false);

    // Store callbacks in refs to avoid re-creating fetchJobs
    const onJobCompleteRef = useRef(onJobComplete);
    const onJobFailedRef = useRef(onJobFailed);

    // Update refs when callbacks change
    useEffect(() => {
        onJobCompleteRef.current = onJobComplete;
        onJobFailedRef.current = onJobFailed;
    }, [onJobComplete, onJobFailed]);

    // Categorize jobs
    const { activeJobs, completedJobs, failedJobs } = useMemo(() => {
        const active: VideoGenerationProgress[] = [];
        const completed: VideoGenerationProgress[] = [];
        const failed: VideoGenerationProgress[] = [];

        for (const job of jobs) {
            if (ACTIVE_STATUSES.includes(job.status)) {
                active.push(job);
            } else if (job.status === 'complete') {
                completed.push(job);
            } else if (job.status === 'failed') {
                failed.push(job);
            }
        }

        return { activeJobs: active, completedJobs: completed, failedJobs: failed };
    }, [jobs]);

    const hasActiveJobs = activeJobs.length > 0;
    const activeCount = activeJobs.length;

    // Fetch jobs from API - stable reference
    const fetchJobs = useCallback(async () => {
        if (!enabled || isFetchingRef.current) return;

        try {
            isFetchingRef.current = true;
            setIsLoading(true);
            const fetchedJobs = await videoApi.getJobs();

            // Detect job state transitions
            const previousJobs = previousJobsRef.current;

            for (const job of fetchedJobs) {
                const previousStatus = previousJobs.get(job.jobId);

                // Job just completed
                if (previousStatus && ACTIVE_STATUSES.includes(previousStatus) && job.status === 'complete') {
                    onJobCompleteRef.current?.(job);
                }

                // Job just failed
                if (previousStatus && ACTIVE_STATUSES.includes(previousStatus) && job.status === 'failed') {
                    onJobFailedRef.current?.(job);
                }

                // Update previous state
                previousJobs.set(job.jobId, job.status);
            }

            setJobs(fetchedJobs);
            setError(null);
        } catch (err) {
            // Don't spam error state on network issues
            console.error('[useVideoJobs] Fetch failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
        } finally {
            isFetchingRef.current = false;
            setIsLoading(false);
        }
    }, [enabled]); // Only enabled as dependency - callbacks are in refs

    // Cleanup completed jobs
    const cleanup = useCallback(async () => {
        try {
            await videoApi.cleanup();
            await fetchJobs();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cleanup jobs');
        }
    }, [fetchJobs]);

    // Handle visibility change (pause polling when tab hidden)
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === 'visible';

            // Immediately fetch when becoming visible
            if (isVisibleRef.current && enabled) {
                fetchJobs();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled, fetchJobs]);

    // Polling effect - use refs to avoid infinite loop
    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        fetchJobs();

        // Dynamic polling - check hasActiveJobs via jobs state length
        // Use a single interval that adjusts internally
        let pollerId: NodeJS.Timeout | null = null;

        const startPolling = () => {
            // Clear existing interval
            if (pollerId) {
                clearInterval(pollerId);
            }

            // Use idle polling - active polling is only needed if we have active jobs
            // Check this dynamically in the interval callback
            pollerId = setInterval(() => {
                if (!isVisibleRef.current) return;
                fetchJobs();
            }, POLLING_INTERVAL); // Default to 30s - we don't need aggressive polling
        };

        startPolling();

        return () => {
            if (pollerId) {
                clearInterval(pollerId);
            }
        };
    }, [enabled, fetchJobs]); // Removed hasActiveJobs - this was causing infinite loop!

    return {
        jobs,
        activeJobs,
        completedJobs,
        failedJobs,
        hasActiveJobs,
        activeCount,
        isLoading,
        error,
        refetch: fetchJobs,
        cleanup
    };
}

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * Hook to get a specific job's progress
 */
export function useVideoJobProgress(jobId: string | null): VideoGenerationProgress | null {
    const { jobs } = useVideoJobs({ enabled: !!jobId });
    return useMemo(() =>
        jobId ? jobs.find(j => j.jobId === jobId) || null : null,
        [jobs, jobId]
    );
}
