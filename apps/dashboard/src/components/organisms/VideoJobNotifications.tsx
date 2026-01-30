/**
 * VideoJobNotifications Component
 * 
 * Toast notification system for video job events.
 * Shows notifications when jobs complete or fail.
 * 
 * @module components/organisms/VideoJobNotifications
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    CheckCircle,
    XCircle,
    Download,
    RefreshCw,
    X
} from 'lucide-react';
import { useVideoJobs } from '../../lib/useVideoJobs';
import type { VideoGenerationProgress, Platform } from '../../lib/api';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../lib/api';

// =============================================================================
// Types
// =============================================================================

interface Toast {
    id: string;
    type: 'success' | 'error';
    job: VideoGenerationProgress;
    timestamp: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Toast display duration (ms) */
const TOAST_DURATION = 8000;

/** Maximum number of toasts to show */
const MAX_TOASTS = 3;

// =============================================================================
// Toast Item Component
// =============================================================================

interface ToastItemProps {
    toast: Toast;
    onDismiss: (id: string) => void;
    onDownload: (jobId: string) => void;
    onRetry: (jobId: string) => void;
}

function ToastItem({ toast, onDismiss, onDownload, onRetry }: ToastItemProps) {
    const { job, type } = toast;

    // Extract platform from jobId
    const platformMatch = job.jobId.match(/^(tiktok|reels|shorts)_/);
    const platform = (platformMatch?.[1] || 'tiktok') as Platform;
    const colors = PLATFORM_COLORS[platform];
    const label = PLATFORM_LABELS[platform];

    // Auto-dismiss after duration
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div
            className={`
                relative flex items-start gap-3 p-4 rounded-xl
                backdrop-blur-md shadow-xl shadow-black/30
                border animate-slide-in-right
                ${type === 'success'
                    ? 'bg-green-950/90 border-green-800/50'
                    : 'bg-red-950/90 border-red-800/50'
                }
            `}
            style={{
                animation: 'slideInRight 0.3s ease-out',
            }}
        >
            {/* Icon */}
            <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${type === 'success' ? 'bg-green-900/50' : 'bg-red-900/50'}
            `}>
                {type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
                        {type === 'success' ? 'Video tamamlandı!' : 'Video oluşturulamadı'}
                    </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`
                        px-1.5 py-0.5 rounded text-[10px] font-medium
                        bg-gradient-to-r ${colors.gradient} text-white
                    `}>
                        {label}
                    </span>
                    {type === 'error' && job.currentStep && (
                        <span className="text-[10px] text-red-400 truncate">
                            {job.currentStep}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                    {type === 'success' && (
                        <button
                            onClick={() => onDownload(job.jobId)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-800/50 hover:bg-green-800 text-green-200 rounded-lg transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            İndir
                        </button>
                    )}
                    {type === 'error' && (
                        <button
                            onClick={() => onRetry(job.jobId)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-800/50 hover:bg-amber-800 text-amber-200 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Tekrar Dene
                        </button>
                    )}
                </div>
            </div>

            {/* Dismiss Button */}
            <button
                onClick={() => onDismiss(toast.id)}
                className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress Bar (auto-dismiss timer) */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800 rounded-b-xl overflow-hidden">
                <div
                    className={`h-full ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{
                        animation: `shrink ${TOAST_DURATION}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export function VideoJobNotifications() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Add toast
    const addToast = useCallback((type: 'success' | 'error', job: VideoGenerationProgress) => {
        const newToast: Toast = {
            id: `${job.jobId}-${Date.now()}`,
            type,
            job,
            timestamp: Date.now(),
        };

        setToasts(prev => {
            const updated = [newToast, ...prev];
            // Limit max toasts
            return updated.slice(0, MAX_TOASTS);
        });
    }, []);

    // Dismiss toast
    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Handle download
    const handleDownload = useCallback((jobId: string) => {
        const link = document.createElement('a');
        link.href = `/api/video/download/${jobId}`;
        link.download = `${jobId}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    // Handle retry (placeholder)
    const handleRetry = useCallback((jobId: string) => {
        console.log('Retry job:', jobId);
        // TODO: Implement retry logic
    }, []);

    // Subscribe to job events
    useVideoJobs({
        onJobComplete: (job) => addToast('success', job),
        onJobFailed: (job) => addToast('error', job),
    });

    // Don't render if no toasts
    if (toasts.length === 0) {
        return null;
    }

    // Render toast container in a portal
    return createPortal(
        <>
            {/* Animation Keyframes */}
            <style>{`
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes shrink {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={dismissToast}
                        onDownload={handleDownload}
                        onRetry={handleRetry}
                    />
                ))}
            </div>
        </>,
        document.body
    );
}
