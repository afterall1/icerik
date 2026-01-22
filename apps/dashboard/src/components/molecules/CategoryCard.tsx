import { Card } from '../atoms';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
    id: string;
    label: string;
    icon: LucideIcon;
    subredditCount: number;
    isSelected?: boolean;
    onClick: (id: string) => void;
}

export function CategoryCard({
    id,
    label,
    icon: Icon,
    subredditCount,
    isSelected = false,
    onClick,
}: CategoryCardProps) {
    return (
        <Card
            hoverable
            padding="md"
            onClick={() => onClick(id)}
            className={clsx(
                'flex flex-col items-center gap-2 text-center cursor-pointer',
                'min-w-[120px]',
                {
                    'ring-2 ring-indigo-500 border-indigo-500': isSelected,
                }
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(id);
                }
            }}
            aria-pressed={isSelected}
        >
            <Icon className="w-8 h-8 text-indigo-400" />
            <span className="font-medium text-slate-100">{label}</span>
            <span className="text-xs text-slate-400">{subredditCount} subreddit</span>
        </Card>
    );
}
