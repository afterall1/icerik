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
    const blobUrlRef = useRef<string | null>(null);

    // Handle play/pause preview - simplified logic matching test page
    const handlePlayClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // If playing, stop
        if (status === 'playing' && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setStatus('idle');
            return;
        }

        // If already loading, ignore
        if (status === 'loading') return;

        // Cleanup previous audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current = null;
        }
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            // Fetch audio from proxy endpoint
            const url = `http://localhost:3000/api/voice/preview/${voice.id}?provider=${voice.provider}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const buffer = await response.arrayBuffer();

            if (buffer.byteLength < 100) {
                throw new Error('Audio data too small');
            }

            // Create blob with explicit MIME type
            const blob = new Blob([buffer], { type: 'audio/mpeg' });
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;

            // Create and configure audio element
            const audio = new Audio(blobUrl);
            audioRef.current = audio;

            audio.onended = () => setStatus('idle');
            audio.onerror = () => {
                setStatus('error');
                setErrorMsg('Playback failed');
            };

            // Play
            await audio.play();
            setStatus('playing');

        } catch (err) {
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
