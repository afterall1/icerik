/**
 * TrendExplorer Page
 * 
 * Main dashboard page for exploring viral trends from Reddit.
 * Uses React Query for data fetching with automatic caching and refetching.
 * 
 * @module pages/TrendExplorer
 */

import { useState, useCallback } from 'react';
import { useFilterStore } from '../stores/filterStore';
import { useCategories, useSubreddits, useTrends } from '../lib/hooks';
import { CategoryGrid, SubredditList, TrendResults, FilterPanel } from '../components/organisms';
import { Button } from '../components/atoms';
import { ChevronLeft, RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

type ViewState = 'categories' | 'subreddits' | 'trends';

export function TrendExplorer() {
    const [view, setView] = useState<ViewState>('categories');
    const queryClient = useQueryClient();

    const {
        selectedCategory,
        selectedSubreddit,
        sortType,
        timeRange,
        setSelectedCategory,
        setSelectedSubreddit,
        setSortType,
        setTimeRange,
    } = useFilterStore();

    // React Query hooks
    const {
        data: categories = [],
        isLoading: categoriesLoading,
        error: categoriesError,
        refetch: refetchCategories,
    } = useCategories();

    const {
        data: subreddits = [],
        isLoading: subredditsLoading,
        error: subredditsError,
        refetch: refetchSubreddits,
    } = useSubreddits(selectedCategory || undefined, {
        enabled: !!selectedCategory,
    });

    const {
        data: trends = [],
        isLoading: trendsLoading,
        error: trendsError,
        refetch: refetchTrends,
    } = useTrends(
        {
            subreddit: selectedSubreddit || undefined,
            sortType,
            timeRange,
            limit: 20,
        },
        {
            enabled: !!selectedSubreddit && view === 'trends',
        }
    );

    // Determine current loading and error state based on view
    const isLoading =
        (view === 'categories' && categoriesLoading) ||
        (view === 'subreddits' && subredditsLoading) ||
        (view === 'trends' && trendsLoading);

    const currentError =
        (view === 'categories' && categoriesError) ||
        (view === 'subreddits' && subredditsError) ||
        (view === 'trends' && trendsError);

    const handleCategorySelect = useCallback((id: string) => {
        setSelectedCategory(id);
        setView('subreddits');
    }, [setSelectedCategory]);

    const handleSubredditSelect = useCallback((name: string) => {
        setSelectedSubreddit(name);
        setView('trends');
    }, [setSelectedSubreddit]);

    const handleBack = useCallback(() => {
        if (view === 'trends') {
            setView('subreddits');
        } else if (view === 'subreddits') {
            setView('categories');
            setSelectedCategory(null);
        }
    }, [view, setSelectedCategory]);

    const handleRetry = useCallback(() => {
        if (view === 'categories') {
            refetchCategories();
        } else if (view === 'subreddits') {
            refetchSubreddits();
        } else if (view === 'trends') {
            refetchTrends();
        }
    }, [view, refetchCategories, refetchSubreddits, refetchTrends]);

    const handleRefreshTrends = useCallback(() => {
        // Invalidate and refetch trends with fresh data
        queryClient.invalidateQueries({ queryKey: ['trends', 'list'] });
        refetchTrends();
    }, [queryClient, refetchTrends]);

    const getCategoryLabel = useCallback((id: string | null): string => {
        if (!id) return '';
        const cat = categories.find((c) => c.id === id);
        return cat?.label ?? id;
    }, [categories]);

    return (
        <div className="min-h-screen bg-slate-900">
            <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {view !== 'categories' && (
                                <Button variant="ghost" size="sm" onClick={handleBack}>
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Geri
                                </Button>
                            )}
                            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-400" />
                                Trend Explorer
                            </h1>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            {selectedCategory && (
                                <span className="px-2 py-1 bg-slate-800 rounded">
                                    {getCategoryLabel(selectedCategory)}
                                </span>
                            )}
                            {selectedSubreddit && (
                                <>
                                    <span>/</span>
                                    <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded">
                                        r/{selectedSubreddit}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Error Display */}
                {currentError && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                        <div className="flex items-start gap-3 text-red-300">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium">Bir hata oluştu</p>
                                <p className="text-sm text-red-400 mt-1">
                                    {currentError instanceof Error ? currentError.message : 'Beklenmeyen bir hata oluştu'}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRetry}
                            >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Tekrar Dene
                            </Button>
                        </div>
                    </div>
                )}

                {/* Categories View */}
                {view === 'categories' && (
                    <section>
                        <h2 className="text-2xl font-bold text-slate-100 mb-6">
                            📁 Kategori Seç
                        </h2>
                        <CategoryGrid
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onCategorySelect={handleCategorySelect}
                            isLoading={categoriesLoading}
                        />
                    </section>
                )}

                {/* Subreddits View */}
                {view === 'subreddits' && (
                    <section>
                        <h2 className="text-2xl font-bold text-slate-100 mb-6">
                            📊 Subreddit Seç
                        </h2>
                        <SubredditList
                            subreddits={subreddits.slice(0, 10)}
                            selectedSubreddit={selectedSubreddit}
                            onSubredditSelect={handleSubredditSelect}
                            isLoading={subredditsLoading}
                            categoryLabel={getCategoryLabel(selectedCategory)}
                        />
                    </section>
                )}

                {/* Trends View */}
                {view === 'trends' && (
                    <section>
                        <FilterPanel
                            sortType={sortType}
                            timeRange={timeRange}
                            onSortChange={setSortType}
                            onTimeRangeChange={setTimeRange}
                        />

                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-slate-100">
                                🔥 Trendler
                            </h2>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRefreshTrends}
                                disabled={trendsLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-1 ${trendsLoading ? 'animate-spin' : ''}`} />
                                Yenile
                            </Button>
                        </div>

                        <TrendResults trends={trends} isLoading={trendsLoading} />
                    </section>
                )}
            </main>
        </div>
    );
}
