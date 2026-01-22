import { create } from 'zustand';

export type SortType = 'hot' | 'rising' | 'top' | 'new';
export type TimeRange = 'hour' | 'day' | 'week' | 'month';

interface FilterState {
    selectedCategory: string | null;
    selectedSubreddit: string | null;
    sortType: SortType;
    timeRange: TimeRange;
    minUpvotes: number;
    minComments: number;
    limit: number;

    setSelectedCategory: (category: string | null) => void;
    setSelectedSubreddit: (subreddit: string | null) => void;
    setSortType: (sort: SortType) => void;
    setTimeRange: (time: TimeRange) => void;
    setMinUpvotes: (min: number) => void;
    setMinComments: (min: number) => void;
    setLimit: (limit: number) => void;
    resetFilters: () => void;
}

const initialState = {
    selectedCategory: null,
    selectedSubreddit: null,
    sortType: 'hot' as SortType,
    timeRange: 'day' as TimeRange,
    minUpvotes: 0,
    minComments: 0,
    limit: 20,
};

export const useFilterStore = create<FilterState>((set) => ({
    ...initialState,

    setSelectedCategory: (category) =>
        set({
            selectedCategory: category,
            selectedSubreddit: null,
        }),

    setSelectedSubreddit: (subreddit) =>
        set({ selectedSubreddit: subreddit }),

    setSortType: (sort) => set({ sortType: sort }),

    setTimeRange: (time) => set({ timeRange: time }),

    setMinUpvotes: (min) => set({ minUpvotes: min }),

    setMinComments: (min) => set({ minComments: min }),

    setLimit: (limit) => set({ limit: limit }),

    resetFilters: () => set(initialState),
}));
