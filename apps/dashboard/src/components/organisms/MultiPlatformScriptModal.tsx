/**
 * MultiPlatformScriptModal Component
 *
 * Full-featured modal for generating AI video scripts for multiple platforms.
 * Displays side-by-side comparison of TikTok, Reels, and Shorts scripts.
 *
 * @module components/organisms/MultiPlatformScriptModal
 */

import { useState, useEffect, useCallback } from 'react';
import { useMultiPlatformScripts, useRetryFailedPlatforms, useBatchScoreScripts } from '../../lib/hooks';
import { Button, Card } from '../atoms';
import { PlatformScriptCard } from '../molecules';
import type { TrendData, Platform, MultiPlatformOptions } from '../../lib/api';
import { ALL_PLATFORMS, PLATFORM_LABELS } from '../../lib/api';
import { X, Sparkles, Loader2, Zap, RotateCcw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface MultiPlatformScriptModalProps {
    /** Trend data to generate scripts from */
    trend: TrendData;
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
}

/**
 * Tone options for selection
 */
const TONE_OPTIONS: Array<{ value: MultiPlatformOptions['tone']; label: string }> = [
    { value: 'casual', label: 'Samimi' },
    { value: 'professional', label: 'Profesyonel' },
    { value: 'humorous', label: 'Eğlenceli' },
    { value: 'dramatic', label: 'Dramatik' },
];

/**
 * Language options
 */
const LANGUAGE_OPTIONS: Array<{ value: MultiPlatformOptions['language']; label: string }> = [
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' },
];

/**
 * Platform-specific optimal duration configuration
 * Based on algorithm research and platform best practices
 */
const PLATFORM_OPTIMAL_DURATIONS: Record<Platform, { min: number; max: number; ideal: number; label: string }> = {
    tiktok: { min: 15, max: 30, ideal: 21, label: 'TikTok' },
    reels: { min: 15, max: 60, ideal: 30, label: 'Reels' },
    shorts: { min: 15, max: 60, ideal: 30, label: 'Shorts' },
};

/**
 * Get smart default duration based on selected platforms
 * Uses the shortest ideal duration to optimize for all platforms
 */
function getSmartDefaultDuration(platforms: Platform[]): number {
    if (platforms.length === 0) return 30;
    if (platforms.length === 1) {
        return PLATFORM_OPTIMAL_DURATIONS[platforms[0]].ideal;
    }
    // Multiple platforms: use the shortest ideal (usually TikTok's 21s)
    return Math.min(...platforms.map(p => PLATFORM_OPTIMAL_DURATIONS[p].ideal));
}

/**
 * Check if duration is optimal for given platforms
 */
function getDurationStatus(duration: number, platforms: Platform[]): {
    status: 'optimal' | 'acceptable' | 'warning';
    message: string;
} {
    const platformsOverMax = platforms.filter(p => duration > PLATFORM_OPTIMAL_DURATIONS[p].max);
    const platformsAboveIdeal = platforms.filter(p =>
        duration > PLATFORM_OPTIMAL_DURATIONS[p].ideal &&
        duration <= PLATFORM_OPTIMAL_DURATIONS[p].max
    );

    if (platformsOverMax.length > 0) {
        const names = platformsOverMax.map(p => PLATFORM_OPTIMAL_DURATIONS[p].label).join(', ');
        return {
            status: 'warning',
            message: `${names} için optimal sürenin üzerinde (tamamlama oranı düşebilir)`,
        };
    }

    if (platformsAboveIdeal.length > 0) {
        const names = platformsAboveIdeal.map(p => PLATFORM_OPTIMAL_DURATIONS[p].label).join(', ');
        return {
            status: 'acceptable',
            message: `${names} için idealin üzerinde ama kabul edilebilir`,
        };
    }

    return {
        status: 'optimal',
        message: 'Tüm platformlar için optimal süre',
    };
}

/**
 * Duration presets with platform recommendations
 */
const DURATION_PRESETS = [
    { value: 15, label: '15s', recommended: ['tiktok', 'reels', 'shorts'] },
    { value: 21, label: '21s ⭐', recommended: ['tiktok'] }, // TikTok sweet spot
    { value: 30, label: '30s', recommended: ['reels', 'shorts'] },
    { value: 45, label: '45s', recommended: [] },
    { value: 60, label: '60s', recommended: [] },
];

/**
 * Default options - will be overridden by smart defaults
 */
const DEFAULT_OPTIONS: MultiPlatformOptions = {
    platforms: [...ALL_PLATFORMS],
    durationSeconds: 21, // Changed to TikTok optimal
    tone: 'casual',
    language: 'tr',
    includeHook: true,
    includeCta: true,
};

export function MultiPlatformScriptModal({ trend, isOpen, onClose }: MultiPlatformScriptModalProps) {
    const [options, setOptions] = useState<MultiPlatformOptions>(DEFAULT_OPTIONS);
    const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set(ALL_PLATFORMS));

    const {
        mutate: generateScripts,
        data: result,
        isPending,
        error,
        reset,
    } = useMultiPlatformScripts();

    const {
        mutate: retryFailed,
        isPending: isRetrying,
    } = useRetryFailedPlatforms();

    // Batch scoring hook for auto-score after generation
    const {
        mutate: batchScore,
        data: scoreResults,
        isPending: isScoring,
        reset: resetScores,
    } = useBatchScoreScripts();

    // Reset on open with smart duration default
    useEffect(() => {
        if (isOpen) {
            reset();
            resetScores();
            setSelectedPlatforms(new Set(ALL_PLATFORMS));
            // Set smart default duration based on all platforms
            const smartDuration = getSmartDefaultDuration([...ALL_PLATFORMS]);
            setOptions(prev => ({ ...prev, durationSeconds: smartDuration }));
        }
    }, [isOpen, reset, resetScores]);

    // Auto-score scripts after successful generation
    useEffect(() => {
        if (result && result.metadata.successCount > 0) {
            // Collect successful scripts for batch scoring
            const successfulScripts = Object.values(result.results)
                .filter((r): r is Extract<typeof r, { success: true }> =>
                    r !== undefined && r.success === true
                )
                .map(r => r.script);

            if (successfulScripts.length > 0) {
                batchScore(successfulScripts);
            }
        }
    }, [result, batchScore]);

    // Update duration when platforms change
    useEffect(() => {
        const platforms = Array.from(selectedPlatforms);
        const smartDuration = getSmartDefaultDuration(platforms);
        setOptions(prev => ({
            ...prev,
            durationSeconds: smartDuration,
        }));
    }, [selectedPlatforms]);

    // Handle escape key
    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleGenerate = useCallback(() => {
        generateScripts({
            trend,
            platforms: Array.from(selectedPlatforms),
            options: {
                ...options,
                platforms: Array.from(selectedPlatforms),
            },
        });
    }, [generateScripts, trend, selectedPlatforms, options]);

    const handleRetry = useCallback(() => {
        if (!result) return;
        retryFailed({ previousResult: result, options });
    }, [retryFailed, result, options]);

    const togglePlatform = (platform: Platform) => {
        setSelectedPlatforms((prev) => {
            const next = new Set(prev);
            if (next.has(platform)) {
                if (next.size > 1) {
                    next.delete(platform);
                }
            } else {
                next.add(platform);
            }
            return next;
        });
    };

    const updateOption = <K extends keyof MultiPlatformOptions>(key: K, value: MultiPlatformOptions[K]) => {
        setOptions((prev) => ({ ...prev, [key]: value }));
    };

    if (!isOpen) return null;

    const hasFailures = result && result.metadata.failureCount > 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative w-full max-w-7xl max-h-[95vh] overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-xl">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Multi-Platform Script Oluştur</h2>
                            <p className="text-sm text-slate-400 truncate max-w-md">{trend.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {result && (
                            <div className="flex items-center gap-2 text-xs mr-4">
                                <span className="flex items-center gap-1 text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    {result.metadata.successCount} başarılı
                                </span>
                                {hasFailures && (
                                    <span className="flex items-center gap-1 text-red-400">
                                        <XCircle className="w-4 h-4" />
                                        {result.metadata.failureCount} başarısız
                                    </span>
                                )}
                                <span className="text-slate-500">
                                    ({Math.round(result.metadata.totalDurationMs / 1000)}s)
                                </span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                            aria-label="Kapat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Options Panel */}
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Platform Selection */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Platformlar:</span>
                            <div className="flex gap-1">
                                {ALL_PLATFORMS.map((platform) => (
                                    <button
                                        key={platform}
                                        onClick={() => togglePlatform(platform)}
                                        disabled={isPending}
                                        className={`px-2 py-1 text-xs rounded-lg border transition-colors ${selectedPlatforms.has(platform)
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                            } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {PLATFORM_LABELS[platform]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tone Selection */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Ton:</span>
                            <select
                                value={options.tone}
                                onChange={(e) => updateOption('tone', e.target.value as MultiPlatformOptions['tone'])}
                                disabled={isPending}
                                className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {TONE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Language Selection */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Dil:</span>
                            <div className="flex gap-1">
                                {LANGUAGE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateOption('language', opt.value)}
                                        disabled={isPending}
                                        className={`px-2 py-1 text-xs rounded-lg border transition-colors ${options.language === opt.value
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                            } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration Selection with Platform Awareness */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Süre:</span>
                            <div className="flex gap-1">
                                {DURATION_PRESETS.map((preset) => {
                                    const selectedArr = Array.from(selectedPlatforms);
                                    const isRecommended = preset.recommended.some(p =>
                                        selectedArr.includes(p as Platform)
                                    );
                                    return (
                                        <button
                                            key={preset.value}
                                            onClick={() => updateOption('durationSeconds', preset.value)}
                                            disabled={isPending}
                                            className={`px-2 py-1 text-xs rounded-lg border transition-colors ${options.durationSeconds === preset.value
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : isRecommended
                                                    ? 'bg-green-900/30 border-green-700/50 text-green-400 hover:border-green-600'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title={isRecommended ? 'Seçili platformlar için önerilen' : undefined}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Duration Status Indicator */}
                            {(() => {
                                const status = getDurationStatus(options.durationSeconds ?? 30, Array.from(selectedPlatforms));
                                if (status.status === 'warning') {
                                    return (
                                        <div className="flex items-center gap-1 text-amber-400" title={status.message}>
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                        </div>
                                    );
                                }
                                if (status.status === 'optimal') {
                                    return (
                                        <div className="flex items-center gap-1 text-green-400" title={status.message}>
                                            <CheckCircle className="w-3.5 h-3.5" />
                                        </div>
                                    );
                                }
                                return (
                                    <div className="flex items-center gap-1 text-slate-400" title={status.message}>
                                        <Info className="w-3.5 h-3.5" />
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Generate Button */}
                        <div className="ml-auto flex items-center gap-2">
                            {hasFailures && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleRetry}
                                    disabled={isRetrying || isPending}
                                >
                                    {isRetrying ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            Yeniden Deneniyor...
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="w-4 h-4 mr-1" />
                                            Başarısızları Yeniden Dene
                                        </>
                                    )}
                                </Button>
                            )}
                            <Button
                                onClick={handleGenerate}
                                disabled={isPending || selectedPlatforms.size === 0}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        {selectedPlatforms.size} Platform için Oluştur
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mx-4 mt-4">
                        <Card padding="sm" className="border-red-800 bg-red-900/20 text-red-300">
                            <p className="text-sm">Hata: {error.message}</p>
                        </Card>
                    </div>
                )}

                {/* Content - Side by Side Cards */}
                <div className="flex-1 overflow-y-auto p-4">
                    {result ? (
                        <>
                            {/* Recommendation */}
                            {result.summary.recommendation && (
                                <div className="mb-4 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                                    <p className="text-sm text-slate-300">{result.summary.recommendation}</p>
                                </div>
                            )}

                            {/* Platform Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ALL_PLATFORMS.filter((p) => selectedPlatforms.has(p)).map((platform) => {
                                    const platformScore = scoreResults?.get(platform);
                                    return (
                                        <PlatformScriptCard
                                            key={platform}
                                            platform={platform}
                                            result={result.results[platform]}
                                            isLoading={false}
                                            onRetry={handleRetry}
                                            algorithmScore={platformScore?.algorithmScore}
                                            viralLabel={platformScore?.viralPotential}
                                            isScoreLoading={isScoring}
                                            showIterationPanel={true}
                                        />
                                    );
                                })}
                            </div>
                        </>
                    ) : isPending ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from(selectedPlatforms).map((platform) => (
                                <PlatformScriptCard
                                    key={platform}
                                    platform={platform}
                                    result={undefined}
                                    isLoading={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                            <div className="p-6 mb-4 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-red-500/20 rounded-full">
                                <Zap className="w-12 h-12 text-slate-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">
                                Multi-Platform Script Üretimi
                            </h3>
                            <p className="text-slate-500 max-w-md">
                                Platformları ve ayarları seçin, ardından "Oluştur" butonuna tıklayın.
                                Her platform için algoritmaya özel script üretilecek.
                            </p>
                            <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">🎵 TikTok: 1s Hook, Loop Design</span>
                                <span className="flex items-center gap-1">📸 Reels: Shareability Focus</span>
                                <span className="flex items-center gap-1">▶️ Shorts: Retention Engineering</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
