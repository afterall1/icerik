/**
 * ScriptGeneratorModal Component
 * 
 * Full-featured modal for generating AI video scripts from trends.
 * Supports format, platform, tone, language, and duration selection.
 * 
 * @module components/organisms/ScriptGeneratorModal
 */

import { useState, useEffect, useCallback } from 'react';
import { useScriptGenerator, useVideoFormats } from '../../lib/hooks';
import { Button, Card } from '../atoms';
import { ScriptPreview } from '../molecules';
import type { TrendData, VideoFormat, ScriptOptions } from '../../lib/api';
import { X, Sparkles, AlertCircle, Copy, Check, Loader2 } from 'lucide-react';

interface ScriptGeneratorModalProps {
    /** Trend data to generate script from */
    trend: TrendData;
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
}

/**
 * Default script options
 */
const DEFAULT_OPTIONS: ScriptOptions = {
    format: 'Commentary',
    durationSeconds: 60,
    platform: 'all',
    tone: 'casual',
    language: 'tr',
    includeCta: true,
    includeHook: true,
};

/**
 * Platform options for selection
 */
const PLATFORM_OPTIONS: Array<{ value: ScriptOptions['platform']; label: string }> = [
    { value: 'all', label: 'Tüm Platformlar' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'reels', label: 'Instagram Reels' },
    { value: 'shorts', label: 'YouTube Shorts' },
];

/**
 * Tone options for selection
 */
const TONE_OPTIONS: Array<{ value: ScriptOptions['tone']; label: string }> = [
    { value: 'casual', label: 'Samimi' },
    { value: 'professional', label: 'Profesyonel' },
    { value: 'humorous', label: 'Eğlenceli' },
    { value: 'dramatic', label: 'Dramatik' },
];

/**
 * Language options for selection
 */
const LANGUAGE_OPTIONS: Array<{ value: ScriptOptions['language']; label: string }> = [
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' },
];

/**
 * Duration presets
 */
const DURATION_PRESETS = [
    { value: 15, label: '15s' },
    { value: 30, label: '30s' },
    { value: 60, label: '60s' },
    { value: 90, label: '90s' },
    { value: 120, label: '2dk' },
];

export function ScriptGeneratorModal({ trend, isOpen, onClose }: ScriptGeneratorModalProps) {
    const [options, setOptions] = useState<ScriptOptions>(DEFAULT_OPTIONS);
    const [copied, setCopied] = useState(false);

    const { data: formats, isLoading: formatsLoading } = useVideoFormats(trend.category);
    const { mutate: generateScript, data: script, isPending, error, reset } = useScriptGenerator();

    // Set default format when formats load
    useEffect(() => {
        if (formats && formats.length > 0 && !formats.includes(options.format)) {
            setOptions(prev => ({ ...prev, format: formats[0] }));
        }
    }, [formats, options.format]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            reset();
            setCopied(false);
        }
    }, [isOpen, reset]);

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
        generateScript({ trend, options });
    }, [generateScript, trend, options]);

    const handleCopyAll = useCallback(async () => {
        if (!script) return;
        try {
            await navigator.clipboard.writeText(script.script);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [script]);

    const updateOption = <K extends keyof ScriptOptions>(key: K, value: ScriptOptions[K]) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Script Oluştur</h2>
                            <p className="text-sm text-slate-400 truncate max-w-md">{trend.title}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Kapat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Options Panel - Left Side */}
                    <div className="lg:col-span-2 space-y-5">
                        <Card padding="md" className="space-y-4">
                            <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">Ayarlar</h3>

                            {/* Format Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Format</label>
                                <select
                                    value={options.format}
                                    onChange={(e) => updateOption('format', e.target.value as VideoFormat)}
                                    disabled={formatsLoading}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    {formatsLoading ? (
                                        <option>Yükleniyor...</option>
                                    ) : (
                                        formats?.map(format => (
                                            <option key={format} value={format}>{format}</option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {/* Platform Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Platform</label>
                                <select
                                    value={options.platform}
                                    onChange={(e) => updateOption('platform', e.target.value as ScriptOptions['platform'])}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    {PLATFORM_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tone Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Ton</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {TONE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateOption('tone', opt.value)}
                                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${options.tone === opt.value
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Language Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Dil</label>
                                <div className="flex gap-2">
                                    {LANGUAGE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateOption('language', opt.value)}
                                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${options.language === opt.value
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Süre: <span className="text-indigo-400">{options.durationSeconds}s</span>
                                </label>
                                <div className="flex gap-2 mb-2">
                                    {DURATION_PRESETS.map(preset => (
                                        <button
                                            key={preset.value}
                                            onClick={() => updateOption('durationSeconds', preset.value)}
                                            className={`flex-1 px-2 py-1 text-xs rounded-lg border transition-colors ${options.durationSeconds === preset.value
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="range"
                                    min={15}
                                    max={180}
                                    step={5}
                                    value={options.durationSeconds}
                                    onChange={(e) => updateOption('durationSeconds', parseInt(e.target.value, 10))}
                                    className="w-full accent-indigo-500"
                                />
                            </div>

                            {/* Toggles */}
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={options.includeHook}
                                        onChange={(e) => updateOption('includeHook', e.target.checked)}
                                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-300">Hook Ekle</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={options.includeCta}
                                        onChange={(e) => updateOption('includeCta', e.target.checked)}
                                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-300">CTA Ekle</span>
                                </label>
                            </div>
                        </Card>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={isPending || formatsLoading}
                            className="w-full py-3 text-base font-semibold"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Oluşturuluyor...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Script Oluştur
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Preview Panel - Right Side */}
                    <div className="lg:col-span-3">
                        {error && (
                            <Card padding="md" className="mb-4 border-red-800 bg-red-900/20">
                                <div className="flex items-start gap-3 text-red-300">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Script oluşturulamadı</p>
                                        <p className="text-sm text-red-400 mt-1">{error.message}</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {script ? (
                            <div className="space-y-4">
                                {/* Script Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-100">{script.title}</h3>
                                        <p className="text-sm text-slate-400">
                                            Tahmini süre: {script.estimatedDurationSeconds}s | {script.metadata.format} | {script.metadata.platform}
                                        </p>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleCopyAll}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4 mr-1 text-green-400" />
                                                Kopyalandı!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 mr-1" />
                                                Tümünü Kopyala
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Script Preview */}
                                <ScriptPreview script={script} />

                                {/* Hashtags */}
                                <Card padding="sm" className="flex flex-wrap gap-2">
                                    {script.hashtags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 text-sm bg-indigo-900/50 text-indigo-300 rounded-lg"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </Card>
                            </div>
                        ) : (
                            <Card padding="lg" className="flex flex-col items-center justify-center min-h-[400px] text-center">
                                <div className="p-4 mb-4 bg-slate-800/50 rounded-full">
                                    <Sparkles className="w-8 h-8 text-slate-500" />
                                </div>
                                <p className="text-slate-400 mb-1">Henüz script oluşturulmadı</p>
                                <p className="text-sm text-slate-500">
                                    Ayarları seçin ve "Script Oluştur" butonuna tıklayın
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
