/**
 * RateLimitStatus Component
 * 
 * Displays real-time API rate limit status with health indicator.
 * Auto-refreshes every 10 seconds to show current request counts.
 * 
 * @module components/molecules/RateLimitStatus
 */

import { useHealth } from '../../lib/hooks';
import { Activity, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface RateLimitStatusProps {
    /** Show compact version for header */
    compact?: boolean;
    /** Additional CSS classes */
    className?: string;
}

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

function getHealthStatus(isHealthy: boolean, requestsPerMinute: number): HealthStatus {
    if (!isHealthy) return 'unhealthy';
    if (requestsPerMinute > 50) return 'degraded';
    return 'healthy';
}

const STATUS_STYLES: Record<HealthStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
    healthy: {
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: 'text-emerald-400',
        icon: CheckCircle,
    },
    degraded: {
        bg: 'bg-amber-500/10 border-amber-500/30',
        text: 'text-amber-400',
        icon: AlertTriangle,
    },
    unhealthy: {
        bg: 'bg-red-500/10 border-red-500/30',
        text: 'text-red-400',
        icon: AlertTriangle,
    },
};

export function RateLimitStatus({ compact = false, className = '' }: RateLimitStatusProps) {
    const { data: health, isLoading, isError } = useHealth();

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                {!compact && <span className="text-xs text-slate-400">Durum yükleniyor...</span>}
            </div>
        );
    }

    // Error state
    if (isError || !health) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <AlertTriangle className="w-4 h-4 text-red-400" />
                {!compact && <span className="text-xs text-red-400">Bağlantı hatası</span>}
            </div>
        );
    }

    const rateLimit = (health as { rateLimit?: { requestsInLastMinute?: number; isHealthy?: boolean } }).rateLimit;
    const requestsPerMinute = rateLimit?.requestsInLastMinute ?? 0;
    const isHealthy = rateLimit?.isHealthy ?? false;
    const status = getHealthStatus(isHealthy, requestsPerMinute);
    const styles = STATUS_STYLES[status];
    const StatusIcon = styles.icon;

    // Compact version (for header)
    if (compact) {
        return (
            <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${styles.bg} ${className}`}
                title={`API Durumu: ${requestsPerMinute} istek/dk`}
            >
                <StatusIcon className={`w-3.5 h-3.5 ${styles.text}`} />
                <span className={`text-xs font-medium ${styles.text}`}>
                    {requestsPerMinute}/dk
                </span>
            </div>
        );
    }

    // Full version
    return (
        <div className={`p-4 rounded-xl border ${styles.bg} ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${styles.text}`} />
                    <span className="text-sm font-medium text-slate-200">API Durumu</span>
                </div>
                <StatusIcon className={`w-5 h-5 ${styles.text}`} />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-400">İstek/Dakika:</span>
                    <span className={styles.text}>{requestsPerMinute}</span>
                </div>

                <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Durum:</span>
                    <span className={styles.text}>
                        {status === 'healthy' && 'Sağlıklı'}
                        {status === 'degraded' && 'Yoğun'}
                        {status === 'unhealthy' && 'Sorunlu'}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${status === 'healthy'
                                ? 'bg-emerald-500'
                                : status === 'degraded'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                            style={{ width: `${Math.min(requestsPerMinute, 60) / 60 * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0</span>
                        <span>60 limit</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
