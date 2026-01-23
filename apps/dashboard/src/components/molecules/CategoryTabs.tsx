/**
 * CategoryTabs Component
 * 
 * Horizontal scrollable category tabs with "All" option.
 * Premium glassmorphism design with smooth animations.
 * 
 * @module components/molecules/CategoryTabs
 */

import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

interface Category {
    id: string;
    label: string;
    subredditCount: number;
}

interface CategoryTabsProps {
    categories: Category[];
    selectedCategory: string | null;
    onCategorySelect: (id: string | null) => void;
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

export function CategoryTabs({
    categories,
    selectedCategory,
    onCategorySelect,
    isLoading = false,
}: CategoryTabsProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // Check scroll position for arrow visibility
    const checkScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setShowLeftArrow(scrollLeft > 10);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        checkScroll();
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
            container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [categories]);

    const scroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = 200;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    if (isLoading) {
        return (
            <div className="flex gap-2 overflow-hidden py-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-10 w-28 bg-slate-800 rounded-full animate-pulse flex-shrink-0"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="relative group">
            {/* Left Scroll Arrow */}
            {showLeftArrow && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-full shadow-lg hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                </button>
            )}

            {/* Right Scroll Arrow */}
            {showRightArrow && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-full shadow-lg hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
            )}

            {/* Tabs Container */}
            <div
                ref={scrollContainerRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth snap-x snap-mandatory"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {/* All Categories Tab */}
                <button
                    onClick={() => onCategorySelect(null)}
                    className={`
                        flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full
                        font-medium text-sm transition-all duration-200
                        ${selectedCategory === null
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 border border-slate-700/50'
                        }
                    `}
                >
                    <Layers className="w-4 h-4" />
                    <span>Tümü</span>
                </button>

                {/* Category Tabs */}
                {categories.map((category) => {
                    const Icon = CATEGORY_ICONS[category.id] || MoreHorizontal;
                    const isSelected = selectedCategory === category.id;

                    return (
                        <button
                            key={category.id}
                            onClick={() => onCategorySelect(category.id)}
                            className={`
                                flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full
                                font-medium text-sm transition-all duration-200
                                ${isSelected
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 border border-slate-700/50'
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{category.label}</span>
                            <span className={`
                                text-xs px-1.5 py-0.5 rounded-full
                                ${isSelected ? 'bg-white/20' : 'bg-slate-700/50'}
                            `}>
                                {category.subredditCount}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Gradient Fades */}
            {showLeftArrow && (
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
            )}
            {showRightArrow && (
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
            )}
        </div>
    );
}
