/**
 * PlatformScriptCard Component
 *
 * Displays a platform-specific script with optimizations and metadata.
 * Used in the side-by-side comparison view.
 *
 * @module components/molecules/PlatformScriptCard
 */

import { useState, useCallback } from 'react';
import { Card } from '../atoms';
import type { PlatformScriptResult, Platform } from '../../lib/api';
import { PLATFORM_LABELS, PLATFORM_ICONS, PLATFORM_COLORS } from '../../lib/api';
import { Copy, Check, ChevronDown, ChevronUp, Clock, FileText, AlertCircle, Sparkles, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { AlgorithmEducationPanel } from './AlgorithmEducationPanel';

/**
 * Platform-optimal duration thresholds for warning display
 */
const PLATFORM_DURATION_THRESHOLDS: Record<Platform, { max: number; ideal: number }> = {
    tiktok: { max: 30, ideal: 21 },
    reels: { max: 60, ideal: 30 },
    shorts: { max: 60, ideal: 30 },
};

interface PlatformScriptCardProps {
    /** Platform identifier */
    platform: Platform;
    /** Result for this platform (success or failure) */
    result: PlatformScriptResult | undefined;
    /** Whether generation is in progress */
    isLoading?: boolean;
    /** Callback to retry this platform */
    onRetry?: () => void;
}

/**
 * Section component for script parts
 */
function ScriptSection({
    title,
    content,
    wordCount,
    estimatedSeconds,
    accentColor,
}: {
    title: string;
    content: string;
    wordCount: number;
    estimatedSeconds: number;
    accentColor: string;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy section:', err);
        }
    }, [content]);

    return (
        <div className={`border-l-2 ${accentColor} bg-slate-800/30 rounded-r-lg overflow-hidden`}>
            <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-300 text-sm">{title}</span>
                    <span className="text-xs text-slate-500">
                        {wordCount} kelime • ~{estimatedSeconds}s
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopy();
                        }}
                        className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
                        title="Kopyala"
                    >
                        {copied ? (
                            <Check className="w-3 h-3 text-green-400" />
                        ) : (
                            <Copy className="w-3 h-3" />
                        )}
                    </button>
                    {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    )}
                </div>
            </div>
            {isExpanded && (
                <div className="px-3 pb-2">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {content}
                    </p>
                </div>
            )}
        </div>
    );
}

export function PlatformScriptCard({ platform, result, isLoading, onRetry }: PlatformScriptCardProps) {
    const [copied, setCopied] = useState(false);
    const label = PLATFORM_LABELS[platform];
    const icon = PLATFORM_ICONS[platform];
    const colors = PLATFORM_COLORS[platform];

    const handleCopyAll = useCallback(async () => {
        if (!result?.success) return;
        try {
            await navigator.clipboard.writeText(result.script.script);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [result]);

    // Loading state
    if (isLoading) {
        return (
            <Card padding="md" className="h-full animate-pulse">
                <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient}`}>
                        <span className="text-lg">{icon}</span>
                    </div>
                    <div className="h-5 bg-slate-700 rounded w-24" />
                </div>
                <div className="space-y-3">
                    <div className="h-20 bg-slate-800 rounded" />
                    <div className="h-32 bg-slate-800 rounded" />
                    <div className="h-16 bg-slate-800 rounded" />
                </div>
            </Card>
        );
    }

    // Not generated yet
    if (!result) {
        return (
            <Card padding="md" className="h-full flex flex-col items-center justify-center text-center">
                <div className={`p-3 mb-3 rounded-xl bg-gradient-to-br ${colors.gradient} opacity-50`}>
                    <span className="text-2xl">{icon}</span>
                </div>
                <p className="text-slate-400 text-sm">{label}</p>
                <p className="text-slate-500 text-xs mt-1">Henüz oluşturulmadı</p>
            </Card>
        );
    }

    // Failed state
    if (!result.success) {
        return (
            <Card padding="md" className="h-full border-red-800/50">
                <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient}`}>
                        <span className="text-lg">{icon}</span>
                    </div>
                    <span className="font-semibold text-slate-100">{label}</span>
                </div>
                <div className="flex items-start gap-3 text-red-300 mb-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-sm">Oluşturulamadı</p>
                        <p className="text-xs text-red-400 mt-1">{result.error}</p>
                    </div>
                </div>
                {result.retryable && onRetry && (
                    <button
                        onClick={onRetry}
                        className="w-full px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tekrar Dene
                    </button>
                )}
            </Card>
        );
    }

    // Success state
    const { script } = result;

    return (
        <Card padding="none" className="h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className={`p-3 bg-gradient-to-r ${colors.gradient}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        <span className="font-bold text-white">{label}</span>
                    </div>
                    <button
                        onClick={handleCopyAll}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                        title="Tümünü Kopyala"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 px-3 py-2 border-b border-slate-800 bg-slate-900/50 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                    <FileText className="w-3 h-3" />
                    {script.script.split(/\s+/).length} kelime
                </span>
                {(() => {
                    const thresholds = PLATFORM_DURATION_THRESHOLDS[platform];
                    const duration = script.estimatedDurationSeconds;
                    const isOverMax = duration > thresholds.max;
                    const isAboveIdeal = duration > thresholds.ideal && duration <= thresholds.max;

                    if (isOverMax) {
                        return (
                            <span
                                className="flex items-center gap-1 text-amber-400"
                                title={`Optimal süre ${thresholds.max}s - tamamlama oranı düşebilir`}
                            >
                                <AlertTriangle className="w-3 h-3" />
                                ~{duration}s ({thresholds.max}s önerilir)
                            </span>
                        );
                    }
                    if (isAboveIdeal) {
                        return (
                            <span
                                className="flex items-center gap-1 text-slate-400"
                                title={`${thresholds.ideal}s ideal - kabul edilebilir süre`}
                            >
                                <Clock className="w-3 h-3" />
                                ~{duration}s
                            </span>
                        );
                    }
                    return (
                        <span
                            className="flex items-center gap-1 text-green-400"
                            title="Optimal süre - yüksek tamamlama oranı beklenir"
                        >
                            <CheckCircle className="w-3 h-3" />
                            ~{duration}s ✓
                        </span>
                    );
                })()}
            </div>

            {/* Title */}
            <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-sm font-medium text-slate-200 line-clamp-2">{script.title}</p>
            </div>

            {/* Sections */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {script.sections.hook && (
                    <ScriptSection
                        title="🎣 Hook"
                        content={script.sections.hook.content}
                        wordCount={script.sections.hook.wordCount}
                        estimatedSeconds={script.sections.hook.estimatedSeconds}
                        accentColor="border-amber-500"
                    />
                )}
                <ScriptSection
                    title="📝 Body"
                    content={script.sections.body.content}
                    wordCount={script.sections.body.wordCount}
                    estimatedSeconds={script.sections.body.estimatedSeconds}
                    accentColor="border-indigo-500"
                />
                {script.sections.cta && (
                    <ScriptSection
                        title="📢 CTA"
                        content={script.sections.cta.content}
                        wordCount={script.sections.cta.wordCount}
                        estimatedSeconds={script.sections.cta.estimatedSeconds}
                        accentColor="border-green-500"
                    />
                )}
            </div>

            {/* Optimizations - Compact Summary */}
            <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <Sparkles className="w-3 h-3" />
                    Uygulanan Optimizasyonlar
                </div>
                <div className="flex flex-wrap gap-1">
                    {script.optimizations.slice(0, 3).map((opt, i) => (
                        <span
                            key={i}
                            className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded"
                        >
                            {opt}
                        </span>
                    ))}
                    {script.optimizations.length > 3 && (
                        <span className="text-[10px] text-slate-500">
                            +{script.optimizations.length - 3} daha
                        </span>
                    )}
                </div>
            </div>

            {/* Algorithm Education Panel */}
            <AlgorithmEducationPanel
                platform={platform}
                appliedOptimizations={script.optimizations}
            />

            {/* Hashtags */}
            <div className="px-3 py-2 border-t border-slate-800 flex flex-wrap gap-1">
                {script.hashtags.slice(0, 5).map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 text-[10px] bg-indigo-900/50 text-indigo-300 rounded">
                        {tag}
                    </span>
                ))}
            </div>
        </Card>
    );
}

