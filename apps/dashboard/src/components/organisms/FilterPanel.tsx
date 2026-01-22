import { FilterGroup } from '../molecules';
import { Card } from '../atoms';
import { Flame, TrendingUp, ArrowUp, Sparkles, Clock, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import type { SortType, TimeRange } from '../../stores/filterStore';

interface FilterPanelProps {
    sortType: SortType;
    timeRange: TimeRange;
    onSortChange: (sort: SortType) => void;
    onTimeRangeChange: (time: TimeRange) => void;
}

const SORT_OPTIONS: { value: SortType; label: string; icon: React.ReactNode }[] = [
    { value: 'hot', label: 'Hot', icon: <Flame className="w-4 h-4" /> },
    { value: 'rising', label: 'Rising', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'top', label: 'Top', icon: <ArrowUp className="w-4 h-4" /> },
    { value: 'new', label: 'New', icon: <Sparkles className="w-4 h-4" /> },
];

const TIME_OPTIONS: { value: TimeRange; label: string; icon: React.ReactNode }[] = [
    { value: 'hour', label: 'Son Saat', icon: <Clock className="w-4 h-4" /> },
    { value: 'day', label: 'Bugün', icon: <Calendar className="w-4 h-4" /> },
    { value: 'week', label: 'Bu Hafta', icon: <CalendarDays className="w-4 h-4" /> },
    { value: 'month', label: 'Bu Ay', icon: <CalendarRange className="w-4 h-4" /> },
];

export function FilterPanel({
    sortType,
    timeRange,
    onSortChange,
    onTimeRangeChange,
}: FilterPanelProps) {
    return (
        <Card padding="md" className="mb-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">⚙️ Filtreler</h3>
            <div className="flex flex-col sm:flex-row gap-6">
                <FilterGroup
                    label="Hype Türü"
                    options={SORT_OPTIONS}
                    value={sortType}
                    onChange={onSortChange}
                />
                <FilterGroup
                    label="Zaman Aralığı"
                    options={TIME_OPTIONS}
                    value={timeRange}
                    onChange={onTimeRangeChange}
                />
            </div>
        </Card>
    );
}
