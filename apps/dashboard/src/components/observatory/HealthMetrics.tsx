/**
 * Health Metrics Panel
 * 
 * Displays real-time system health and status.
 * 
 * @module components/observatory/HealthMetrics
 */

import { useQuery } from '@tanstack/react-query';
import { Heart, Server, Brain, Database, Wifi, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Health status types
 */
interface HealthData {
    status: string;
    rateLimit: {
        isHealthy: boolean;
        remaining: number;
        used: number;
        resetAt?: string;
    };
    cache: {
        hitRate: number;
        totalQueries: number;
        hits: number;
        misses: number;
    };
    database: {
        size: number;
        tables: number;
    };
}

interface AIStatus {
    isConfigured: boolean;
    model: string;
    status: string;
}

/**
 * Status indicator component
 */
function StatusIndicator({
    status,
    label,
}: {
    status: 'healthy' | 'warning' | 'error';
    label: string;
}) {
    const config = {
        healthy: {
            bg: 'bg-emerald-500/20',
            border: 'border-emerald-500/30',
            icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
            text: 'text-emerald-400',
        },
        warning: {
            bg: 'bg-amber-500/20',
            border: 'border-amber-500/30',
            icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
            text: 'text-amber-400',
        },
        error: {
            bg: 'bg-red-500/20',
            border: 'border-red-500/30',
            icon: <XCircle className="w-4 h-4 text-red-400" />,
            text: 'text-red-400',
        },
    };

    const c = config[status];

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 ${c.bg} ${c.border} border rounded-full`}>
            {c.icon}
            <span className={`text-sm ${c.text}`}>{label}</span>
        </div>
    );
}

/**
 * Metric box component
 */
function MetricBox({
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
    color?: 'indigo' | 'emerald' | 'amber' | 'cyan';
}) {
    const colors = {
        indigo: 'border-indigo-500/30 text-indigo-400',
        emerald: 'border-emerald-500/30 text-emerald-400',
        amber: 'border-amber-500/30 text-amber-400',
        cyan: 'border-cyan-500/30 text-cyan-400',
    };

    return (
        <div className={`p-4 bg-slate-800/50 border ${colors[color]} rounded-lg`}>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Icon className={`w-4 h-4 ${colors[color].split(' ').pop()}`} />
                {label}
            </div>
            <div className="text-2xl font-bold text-slate-100">{value}</div>
            {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
        </div>
    );
}

/**
 * Fetch health data
 */
async function fetchHealthData(): Promise<HealthData> {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Health check failed');
    const json = await response.json();
    return {
        status: json.status || 'unknown',
        rateLimit: json.rateLimit || { isHealthy: false, remaining: 0, used: 0 },
        cache: json.cacheStats || { hitRate: 0, totalQueries: 0, hits: 0, misses: 0 },
        database: json.database || { size: 0, tables: 0 },
    };
}

/**
 * Fetch AI status
 */
async function fetchAIStatus(): Promise<AIStatus> {
    try {
        const response = await fetch(`${API_BASE}/ai/status`);
        if (!response.ok) {
            return { isConfigured: false, model: 'N/A', status: 'error' };
        }
        const json = await response.json();
        return {
            isConfigured: json.data?.isConfigured ?? false,
            model: json.data?.model ?? 'gemini-2.0-flash',
            status: json.data?.isConfigured ? 'ready' : 'not_configured',
        };
    } catch {
        return { isConfigured: false, model: 'N/A', status: 'error' };
    }
}

/**
 * Health Metrics Component
 */
export function HealthMetrics() {
    const {
        data: health,
        isLoading: healthLoading,
        error: healthError,
    } = useQuery<HealthData>({
        queryKey: ['observatory', 'health'],
        queryFn: fetchHealthData,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 30 * 1000, // Auto-refresh every 30s
    });

    const {
        data: aiStatus,
        isLoading: aiLoading,
    } = useQuery<AIStatus>({
        queryKey: ['observatory', 'ai-status'],
        queryFn: fetchAIStatus,
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 60 * 1000, // Auto-refresh every 1min
    });

    const isLoading = healthLoading || aiLoading;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-8 w-24 rounded-full bg-slate-800/50 animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 rounded-lg bg-slate-800/50 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (healthError) {
        return (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                Sağlık verileri yüklenemedi: {healthError instanceof Error ? healthError.message : 'Bilinmeyen hata'}
            </div>
        );
    }

    const engineStatus = health?.status === 'ok' ? 'healthy' : 'warning';
    const rateLimitStatus = health?.rateLimit.isHealthy ? 'healthy' : 'warning';
    const aiConfigStatus = aiStatus?.isConfigured ? 'healthy' : 'error';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-rose-400" />
                    Sistem Sağlığı
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    Real-time durum bilgileri • Her 30 saniyede güncellenir
                </p>
            </div>

            {/* Status indicators */}
            <div className="flex flex-wrap gap-3">
                <StatusIndicator
                    status={engineStatus}
                    label={engineStatus === 'healthy' ? 'Engine Çalışıyor' : 'Engine Sorunlu'}
                />
                <StatusIndicator
                    status={rateLimitStatus}
                    label={rateLimitStatus === 'healthy' ? 'Rate Limit OK' : 'Rate Limit Uyarı'}
                />
                <StatusIndicator
                    status={aiConfigStatus}
                    label={aiConfigStatus === 'healthy' ? 'AI Aktif' : 'AI Yapılandırılmamış'}
                />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox
                    icon={Wifi}
                    label="Rate Limit Kalan"
                    value={health?.rateLimit.remaining ?? 0}
                    sublabel={`${health?.rateLimit.used ?? 0} kullanıldı`}
                    color="emerald"
                />
                <MetricBox
                    icon={Database}
                    label="Cache Hit Rate"
                    value={`${Math.round((health?.cache.hitRate ?? 0) * 100)}%`}
                    sublabel={`${health?.cache.hits ?? 0} hit / ${health?.cache.misses ?? 0} miss`}
                    color="cyan"
                />
                <MetricBox
                    icon={Server}
                    label="Toplam Sorgu"
                    value={health?.cache.totalQueries ?? 0}
                    sublabel="Cache sorguları"
                    color="amber"
                />
                <MetricBox
                    icon={Brain}
                    label="AI Model"
                    value={aiStatus?.model ?? 'N/A'}
                    sublabel={aiStatus?.isConfigured ? 'Yapılandırıldı' : 'Yapılandırılmadı'}
                    color="indigo"
                />
            </div>

            {/* Auto-refresh indicator */}
            <div className="text-center text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Otomatik yenileme aktif
                </span>
            </div>
        </div>
    );
}
