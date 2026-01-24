/**
 * AnalyticsPanel Component
 *
 * Dashboard panel showing usage analytics and statistics.
 *
 * @module components/molecules/AnalyticsPanel
 */

import { useState } from 'react';
import { Card } from '../atoms';
import type { AnalyticsData, AnalyticsSummary } from '../../lib/useAnalytics';
import type { RatingStats } from '../../lib/useScriptRating';
import { PLATFORM_LABELS, PLATFORM_ICONS, type Platform } from '../../lib/api';
import {
    BarChart3,
    FileText,
    Copy,
    Download,
    RefreshCw,
    ThumbsUp,
    ThumbsDown,
    Star,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Trash2,
} from 'lucide-react';

interface AnalyticsPanelProps {
    /** Analytics data */
    analyticsData: AnalyticsData;
    /** Analytics summary */
    analyticsSummary: AnalyticsSummary;
    /** Rating statistics */
    ratingStats?: RatingStats;
    /** Export analytics callback */
    onExport: () => void;
    /** Reset analytics callback */
    onReset: () => void;
}

/**
 * StatCard - Individual stat display
 */
function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    color,
}: {
    icon: typeof FileText;
    label: string;
    value: string | number;
    subValue?: string;
    color: string;
}) {
    return (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-slate-400">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {subValue && (
                <div className="text-xs text-slate-500 mt-1">{subValue}</div>
            )}
        </div>
    );
}

/**
 * PlatformStatRow - Platform-specific stats
 */
function PlatformStatRow({
    platform,
    stats,
}: {
    platform: Platform;
    stats: { generated: number; copied: number; exported: number; iterated: number };
}) {
    const icon = PLATFORM_ICONS[platform];
    const label = PLATFORM_LABELS[platform];

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
            <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-slate-300">{label}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">
                    <FileText className="w-3 h-3 inline mr-1" />
                    {stats.generated}
                </span>
                <span className="text-slate-400">
                    <Copy className="w-3 h-3 inline mr-1" />
                    {stats.copied}
                </span>
                <span className="text-slate-400">
                    <Download className="w-3 h-3 inline mr-1" />
                    {stats.exported}
                </span>
            </div>
        </div>
    );
}

/**
 * AnalyticsPanel - Usage statistics dashboard
 */
export function AnalyticsPanel({
    analyticsData,
    analyticsSummary,
    ratingStats,
    onExport,
    onReset,
}: AnalyticsPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const { scriptsGenerated, copyRate, exportRate, iterationRate, avgModalTimeSeconds, mostUsedPlatform, mostUsedCategory } = analyticsSummary;

    return (
        <Card padding="none" className="overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-200">Kullanım Analizi</span>
                </div>
                {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
            </button>

            {/* Content */}
            {!isCollapsed && (
                <div className="p-4 space-y-4">
                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                            icon={FileText}
                            label="Toplam Script"
                            value={scriptsGenerated}
                            color="text-blue-400"
                        />
                        <StatCard
                            icon={Copy}
                            label="Kopyalama Oranı"
                            value={`${copyRate.toFixed(0)}%`}
                            subValue={`${analyticsData.totalCopies} kopyalama`}
                            color="text-green-400"
                        />
                        <StatCard
                            icon={Download}
                            label="Export Oranı"
                            value={`${exportRate.toFixed(0)}%`}
                            subValue={`${analyticsData.totalExports} export`}
                            color="text-purple-400"
                        />
                        <StatCard
                            icon={RefreshCw}
                            label="Iteration Oranı"
                            value={`${iterationRate.toFixed(0)}%`}
                            subValue={`${analyticsData.totalIterations} düzenleme`}
                            color="text-orange-400"
                        />
                    </div>

                    {/* Rating Stats */}
                    {ratingStats && ratingStats.totalRatings > 0 && (
                        <div className="bg-slate-800/30 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400" />
                                Değerlendirmeler
                            </h4>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <ThumbsUp className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 font-medium">{ratingStats.likes}</span>
                                    <span className="text-slate-500 text-xs">
                                        ({ratingStats.likePercentage.toFixed(0)}%)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ThumbsDown className="w-4 h-4 text-red-400" />
                                    <span className="text-red-400 font-medium">{ratingStats.dislikes}</span>
                                </div>
                                {ratingStats.averageStars > 0 && (
                                    <div className="flex items-center gap-1 text-yellow-400">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span>{ratingStats.averageStars.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Platform Breakdown */}
                    <div className="bg-slate-800/30 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Platform Dağılımı</h4>
                        <div className="divide-y divide-slate-700/50">
                            {(Object.entries(analyticsData.byPlatform) as [Platform, typeof analyticsData.byPlatform[Platform]][]).map(
                                ([platform, stats]) => (
                                    <PlatformStatRow
                                        key={platform}
                                        platform={platform}
                                        stats={stats}
                                    />
                                )
                            )}
                        </div>
                    </div>

                    {/* Insights */}
                    <div className="bg-slate-800/30 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-400" />
                            Öne Çıkanlar
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-slate-400">
                                En çok kullanılan platform:
                                <span className="ml-1 text-white">
                                    {mostUsedPlatform ? PLATFORM_LABELS[mostUsedPlatform] : '-'}
                                </span>
                            </div>
                            <div className="text-slate-400">
                                En çok kullanılan kategori:
                                <span className="ml-1 text-white capitalize">
                                    {mostUsedCategory || '-'}
                                </span>
                            </div>
                            <div className="text-slate-400">
                                Ortalama modal süresi:
                                <span className="ml-1 text-white">
                                    {avgModalTimeSeconds > 0 ? `${avgModalTimeSeconds.toFixed(0)}s` : '-'}
                                </span>
                            </div>
                            <div className="text-slate-400">
                                Toplam oturum:
                                <span className="ml-1 text-white">
                                    {analyticsData.sessionsCount}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <button
                            onClick={onExport}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            Analiz Verisini Dışa Aktar
                        </button>
                        <button
                            onClick={onReset}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                            Sıfırla
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}

export default AnalyticsPanel;
