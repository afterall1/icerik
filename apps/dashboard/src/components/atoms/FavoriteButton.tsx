/**
 * FavoriteButton Component
 *
 * A star button for toggling favorite status on trends.
 *
 * @module components/atoms/FavoriteButton
 */

import { Star } from 'lucide-react';

interface FavoriteButtonProps {
    /** Whether the item is favorited */
    isFavorite: boolean;
    /** Toggle callback */
    onToggle: () => void;
    /** Button size */
    size?: 'sm' | 'md';
    /** Additional className */
    className?: string;
}

/**
 * FavoriteButton - Star toggle for favorites
 */
export function FavoriteButton({
    isFavorite,
    onToggle,
    size = 'md',
    className = '',
}: FavoriteButtonProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
    };

    const buttonSizeClasses = {
        sm: 'p-1',
        md: 'p-1.5',
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className={`
                ${buttonSizeClasses[size]}
                rounded-full transition-all duration-200
                ${isFavorite
                    ? 'text-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30'
                    : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-700/50'
                }
                ${className}
            `}
            title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Star
                className={`${sizeClasses[size]} ${isFavorite ? 'fill-current' : ''}`}
            />
        </button>
    );
}

export default FavoriteButton;
