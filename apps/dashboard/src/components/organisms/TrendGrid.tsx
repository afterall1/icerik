/**
 * TrendGrid Component
 * 
 * Responsive grid layout for displaying trend cards with Grid/List view toggle.
 * Uses CSS Grid with responsive columns and supports virtualization for large datasets.
 * 
 * @module components/organisms/TrendGrid
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TrendCard } from '../molecules';
import { MultiPlatformScriptModal } from './MultiPlatformScriptModal';
import { LayoutGrid, List, Loader2 } from 'lucide-react';
import type { TrendData } from '../../lib/api';

// ============================================================
// Types
// ============================================================

export type ViewMode = 'grid' | 'list';

interface TrendGridProps {
    trends: TrendData[];
    isLoading?: boolean;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    /** Number of items to render initially (virtualization) */
    initialRenderCount?: number;
    /** Number of items to add when scrolling near bottom */
    loadMoreCount?: number;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_INITIAL_RENDER = 12;
const DEFAULT_LOAD_MORE = 6;
const SCROLL_THRESHOLD = 200; // pixels from bottom to trigger load more

// ============================================================
// Component
// ============================================================

export function TrendGrid({
    trends,
    isLoading = false,
    viewMode: controlledViewMode,
    onViewModeChange,
    initialRenderCount = DEFAULT_INITIAL_RENDER,
    loadMoreCount = DEFAULT_LOAD_MORE,
}: TrendGridProps) {
    // View mode - controlled or uncontrolled
    const [internalViewMode, setInternalViewMode] = useState<ViewMode>('grid');
    const viewMode = controlledViewMode ?? internalViewMode;

    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setInternalViewMode(mode);
        onViewModeChange?.(mode);
    }, [onViewModeChange]);

    // Script generation modal state
    const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Virtualization state
    const [renderedCount, setRenderedCount] = useState(initialRenderCount);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset rendered count when trends change
    useEffect(() => {
        setRenderedCount(initialRenderCount);
    }, [trends.length, initialRenderCount]);

    // Scroll-based lazy loading
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            if (distanceFromBottom < SCROLL_THRESHOLD && renderedCount < trends.length) {
                setRenderedCount(prev => Math.min(prev + loadMoreCount, trends.length));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [renderedCount, trends.length, loadMoreCount]);

    // Memoized visible trends
    const visibleTrends = useMemo(() => {
        return trends.slice(0, renderedCount);
    }, [trends, renderedCount]);

    // Modal handlers
    const handleOpenScriptModal = useCallback((trend: TrendData) => {
        setSelectedTrend(trend);
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedTrend(null), 300);
    }, []);

    // ============================================================
    // Render States
    // ============================================================

    if (isLoading) {
        return (
            <div className={viewMode === 'grid' ? 'trend-grid' : 'trend-list'}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={`skeleton-${i}`}
                        className="h-40 bg-slate-800/50 rounded-xl animate-pulse"
                        style={{ animationDelay: `${i * 100}ms` }}
                    />
                ))}
            </div>
        );
    }

    if (trends.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <LayoutGrid className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                    Trend bulunamadı
                </h3>
                <p className="text-sm text-slate-500">
                    Filtreleri değiştirmeyi deneyin.
                </p>
            </div>
        );
    }

    // ============================================================
    // Main Render
    // ============================================================

    return (
        <>
            {/* Header with count and view toggle */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-400">
                    {trends.length} trend bulundu
                    {renderedCount < trends.length && (
                        <span className="text-slate-500 ml-1">
                            ({renderedCount} gösteriliyor)
                        </span>
                    )}
                </h3>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg">
                    <button
                        onClick={() => handleViewModeChange('grid')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-slate-400 hover:text-slate-300'
                            }`}
                        title="Grid görünümü"
                        aria-label="Grid görünümü"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleViewModeChange('list')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-slate-400 hover:text-slate-300'
                            }`}
                        title="Liste görünümü"
                        aria-label="Liste görünümü"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Trend Grid/List Container */}
            <div
                ref={containerRef}
                className={viewMode === 'grid' ? 'trend-grid' : 'trend-list'}
            >
                {visibleTrends.map((trend, index) => (
                    <div
                        key={trend.id}
                        className="trend-grid-item"
                        style={{
                            animationDelay: `${Math.min(index, 11) * 50}ms`,
                        }}
                    >
                        <TrendCard
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
                    </div>
                ))}
            </div>

            {/* Load More Indicator */}
            {renderedCount < trends.length && (
                <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Daha fazla yükleniyor...</span>
                    </div>
                </div>
            )}

            {/* Multi-Platform Script Generator Modal */}
            {selectedTrend && (
                <MultiPlatformScriptModal
                    trend={selectedTrend}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                />
            )}

            {/* CSS Styles */}
            <style>{`
                .trend-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                @media (min-width: 640px) {
                    .trend-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 16px;
                    }
                }

                @media (min-width: 1024px) {
                    .trend-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                    }
                }

                .trend-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .trend-grid-item {
                    animation: fadeInUp 0.3s ease-out forwards;
                    opacity: 0;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
}
