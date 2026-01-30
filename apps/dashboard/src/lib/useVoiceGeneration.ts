/**
 * useVoiceGeneration Hook
 * 
 * Manages TTS audio generation with caching and loading states.
 * Integrates with the backend voice API.
 * 
 * @module lib/hooks/useVoiceGeneration
 */

import { useState, useCallback, useRef } from 'react';
import type {
    VoiceProvider,
    VoiceGenerationOptions,
    GeneratedAudio,
} from './voiceTypes';
import { generateTextHash, generateAudioCacheId } from './voiceTypes';
import { sanitizeForTTS } from './textSanitizer';

const API_BASE = '/api';

/**
 * Hook return type
 */
export interface UseVoiceGenerationReturn {
    /** Generate audio from text */
    generateAudio: (
        scriptId: string,
        text: string,
        options: VoiceGenerationOptions
    ) => Promise<Blob | null>;
    /** Check if audio is cached */
    isCached: (scriptId: string, voiceId: string) => boolean;
    /** Get cached audio */
    getCachedAudio: (scriptId: string, voiceId: string) => GeneratedAudio | null;
    /** Clear cache for a script */
    clearCache: (scriptId: string) => void;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: string | null;
    /** Current audio URL (for playback) */
    audioUrl: string | null;
    /** Audio duration in seconds */
    audioDuration: number | null;
    /** Provider used for last generation */
    lastProvider: VoiceProvider | null;
}

/**
 * In-memory audio cache
 */
const audioCache = new Map<string, GeneratedAudio>();

/**
 * Hook for voice generation with caching
 */
export function useVoiceGeneration(): UseVoiceGenerationReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioDuration, setAudioDuration] = useState<number | null>(null);
    const [lastProvider, setLastProvider] = useState<VoiceProvider | null>(null);
    const audioUrlRef = useRef<string | null>(null);

    // Clean up previous blob URL
    const cleanupAudioUrl = useCallback(() => {
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
    }, []);

    // Check if audio is cached
    const isCached = useCallback((scriptId: string, voiceId: string): boolean => {
        const cacheId = generateAudioCacheId(scriptId, voiceId);
        return audioCache.has(cacheId);
    }, []);

    // Get cached audio
    const getCachedAudio = useCallback((scriptId: string, voiceId: string): GeneratedAudio | null => {
        const cacheId = generateAudioCacheId(scriptId, voiceId);
        return audioCache.get(cacheId) || null;
    }, []);

    // Clear cache for a script
    const clearCache = useCallback((scriptId: string): void => {
        const keysToDelete: string[] = [];
        audioCache.forEach((_, key) => {
            if (key.startsWith(scriptId)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => audioCache.delete(key));
    }, []);

    // Generate audio from text
    const generateAudio = useCallback(async (
        scriptId: string,
        text: string,
        options: VoiceGenerationOptions
    ): Promise<Blob | null> => {
        const cacheId = generateAudioCacheId(scriptId, options.voiceId);

        // Check cache first
        const cached = audioCache.get(cacheId);
        if (cached) {
            // Verify text hash matches
            const textHash = generateTextHash(text);
            if (cached.textHash === textHash) {
                cleanupAudioUrl();
                const url = URL.createObjectURL(cached.audioBlob);
                audioUrlRef.current = url;
                setAudioUrl(url);
                setAudioDuration(cached.durationSeconds);
                return cached.audioBlob;
            }
        }

        setIsLoading(true);
        setError(null);
        cleanupAudioUrl();

        try {
            // Sanitize text to remove visual directions like [ZOOM IN], [CUT TO] etc.
            const cleanText = sanitizeForTTS(text);

            const response = await fetch(`${API_BASE}/voice/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: cleanText,
                    voiceId: options.voiceId,
                    provider: options.provider,
                    settings: options.settings,
                    format: options.format || 'mp3',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Generation failed: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const provider = (response.headers.get('X-Voice-Provider') || 'elevenlabs') as VoiceProvider;
            const duration = parseFloat(response.headers.get('X-Audio-Duration') || '0');

            // Cache the audio
            const generatedAudio: GeneratedAudio = {
                id: cacheId,
                scriptId,
                voiceId: options.voiceId,
                platform: 'reels', // Default, could be passed as param
                audioBlob,
                durationSeconds: duration,
                generatedAt: new Date().toISOString(),
                textHash: generateTextHash(text),
            };
            audioCache.set(cacheId, generatedAudio);

            // Create audio URL for playback
            const url = URL.createObjectURL(audioBlob);
            audioUrlRef.current = url;
            setAudioUrl(url);
            setAudioDuration(duration);
            setLastProvider(provider);

            return audioBlob;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Voice generation failed:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [cleanupAudioUrl]);

    return {
        generateAudio,
        isCached,
        getCachedAudio,
        clearCache,
        isLoading,
        error,
        audioUrl,
        audioDuration,
        lastProvider,
    };
}
