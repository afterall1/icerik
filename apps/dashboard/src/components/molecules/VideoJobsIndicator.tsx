/**
 * VideoJobsIndicator Component
 * 
 * Header badge showing active video jobs with expandable dropdown.
 * Provides quick access to job status and actions.
 * 
 * @module components/molecules/VideoJobsIndicator
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Film,
    ChevronDown,
    Download,
    RefreshCw,
    CheckCircle,
    XCircle,
    Loader2,
    Clock,
    Trash2,
    X
} from 'lucide-react';
import { useVideoJobs } from '../../lib/useVideoJobs';
import type { VideoGenerationProgress, VideoJobStatus, Platform } from '../../lib/api';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../lib/api';

// =============================================================================
// Constants
// =============================================================================

const STATUS_CONFIG: Record<VideoJobStatus, {
    color: string;
    bgColor: string;
    icon: 'loading' | 'check' | 'error' | 'clock';
}> = {
    'queued': { color: 'text-slate-400', bgColor: 'bg-slate-700', icon: 'clock' },
    'building-timeline': { color: 'text-blue-400', bgColor: 'bg-blue-900/50', icon: 'loading' },
    'generating-captions': { color: 'text-purple-400', bgColor: 'bg-purple-900/50', icon: 'loading' },
    'composing-video': { color: 'text-indigo-400', bgColor: 'bg-indigo-900/50', icon: 'loading' },
    'encoding': { color: 'text-pink-400', bgColor: 'bg-pink-900/50', icon: 'loading' },
    'complete': { color: 'text-green-400', bgColor: 'bg-green-900/50', icon: 'check' },
    'failed': { color: 'text-red-400', bgColor: 'bg-red-900/50', icon: 'error' },
};

// =============================================================================
// Subcomponents
// =============================================================================

interface JobItemProps {
    job: VideoGenerationProgress;
    onDownload?: (jobId: string) => void;
    onRetry?: (jobId: string) => void;
}

function JobItem({ job, onDownload, onRetry }: JobItemProps) {
    const config = STATUS_CONFIG[job.status];

    // Extract platform from jobId (format: platform_uuid)
    const platformMatch = job.jobId.match(/^(tiktok|reels|shorts)_/);
    const platform = (platformMatch?.[1] || 'tiktok') as Platform;
    const colors = PLATFORM_COLORS[platform];
    const label = PLATFORM_LABELS[platform];

    const renderIcon = () => {
        switch (config.icon) {
            case 'loading':
                return <Loader2 className={`w-4 h-4 ${config.color} animate-spin`} />;
            case 'check':
                return <CheckCircle className={`w-4 h-4 ${config.color}`} />;
            case 'error':
                return <XCircle className={`w-4 h-4 ${config.color}`} />;
            case 'clock':
                return <Clock className={`w-4 h-4 ${config.color}`} />;
        }
    };

    return (
        <div className={`p-2.5 ${config.bgColor} rounded-lg border border-slate-700/50`}>
            <div className="flex items-center gap-2">
                {/* Platform Badge */}
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs bg-gradient-to-br ${colors.gradient}`}>
                    {label.charAt(0)}
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200 truncate">
                            {label} Video
                        </span>
                        {renderIcon()}
                    </div>

                    {/* Progress or Status */}
                    {job.status === 'complete' ? (
                        <span className="text-[10px] text-green-400">Tamamlandı</span>
                    ) : job.status === 'failed' ? (
                        <span className="text-[10px] text-red-400 truncate block">
                            {job.currentStep || 'Hata oluştu'}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500`}
                                    style={{ width: `${job.progress}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                                {Math.round(job.progress)}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {job.status === 'complete' && onDownload && (
                        <button
                            onClick={() => onDownload(job.jobId)}
                            className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition-colors"
                            title="İndir"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {job.status === 'failed' && onRetry && (
                        <button
                            onClick={() => onRetry(job.jobId)}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-900/30 rounded transition-colors"
                            title="Tekrar Dene"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export function VideoJobsIndicator() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        jobs,
        activeJobs,
        completedJobs,
        failedJobs,
        hasActiveJobs,
        activeCount,
        cleanup
    } = useVideoJobs();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Handle download
    const handleDownload = useCallback((jobId: string) => {
        // Find job to get platform
        const job = jobs.find(j => j.jobId === jobId);
        if (!job) return;

        // Create download link
        const link = document.createElement('a');
        link.href = `/api/video/download/${jobId}`;
        link.download = `${jobId}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [jobs]);

    // Handle retry (placeholder - would need to re-trigger generation)
    const handleRetry = useCallback((jobId: string) => {
        // TODO: Implement retry logic
        console.log('Retry job:', jobId);
    }, []);

    // Handle cleanup
    const handleCleanup = useCallback(async () => {
        await cleanup();
    }, [cleanup]);

    // Don't render if no jobs
    if (jobs.length === 0) {
        return null;
    }

    // Badge color based on status
    const badgeColor = hasActiveJobs
        ? 'bg-indigo-600 text-white'
        : failedJobs.length > 0
            ? 'bg-red-600 text-white'
            : 'bg-green-600 text-white';

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    transition-all duration-200
                    ${isOpen
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                    }
                `}
            >
                <Film className={`w-4 h-4 ${hasActiveJobs ? 'animate-pulse' : ''}`} />

                {/* Badge */}
                <span className={`
                    min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
                    flex items-center justify-center
                    ${badgeColor}
                `}>
                    {hasActiveJobs ? activeCount : jobs.length}
                </span>

                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
                        <span className="text-xs font-semibold text-slate-200">
                            Video İşleri
                        </span>
                        <div className="flex items-center gap-1">
                            {(completedJobs.length > 0 || failedJobs.length > 0) && (
                                <button
                                    onClick={handleCleanup}
                                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                                    title="Tamamlananları temizle"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Job Lists */}
                    <div className="max-h-80 overflow-y-auto">
                        {/* Active Jobs */}
                        {activeJobs.length > 0 && (
                            <div className="p-2 space-y-2">
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">
                                    İşleniyor ({activeJobs.length})
                                </span>
                                {activeJobs.map(job => (
                                    <JobItem key={job.jobId} job={job} />
                                ))}
                            </div>
                        )}

                        {/* Completed Jobs */}
                        {completedJobs.length > 0 && (
                            <div className="p-2 space-y-2 border-t border-slate-800">
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">
                                    Tamamlandı ({completedJobs.length})
                                </span>
                                {completedJobs.map(job => (
                                    <JobItem
                                        key={job.jobId}
                                        job={job}
                                        onDownload={handleDownload}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Failed Jobs */}
                        {failedJobs.length > 0 && (
                            <div className="p-2 space-y-2 border-t border-slate-800">
                                <span className="text-[10px] font-medium text-red-500 uppercase tracking-wider px-1">
                                    Hatalı ({failedJobs.length})
                                </span>
                                {failedJobs.map(job => (
                                    <JobItem
                                        key={job.jobId}
                                        job={job}
                                        onRetry={handleRetry}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {jobs.length === 0 && (
                            <div className="p-6 text-center">
                                <Film className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                                <p className="text-xs text-slate-500">Henüz video işi yok</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
