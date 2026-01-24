/**
 * HistoryPanel Component
 *
 * Displays script generation history with quick actions.
 *
 * @module components/molecules/HistoryPanel
 */

import { useState } from 'react';
import { Card } from '../atoms';
import type { ScriptHistoryEntry } from '../../lib/useScriptHistory';
import { PLATFORM_LABELS, PLATFORM_ICONS, PLATFORM_COLORS } from '../../lib/api';
import { History, Copy, Check, Trash2, Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface HistoryPanelProps {
    /** List of history entries */
    history: ScriptHistoryEntry[];
    /** Remove an entry */
    onRemove: (id: string) => void;
    /** Clear all history */
    onClear: () => void;
    /** View a script */
    onView?: (entry: ScriptHistoryEntry) => void;
    /** Loading state */
    isLoading?: boolean;
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
 * HistoryEntry - Single history item
 */
function HistoryEntry({
    entry,
    onRemove,
    onView,
}: {
    entry: ScriptHistoryEntry;
    onRemove: () => void;
    onView?: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const colors = PLATFORM_COLORS[entry.platform];
    const icon = PLATFORM_ICONS[entry.platform];
    const label = PLATFORM_LABELS[entry.platform];

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(entry.script.script);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="group px-4 py-3 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-start gap-3">
                {/* Platform Icon */}
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colors.gradient} flex-shrink-0`}>
                    <span className="text-sm">{icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4
                        className="text-sm font-medium text-slate-200 truncate cursor-pointer hover:text-white"
                        onClick={onView}
                    >
                        {entry.trendTitle}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="text-slate-300">{label}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(entry.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleCopy}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Kopyala"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                    <button
                        onClick={onRemove}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Sil"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * HistoryPanel - Script generation history panel
 */
export function HistoryPanel({
    history,
    onRemove,
    onClear,
    onView,
    isLoading = false,
}: HistoryPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <Card padding="none" className="overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-indigo-200">Script Geçmişi</span>
                    <span className="text-xs text-slate-400 ml-2">
                        {history.length} kayıt
                    </span>
                </div>
                {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
            </button>

            {/* Content */}
            {!isCollapsed && (
                <div>
                    {isLoading ? (
                        <div className="px-4 py-6 text-center text-slate-500 text-sm">
                            <div className="animate-spin w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full mx-auto mb-2" />
                            <p>Yükleniyor...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-500 text-sm">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Henüz script geçmişi yok</p>
                            <p className="text-xs mt-1">Script oluşturduğunuzda burada görünecek</p>
                        </div>
                    ) : (
                        <>
                            {/* History Items */}
                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                                {history.map((entry) => (
                                    <HistoryEntry
                                        key={entry.id}
                                        entry={entry}
                                        onRemove={() => onRemove(entry.id)}
                                        onView={() => onView?.(entry)}
                                    />
                                ))}
                            </div>

                            {/* Clear All */}
                            <div className="px-4 py-2 bg-slate-800/30 border-t border-slate-800">
                                <button
                                    onClick={onClear}
                                    className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Geçmişi temizle
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}

export default HistoryPanel;
