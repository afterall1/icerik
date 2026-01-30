/**
 * PlatformScriptCard Component
 *
 * Displays a platform-specific script with optimizations and metadata.
 * Used in the side-by-side comparison view.
 *
 * @module components/molecules/PlatformScriptCard
 */

import { useState, useCallback, useMemo } from 'react';
import { Card } from '../atoms';
import type { PlatformScriptResult, Platform, AlgorithmScore, ViralPotentialLabel, PlatformScript, IterationResult } from '../../lib/api';
import { PLATFORM_LABELS, PLATFORM_ICONS, PLATFORM_COLORS } from '../../lib/api';
import { Copy, Check, ChevronDown, ChevronUp, Clock, FileText, AlertCircle, Sparkles, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, Wand2, Image, Volume2 } from 'lucide-react';
import { AlgorithmEducationPanel } from './AlgorithmEducationPanel';
import { AlgorithmScoreCard, CompactScoreBadge } from './AlgorithmScoreCard';
import { IterationPanel } from './IterationPanel';
import { VisualDiscoveryPanel, type SectionType } from './VisualDiscoveryPanel';
import { SelectedVisualsPreview } from './SelectedVisualsPreview';
import { useVisualSelections } from '../../lib/useVisualSelections';
import { generateScriptId, type SelectableSectionType } from '../../lib/selectedVisualsTypes';
import type { ValidatedImage } from '../../lib/useVisualSearch';
import { VoicePlayer } from './VoicePlayer';
import { useVoiceGeneration } from '../../lib/useVoiceGeneration';
import { useVoiceSelection } from '../../lib/useVoiceSelection';
import { VoiceSelectionModal } from '../organisms/VoiceSelectionModal';
import { VideoGenerationButton } from './VideoGenerationButton';
import { VideoGenerationModal } from '../organisms/VideoGenerationModal';

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
    /** Optional algorithm score result */
    algorithmScore?: AlgorithmScore;
    /** Optional viral potential label */
    viralLabel?: ViralPotentialLabel;
    /** Whether score is loading */
    isScoreLoading?: boolean;
    /** Callback when script is updated via iteration */
    onScriptUpdated?: (script: PlatformScript) => void;
    /** Whether to show iteration controls */
    showIterationPanel?: boolean;
    /** Trend ID for visual selections */
    trendId?: string;
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
    sectionType,
    onFindVisuals,
}: {
    title: string;
    content: string;
    wordCount: number;
    estimatedSeconds: number;
    accentColor: string;
    sectionType?: SectionType;
    onFindVisuals?: () => void;
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

    const handleFindVisuals = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onFindVisuals) {
            onFindVisuals();
        }
    }, [onFindVisuals]);

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
                    {/* Visual Discovery Button */}
                    {sectionType && onFindVisuals && (
                        <button
                            onClick={handleFindVisuals}
                            className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded transition-colors"
                            title="Görsel Bul"
                        >
                            <Image className="w-3.5 h-3.5" />
                        </button>
                    )}
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

export function PlatformScriptCard({
    platform,
    result,
    isLoading,
    onRetry,
    algorithmScore,
    viralLabel,
    isScoreLoading,
    onScriptUpdated,
    showIterationPanel = false,
    trendId = '',
}: PlatformScriptCardProps) {
    const [copied, setCopied] = useState(false);
    const [iterationExpanded, setIterationExpanded] = useState(false);
    // Visual Discovery Panel state
    const [visualPanelOpen, setVisualPanelOpen] = useState(false);
    const [visualPanelSection, setVisualPanelSection] = useState<SectionType | null>(null);
    const [visualPanelContent, setVisualPanelContent] = useState('');
    const [voiceExpanded, setVoiceExpanded] = useState(false);
    const [voiceModalOpen, setVoiceModalOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);

    const label = PLATFORM_LABELS[platform];
    const icon = PLATFORM_ICONS[platform];
    const colors = PLATFORM_COLORS[platform];

    // Voice generation hooks
    const { primaryVoice, hasPrimaryVoice } = useVoiceSelection();
    const {
        generateAudio,
        isLoading: isVoiceLoading,
        error: voiceError,
        audioUrl,
        audioBlob,
        audioDuration,
        lastProvider,
    } = useVoiceGeneration();

    // Generate stable script ID for visual selections
    const scriptId = useMemo(() => {
        if (!result?.success) return null;
        return generateScriptId(
            result.script.metadata.trendId,
            platform,
            result.script.metadata.generatedAt
        );
    }, [result, platform]);

    // Visual selections hook
    const {
        selections,
        addSelection,
        removeSelection,
        isSelected,
        getSelectionOrder,
        isSectionFull,
    } = useVisualSelections(
        scriptId,
        platform,
        trendId,
        result?.success ? result.script.title : ''
    );

    // Handle visual discovery for a section
    const handleFindVisuals = useCallback((sectionType: SectionType, content: string) => {
        setVisualPanelSection(sectionType);
        setVisualPanelContent(content);
        setVisualPanelOpen(true);
    }, []);

    const handleCloseVisualPanel = useCallback(() => {
        setVisualPanelOpen(false);
        setVisualPanelSection(null);
        setVisualPanelContent('');
    }, []);

    // Handle image selection from visual panel
    const handleImageSelect = useCallback(async (image: ValidatedImage) => {
        if (!visualPanelSection) return;
        const added = await addSelection(visualPanelSection as SelectableSectionType, image);
        if (added) {
            // Optional: close panel after max selections reached
            if (isSectionFull(visualPanelSection as SelectableSectionType)) {
                // Keep panel open but user can see it's full
            }
        }
    }, [visualPanelSection, addSelection, isSectionFull]);

    // Handle removing a selection
    const handleRemoveSelection = useCallback(async (sectionType: SelectableSectionType, imageId: string) => {
        await removeSelection(sectionType, imageId);
    }, [removeSelection]);

    // Handle iteration result
    const handleIterationResult = useCallback((iterResult: IterationResult) => {
        if (onScriptUpdated && iterResult.updatedScript) {
            onScriptUpdated(iterResult.updatedScript);
        }
    }, [onScriptUpdated]);

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
        <>
            <Card padding="none" className="h-full overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`p-3 bg-gradient-to-r ${colors.gradient}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{icon}</span>
                            <span className="font-bold text-white">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Compact Score Badge */}
                            {algorithmScore && viralLabel && (
                                <CompactScoreBadge score={algorithmScore.overallScore} viralLabel={viralLabel} />
                            )}
                            <button
                                onClick={handleCopyAll}
                                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                                title="Tümünü Kopyala"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
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
                        <>
                            <ScriptSection
                                title="🎣 Hook"
                                content={script.sections.hook.content}
                                wordCount={script.sections.hook.wordCount}
                                estimatedSeconds={script.sections.hook.estimatedSeconds}
                                accentColor="border-amber-500"
                                sectionType="hook"
                                onFindVisuals={() => handleFindVisuals('hook', script.sections.hook!.content)}
                            />
                            {selections && selections.selections.hook.length > 0 && (
                                <SelectedVisualsPreview
                                    sectionType="hook"
                                    selections={selections.selections.hook}
                                    onRemove={(imageId) => handleRemoveSelection('hook', imageId)}
                                    onAddMore={() => handleFindVisuals('hook', script.sections.hook!.content)}
                                    isFull={isSectionFull('hook')}
                                />
                            )}
                        </>
                    )}
                    <ScriptSection
                        title="📝 Body"
                        content={script.sections.body.content}
                        wordCount={script.sections.body.wordCount}
                        estimatedSeconds={script.sections.body.estimatedSeconds}
                        accentColor="border-indigo-500"
                        sectionType="body"
                        onFindVisuals={() => handleFindVisuals('body', script.sections.body.content)}
                    />
                    {selections && selections.selections.body.length > 0 && (
                        <SelectedVisualsPreview
                            sectionType="body"
                            selections={selections.selections.body}
                            onRemove={(imageId) => handleRemoveSelection('body', imageId)}
                            onAddMore={() => handleFindVisuals('body', script.sections.body.content)}
                            isFull={isSectionFull('body')}
                        />
                    )}
                    {script.sections.cta && (
                        <>
                            <ScriptSection
                                title="📢 CTA"
                                content={script.sections.cta.content}
                                wordCount={script.sections.cta.wordCount}
                                estimatedSeconds={script.sections.cta.estimatedSeconds}
                                accentColor="border-green-500"
                                sectionType="cta"
                                onFindVisuals={() => handleFindVisuals('cta', script.sections.cta!.content)}
                            />
                            {selections && selections.selections.cta.length > 0 && (
                                <SelectedVisualsPreview
                                    sectionType="cta"
                                    selections={selections.selections.cta}
                                    onRemove={(imageId) => handleRemoveSelection('cta', imageId)}
                                    onAddMore={() => handleFindVisuals('cta', script.sections.cta!.content)}
                                    isFull={isSectionFull('cta')}
                                />
                            )}
                        </>
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

                {/* Algorithm Score Card - Show if available */}
                {(algorithmScore || isScoreLoading) && (
                    <div className="px-3 py-2 border-t border-slate-800">
                        {isScoreLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                                <TrendingUp className="w-4 h-4 animate-pulse" />
                                <span>Viral skor hesaplanıyor...</span>
                            </div>
                        ) : algorithmScore && viralLabel ? (
                            <AlgorithmScoreCard
                                score={algorithmScore}
                                viralLabel={viralLabel}
                                compact={true}
                            />
                        ) : null}
                    </div>
                )}

                {/* Warnings - Show if script was trimmed or has issues */}
                {script.warnings && script.warnings.length > 0 && (
                    <div className="px-3 py-2 border-t border-amber-800/50 bg-amber-900/20">
                        <div className="flex items-start gap-2 text-xs text-amber-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                                {script.warnings.map((warning, i) => (
                                    <span key={i}>{warning}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Iteration Panel - Toggle expandable */}
                {showIterationPanel && onScriptUpdated && (
                    <div className="px-3 py-2 border-t border-slate-800">
                        {!iterationExpanded ? (
                            <button
                                onClick={() => setIterationExpanded(true)}
                                className="flex items-center gap-2 w-full text-left text-xs text-slate-400 hover:text-slate-300 transition-colors py-1"
                            >
                                <Wand2 className="w-3 h-3" />
                                <span>Script İyileştir</span>
                                <ChevronDown className="w-3 h-3 ml-auto" />
                            </button>
                        ) : (
                            <div>
                                <button
                                    onClick={() => setIterationExpanded(false)}
                                    className="flex items-center gap-2 w-full text-left text-xs text-slate-300 mb-2"
                                >
                                    <Wand2 className="w-3 h-3" />
                                    <span>Script İyileştir</span>
                                    <ChevronUp className="w-3 h-3 ml-auto" />
                                </button>
                                <IterationPanel
                                    script={script}
                                    onScriptUpdated={handleIterationResult}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Hashtags */}
                <div className="px-3 py-2 border-t border-slate-800 flex flex-wrap gap-1">
                    {script.hashtags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[10px] bg-indigo-900/50 text-indigo-300 rounded">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Voice Generation Section */}
                <div className="px-3 py-2 border-t border-slate-800">
                    {!voiceExpanded ? (
                        <button
                            onClick={() => setVoiceExpanded(true)}
                            className="flex items-center gap-2 w-full text-left text-xs text-slate-400 hover:text-slate-300 transition-colors py-1"
                        >
                            <Volume2 className="w-3 h-3" />
                            <span>🔊 Seslendir</span>
                            <ChevronDown className="w-3 h-3 ml-auto" />
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <button
                                onClick={() => setVoiceExpanded(false)}
                                className="flex items-center gap-2 w-full text-left text-xs text-slate-300"
                            >
                                <Volume2 className="w-3 h-3" />
                                <span>🔊 Seslendir</span>
                                <ChevronUp className="w-3 h-3 ml-auto" />
                            </button>

                            {/* Generate Button */}
                            {!audioUrl && !isVoiceLoading && (
                                <button
                                    onClick={async () => {
                                        if (!scriptId || !hasPrimaryVoice || !primaryVoice) return;
                                        await generateAudio(scriptId, script.script, {
                                            voiceId: primaryVoice.voiceId,
                                            provider: primaryVoice.provider,
                                            settings: primaryVoice.settings,
                                        });
                                    }}
                                    disabled={!hasPrimaryVoice || isVoiceLoading}
                                    className={`w-full px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${hasPrimaryVoice
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Volume2 className="w-4 h-4" />
                                    {hasPrimaryVoice ? (
                                        <>
                                            <span>Seslendir</span>
                                            <span className="text-xs opacity-75">• {primaryVoice?.name}</span>
                                        </>
                                    ) : (
                                        <span>Önce ses seçin</span>
                                    )}
                                </button>
                            )}

                            {/* Voice Player */}
                            <VoicePlayer
                                audioUrl={audioUrl}
                                duration={audioDuration || undefined}
                                provider={lastProvider || undefined}
                                isLoading={isVoiceLoading}
                                error={voiceError}
                                onRegenerate={async () => {
                                    if (!scriptId || !hasPrimaryVoice || !primaryVoice) return;
                                    await generateAudio(scriptId, script.script, {
                                        voiceId: primaryVoice.voiceId,
                                        provider: primaryVoice.provider,
                                        settings: primaryVoice.settings,
                                    });
                                }}
                                compact
                            />

                            {/* Voice selection button when no voice selected */}
                            {!hasPrimaryVoice && (
                                <button
                                    onClick={() => setVoiceModalOpen(true)}
                                    className="w-full px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    <span>Ses Seç</span>
                                </button>
                            )}

                            {/* Change voice button when voice is selected */}
                            {hasPrimaryVoice && (
                                <button
                                    onClick={() => setVoiceModalOpen(true)}
                                    className="text-[10px] text-slate-500 hover:text-slate-400 underline transition-colors"
                                >
                                    Farklı ses seç
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Video Generation Section */}
                <div className="px-3 py-2 border-t border-slate-800">
                    <VideoGenerationButton
                        platform={platform}
                        visualCount={
                            (selections?.selections.hook?.length || 0) +
                            (selections?.selections.body?.length || 0) +
                            (selections?.selections.cta?.length || 0)
                        }
                        hasAudio={!!audioUrl}
                        audioDuration={audioDuration || undefined}
                        onClick={() => setVideoModalOpen(true)}
                    />
                </div>
            </Card>

            {/* Visual Discovery Panel */}
            {visualPanelSection !== null && (
                <VisualDiscoveryPanel
                    isOpen={visualPanelOpen}
                    onClose={handleCloseVisualPanel}
                    sectionType={visualPanelSection}
                    content={visualPanelContent}
                    category={script.metadata.category}
                    onImageSelect={handleImageSelect}
                    isImageSelected={(imageId) => isSelected(visualPanelSection as SelectableSectionType, imageId)}
                    getSelectionOrder={(imageId) => getSelectionOrder(visualPanelSection as SelectableSectionType, imageId)}
                    isSectionFull={isSectionFull(visualPanelSection as SelectableSectionType)}
                    selectionCount={selections?.selections[visualPanelSection as SelectableSectionType]?.length ?? 0}
                />
            )}

            {/* Voice Selection Modal */}
            <VoiceSelectionModal
                isOpen={voiceModalOpen}
                onClose={() => setVoiceModalOpen(false)}
            />

            {/* Video Generation Modal */}
            <VideoGenerationModal
                isOpen={videoModalOpen}
                onClose={() => setVideoModalOpen(false)}
                platform={platform}
                script={script}
                visualSelections={selections}
                audioUrl={audioUrl}
                audioBlob={audioBlob}
                audioDuration={audioDuration}
            />
        </>
    );
}
