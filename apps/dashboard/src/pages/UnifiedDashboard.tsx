/**
 * UnifiedDashboard Page
 * 
 * Single-page dashboard with sidebar filters, category tabs, and trend grid.
 * Replaces the multi-step TrendExplorer wizard.
 * 
 * @module pages/UnifiedDashboard
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFilterStore } from '../stores/filterStore';
import { useCategories, useSubreddits, useTrends } from '../lib/hooks';
import { FilterSidebar } from '../components/organisms/FilterSidebar';
import { CategoryTabs } from '../components/molecules/CategoryTabs';
import { SearchBar } from '../components/molecules/SearchBar';
import { TrendResults } from '../components/organisms';
import { Activity, RefreshCw, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/atoms';

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export function UnifiedDashboard() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 300);

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

    // Fetch categories
    const {
        data: categories = [],
        isLoading: categoriesLoading,
    } = useCategories();

    // Fetch subreddits for selected category (or all)
    const {
        data: subreddits = [],
    } = useSubreddits(selectedCategory || undefined);

    // Fetch trends - either for selected subreddit or all
    const {
        data: trends = [],
        isLoading: trendsLoading,
        refetch: refetchTrends,
        isFetching: trendsFetching,
    } = useTrends({
        subreddit: selectedSubreddit || undefined,
        category: selectedCategory || undefined,
        sortType,
        timeRange,
        limit: 50,
    });

    // Filter trends by search query
    const filteredTrends = useMemo(() => {
        if (!debouncedSearch) return trends;
        const query = debouncedSearch.toLowerCase();
        return trends.filter(
            (trend) =>
                trend.title.toLowerCase().includes(query) ||
                trend.subreddit.toLowerCase().includes(query)
        );
    }, [trends, debouncedSearch]);

    // Handle category selection
    const handleCategorySelect = useCallback((id: string | null) => {
        setSelectedCategory(id);
        setSelectedSubreddit(null);
    }, [setSelectedCategory, setSelectedSubreddit]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['trends'] });
        refetchTrends();
    }, [queryClient, refetchTrends]);

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSelectedCategory(null);
        setSelectedSubreddit(null);
        setSortType('hot');
        setTimeRange('day');
        setSearchQuery('');
    }, [setSelectedCategory, setSelectedSubreddit, setSortType, setTimeRange]);

    // Stats for header
    const stats = useMemo(() => ({
        totalTrends: trends.length,
        filteredCount: filteredTrends.length,
        avgNes: trends.length > 0
            ? Math.round(trends.reduce((sum, t) => sum + t.nes, 0) / trends.length)
            : 0,
        hotCount: trends.filter(t => t.nes >= 500).length,
    }), [trends, filteredTrends]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    {/* Top Row - Logo & Search */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold text-slate-100">Trend Engine</h1>
                                <p className="text-xs text-slate-500">Reddit trend keşfi</p>
                            </div>
                        </div>

                        <SearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Trend veya subreddit ara..."
                            isLoading={trendsFetching && !!searchQuery}
                            className="flex-1 max-w-xl"
                        />

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={trendsFetching}
                            className="hidden sm:flex"
                        >
                            <RefreshCw className={`w-4 h-4 mr-1.5 ${trendsFetching ? 'animate-spin' : ''}`} />
                            Yenile
                        </Button>
                    </div>

                    {/* Category Tabs */}
                    <CategoryTabs
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategorySelect={handleCategorySelect}
                        isLoading={categoriesLoading}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Left Sidebar - Filters (Hidden on mobile) */}
                    <div className="hidden lg:block w-64 flex-shrink-0">
                        <div className="sticky top-32">
                            <FilterSidebar
                                sortType={sortType}
                                timeRange={timeRange}
                                onSortChange={setSortType}
                                onTimeRangeChange={setTimeRange}
                                subreddits={subreddits.map(s => s.name)}
                                selectedSubreddits={selectedSubreddit ? [selectedSubreddit] : []}
                                onSubredditToggle={(sub) => {
                                    setSelectedSubreddit(selectedSubreddit === sub ? null : sub);
                                }}
                                onClearFilters={handleClearFilters}
                            />
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        {/* Stats Bar */}
                        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/30">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm text-slate-400">
                                    <span className="font-semibold text-slate-200">{stats.filteredCount}</span>
                                    {stats.filteredCount !== stats.totalTrends && (
                                        <span className="text-slate-500"> / {stats.totalTrends}</span>
                                    )}
                                    {' '}trend
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-sm text-slate-400">
                                    Ortalama NES: <span className="font-semibold text-slate-200">{stats.avgNes}</span>
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-slate-400">
                                    <span className="font-semibold text-red-300">{stats.hotCount}</span> sıcak trend
                                </span>
                            </div>

                            {/* Mobile Filter Toggle */}
                            <button
                                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                                className="lg:hidden ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-700"
                            >
                                Filtreler
                            </button>
                        </div>

                        {/* Mobile Filters */}
                        {isMobileFilterOpen && (
                            <div className="lg:hidden mb-6">
                                <FilterSidebar
                                    sortType={sortType}
                                    timeRange={timeRange}
                                    onSortChange={setSortType}
                                    onTimeRangeChange={setTimeRange}
                                    onClearFilters={handleClearFilters}
                                />
                            </div>
                        )}

                        {/* Trend Results */}
                        <TrendResults
                            trends={filteredTrends}
                            isLoading={trendsLoading}
                        />

                        {/* Empty State for Search */}
                        {!trendsLoading && filteredTrends.length === 0 && searchQuery && (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                                    <Activity className="w-8 h-8 text-slate-600" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-300 mb-2">
                                    "{searchQuery}" için sonuç bulunamadı
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    Farklı anahtar kelimeler deneyin veya filtreleri temizleyin.
                                </p>
                                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                                    Aramayı Temizle
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
