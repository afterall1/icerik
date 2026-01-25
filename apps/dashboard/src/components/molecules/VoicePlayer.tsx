/**
 * VoicePlayer Component
 * 
 * Audio player for generated voiceovers with play/pause,
 * progress, and download controls.
 * 
 * @module components/molecules/VoicePlayer
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Download, RefreshCw, Volume2, VolumeX } from 'lucide-react';

interface VoicePlayerProps {
    /** Audio source URL */
    audioUrl: string | null;
    /** Audio duration in seconds */
    duration?: number;
    /** Provider used */
    provider?: 'elevenlabs' | 'fishaudio';
    /** Loading state */
    isLoading?: boolean;
    /** Error message */
    error?: string | null;
    /** Callback to regenerate */
    onRegenerate?: () => void;
    /** Compact mode */
    compact?: boolean;
}

/**
 * Format seconds to mm:ss
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoicePlayer({
    audioUrl,
    duration = 0,
    provider,
    isLoading = false,
    error = null,
    onRegenerate,
    compact = false,
}: VoicePlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [actualDuration, setActualDuration] = useState(duration);
    const [isMuted, setIsMuted] = useState(false);

    // Reset state when audio URL changes
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, [audioUrl]);

    // Handle play/pause
    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    // Handle time update
    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    }, []);

    // Handle loaded metadata
    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current && audioRef.current.duration) {
            setActualDuration(audioRef.current.duration);
        }
    }, []);

    // Handle ended
    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    // Handle seek
    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const time = parseFloat(e.target.value);
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, []);

    // Handle mute toggle
    const toggleMute = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    // Handle download
    const handleDownload = useCallback(() => {
        if (!audioUrl) return;

        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `voiceover_${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [audioUrl]);

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 ${compact ? 'p-2' : 'p-3'} bg-slate-800/50 rounded-lg border border-slate-700`}>
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center animate-pulse">
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1">
                    <div className="h-2 bg-slate-700 rounded animate-pulse" />
                </div>
                <span className="text-xs text-slate-400">Oluşturuluyor...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`flex items-center gap-2 ${compact ? 'p-2' : 'p-3'} bg-red-900/20 rounded-lg border border-red-800/50`}>
                <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                    <VolumeX className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-red-400">{error}</p>
                </div>
                {onRegenerate && (
                    <button
                        onClick={onRegenerate}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                        title="Tekrar Dene"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    }

    // No audio state
    if (!audioUrl) {
        return null;
    }

    const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

    return (
        <div className={`${compact ? 'p-2' : 'p-3'} bg-slate-800/50 rounded-lg border border-slate-700`}>
            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                    {isPlaying ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                    )}
                </button>

                {/* Progress Bar */}
                <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-10">
                        {formatTime(currentTime)}
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={actualDuration || 1}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-3
                            [&::-webkit-slider-thumb]:h-3
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-indigo-500
                            [&::-webkit-slider-thumb]:hover:bg-indigo-400"
                        style={{
                            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${progress}%, #334155 ${progress}%, #334155 100%)`,
                        }}
                    />
                    <span className="text-xs text-slate-400 w-10 text-right">
                        {formatTime(actualDuration)}
                    </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                        title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
                    >
                        {isMuted ? (
                            <VolumeX className="w-4 h-4" />
                        ) : (
                            <Volume2 className="w-4 h-4" />
                        )}
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                        title="İndir"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    {/* Regenerate Button */}
                    {onRegenerate && (
                        <button
                            onClick={onRegenerate}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                            title="Yeniden Oluştur"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Provider Badge */}
            {provider && !compact && (
                <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${provider === 'elevenlabs'
                            ? 'bg-purple-900/50 text-purple-300'
                            : 'bg-cyan-900/50 text-cyan-300'
                        }`}>
                        {provider === 'elevenlabs' ? 'ElevenLabs' : 'Fish Audio'}
                    </span>
                </div>
            )}
        </div>
    );
}
