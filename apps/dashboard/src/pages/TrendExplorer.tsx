import { useState, useEffect } from 'react';
import { useFilterStore } from '../stores/filterStore';
import { api, type Category, type Subreddit, type TrendData } from '../lib/api';
import { CategoryGrid, SubredditList, TrendResults, FilterPanel } from '../components/organisms';
import { Button } from '../components/atoms';
import { ChevronLeft, RefreshCw, Activity } from 'lucide-react';

type ViewState = 'categories' | 'subreddits' | 'trends';

export function TrendExplorer() {
    const [view, setView] = useState<ViewState>('categories');
    const [categories, setCategories] = useState<Category[]>([]);
    const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            loadSubreddits(selectedCategory);
        }
    }, [selectedCategory]);

    useEffect(() => {
        if (selectedSubreddit) {
            loadTrends();
        }
    }, [selectedSubreddit, sortType, timeRange]);

    async function loadCategories() {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getCategories();
            setCategories(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Kategoriler yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadSubreddits(category: string) {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getSubreddits(category);
            setSubreddits(data.slice(0, 10));
            setView('subreddits');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Subredditler yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadTrends() {
        if (!selectedSubreddit) return;

        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getTrends({
                subreddit: selectedSubreddit,
                sortType,
                timeRange,
                limit: 20,
            });
            setTrends(data);
            setView('trends');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Trendler yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    }

    function handleCategorySelect(id: string) {
        setSelectedCategory(id);
    }

    function handleSubredditSelect(name: string) {
        setSelectedSubreddit(name);
    }

    function handleBack() {
        if (view === 'trends') {
            setView('subreddits');
            setTrends([]);
        } else if (view === 'subreddits') {
            setView('categories');
            setSelectedCategory(null);
            setSubreddits([]);
        }
    }

    function getCategoryLabel(id: string | null): string {
        if (!id) return '';
        const cat = categories.find((c) => c.id === id);
        return cat?.label ?? id;
    }

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
                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                        <p>{error}</p>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                                setError(null);
                                if (view === 'categories') loadCategories();
                                else if (view === 'subreddits' && selectedCategory) loadSubreddits(selectedCategory);
                                else if (view === 'trends') loadTrends();
                            }}
                        >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Tekrar Dene
                        </Button>
                    </div>
                )}

                {view === 'categories' && (
                    <section>
                        <h2 className="text-2xl font-bold text-slate-100 mb-6">
                            📁 Kategori Seç
                        </h2>
                        <CategoryGrid
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onCategorySelect={handleCategorySelect}
                            isLoading={isLoading}
                        />
                    </section>
                )}

                {view === 'subreddits' && (
                    <section>
                        <h2 className="text-2xl font-bold text-slate-100 mb-6">
                            📊 Subreddit Seç
                        </h2>
                        <SubredditList
                            subreddits={subreddits}
                            selectedSubreddit={selectedSubreddit}
                            onSubredditSelect={handleSubredditSelect}
                            isLoading={isLoading}
                            categoryLabel={getCategoryLabel(selectedCategory)}
                        />
                    </section>
                )}

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
                                onClick={loadTrends}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                Yenile
                            </Button>
                        </div>

                        <TrendResults trends={trends} isLoading={isLoading} />
                    </section>
                )}
            </main>
        </div>
    );
}
