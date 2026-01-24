/**
 * TrendTypeBadge Component
 *
 * Displays a trend type classification with appropriate styling.
 * Each type has distinct color coding for quick visual identification.
 *
 * @module components/atoms/TrendTypeBadge
 */

import { type TrendType, TREND_TYPE_CONFIG } from '../../lib/api';

interface TrendTypeBadgeProps {
    /** The trend type to display */
    type: TrendType;
    /** Confidence score (0-1) for the classification */
    confidence?: number;
    /** Whether to show the confidence percentage */
    showConfidence?: boolean;
    /** Badge size variant */
    size?: 'sm' | 'md';
    /** Additional CSS classes */
    className?: string;
}

/**
 * Get Tailwind classes for badge size
 */
function getSizeClasses(size: 'sm' | 'md'): string {
    switch (size) {
        case 'sm':
            return 'text-xs px-2 py-0.5 gap-1';
        case 'md':
            return 'text-sm px-3 py-1 gap-1.5';
        default:
            return 'text-xs px-2 py-0.5 gap-1';
    }
}

/**
 * TrendTypeBadge
 *
 * Visual indicator for trend classification type.
 * Uses color coding and emoji for quick identification:
 * - 🔥 Controversy (red)
 * - ⚡ Breaking News (yellow)
 * - 📚 Tutorial (blue)
 * - 📖 Story (purple)
 * - ⭐ Review (amber)
 * - 💬 Discussion (slate)
 * - 😂 Meme (pink)
 * - 📢 Announcement (green)
 */
export function TrendTypeBadge({
    type,
    confidence,
    showConfidence = false,
    size = 'sm',
    className = '',
}: TrendTypeBadgeProps) {
    const config = TREND_TYPE_CONFIG[type];

    if (!config) {
        console.warn(`Unknown trend type: ${type}`);
        return null;
    }

    const sizeClasses = getSizeClasses(size);
    const confidencePercent = confidence ? Math.round(confidence * 100) : null;
    const tooltipText = `${config.label}${confidencePercent ? ` (${confidencePercent}% güven)` : ''}`;

    return (
        <span
            className={`
                inline-flex items-center rounded-full border font-medium
                transition-all duration-200 hover:scale-105
                ${config.colorClass}
                ${sizeClasses}
                ${className}
            `.trim().replace(/\s+/g, ' ')}
            title={tooltipText}
            role="status"
            aria-label={tooltipText}
        >
            <span className="flex-shrink-0" aria-hidden="true">
                {config.emoji}
            </span>
            <span className="truncate">{config.label}</span>
            {showConfidence && confidencePercent !== null && (
                <span className="opacity-60 text-[0.65em] ml-0.5">
                    {confidencePercent}%
                </span>
            )}
        </span>
    );
}

/**
 * TrendTypeBadgeSkeleton
 *
 * Loading placeholder for TrendTypeBadge
 */
export function TrendTypeBadgeSkeleton({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    const sizeClasses = size === 'sm' ? 'h-5 w-20' : 'h-6 w-24';

    return (
        <span
            className={`
                inline-block rounded-full bg-slate-700/50 animate-pulse
                ${sizeClasses}
            `.trim().replace(/\s+/g, ' ')}
            aria-hidden="true"
        />
    );
}
