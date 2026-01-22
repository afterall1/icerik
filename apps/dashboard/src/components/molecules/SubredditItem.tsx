import { Card } from '../atoms';
import { clsx } from 'clsx';
import { Users, TrendingUp } from 'lucide-react';

interface SubredditItemProps {
    name: string;
    subscribers: number;
    tier: 1 | 2 | 3;
    isSelected?: boolean;
    onClick: (name: string) => void;
}

function formatSubscribers(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
}

function getTierLabel(tier: 1 | 2 | 3): string {
    switch (tier) {
        case 1:
            return 'Hot 🔥';
        case 2:
            return 'Aktif';
        case 3:
            return 'Normal';
    }
}

function getTierColor(tier: 1 | 2 | 3): string {
    switch (tier) {
        case 1:
            return 'text-orange-400';
        case 2:
            return 'text-blue-400';
        case 3:
            return 'text-slate-400';
    }
}

export function SubredditItem({
    name,
    subscribers,
    tier,
    isSelected = false,
    onClick,
}: SubredditItemProps) {
    return (
        <Card
            hoverable
            padding="sm"
            onClick={() => onClick(name)}
            className={clsx(
                'flex items-center justify-between gap-4 cursor-pointer',
                {
                    'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-950/30': isSelected,
                }
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(name);
                }
            }}
            aria-pressed={isSelected}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-400">r/</span>
                </div>
                <div>
                    <h3 className="font-medium text-slate-100">{name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Users className="w-3 h-3" />
                        <span>{formatSubscribers(subscribers)} üye</span>
                    </div>
                </div>
            </div>

            <div className={clsx('flex items-center gap-1 text-sm', getTierColor(tier))}>
                <TrendingUp className="w-4 h-4" />
                <span>{getTierLabel(tier)}</span>
            </div>
        </Card>
    );
}
