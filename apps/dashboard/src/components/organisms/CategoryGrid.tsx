import { CategoryCard } from '../molecules';
import {
    Cpu,
    DollarSign,
    Film,
    Gamepad2,
    Heart,
    Newspaper,
    Theater,
    Trophy,
    Microscope,
    MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Category {
    id: string;
    label: string;
    subredditCount: number;
}

interface CategoryGridProps {
    categories: Category[];
    selectedCategory: string | null;
    onCategorySelect: (id: string) => void;
    isLoading?: boolean;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    technology: Cpu,
    finance: DollarSign,
    entertainment: Film,
    gaming: Gamepad2,
    lifestyle: Heart,
    news: Newspaper,
    drama: Theater,
    sports: Trophy,
    science: Microscope,
    other: MoreHorizontal,
};

export function CategoryGrid({
    categories,
    selectedCategory,
    onCategorySelect,
    isLoading = false,
}: CategoryGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-32 bg-slate-800 rounded-xl animate-pulse"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((category) => (
                <CategoryCard
                    key={category.id}
                    id={category.id}
                    label={category.label}
                    icon={CATEGORY_ICONS[category.id] || MoreHorizontal}
                    subredditCount={category.subredditCount}
                    isSelected={selectedCategory === category.id}
                    onClick={onCategorySelect}
                />
            ))}
        </div>
    );
}
