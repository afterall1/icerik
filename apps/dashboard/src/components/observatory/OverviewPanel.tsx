/**
 * Overview Panel
 * 
 * Displays project-wide metrics at a glance.
 * 
 * @module components/observatory/OverviewPanel
 */

import { useQuery } from '@tanstack/react-query';
import { observatoryApi, type ObservatoryMetrics } from '../../lib/observatoryApi';
import { Activity, Cpu, Database, FileCode, Folder, GitBranch, Layers, Zap } from 'lucide-react';

/**
 * Metric card component
 */
function MetricCard({
    icon: Icon,
    label,
    value,
    sublabel,
    color = 'indigo',
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sublabel?: string;
    color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple';
}) {
    const colorClasses = {
        indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400',
        emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
        amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
        rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
        cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    };

    return (
        <div
            className={`
                relative overflow-hidden rounded-xl border backdrop-blur-sm
                bg-gradient-to-br ${colorClasses[color]}
                p-4 transition-all duration-300 hover:scale-[1.02]
            `}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
                    {sublabel && (
                        <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
                    )}
                </div>
                <Icon className={`w-8 h-8 ${colorClasses[color].split(' ').pop()}`} />
            </div>
        </div>
    );
}

/**
 * Overview Panel Component
 */
export function OverviewPanel() {
    const { data: metrics, isLoading, error } = useQuery<ObservatoryMetrics>({
        queryKey: ['observatory', 'metrics'],
        queryFn: () => observatoryApi.getMetrics(),
        staleTime: 60 * 1000, // 1 minute
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="h-24 rounded-xl bg-slate-800/50 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                Metrikler yüklenemedi: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-400" />
                        {metrics.projectName}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Version {metrics.version} • Son güncelleme: {formatDate(metrics.lastUpdate)}
                    </p>
                </div>
                <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                    <span className="text-emerald-400 font-semibold">
                        ✓ Tüm Fazlar Tamamlandı
                    </span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={GitBranch}
                    label="Tamamlanan Fazlar"
                    value={`${metrics.completedPhases}/${metrics.totalPhases}`}
                    sublabel="Development phases"
                    color="emerald"
                />
                <MetricCard
                    icon={Zap}
                    label="API Endpoint"
                    value={metrics.totalEndpoints}
                    sublabel="REST API"
                    color="amber"
                />
                <MetricCard
                    icon={Layers}
                    label="Platform"
                    value={metrics.totalPlatforms}
                    sublabel="TikTok, Reels, Shorts"
                    color="rose"
                />
                <MetricCard
                    icon={Folder}
                    label="Kategori"
                    value={metrics.totalCategories}
                    sublabel="İçerik kategorileri"
                    color="cyan"
                />
                <MetricCard
                    icon={Database}
                    label="Subreddit"
                    value={metrics.totalSubreddits}
                    sublabel="Veri kaynağı"
                    color="purple"
                />
                <MetricCard
                    icon={FileCode}
                    label="Knowledge Dosyası"
                    value={metrics.knowledgeFiles}
                    sublabel="AI bilgi tabanı"
                    color="indigo"
                />
                <MetricCard
                    icon={Cpu}
                    label="AI Sistemleri"
                    value={6}
                    sublabel="Agent, Orchestrator, Supervisor..."
                    color="emerald"
                />
                <MetricCard
                    icon={Activity}
                    label="Arşitektür Dosyası"
                    value={6}
                    sublabel="memory/architecture/"
                    color="amber"
                />
            </div>
        </div>
    );
}
