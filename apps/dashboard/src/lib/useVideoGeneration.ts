/**
 * useVideoGeneration Hook
 * 
 * State management for video generation workflow.
 * Handles generation, progress polling, and result management.
 * 
 * @module lib/hooks/useVideoGeneration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    videoApi,
    type VideoProjectInput,
    type VideoGenerationResult,
    type VideoGenerationProgress,
} from './api';

const POLL_INTERVAL_MS = 2000;

/**
 * Hook return type
 */
export interface UseVideoGenerationReturn {
    /** Whether generation is in progress */
    isGenerating: boolean;
    /** Current progress (null if not started) */
    progress: VideoGenerationProgress | null;
    /** Generation result (null if not complete) */
    result: VideoGenerationResult | null;
    /** Error message (null if no error) */
    error: string | null;
    /** Start video generation */
    startGeneration: (project: VideoProjectInput) => Promise<void>;
    /** Cancel ongoing generation polling */
    cancelGeneration: () => void;
    /** Reset state to initial */
    reset: () => void;
}

/**
 * Hook for managing video generation workflow
 * 
 * @example
 * const { isGenerating, progress, result, startGeneration } = useVideoGeneration();
 * 
 * // Start generation
 * await startGeneration({
 *     platform: 'tiktok',
 *     title: 'My Video',
 *     script: { hook: '...', body: '...', cta: '...' },
 *     images: { hook: ['url1'], body: ['url2'], cta: ['url3'] },
 *     audio: { voiceoverPath: '/path/to/audio.mp3', voiceoverDuration: 21 },
 * });
 */
export function useVideoGeneration(): UseVideoGenerationReturn {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<VideoGenerationProgress | null>(null);
    const [result, setResult] = useState<VideoGenerationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const jobIdRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, []);

    /**
     * Poll for job status
     */
    const pollStatus = useCallback(async (jobId: string): Promise<void> => {
        try {
            const status = await videoApi.getStatus(jobId);

            if (!isMountedRef.current) return;

            setProgress(status);

            // Check for completion or failure
            if (status.status === 'complete' || status.status === 'failed') {
                // Stop polling
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }

                setIsGenerating(false);

                if (status.status === 'failed') {
                    setError('Video generation failed');
                }
            }
        } catch (err) {
            if (!isMountedRef.current) return;

            console.error('Failed to poll video status:', err);
            // Don't stop polling on temporary errors, but log them
        }
    }, []);

    /**
     * Start video generation
     */
    const startGeneration = useCallback(async (project: VideoProjectInput): Promise<void> => {
        // Reset state
        setIsGenerating(true);
        setProgress(null);
        setResult(null);
        setError(null);

        // Clear any existing poll
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        try {
            // Start generation
            const genResult = await videoApi.generate(project);

            if (!isMountedRef.current) return;

            if (!genResult.success) {
                setError(genResult.error || 'Video generation failed');
                setIsGenerating(false);
                return;
            }

            // Store job ID and result
            jobIdRef.current = genResult.jobId;
            setResult(genResult);

            // Set initial progress
            setProgress({
                jobId: genResult.jobId,
                status: 'queued',
                progress: 0,
                currentStep: 'Starting...',
            });

            // Start polling for status
            pollIntervalRef.current = setInterval(() => {
                if (jobIdRef.current) {
                    pollStatus(jobIdRef.current);
                }
            }, POLL_INTERVAL_MS);

            // Initial poll
            await pollStatus(genResult.jobId);

        } catch (err) {
            if (!isMountedRef.current) return;

            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            setIsGenerating(false);
        }
    }, [pollStatus]);

    /**
     * Cancel ongoing generation polling
     */
    const cancelGeneration = useCallback((): void => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        jobIdRef.current = null;
        setIsGenerating(false);
    }, []);

    /**
     * Reset state to initial
     */
    const reset = useCallback((): void => {
        cancelGeneration();
        setProgress(null);
        setResult(null);
        setError(null);
    }, [cancelGeneration]);

    return {
        isGenerating,
        progress,
        result,
        error,
        startGeneration,
        cancelGeneration,
        reset,
    };
}
