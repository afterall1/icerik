/**
 * Skeleton Loading Components
 * 
 * Provides animated loading placeholders for various UI elements.
 * Creates smooth loading states while content is being fetched.
 * 
 * @component
 */

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/**
 * Base skeleton props
 */
interface SkeletonProps {
    /** Additional CSS classes */
    className?: string;
    /** Animation style */
    animation?: 'pulse' | 'shimmer' | 'none';
}

/**
 * Base Skeleton component
 * Renders an animated placeholder element
 */
export function Skeleton({
    className = '',
    animation = 'pulse'
}: SkeletonProps): ReactNode {
    const animationClass = animation === 'pulse'
        ? 'animate-pulse'
        : animation === 'shimmer'
            ? 'skeleton-shimmer'
            : '';

    return (
        <div
            className={clsx(
                'bg-white/10 rounded',
                animationClass,
                className
            )}
            aria-hidden="true"
        />
    );
}

/**
 * Skeleton Text - For text content placeholders
 */
export function SkeletonText({
    lines = 1,
    className = '',
    animation = 'pulse',
}: SkeletonProps & { lines?: number }): ReactNode {
    return (
        <div className={clsx('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    animation={animation}
                    className={clsx(
                        'h-4',
                        // Make last line shorter if multiple lines
                        i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
                    )}
                />
            ))}
        </div>
    );
}

/**
 * Skeleton Circle - For avatars and round elements
 */
export function SkeletonCircle({
    size = 'md',
    className = '',
    animation = 'pulse',
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }): ReactNode {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
    };

    return (
        <Skeleton
            animation={animation}
            className={clsx('rounded-full', sizeClasses[size], className)}
        />
    );
}

/**
 * SkeletonCard - For card-shaped content placeholders
 */
export function SkeletonCard({
    className = '',
    animation = 'pulse',
}: SkeletonProps): ReactNode {
    return (
        <div className={clsx(
            'bg-white/5 border border-white/10 rounded-xl p-4',
            className
        )}>
            <div className="flex items-start gap-3">
                <SkeletonCircle size="md" animation={animation} />
                <div className="flex-1 space-y-3">
                    <Skeleton animation={animation} className="h-5 w-3/4" />
                    <SkeletonText lines={2} animation={animation} />
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <Skeleton animation={animation} className="h-6 w-16 rounded-full" />
                <Skeleton animation={animation} className="h-6 w-20 rounded-full" />
                <Skeleton animation={animation} className="h-6 w-14 rounded-full" />
            </div>
        </div>
    );
}

/**
 * SkeletonTrendCard - Specific skeleton for trend cards
 */
export function SkeletonTrendCard({
    className = '',
    animation = 'pulse',
}: SkeletonProps): ReactNode {
    return (
        <div className={clsx(
            'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-5',
            className
        )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Skeleton animation={animation} className="h-6 w-24 rounded-full" />
                    <Skeleton animation={animation} className="h-5 w-16 rounded" />
                </div>
                <Skeleton animation={animation} className="h-8 w-16 rounded-lg" />
            </div>

            {/* Title */}
            <Skeleton animation={animation} className="h-6 w-full mb-2" />
            <Skeleton animation={animation} className="h-6 w-4/5 mb-4" />

            {/* Stats Row */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Skeleton animation={animation} className="h-4 w-4 rounded" />
                    <Skeleton animation={animation} className="h-4 w-12" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton animation={animation} className="h-4 w-4 rounded" />
                    <Skeleton animation={animation} className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton animation={animation} className="h-4 w-4 rounded" />
                    <Skeleton animation={animation} className="h-4 w-10" />
                </div>
            </div>
        </div>
    );
}

/**
 * SkeletonCategoryCard - Skeleton for category cards
 */
export function SkeletonCategoryCard({
    className = '',
    animation = 'pulse',
}: SkeletonProps): ReactNode {
    return (
        <div className={clsx(
            'bg-white/5 border border-white/10 rounded-xl p-6 text-center',
            className
        )}>
            <SkeletonCircle size="lg" animation={animation} className="mx-auto mb-4" />
            <Skeleton animation={animation} className="h-5 w-24 mx-auto mb-2" />
            <Skeleton animation={animation} className="h-4 w-16 mx-auto" />
        </div>
    );
}

/**
 * SkeletonList - Renders multiple skeleton items
 */
export function SkeletonList({
    count = 3,
    ItemComponent = SkeletonCard,
    className = '',
    gap = 'gap-4',
    animation = 'pulse',
}: SkeletonProps & {
    count?: number;
    ItemComponent?: React.ComponentType<SkeletonProps>;
    gap?: string;
}): ReactNode {
    return (
        <div className={clsx('flex flex-col', gap, className)}>
            {Array.from({ length: count }).map((_, i) => (
                <ItemComponent key={i} animation={animation} />
            ))}
        </div>
    );
}

/**
 * SkeletonGrid - Renders skeleton items in a grid
 */
export function SkeletonGrid({
    count = 6,
    columns = 3,
    ItemComponent = SkeletonCategoryCard,
    className = '',
    animation = 'pulse',
}: SkeletonProps & {
    count?: number;
    columns?: 2 | 3 | 4;
    ItemComponent?: React.ComponentType<SkeletonProps>;
}): ReactNode {
    const gridCols = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={clsx('grid gap-4', gridCols[columns], className)}>
            {Array.from({ length: count }).map((_, i) => (
                <ItemComponent key={i} animation={animation} />
            ))}
        </div>
    );
}

/**
 * SkeletonButton - For button placeholders
 */
export function SkeletonButton({
    size = 'md',
    className = '',
    animation = 'pulse',
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }): ReactNode {
    const sizeClasses = {
        sm: 'h-8 w-20',
        md: 'h-10 w-28',
        lg: 'h-12 w-36',
    };

    return (
        <Skeleton
            animation={animation}
            className={clsx('rounded-lg', sizeClasses[size], className)}
        />
    );
}

/**
 * SkeletonHeader - For page header placeholders
 */
export function SkeletonHeader({
    className = '',
    animation = 'pulse',
}: SkeletonProps): ReactNode {
    return (
        <div className={clsx('space-y-4', className)}>
            <Skeleton animation={animation} className="h-10 w-64" />
            <Skeleton animation={animation} className="h-5 w-96" />
        </div>
    );
}

// Default export for convenience
export default Skeleton;
