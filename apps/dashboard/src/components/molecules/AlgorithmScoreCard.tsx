/**
 * AlgorithmScoreCard Component
 *
 * Displays viral potential score with 5-dimensional breakdown,
 * visual progress bars, and improvement suggestions.
 *
 * @module components/molecules/AlgorithmScoreCard
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Zap, MessageSquare, Settings, RefreshCw, Lightbulb } from 'lucide-react';
import type { AlgorithmScore, ViralPotentialLabel } from '../../lib/api';

interface AlgorithmScoreCardProps {
    /** The algorithm score data */
    score: AlgorithmScore;
    /** Viral potential label with color coding */
    viralLabel: ViralPotentialLabel;
    /** Loading state */
    isLoading?: boolean;
    /** Compact mode - hide breakdown by default */
    compact?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Score metric configuration
 */
const METRIC_CONFIG: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
    hookStrength: {
        icon: <Zap className="w-4 h-4" />,
        label: 'Hook Gücü',
        description: 'İlk saniyede dikkat çekme potansiyeli',
    },
    completionPotential: {
        icon: <TrendingUp className="w-4 h-4" />,
        label: 'Tamamlama',
        description: 'İzleyicinin sonuna kadar izleme olasılığı',
    },
    engagementTriggers: {
        icon: <MessageSquare className="w-4 h-4" />,
        label: 'Etkileşim',
        description: 'Yorum ve paylaşım tetikleyicileri',
    },
    platformOptimization: {
        icon: <Settings className="w-4 h-4" />,
        label: 'Platform Uyumu',
        description: 'Algoritma optimizasyonu seviyesi',
    },
    loopPotential: {
        icon: <RefreshCw className="w-4 h-4" />,
        label: 'Loop Potansiyeli',
        description: 'Tekrar izleme olasılığı',
    },
};

/**
 * Get color classes based on score value
 */
function getScoreColorClass(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 65) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 35) return 'bg-orange-500';
    return 'bg-red-500';
}

/**
 * Get text color based on viral label color
 */
function getViralLabelColorClass(color: ViralPotentialLabel['color']): string {
    switch (color) {
        case 'green':
            return 'text-green-400';
        case 'blue':
            return 'text-blue-400';
        case 'yellow':
            return 'text-yellow-400';
        case 'orange':
            return 'text-orange-400';
        case 'red':
            return 'text-red-400';
        default:
            return 'text-slate-400';
    }
}

/**
 * Get background gradient based on overall score
 */
function getScoreGradient(score: number): string {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 65) return 'from-blue-500 to-indigo-600';
    if (score >= 50) return 'from-yellow-500 to-amber-600';
    if (score >= 35) return 'from-orange-500 to-red-600';
    return 'from-red-500 to-rose-700';
}

/**
 * Score Progress Bar
 */
function ScoreBar({ score, label, icon, description }: {
    score: number;
    label: string;
    icon: React.ReactNode;
    description: string;
}) {
    return (
        <div className="group" title={description}>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-slate-500 group-hover:text-slate-400 transition-colors">
                        {icon}
                    </span>
                    <span>{label}</span>
                </div>
                <span className="text-sm font-medium text-slate-200">{score}</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${getScoreColorClass(score)}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}

/**
 * AlgorithmScoreCard
 *
 * Comprehensive viral score visualization with:
 * - Overall score circle with gradient
 * - 5 metric progress bars
 * - Expandable improvements section
 */
export function AlgorithmScoreCard({
    score,
    viralLabel,
    isLoading = false,
    compact = false,
    className = '',
}: AlgorithmScoreCardProps) {
    const [isExpanded, setIsExpanded] = useState(!compact);

    if (isLoading) {
        return <AlgorithmScoreCardSkeleton />;
    }

    const metrics = [
        { key: 'hookStrength', value: score.hookStrength },
        { key: 'completionPotential', value: score.completionPotential },
        { key: 'engagementTriggers', value: score.engagementTriggers },
        { key: 'platformOptimization', value: score.platformOptimization },
        { key: 'loopPotential', value: score.loopPotential },
    ];

    return (
        <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
            {/* Header with Overall Score */}
            <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Score Circle */}
                        <div
                            className={`
                                relative w-16 h-16 rounded-full bg-gradient-to-br ${getScoreGradient(score.overallScore)}
                                flex items-center justify-center shadow-lg
                            `}
                        >
                            <div className="absolute inset-1 bg-slate-900 rounded-full flex items-center justify-center">
                                <span className="text-xl font-bold text-white">{score.overallScore}</span>
                            </div>
                        </div>

                        {/* Viral Label */}
                        <div>
                            <div className={`flex items-center gap-2 text-lg font-semibold ${getViralLabelColorClass(viralLabel.color)}`}>
                                <span>{viralLabel.emoji}</span>
                                <span>{viralLabel.label}</span>
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">Viral Potansiyel Skoru</p>
                        </div>
                    </div>

                    {/* Expand/Collapse Toggle */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
                        aria-label={isExpanded ? 'Detayları gizle' : 'Detayları göster'}
                    >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <>
                    {/* Metric Breakdown */}
                    <div className="p-4 space-y-3">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">Metrik Dağılımı</h4>
                        {metrics.map(({ key, value }) => {
                            const config = METRIC_CONFIG[key];
                            if (!config) return null;
                            return (
                                <ScoreBar
                                    key={key}
                                    score={value}
                                    label={config.label}
                                    icon={config.icon}
                                    description={config.description}
                                />
                            );
                        })}
                    </div>

                    {/* Improvements Section */}
                    {score.improvements.length > 0 && (
                        <div className="p-4 bg-slate-900/30 border-t border-slate-700/50">
                            <h4 className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                                <Lightbulb className="w-4 h-4" />
                                İyileştirme Önerileri
                            </h4>
                            <ul className="space-y-2">
                                {score.improvements.map((improvement, index) => (
                                    <li
                                        key={index}
                                        className="flex items-start gap-2 text-sm text-slate-300"
                                    >
                                        <span className="text-amber-500/80 mt-0.5">•</span>
                                        <span>{improvement}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Detailed Breakdown (from API) */}
                    {score.breakdown.length > 0 && (
                        <div className="p-4 border-t border-slate-700/50">
                            <h4 className="text-sm font-medium text-slate-400 mb-3">Detaylı Analiz</h4>
                            <div className="space-y-2">
                                {score.breakdown.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300">{item.metric}</span>
                                        <span className="text-slate-400">{item.feedback}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * AlgorithmScoreCardSkeleton
 *
 * Loading placeholder for AlgorithmScoreCard
 */
export function AlgorithmScoreCardSkeleton() {
    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-700" />
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-slate-700 rounded" />
                    <div className="h-4 w-24 bg-slate-700/50 rounded" />
                </div>
            </div>
            <div className="mt-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-1">
                        <div className="h-4 w-24 bg-slate-700/50 rounded" />
                        <div className="h-2 bg-slate-700/30 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * CompactScoreBadge
 *
 * Minimal score display for inline use
 */
export function CompactScoreBadge({ score, viralLabel }: { score: number; viralLabel: ViralPotentialLabel }) {
    return (
        <span
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium
                bg-gradient-to-r ${getScoreGradient(score)} text-white shadow-sm
            `}
            title={viralLabel.label}
        >
            <span>{viralLabel.emoji}</span>
            <span>{score}</span>
        </span>
    );
}
