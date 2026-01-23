/**
 * FilterSidebar Component
 * 
 * Left sidebar with filter options for trends.
 * Collapsible sections with premium glassmorphism design.
 * 
 * @module components/organisms/FilterSidebar
 */

import { useState } from 'react';
import {
    Filter,
    ChevronDown,
    Clock,
    TrendingUp,
    Flame,
    Zap,
    Calendar,
    X
} from 'lucide-react';
import type { TimeRange } from '@icerik/shared';

type SortType = 'hot' | 'new' | 'rising' | 'top';

interface FilterSidebarProps {
    sortType: SortType;
    timeRange: TimeRange;
    onSortChange: (sort: SortType) => void;
    onTimeRangeChange: (range: TimeRange) => void;
    subreddits?: string[];
    selectedSubreddits?: string[];
    onSubredditToggle?: (subreddit: string) => void;
    onClearFilters?: () => void;
    className?: string;
}

interface FilterSectionProps {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

function FilterSection({ title, icon, defaultOpen = true, children }: FilterSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-slate-700/50 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{title}</span>
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
}

interface FilterOptionProps {
    label: string;
    icon?: React.ReactNode;
    isSelected: boolean;
    onClick: () => void;
}

function FilterOption({ label, icon, isSelected, onClick }: FilterOptionProps) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200
                ${isSelected
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }
            `}
        >
            {icon && <span className="w-4 h-4">{icon}</span>}
            <span>{label}</span>
            {isSelected && (
                <div className="ml-auto w-2 h-2 rounded-full bg-indigo-400" />
            )}
        </button>
    );
}

const SORT_OPTIONS: { value: SortType; label: string; icon: React.ReactNode }[] = [
    { value: 'hot', label: 'Popüler', icon: <Flame className="w-4 h-4" /> },
    { value: 'new', label: 'Yeni', icon: <Zap className="w-4 h-4" /> },
    { value: 'rising', label: 'Yükselen', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'top', label: 'En İyi', icon: <TrendingUp className="w-4 h-4" /> },
];

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'hour', label: 'Son 1 Saat' },
    { value: 'day', label: 'Bugün' },
    { value: 'week', label: 'Bu Hafta' },
    { value: 'month', label: 'Bu Ay' },
    { value: 'year', label: 'Bu Yıl' },
    { value: 'all', label: 'Tüm Zamanlar' },
];

export function FilterSidebar({
    sortType,
    timeRange,
    onSortChange,
    onTimeRangeChange,
    subreddits = [],
    selectedSubreddits = [],
    onSubredditToggle,
    onClearFilters,
    className = '',
}: FilterSidebarProps) {
    const hasActiveFilters = sortType !== 'hot' || timeRange !== 'day' || selectedSubreddits.length > 0;

    return (
        <aside className={`
            bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl
            overflow-hidden flex flex-col
            ${className}
        `}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <Filter className="w-4 h-4 text-indigo-400" />
                    <span>Filtreler</span>
                </div>
                {hasActiveFilters && onClearFilters && (
                    <button
                        onClick={onClearFilters}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Temizle
                    </button>
                )}
            </div>

            {/* Filter Sections */}
            <div className="flex-1 overflow-y-auto">
                {/* Sort Section */}
                <FilterSection
                    title="Sıralama"
                    icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
                >
                    {SORT_OPTIONS.map((option) => (
                        <FilterOption
                            key={option.value}
                            label={option.label}
                            icon={option.icon}
                            isSelected={sortType === option.value}
                            onClick={() => onSortChange(option.value)}
                        />
                    ))}
                </FilterSection>

                {/* Time Range Section */}
                <FilterSection
                    title="Zaman Aralığı"
                    icon={<Calendar className="w-4 h-4 text-purple-400" />}
                >
                    {TIME_OPTIONS.map((option) => (
                        <FilterOption
                            key={option.value}
                            label={option.label}
                            icon={<Clock className="w-4 h-4" />}
                            isSelected={timeRange === option.value}
                            onClick={() => onTimeRangeChange(option.value)}
                        />
                    ))}
                </FilterSection>

                {/* Subreddits Section (if provided) */}
                {subreddits.length > 0 && onSubredditToggle && (
                    <FilterSection
                        title={`Subredditler (${selectedSubreddits.length}/${subreddits.length})`}
                        icon={<span className="text-orange-400">r/</span>}
                        defaultOpen={false}
                    >
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {subreddits.map((subreddit) => (
                                <label
                                    key={subreddit}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedSubreddits.includes(subreddit)}
                                        onChange={() => onSubredditToggle(subreddit)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                    />
                                    <span className="text-sm text-slate-400 group-hover:text-slate-200 truncate">
                                        r/{subreddit}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </FilterSection>
                )}
            </div>

            {/* Active Filters Count */}
            {hasActiveFilters && (
                <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
                    <div className="text-xs text-slate-400">
                        <span className="text-indigo-400 font-medium">
                            {(sortType !== 'hot' ? 1 : 0) +
                                (timeRange !== 'day' ? 1 : 0) +
                                selectedSubreddits.length}
                        </span>
                        {' '}aktif filtre
                    </div>
                </div>
            )}
        </aside>
    );
}
