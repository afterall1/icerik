/**
 * VideoGenerationButton Component
 * 
 * Compact button to trigger video generation from PlatformScriptCard.
 * Shows visual and audio readiness status.
 * 
 * @module components/molecules/VideoGenerationButton
 */

import { Film, Image, Volume2, AlertCircle } from 'lucide-react';
import type { Platform } from '../../lib/api';

interface VideoGenerationButtonProps {
    /** Platform for this video */
    platform: Platform;
    /** Number of visuals selected */
    visualCount: number;
    /** Whether audio has been generated */
    hasAudio: boolean;
    /** Audio duration in seconds */
    audioDuration?: number;
    /** Click handler */
    onClick: () => void;
    /** Whether button is disabled */
    disabled?: boolean;
    /** Whether generation is in progress */
    isGenerating?: boolean;
}

/**
 * Compact button showing readiness status for video generation
 */
export function VideoGenerationButton({
    platform: _platform,
    visualCount,
    hasAudio,
    audioDuration,
    onClick,
    disabled = false,
    isGenerating = false,
}: VideoGenerationButtonProps) {
    const isReady = visualCount > 0 && hasAudio;

    // Determine button state
    const buttonDisabled = disabled || !isReady || isGenerating;

    // Status indicators
    const visualStatus = visualCount > 0
        ? { color: 'text-green-400', text: `${visualCount} görsel` }
        : { color: 'text-slate-500', text: 'Görsel yok' };

    const audioStatus = hasAudio
        ? { color: 'text-green-400', text: audioDuration ? `${Math.round(audioDuration)}s ses` : 'Ses hazır' }
        : { color: 'text-slate-500', text: 'Ses yok' };

    return (
        <div className="space-y-2">
            {/* Status Row */}
            <div className="flex items-center gap-3 text-xs">
                <span className={`flex items-center gap-1 ${visualStatus.color}`}>
                    <Image className="w-3 h-3" />
                    {visualStatus.text}
                </span>
                <span className={`flex items-center gap-1 ${audioStatus.color}`}>
                    <Volume2 className="w-3 h-3" />
                    {audioStatus.text}
                </span>
            </div>

            {/* Generate Button */}
            <button
                onClick={onClick}
                disabled={buttonDisabled}
                className={`
                    w-full px-3 py-2.5 rounded-lg flex items-center justify-center gap-2
                    text-sm font-medium transition-all duration-200
                    ${isReady && !isGenerating
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-purple-500/25'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }
                    ${isGenerating ? 'animate-pulse' : ''}
                `}
            >
                <Film className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? (
                    <span>Video Oluşturuluyor...</span>
                ) : isReady ? (
                    <span>🎬 Video Oluştur</span>
                ) : (
                    <span>Video Oluştur</span>
                )}
            </button>

            {/* Hint when not ready */}
            {!isReady && !isGenerating && (
                <div className="flex items-start gap-1.5 text-[10px] text-slate-500">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>
                        {visualCount === 0 && !hasAudio
                            ? 'Görsel seçin ve seslendirme yapın'
                            : visualCount === 0
                                ? 'En az 1 görsel seçin'
                                : 'Seslendirme yapın'}
                    </span>
                </div>
            )}
        </div>
    );
}
