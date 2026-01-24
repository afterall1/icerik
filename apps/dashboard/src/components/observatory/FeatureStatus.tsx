/**
 * Feature Status Panel
 * 
 * Displays roadmap progress and phase completion status.
 * 
 * @module components/observatory/FeatureStatus
 */

import { useQuery } from '@tanstack/react-query';
import { observatoryApi, type RoadmapResponse } from '../../lib/observatoryApi';
import { Flag, CheckCircle, Clock, Lightbulb, ChevronRight } from 'lucide-react';

/**
 * Phase card component
 */
function PhaseCard({
    phase,
    name,
    status,
    features,
}: {
    phase: number;
    name: string;
    status: 'complete' | 'in-progress' | 'planned';
    features: string[];
}) {
    const statusConfig = {
        complete: {
            bg: 'bg-emerald-500/10 border-emerald-500/30',
            icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
            label: 'Tamamlandı',
            labelColor: 'text-emerald-400',
        },
        'in-progress': {
            bg: 'bg-amber-500/10 border-amber-500/30',
            icon: <Clock className="w-5 h-5 text-amber-400" />,
            label: 'Devam Ediyor',
            labelColor: 'text-amber-400',
        },
        planned: {
            bg: 'bg-slate-500/10 border-slate-500/30',
            icon: <ChevronRight className="w-5 h-5 text-slate-400" />,
            label: 'Planlandı',
            labelColor: 'text-slate-400',
        },
    };

    const config = statusConfig[status];

    return (
        <div
            className={`
                p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02]
                ${config.bg}
            `}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">Phase {phase}</span>
                        <span className={`text-xs ${config.labelColor}`}>{config.label}</span>
                    </div>
                    <h4 className="font-medium text-slate-100">{name}</h4>
                </div>
                {config.icon}
            </div>
            <div className="mt-3">
                <ul className="text-xs text-slate-400 space-y-1">
                    {features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-slate-500 rounded-full" />
                            {feature}
                        </li>
                    ))}
                    {features.length > 3 && (
                        <li className="text-slate-500">+{features.length - 3} daha</li>
                    )}
                </ul>
            </div>
        </div>
    );
}

/**
 * Progress bar component
 */
function ProgressBar({
    completed,
    total,
}: {
    completed: number;
    total: number;
}) {
    const percentage = Math.round((completed / total) * 100);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">İlerleme</span>
                <span className="text-emerald-400 font-semibold">{percentage}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-xs text-slate-500 text-center">
                {completed} / {total} faz tamamlandı
            </div>
        </div>
    );
}

/**
 * Feature Status Component
 */
export function FeatureStatus() {
    const { data, isLoading, error } = useQuery<RoadmapResponse>({
        queryKey: ['observatory', 'roadmap'],
        queryFn: () => observatoryApi.getRoadmap(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-12 rounded-lg bg-slate-800/50 animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-32 rounded-lg bg-slate-800/50 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                Roadmap yüklenemedi: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Flag className="w-6 h-6 text-emerald-400" />
                        Feature Status
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Development roadmap ve faz durumları
                    </p>
                </div>

                {/* Overall status badge */}
                <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <span className="text-emerald-400 font-semibold">
                        ✓ {data.summary.completionPercentage}% Tamamlandı
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="max-w-md">
                <ProgressBar completed={data.summary.completed} total={data.summary.totalPhases} />
            </div>

            {/* Phases grid */}
            <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Tüm Fazlar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {data.phases.map((phase) => (
                        <PhaseCard
                            key={phase.phase}
                            phase={phase.phase}
                            name={phase.name}
                            status={phase.status}
                            features={phase.features}
                        />
                    ))}
                </div>
            </div>

            {/* Future ideas */}
            <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    Gelecek Fikirler
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.futureIdeas.map((idea, idx) => (
                        <div
                            key={idx}
                            className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg text-sm text-slate-300"
                        >
                            💡 {idea}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
