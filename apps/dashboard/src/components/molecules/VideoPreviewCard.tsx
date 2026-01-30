/**
 * VideoPreviewCard Component
 * 
 * Displays completed video with preview and download options.
 * Shows metadata like duration and file size.
 * 
 * @module components/molecules/VideoPreviewCard
 */

import { useState, useRef } from 'react';
import { Download, RefreshCw, Play, Pause, CheckCircle, Film, Clock, HardDrive } from 'lucide-react';
import type { VideoGenerationResult, Platform } from '../../lib/api';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../lib/api';

interface VideoPreviewCardProps {
    /** Generation result */
    result: VideoGenerationResult;
    /** Platform for theming */
    platform: Platform;
    /** Callback to regenerate video */
    onRegenerate?: () => void;
    /** Callback when download is clicked */
    onDownload?: () => void;
    /** Compact mode */
    compact?: boolean;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration for display
 */
function formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
}

/**
 * Video preview card with playback controls
 */
export function VideoPreviewCard({
    result,
    platform,
    onRegenerate,
    onDownload,
    compact = false,
}: VideoPreviewCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const colors = PLATFORM_COLORS[platform];
    const label = PLATFORM_LABELS[platform];

    const handlePlayPause = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleDownload = () => {
        if (!result.outputPath) return;

        // Create download link
        const link = document.createElement('a');
        link.href = `/api/video/download/${result.jobId}`;
        link.download = `${platform}_video_${result.jobId}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (onDownload) {
            onDownload();
        }
    };

    if (!result.success) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                    <Film className="w-4 h-4" />
                    <span className="text-sm font-medium">Video oluşturulamadı</span>
                </div>
                {result.error && (
                    <p className="text-xs text-red-400/70 mt-1">{result.error}</p>
                )}
                {onRegenerate && (
                    <button
                        onClick={onRegenerate}
                        className="mt-3 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1.5 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Tekrar Dene
                    </button>
                )}
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex items-center justify-between p-2 bg-green-900/20 border border-green-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Video Hazır</span>
                    <span className="text-[10px] text-slate-500">
                        {formatDuration(result.duration)} • {formatFileSize(result.fileSize)}
                    </span>
                </div>
                <button
                    onClick={handleDownload}
                    className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-1 transition-colors"
                >
                    <Download className="w-3 h-3" />
                    İndir
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            {/* Video Preview Area */}
            <div className="relative aspect-[9/16] max-h-80 bg-black">
                {result.outputPath ? (
                    <>
                        <video
                            ref={videoRef}
                            src={`/api/video/stream/${result.jobId}`}
                            className="w-full h-full object-contain"
                            onEnded={() => setIsPlaying(false)}
                            playsInline
                        />
                        {/* Play/Pause Overlay */}
                        <button
                            onClick={handlePlayPause}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                        >
                            {isPlaying ? (
                                <Pause className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <Play className="w-12 h-12 text-white" />
                            )}
                        </button>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <Film className="w-12 h-12 mb-2" />
                        <span className="text-sm">Önizleme mevcut değil</span>
                    </div>
                )}

                {/* Platform Badge */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${colors.gradient} text-white`}>
                    {label}
                </div>
            </div>

            {/* Info Bar */}
            <div className="p-3 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(result.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatFileSize(result.fileSize)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs">Tamamlandı</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        İndir
                    </button>
                    {onRegenerate && (
                        <button
                            onClick={onRegenerate}
                            className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Yeniden
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
