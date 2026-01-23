/**
 * TrendResults Component
 * 
 * Displays a list of trend cards with script generation capability.
 * Integrates ScriptGeneratorModal for AI-powered video script creation.
 * 
 * @module components/organisms/TrendResults
 */

import { useState, useCallback } from 'react';
import { TrendCard } from '../molecules';
import { ScriptGeneratorModal } from './ScriptGeneratorModal';
import type { TrendData } from '../../lib/api';

interface TrendResultsProps {
    trends: TrendData[];
    isLoading?: boolean;
}

export function TrendResults({ trends, isLoading = false }: TrendResultsProps) {
    const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenScriptModal = useCallback((trend: TrendData) => {
        setSelectedTrend(trend);
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        // Keep selectedTrend for potential animation, clear after modal closes
        setTimeout(() => setSelectedTrend(null), 300);
    }, []);

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
        <>
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
                        category={trend.category}
                        nes={trend.nes}
                        score={trend.score}
                        numComments={trend.numComments}
                        upvoteRatio={trend.upvoteRatio}
                        ageHours={trend.ageHours}
                        engagementVelocity={trend.engagementVelocity}
                        controversyFactor={trend.controversyFactor}
                        permalink={trend.permalink}
                        onGenerateScript={() => handleOpenScriptModal(trend)}
                    />
                ))}
            </div>

            {/* Script Generator Modal */}
            {selectedTrend && (
                <ScriptGeneratorModal
                    trend={selectedTrend}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}

