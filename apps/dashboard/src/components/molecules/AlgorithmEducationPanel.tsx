/**
 * AlgorithmEducationPanel Component
 *
 * Expandable panel that teaches users about platform-specific algorithms.
 * Shows metrics with visual weights, optimization explanations, and pro tips.
 *
 * @module components/molecules/AlgorithmEducationPanel
 */

import { useState, useCallback } from 'react';
import {
    ChevronDown,
    ChevronUp,
    BookOpen,
    Target,
    Lightbulb,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Info,
    Sparkles,
} from 'lucide-react';
import type { Platform } from '../../lib/api';

// Import education data from shared - we'll use a local copy for now
// In production this would come from the API
import { PLATFORM_EDUCATION_DATA } from './algorithmEducationData';

interface AlgorithmEducationPanelProps {
    /** Platform to show education for */
    platform: Platform;
    /** Optimizations applied to the current script */
    appliedOptimizations: string[];
    /** Whether panel starts expanded */
    defaultExpanded?: boolean;
}

/**
 * Metric bar component showing visual weight
 */
function MetricBar({
    metric,
    onShowDetail,
}: {
    metric: {
        nameTr: string;
        nameEn: string;
        summary: string;
        weight: number;
        icon: string;
    };
    onShowDetail: () => void;
}) {
    return (
        <div className="group">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{metric.icon}</span>
                    <span className="text-sm font-medium text-slate-200">
                        {metric.nameTr}
                    </span>
                    <span className="text-xs text-slate-500">({metric.nameEn})</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-400">
                        %{metric.weight}
                    </span>
                    <button
                        onClick={onShowDetail}
                        className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Detayları Gör"
                    >
                        <Info className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${metric.weight}%` }}
                />
            </div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{metric.summary}</p>
        </div>
    );
}

/**
 * Metric detail modal
 */
function MetricDetailModal({
    metric,
    onClose,
}: {
    metric: {
        nameTr: string;
        nameEn: string;
        summary: string;
        weight: number;
        calculation: string;
        icon: string;
        doList: string[];
        dontList: string[];
    };
    onClose: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{metric.icon}</span>
                        <div>
                            <h3 className="font-bold text-slate-100">{metric.nameTr}</h3>
                            <p className="text-sm text-slate-400">{metric.nameEn}</p>
                        </div>
                        <div className="ml-auto px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-sm font-semibold">
                            %{metric.weight} ağırlık
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Summary */}
                    <p className="text-slate-300">{metric.summary}</p>

                    {/* Calculation */}
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Nasıl Hesaplanır?
                        </div>
                        <p className="text-sm text-slate-300 font-mono">{metric.calculation}</p>
                    </div>

                    {/* Do List */}
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-green-400 mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Ne Yapmalısınız?
                        </div>
                        <ul className="space-y-1.5">
                            {metric.doList.map((item, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-slate-300"
                                >
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Don't List */}
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-red-400 mb-2">
                            <XCircle className="w-4 h-4" />
                            Ne Yapmamalısınız?
                        </div>
                        <ul className="space-y-1.5">
                            {metric.dontList.map((item, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-slate-300"
                                >
                                    <span className="text-red-500 mt-0.5">✗</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-4">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Optimization explanation item
 */
function OptimizationItem({
    optimization,
    isApplied,
}: {
    optimization: {
        name: string;
        explanation: string;
        whyItMatters: string;
        example?: { good: string; bad: string };
    };
    isApplied: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className={`border rounded-lg overflow-hidden transition-colors ${isApplied
                    ? 'border-green-600/30 bg-green-900/10'
                    : 'border-slate-700 bg-slate-800/30'
                }`}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-800/50 transition-colors"
            >
                {isApplied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                    <div className="w-4 h-4 border border-slate-600 rounded-full flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 ${isApplied ? 'text-green-300' : 'text-slate-400'}`}>
                    {optimization.name}
                </span>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
            </button>

            {isExpanded && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-700/50">
                    <p className="text-sm text-slate-300">{optimization.explanation}</p>

                    <div className="p-2 bg-indigo-900/20 border border-indigo-700/30 rounded text-xs text-indigo-300">
                        <strong>Neden Önemli:</strong> {optimization.whyItMatters}
                    </div>

                    {optimization.example && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-green-900/20 border border-green-700/30 rounded">
                                <div className="text-green-400 font-medium mb-1">✓ İyi Örnek</div>
                                <p className="text-green-200">{optimization.example.good}</p>
                            </div>
                            <div className="p-2 bg-red-900/20 border border-red-700/30 rounded">
                                <div className="text-red-400 font-medium mb-1">✗ Kötü Örnek</div>
                                <p className="text-red-200">{optimization.example.bad}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function AlgorithmEducationPanel({
    platform,
    appliedOptimizations,
    defaultExpanded = false,
}: AlgorithmEducationPanelProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [selectedMetric, setSelectedMetric] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'metrics' | 'optimizations' | 'tips'>('metrics');

    const education = PLATFORM_EDUCATION_DATA[platform];

    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    if (!education) {
        return null;
    }

    return (
        <div className="border-t border-slate-800">
            {/* Toggle Button */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Algoritma Hakkında Öğren</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                    {/* Core Principle */}
                    <div className="p-3 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-700/30 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-indigo-400 mb-1">
                            <Target className="w-3.5 h-3.5" />
                            Temel Prensip
                        </div>
                        <p className="text-sm text-slate-200">{education.corePrinciple}</p>
                    </div>

                    {/* Hook Timing */}
                    <div className="flex items-center gap-3 p-2 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                        <div className="w-10 h-10 flex items-center justify-center bg-amber-600/20 rounded-full text-amber-400 font-bold">
                            {education.hookTiming.seconds}s
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-amber-400 font-medium">
                                Kritik Hook Süresi
                            </div>
                            <p className="text-xs text-amber-200/80 line-clamp-2">
                                {education.hookTiming.explanation}
                            </p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
                        <button
                            onClick={() => setActiveTab('metrics')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'metrics'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <TrendingUp className="w-3 h-3" />
                            Metrikler
                        </button>
                        <button
                            onClick={() => setActiveTab('optimizations')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'optimizations'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <Sparkles className="w-3 h-3" />
                            Optimizasyonlar
                        </button>
                        <button
                            onClick={() => setActiveTab('tips')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'tips'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <Lightbulb className="w-3 h-3" />
                            İpuçları
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[200px]">
                        {/* Metrics Tab */}
                        {activeTab === 'metrics' && (
                            <div className="space-y-3">
                                <p className="text-xs text-slate-500">
                                    Algoritma sinyalleri önem sırasına göre. Tıklayarak detay görün.
                                </p>
                                {education.metrics.map((metric, index) => (
                                    <MetricBar
                                        key={index}
                                        metric={metric}
                                        onShowDetail={() => setSelectedMetric(index)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Optimizations Tab */}
                        {activeTab === 'optimizations' && (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500">
                                    Bu script'e uygulanan optimizasyonlar yeşil ile işaretlendi.
                                </p>
                                {education.optimizationExplanations.map((opt, index) => (
                                    <OptimizationItem
                                        key={index}
                                        optimization={opt}
                                        isApplied={appliedOptimizations.includes(opt.name)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Tips Tab */}
                        {activeTab === 'tips' && (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500">
                                    Deneyimli içerik üreticilerden pro ipuçları.
                                </p>
                                {education.proTips.map((tip, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg"
                                    >
                                        <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-300">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Metric Detail Modal */}
            {selectedMetric !== null && (
                <MetricDetailModal
                    metric={education.metrics[selectedMetric]}
                    onClose={() => setSelectedMetric(null)}
                />
            )}
        </div>
    );
}
