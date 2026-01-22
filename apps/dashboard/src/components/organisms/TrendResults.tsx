import { TrendCard } from '../molecules';
import type { TrendData } from '../../lib/api';

interface TrendResultsProps {
    trends: TrendData[];
    isLoading?: boolean;
}

export function TrendResults({ trends, isLoading = false }: TrendResultsProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-32 bg-slate-800 rounded-xl animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (trends.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <p className="text-lg mb-2">Trend bulunamadı</p>
                <p className="text-sm">Filtreleri değiştirmeyi deneyin.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-400">
                    {trends.length} trend bulundu
                </h3>
            </div>
            {trends.map((trend) => (
                <TrendCard
                    key={trend.id}
                    id={trend.id}
                    title={trend.title}
                    subreddit={trend.subreddit}
                    nes={trend.nes}
                    score={trend.score}
                    numComments={trend.numComments}
                    upvoteRatio={trend.upvoteRatio}
                    ageHours={trend.ageHours}
                    permalink={trend.permalink}
                />
            ))}
        </div>
    );
}
