/**
 * API Catalog Panel
 * 
 * Displays all API endpoints with documentation.
 * 
 * @module components/observatory/ApiCatalog
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { observatoryApi, type EndpointsResponse, type EndpointDoc } from '../../lib/observatoryApi';
import { Globe, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Method badge colors
 */
const methodColors = {
    GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    PUT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

/**
 * Endpoint row component
 */
function EndpointRow({ endpoint }: { endpoint: EndpointDoc }) {
    return (
        <div className="flex items-center gap-4 py-3 px-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
            <span
                className={`
                    px-2 py-0.5 text-xs font-mono font-bold rounded border
                    ${methodColors[endpoint.method]}
                `}
            >
                {endpoint.method}
            </span>
            <code className="text-sm text-indigo-400 flex-1">{endpoint.path}</code>
            <span className="text-sm text-slate-400 hidden md:block flex-1">{endpoint.description}</span>
            <span className="text-xs text-slate-500 hidden sm:block">
                Phase {endpoint.phase}
            </span>
        </div>
    );
}

/**
 * Category section component
 */
function CategorySection({
    category,
    endpoints,
    defaultOpen = false,
}: {
    category: string;
    endpoints: EndpointDoc[];
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const categoryColors: Record<string, string> = {
        Core: 'text-emerald-400',
        Cache: 'text-cyan-400',
        Worker: 'text-amber-400',
        'AI Content': 'text-purple-400',
        Intelligence: 'text-rose-400',
        'AI Quality': 'text-indigo-400',
    };

    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`font-medium ${categoryColors[category] || 'text-slate-100'}`}>
                        {category}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded-full">
                        {endpoints.length} endpoint
                    </span>
                </div>
                {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className="divide-y divide-slate-800">
                    {endpoints.map((endpoint, idx) => (
                        <EndpointRow key={idx} endpoint={endpoint} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * API Catalog Component
 */
export function ApiCatalog() {
    const { data, isLoading, error } = useQuery<EndpointsResponse>({
        queryKey: ['observatory', 'endpoints'],
        queryFn: () => observatoryApi.getEndpoints(),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-slate-800/50 animate-pulse" />
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                API kataloğu yüklenemedi: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
            </div>
        );
    }

    // Order categories for display
    const categoryOrder = ['Core', 'Cache', 'Worker', 'AI Content', 'Intelligence', 'AI Quality'];
    const orderedCategories = categoryOrder.filter((cat) => data.grouped[cat]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Globe className="w-6 h-6 text-amber-400" />
                        API Kataloğu
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {data.summary.total} endpoint • {orderedCategories.length} kategori
                    </p>
                </div>

                {/* Summary badges */}
                <div className="flex flex-wrap gap-2">
                    {Object.entries(data.summary.byCategory).map(([cat, count]) => (
                        <span
                            key={cat}
                            className="px-3 py-1 text-xs bg-slate-800 border border-slate-700 rounded-full text-slate-300"
                        >
                            {cat}: {count}
                        </span>
                    ))}
                </div>
            </div>

            {/* Method legend */}
            <div className="flex gap-4 text-sm">
                {Object.entries(methodColors).map(([method, color]) => (
                    <div key={method} className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 text-xs font-mono rounded border ${color}`}>
                            {method}
                        </span>
                    </div>
                ))}
            </div>

            {/* Endpoint categories */}
            <div className="space-y-4">
                {orderedCategories.map((category, idx) => (
                    <CategorySection
                        key={category}
                        category={category}
                        endpoints={data.grouped[category]}
                        defaultOpen={idx === 0}
                    />
                ))}
            </div>
        </div>
    );
}
