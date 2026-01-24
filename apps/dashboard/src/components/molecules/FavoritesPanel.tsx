/**
 * FavoritesPanel Component
 *
 * A collapsible sidebar panel showing saved favorite trends.
 *
 * @module components/molecules/FavoritesPanel
 */

import { useState } from 'react';
import { Card, Badge } from '../atoms';
import type { FavoriteTrend } from '../../lib/useFavorites';
import { Star, Trash2, ChevronDown, ChevronUp, X, Clock } from 'lucide-react';

interface FavoritesPanelProps {
    /** List of favorite trends */
    favorites: FavoriteTrend[];
    /** Remove a favorite */
    onRemove: (id: string) => void;
    /** Clear all favorites */
    onClear: () => void;
    /** Click on a favorite (navigate/filter) */
    onSelect?: (favorite: FavoriteTrend) => void;
    /** Panel collapsed state */
    collapsed?: boolean;
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins}dk önce`;
    if (diffHours < 24) return `${diffHours}sa önce`;
    if (diffDays < 7) return `${diffDays}g önce`;
    return date.toLocaleDateString('tr-TR');
}

/**
 * Category to color mapping
 */
const CATEGORY_COLORS: Record<string, string> = {
    technology: 'bg-blue-900/50 text-blue-300',
    finance: 'bg-green-900/50 text-green-300',
    gaming: 'bg-purple-900/50 text-purple-300',
    entertainment: 'bg-pink-900/50 text-pink-300',
    sports: 'bg-orange-900/50 text-orange-300',
    science: 'bg-cyan-900/50 text-cyan-300',
    politics: 'bg-red-900/50 text-red-300',
    lifestyle: 'bg-yellow-900/50 text-yellow-300',
};

/**
 * FavoritesPanel - Sidebar panel for favorite trends
 */
export function FavoritesPanel({
    favorites,
    onRemove,
    onClear,
    onSelect,
    collapsed: initialCollapsed = false,
}: FavoritesPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

    return (
        <Card padding="none" className="overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-semibold text-yellow-200">Favoriler</span>
                    <Badge variant="info" size="sm" className="ml-2">
                        {favorites.length}
                    </Badge>
                </div>
                {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
            </button>

            {/* Content */}
            {!isCollapsed && (
                <div className="divide-y divide-slate-800">
                    {favorites.length === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-500 text-sm">
                            <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Henüz favori trend yok</p>
                            <p className="text-xs mt-1">Trend kartlarındaki ⭐ simgesine tıklayın</p>
                        </div>
                    ) : (
                        <>
                            {/* Favorite Items */}
                            <div className="max-h-80 overflow-y-auto">
                                {favorites.map((fav) => (
                                    <div
                                        key={fav.id}
                                        className="group px-4 py-3 hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Content */}
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => onSelect?.(fav)}
                                            >
                                                <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                                                    {fav.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[fav.category] || 'bg-slate-700 text-slate-300'}`}>
                                                        {fav.category}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        r/{fav.subreddit}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                    <span className="text-emerald-400 font-medium">
                                                        NES {fav.nes.toFixed(1)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatRelativeTime(fav.savedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Remove Button */}
                                            <button
                                                onClick={() => onRemove(fav.id)}
                                                className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Favorilerden çıkar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Clear All */}
                            {favorites.length > 0 && (
                                <div className="px-4 py-2 bg-slate-800/30">
                                    <button
                                        onClick={onClear}
                                        className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Tümünü temizle
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}

export default FavoritesPanel;
