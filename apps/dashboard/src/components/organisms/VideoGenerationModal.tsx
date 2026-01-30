/**
 * VideoGenerationModal Component
 * 
 * Full-screen modal for video generation workflow.
 * Phases: Configure → Generating → Complete
 * 
 * @module components/organisms/VideoGenerationModal
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Film, Image, Volume2, Settings, AlertCircle, Loader2 } from 'lucide-react';
import type {
    Platform,
    PlatformScript,
    VideoGenerationOptions,
    CaptionStyleType,
    TransitionStyleType,
} from '../../lib/api';
import {
    PLATFORM_LABELS,
    PLATFORM_COLORS,
    DEFAULT_VIDEO_OPTIONS,
} from '../../lib/api';
import { VideoProgressIndicator } from '../molecules/VideoProgressIndicator';
import { VideoPreviewCard } from '../molecules/VideoPreviewCard';
import { useVideoGeneration } from '../../lib/useVideoGeneration';
import type { ScriptVisualSelections } from '../../lib/selectedVisualsTypes';

interface VideoGenerationModalProps {
    /** Whether modal is open */
    isOpen: boolean;
    /** Callback to close modal */
    onClose: () => void;
    /** Platform for this video */
    platform: Platform;
    /** Script content */
    script: PlatformScript;
    /** Visual selections for each section */
    visualSelections: ScriptVisualSelections | null;
    /** Generated audio URL */
    audioUrl: string | null;
    /** Generated audio blob */
    audioBlob: Blob | null;
    /** Audio duration in seconds */
    audioDuration: number | null;
}

type ModalPhase = 'configure' | 'generating' | 'complete';

/**
 * Caption style options
 */
const CAPTION_STYLE_OPTIONS: Array<{ value: CaptionStyleType; label: string; description: string }> = [
    { value: 'hormozi', label: 'Hormozi', description: 'Bold, centered, animated' },
    { value: 'classic', label: 'Classic', description: 'Traditional subtitles' },
    { value: 'minimal', label: 'Minimal', description: 'Clean, simple' },
];

/**
 * Transition style options
 */
const TRANSITION_STYLE_OPTIONS: Array<{ value: TransitionStyleType; label: string; description: string }> = [
    { value: 'smooth', label: 'Smooth', description: 'Dissolve transitions' },
    { value: 'dynamic', label: 'Dynamic', description: 'Wipe effects' },
    { value: 'minimal', label: 'Minimal', description: 'Quick fades' },
];

/**
 * Full video generation modal
 */
export function VideoGenerationModal({
    isOpen,
    onClose,
    platform,
    script,
    visualSelections,
    audioUrl,
    audioBlob,
    audioDuration,
}: VideoGenerationModalProps) {
    const [phase, setPhase] = useState<ModalPhase>('configure');
    const [options, setOptions] = useState<VideoGenerationOptions>(DEFAULT_VIDEO_OPTIONS);

    const {
        isGenerating,
        progress,
        result,
        error,
        startGeneration,
        reset,
    } = useVideoGeneration();

    const colors = PLATFORM_COLORS[platform];
    const label = PLATFORM_LABELS[platform];

    // Count visuals
    const visualCounts = useMemo(() => {
        if (!visualSelections) return { hook: 0, body: 0, cta: 0, total: 0 };
        const hook = visualSelections.selections.hook.length;
        const body = visualSelections.selections.body.length;
        const cta = visualSelections.selections.cta.length;
        return { hook, body, cta, total: hook + body + cta };
    }, [visualSelections]);

    // Extract image URLs from selections
    const getImageUrls = useCallback(() => {
        if (!visualSelections) return { hook: [], body: [], cta: [] };
        return {
            hook: visualSelections.selections.hook.map(s => s.image.fullUrl),
            body: visualSelections.selections.body.map(s => s.image.fullUrl),
            cta: visualSelections.selections.cta.map(s => s.image.fullUrl),
        };
    }, [visualSelections]);

    // Check if ready to generate
    const isReady = useMemo(() => {
        return visualCounts.total > 0 && !!audioUrl && !!audioDuration;
    }, [visualCounts.total, audioUrl, audioDuration]);

    // Handle phase transitions
    useEffect(() => {
        if (isGenerating && phase !== 'generating') {
            setPhase('generating');
        }
        if (progress?.status === 'complete' && phase !== 'complete') {
            setPhase('complete');
        }
    }, [isGenerating, progress?.status, phase]);

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && phase !== 'generating') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, phase, onClose]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setPhase('configure');
            reset();
        }
    }, [isOpen, reset]);

    // Helper: Convert blob to base64 (no fetch needed - avoids CSP issues)
    const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }, []);

    // Handle generate click
    const handleGenerate = useCallback(async () => {
        // Debug logging
        console.log('[VideoGenerationModal] handleGenerate called:', {
            audioUrl: audioUrl?.substring(0, 50) + '...',
            hasAudioBlob: !!audioBlob,
            audioDuration,
            visualCount: getImageUrls(),
            isReady: !!audioBlob && !!audioDuration,
        });

        // Check for audioBlob first (preferred), then audioUrl
        if (!audioBlob && !audioUrl) {
            console.error('[VideoGenerationModal] Missing audio data:', { audioUrl, audioBlob });
            alert('Ses dosyası hazır değil. Lütfen önce ses oluşturun.');
            return;
        }

        if (!audioDuration) {
            console.error('[VideoGenerationModal] Missing audio duration:', { audioDuration });
            alert('Ses süresi belirsiz. Lütfen önce ses oluşturun.');
            return;
        }

        const images = getImageUrls();

        try {
            let voiceoverData: string | undefined;
            let voiceoverPath: string | undefined;

            // Use audioBlob directly if available (avoids CSP issues with fetch)
            if (audioBlob) {
                console.log('[VideoGenerationModal] Converting blob to base64 directly...');
                voiceoverData = await blobToBase64(audioBlob);
                console.log('[VideoGenerationModal] Base64 conversion complete, length:', voiceoverData?.length);
            } else if (audioUrl && !audioUrl.startsWith('blob:')) {
                // Use file path if it's not a blob URL
                voiceoverPath = audioUrl;
                console.log('[VideoGenerationModal] Using voiceover path:', voiceoverPath);
            } else {
                console.error('[VideoGenerationModal] Cannot process audio - blob not available and URL is blob type');
                alert('Ses dosyası işlenemedi. Lütfen sesi yeniden oluşturun.');
                return;
            }

            console.log('[VideoGenerationModal] Starting video generation...');

            await startGeneration({
                platform,
                title: script.title,
                script: {
                    hook: script.sections.hook?.content || '',
                    body: script.sections.body.content,
                    cta: script.sections.cta?.content || '',
                },
                images,
                audio: {
                    voiceoverPath,
                    voiceoverData,
                    voiceoverDuration: audioDuration,
                },
                options,
            });

            console.log('[VideoGenerationModal] startGeneration called successfully');
        } catch (err) {
            console.error('[VideoGenerationModal] Failed to prepare audio:', err);
            alert('Ses dosyası işlenirken hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
        }
    }, [audioUrl, audioBlob, audioDuration, getImageUrls, blobToBase64, platform, script, options, startGeneration]);

    // Handle option change
    const updateOption = useCallback(<K extends keyof VideoGenerationOptions>(
        key: K,
        value: VideoGenerationOptions[K]
    ) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    // Handle regenerate
    const handleRegenerate = useCallback(() => {
        reset();
        setPhase('configure');
    }, [reset]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={phase !== 'generating' ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className={`flex items-center justify-between p-4 bg-gradient-to-r ${colors.gradient}`}>
                    <div className="flex items-center gap-3">
                        <Film className="w-5 h-5 text-white" />
                        <h2 className="text-lg font-bold text-white">
                            Video Oluştur - {label}
                        </h2>
                    </div>
                    {phase !== 'generating' && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Configure Phase */}
                    {phase === 'configure' && (
                        <div className="space-y-4">
                            {/* Visuals Summary */}
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Image className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-medium text-slate-200">Görseller</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className={`px-2 py-0.5 rounded ${visualCounts.hook > 0 ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-700 text-slate-500'}`}>
                                        Hook: {visualCounts.hook}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded ${visualCounts.body > 0 ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-700 text-slate-500'}`}>
                                        Body: {visualCounts.body}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded ${visualCounts.cta > 0 ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-500'}`}>
                                        CTA: {visualCounts.cta}
                                    </span>
                                </div>
                            </div>

                            {/* Audio Summary */}
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Volume2 className="w-4 h-4 text-green-400" />
                                    <span className="text-sm font-medium text-slate-200">Ses</span>
                                </div>
                                {audioUrl ? (
                                    <div className="flex items-center gap-2 text-xs text-green-400">
                                        <span>✓ Hazır</span>
                                        {audioDuration && <span>• {Math.round(audioDuration)}s</span>}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500">Ses oluşturulmadı</div>
                                )}
                            </div>

                            {/* Options */}
                            <div className="p-3 bg-slate-800 rounded-lg space-y-3">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-200">Ayarlar</span>
                                </div>

                                {/* Caption Style */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5">Altyazı Stili</label>
                                    <div className="flex gap-2">
                                        {CAPTION_STYLE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => updateOption('captionStyle', opt.value)}
                                                className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${options.captionStyle === opt.value
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Transition Style */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5">Geçiş Efekti</label>
                                    <div className="flex gap-2">
                                        {TRANSITION_STYLE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => updateOption('transitionStyle', opt.value)}
                                                className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${options.transitionStyle === opt.value
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Ken Burns Toggle */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-300">Ken Burns Efekti</span>
                                    <button
                                        onClick={() => updateOption('kenBurnsEnabled', !options.kenBurnsEnabled)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${options.kenBurnsEnabled ? 'bg-indigo-600' : 'bg-slate-600'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${options.kenBurnsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Music Volume */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-300">Arka Plan Müzik</span>
                                        <span className="text-xs text-slate-500">
                                            {Math.round(options.backgroundMusicVolume * 100)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={options.backgroundMusicVolume * 100}
                                        onChange={e => updateOption('backgroundMusicVolume', parseInt(e.target.value) / 100)}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                                    <div className="flex items-start gap-2 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generating Phase */}
                    {phase === 'generating' && progress && (
                        <div className="py-8">
                            <VideoProgressIndicator progress={progress} />
                        </div>
                    )}

                    {/* Complete Phase */}
                    {phase === 'complete' && result && (
                        <VideoPreviewCard
                            result={result}
                            platform={platform}
                            onRegenerate={handleRegenerate}
                        />
                    )}
                </div>

                {/* Footer */}
                {phase === 'configure' && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <button
                            onClick={handleGenerate}
                            disabled={!isReady || isGenerating}
                            className={`
                                w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2
                                text-sm font-semibold transition-all duration-200
                                ${isReady
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg'
                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                }
                            `}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Başlatılıyor...</span>
                                </>
                            ) : (
                                <>
                                    <Film className="w-4 h-4" />
                                    <span>🎬 Video Oluştur</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Close button for generating phase */}
                {phase === 'generating' && (
                    <div className="p-4 border-t border-slate-800 text-center">
                        <span className="text-xs text-slate-500">
                            Video oluşturulurken pencereyi kapatabilirsiniz
                        </span>
                    </div>
                )}

                {/* Close button for complete phase */}
                {phase === 'complete' && (
                    <div className="p-4 border-t border-slate-800">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        >
                            Kapat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
