/**
 * Architecture Map Panel
 * 
 * Displays system architecture, components, and ADR decisions.
 * 
 * @module components/observatory/ArchitectureMap
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { observatoryApi, type ArchitectureResponse } from '../../lib/observatoryApi';
import { Network, Server, Monitor, Package, FileCheck, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';

/**
 * System card component
 */
function SystemCard({
    name,
    description,
    docFile,
    status,
}: {
    name: string;
    description: string;
    docFile: string;
    status: 'active' | 'planned';
}) {
    return (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-indigo-500/50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-100">{name}</h4>
                        {status === 'active' ? (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                Aktif
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                Planlanıyor
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400">{description}</p>
                </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
                Dokümantasyon: <code className="text-indigo-400">memory/architecture/{docFile}</code>
            </div>
        </div>
    );
}

/**
 * ADR Table component
 */
function ADRTable({
    adrs,
}: {
    adrs: ArchitectureResponse['adrs'];
}) {
    const [expanded, setExpanded] = useState(false);
    const displayAdrs = expanded ? adrs : adrs.slice(0, 5);

    const statusIcons = {
        accepted: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        deprecated: <AlertCircle className="w-4 h-4 text-red-400" />,
        proposed: <Clock className="w-4 h-4 text-amber-400" />,
    };

    const statusLabels = {
        accepted: 'Kabul Edildi',
        deprecated: 'Kaldırıldı',
        proposed: 'Önerildi',
    };

    return (
        <div className="space-y-2">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left py-2 px-3 text-slate-400 font-medium">ID</th>
                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Karar</th>
                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Özet</th>
                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayAdrs.map((adr) => (
                            <tr key={adr.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="py-2 px-3">
                                    <code className="text-indigo-400">{adr.id}</code>
                                </td>
                                <td className="py-2 px-3 text-slate-100">{adr.title}</td>
                                <td className="py-2 px-3 text-slate-400">{adr.summary}</td>
                                <td className="py-2 px-3">
                                    <div className="flex items-center gap-1">
                                        {statusIcons[adr.status]}
                                        <span className="text-slate-300">{statusLabels[adr.status]}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {adrs.length > 5 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                    {expanded ? (
                        <>
                            <ChevronDown className="w-4 h-4" />
                            Daha az göster
                        </>
                    ) : (
                        <>
                            <ChevronRight className="w-4 h-4" />
                            Tümünü göster ({adrs.length - 5} daha)
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

/**
 * Component Tree
 */
function ComponentTree({
    components,
}: {
    components: ArchitectureResponse['components'];
}) {
    const sections = [
        { key: 'backend', label: 'Backend', icon: Server, color: 'text-emerald-400' },
        { key: 'frontend', label: 'Frontend', icon: Monitor, color: 'text-cyan-400' },
        { key: 'shared', label: 'Shared', icon: Package, color: 'text-purple-400' },
    ] as const;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sections.map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                    <h4 className={`font-medium ${color} flex items-center gap-2 mb-3`}>
                        <Icon className="w-4 h-4" />
                        {label}
                    </h4>
                    <ul className="space-y-1">
                        {components[key].map((item, idx) => (
                            <li key={idx} className="text-xs text-slate-400 font-mono">
                                • {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

/**
 * Architecture Map Component
 */
export function ArchitectureMap() {
    const { data, isLoading, error } = useQuery<ArchitectureResponse>({
        queryKey: ['observatory', 'architecture'],
        queryFn: () => observatoryApi.getArchitecture(),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 rounded-lg bg-slate-800/50 animate-pulse" />
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                Mimari verisi yüklenemedi: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                    <Network className="w-6 h-6 text-cyan-400" />
                    Mimari Haritası
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    {data.systems.length} sistem • {data.adrs.length} ADR kararı
                </p>
            </div>

            {/* Systems Grid */}
            <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-400" />
                    Sistemler
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.systems.map((system) => (
                        <SystemCard key={system.docFile} {...system} />
                    ))}
                </div>
            </div>

            {/* ADR Decisions */}
            <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-400" />
                    Mimari Kararlar (ADR)
                </h3>
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                    <ADRTable adrs={data.adrs} />
                </div>
            </div>

            {/* Component Tree */}
            <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    Bileşen Yapısı
                </h3>
                <ComponentTree components={data.components} />
            </div>
        </div>
    );
}
