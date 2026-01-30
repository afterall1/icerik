/**
 * VideoProgressIndicator Component
 * 
 * Progress bar with step indicators for video generation.
 * Shows current status and estimated time remaining.
 * 
 * @module components/molecules/VideoProgressIndicator
 */

import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react';
import type { VideoGenerationProgress, VideoJobStatus } from '../../lib/api';
import { VIDEO_STATUS_STEPS } from '../../lib/api';

interface VideoProgressIndicatorProps {
    /** Current progress */
    progress: VideoGenerationProgress;
    /** Compact mode (for inline display) */
    compact?: boolean;
}

/**
 * Get step state based on current status
 */
function getStepState(
    stepStatus: VideoJobStatus,
    currentStatus: VideoJobStatus
): 'completed' | 'current' | 'pending' | 'failed' {
    const stepOrder = VIDEO_STATUS_STEPS.findIndex(s => s.status === stepStatus);
    const currentOrder = VIDEO_STATUS_STEPS.findIndex(s => s.status === currentStatus);

    if (currentStatus === 'failed') {
        return stepOrder <= currentOrder ? 'failed' : 'pending';
    }

    if (stepOrder < currentOrder) return 'completed';
    if (stepOrder === currentOrder) return 'current';
    return 'pending';
}

/**
 * Step indicator component
 */
function StepIndicator({
    status: _status,
    label,
    emoji,
    state,
    compact,
}: {
    status: VideoJobStatus;
    label: string;
    emoji: string;
    state: 'completed' | 'current' | 'pending' | 'failed';
    compact?: boolean;
}) {
    const iconSize = compact ? 'w-3 h-3' : 'w-4 h-4';

    return (
        <div
            className={`
                flex items-center gap-1
                ${compact ? 'text-[10px]' : 'text-xs'}
                ${state === 'completed' ? 'text-green-400' : ''}
                ${state === 'current' ? 'text-indigo-400' : ''}
                ${state === 'pending' ? 'text-slate-500' : ''}
                ${state === 'failed' ? 'text-red-400' : ''}
            `}
        >
            {state === 'completed' && <CheckCircle className={iconSize} />}
            {state === 'current' && <Loader2 className={`${iconSize} animate-spin`} />}
            {state === 'pending' && <Circle className={iconSize} />}
            {state === 'failed' && <XCircle className={iconSize} />}
            {!compact && <span>{emoji}</span>}
            <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
        </div>
    );
}

/**
 * Progress bar with step indicators
 */
export function VideoProgressIndicator({
    progress,
    compact = false,
}: VideoProgressIndicatorProps) {
    const { status, progress: percent, currentStep, estimatedTimeRemaining } = progress;

    // Filter out failed state from display steps (show only workflow steps)
    const displaySteps = VIDEO_STATUS_STEPS.filter(s => s.status !== 'failed');

    // Format estimated time
    const formatTime = (seconds?: number): string => {
        if (!seconds) return '';
        if (seconds < 60) return `~${Math.round(seconds)}s kaldı`;
        return `~${Math.round(seconds / 60)}dk kaldı`;
    };

    if (compact) {
        return (
            <div className="space-y-1.5">
                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${status === 'failed'
                                ? 'bg-red-500'
                                : status === 'complete'
                                    ? 'bg-green-500'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                }`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">
                        {Math.round(percent)}%
                    </span>
                </div>

                {/* Current Step */}
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{currentStep}</span>
                    {estimatedTimeRemaining && (
                        <span className="text-slate-500">{formatTime(estimatedTimeRemaining)}</span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">
                    {status === 'complete'
                        ? '✅ Video Tamamlandı!'
                        : status === 'failed'
                            ? '❌ Hata Oluştu'
                            : '🎬 Video Oluşturuluyor...'}
                </span>
                {estimatedTimeRemaining && status !== 'complete' && status !== 'failed' && (
                    <span className="text-xs text-slate-400">
                        {formatTime(estimatedTimeRemaining)}
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${status === 'failed'
                        ? 'bg-red-500'
                        : status === 'complete'
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                        }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>

            {/* Percentage */}
            <div className="text-center">
                <span className="text-2xl font-bold text-slate-100">
                    {Math.round(percent)}%
                </span>
            </div>

            {/* Current Step Description */}
            <div className="text-center text-sm text-slate-400">
                {currentStep}
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                {displaySteps.map((step) => (
                    <StepIndicator
                        key={step.status}
                        status={step.status}
                        label={step.label}
                        emoji={step.emoji}
                        state={getStepState(step.status, status)}
                    />
                ))}
            </div>
        </div>
    );
}
