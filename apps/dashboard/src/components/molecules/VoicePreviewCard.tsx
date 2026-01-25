/**
 * VoicePreviewCard Component
 * 
 * Card displaying a voice option with preview playback
 * and selection controls. Simplified audio logic for reliability.
 * 
 * @module components/molecules/VoicePreviewCard
 */

import { useState, useRef } from 'react';
import { Play, Pause, Check, Star, User, AlertCircle, Loader2 } from 'lucide-react';
import type { Voice } from '../../lib/voiceTypes';

interface VoicePreviewCardProps {
    /** Voice data */
    voice: Voice;
    /** Whether this voice is selected */
    isSelected?: boolean;
    /** Whether this is the primary voice */
    isPrimary?: boolean;
    /** Callback when selected */
    onSelect?: (voice: Voice) => void;
    /** Callback to set as primary */
    onSetPrimary?: (voice: Voice) => void;
    /** Compact mode */
    compact?: boolean;
}

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'error';

export function VoicePreviewCard({
    voice,
    isSelected = false,
    isPrimary = false,
    onSelect,
    onSetPrimary,
    compact = false,
}: VoicePreviewCardProps) {
    const [status, setStatus] = useState<PlaybackStatus>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dataUrlRef = useRef<string | null>(null);

    // Handle play/pause preview - uses backend-cached base64 data URL
    const handlePlayClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('[VoicePreviewCard] handlePlayClick called for:', voice.name, voice.id);

        // If playing, stop
        if (status === 'playing' && audioRef.current) {
            console.log('[VoicePreviewCard] Stopping playback');
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setStatus('idle');
            return;
        }

        // If already loading, ignore
        if (status === 'loading') {
            console.log('[VoicePreviewCard] Already loading, ignoring click');
            return;
        }

        // Cleanup previous audio
        if (audioRef.current) {
            console.log('[VoicePreviewCard] Cleaning up previous audio');
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current = null;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            // If we already have the data URL cached locally, try to reuse it
            if (dataUrlRef.current) {
                console.log('[VoicePreviewCard] Using cached dataUrl');
                try {
                    const audio = new Audio(dataUrlRef.current);
                    audioRef.current = audio;

                    // Create a promise that rejects on error, resolves on canplaythrough
                    const canPlay = new Promise<void>((resolve, reject) => {
                        audio.oncanplaythrough = () => resolve();
                        audio.onerror = () => reject(new Error(audio.error?.message || 'Playback error'));
                    });

                    audio.onended = () => {
                        console.log('[VoicePreviewCard] Audio ended');
                        setStatus('idle');
                    };

                    audio.load();

                    // Wait for audio to be ready (with timeout)
                    await Promise.race([
                        canPlay,
                        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Load timeout')), 5000))
                    ]);

                    await audio.play();
                    setStatus('playing');
                    console.log('[VoicePreviewCard] Playing from cache');
                    return;
                } catch (cacheError) {
                    // Cache is corrupted or playback failed - clear it and fetch fresh
                    console.error('[VoicePreviewCard] Cached audio failed, clearing cache:', cacheError);
                    dataUrlRef.current = null;
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current = null;
                    }
                    // Fall through to fetch fresh data
                }
            }

            // Fetch base64 data URL from backend (cached for 7 days)
            const url = `/api/voice/preview/${voice.id}?provider=${voice.provider}`;
            console.log('[VoicePreviewCard] Fetching:', url);
            const response = await fetch(url);
            console.log('[VoicePreviewCard] Response status:', response.status);

            if (!response.ok) {
                const text = await response.text();
                console.error('[VoicePreviewCard] HTTP error:', response.status, text);
                throw new Error(`HTTP ${response.status}`);
            }

            const json = await response.json();
            console.log('[VoicePreviewCard] JSON parsed, success:', json.success, 'cached:', json.data?.cached);

            if (!json.success || !json.data?.audio) {
                console.error('[VoicePreviewCard] API error:', json.error);
                throw new Error(json.error || 'No audio data');
            }

            // Store data URL for reuse
            const dataUrl = json.data.audio;
            dataUrlRef.current = dataUrl;
            console.log('[VoicePreviewCard] Data URL length:', dataUrl.length, 'MIME:', dataUrl.split(';')[0]);

            // Create and configure audio element with data URL (no blob needed!)
            const audio = new Audio(dataUrl);
            audioRef.current = audio;

            audio.onloadstart = () => console.log('[VoicePreviewCard] Audio: loadstart');
            audio.onloadedmetadata = () => console.log('[VoicePreviewCard] Audio: loadedmetadata, duration:', audio.duration);
            audio.oncanplay = () => console.log('[VoicePreviewCard] Audio: canplay');
            audio.onended = () => {
                console.log('[VoicePreviewCard] Audio: ended');
                setStatus('idle');
            };
            audio.onerror = (e) => {
                console.error('[VoicePreviewCard] Audio error:', e, 'code:', audio.error?.code, 'message:', audio.error?.message);
                setStatus('error');
                setErrorMsg(audio.error?.message || 'Playback failed');
            };

            // Critical: call load() for React/dynamic src compatibility
            console.log('[VoicePreviewCard] Calling audio.load()');
            audio.load();
            console.log('[VoicePreviewCard] Calling audio.play()');
            await audio.play();
            console.log('[VoicePreviewCard] Playing successfully');
            setStatus('playing');

        } catch (err) {
            console.error('[VoicePreviewCard] Catch error:', err);
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    // Handle card selection
    const handleCardClick = () => {
        if (onSelect) {
            onSelect(voice);
        }
    };

    // Handle set as primary
    const handleSetPrimary = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSetPrimary) {
            onSetPrimary(voice);
        }
    };

    // Provider badge color
    const providerColor = voice.provider === 'elevenlabs'
        ? 'bg-purple-900/50 text-purple-300'
        : 'bg-cyan-900/50 text-cyan-300';

    // Render play button icon based on status
    const renderPlayIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'error':
                return <AlertCircle className="w-4 h-4" />;
            case 'playing':
                return <Pause className="w-4 h-4" />;
            default:
                return <Play className="w-4 h-4 ml-0.5" />;
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className={`
                relative p-3 rounded-lg border transition-all cursor-pointer
                ${isSelected
                    ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }
                ${compact ? 'p-2' : 'p-3'}
            `}
        >
            {/* Primary Badge */}
            {isPrimary && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" fill="currentColor" />
                    Ana Ses
                </div>
            )}

            {/* Selection Indicator */}
            {isSelected && !isPrimary && (
                <div className="absolute -top-2 -right-2 bg-indigo-500 text-white p-1 rounded-full">
                    <Check className="w-3 h-3" />
                </div>
            )}

            <div className="flex items-start gap-3">
                {/* Preview Button */}
                <button
                    onClick={handlePlayClick}
                    disabled={status === 'loading'}
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${status === 'error'
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }
                        transition-colors disabled:opacity-50
                    `}
                    title={status === 'error' ? `Hata: ${errorMsg}` : 'Önizleme'}
                >
                    {renderPlayIcon()}
                </button>

                {/* Voice Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 truncate">
                            {voice.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${providerColor}`}>
                            {voice.provider === 'elevenlabs' ? 'EL' : 'FA'}
                        </span>
                    </div>

                    {!compact && voice.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {voice.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mt-1">
                        {voice.gender && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {voice.gender === 'male' ? 'Erkek' : voice.gender === 'female' ? 'Kadın' : 'Nötr'}
                            </span>
                        )}
                        {voice.category && (
                            <span className="text-[10px] text-slate-500">
                                {voice.category}
                            </span>
                        )}
                        {voice.isCloned && (
                            <span className="text-[10px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">
                                Klonlanmış
                            </span>
                        )}
                    </div>
                </div>

                {/* Set as Primary Button */}
                {onSetPrimary && !isPrimary && (
                    <button
                        onClick={handleSetPrimary}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-900/20 rounded transition-colors"
                        title="Ana Ses Olarak Ayarla"
                    >
                        <Star className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
