/**
 * SelectedVisualsPreview Component
 * 
 * Compact preview of selected visuals for a script section.
 * Shows 1-2 thumbnail previews with remove functionality.
 * 
 * @module components/molecules/SelectedVisualsPreview
 */

import { useCallback } from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
import type { SelectedVisual, SelectableSectionType } from '../../lib/selectedVisualsTypes';
import { MAX_VISUALS_PER_SECTION } from '../../lib/selectedVisualsTypes';

interface SelectedVisualsPreviewProps {
    /** Section type */
    sectionType: SelectableSectionType;
    /** Selected visuals for this section */
    selections: SelectedVisual[];
    /** Callback to remove a selection */
    onRemove: (imageId: string) => void;
    /** Callback to open visual discovery panel */
    onAddMore: () => void;
    /** Whether the section is at max capacity */
    isFull: boolean;
}

/**
 * Section color mapping for visual consistency
 */
const SECTION_COLORS: Record<SelectableSectionType, { bg: string; border: string; text: string }> = {
    hook: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
    body: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', text: 'text-indigo-400' },
    cta: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
};

/**
 * SelectedVisualsPreview - Shows selected visuals for a section
 */
export function SelectedVisualsPreview({
    sectionType,
    selections,
    onRemove,
    onAddMore,
    isFull,
}: SelectedVisualsPreviewProps) {
    const colors = SECTION_COLORS[sectionType];
    const hasSelections = selections.length > 0;
    const canAddMore = !isFull;

    const handleRemove = useCallback((e: React.MouseEvent, imageId: string) => {
        e.stopPropagation();
        onRemove(imageId);
    }, [onRemove]);

    const handleAddMore = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onAddMore();
    }, [onAddMore]);

    if (!hasSelections) {
        return null;
    }

    return (
        <div className={`mt-2 p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-medium ${colors.text} flex items-center gap-1`}>
                    <ImageIcon className="w-3 h-3" />
                    Seçili Görseller ({selections.length}/{MAX_VISUALS_PER_SECTION})
                </span>
                {canAddMore && (
                    <button
                        onClick={handleAddMore}
                        className={`p-1 rounded ${colors.bg} hover:bg-white/10 transition-colors`}
                        title="Daha fazla görsel ekle"
                    >
                        <Plus className={`w-3 h-3 ${colors.text}`} />
                    </button>
                )}
            </div>

            <div className="flex gap-2">
                {selections.map((selection) => (
                    <div
                        key={selection.id}
                        className="relative group w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0"
                    >
                        <img
                            src={selection.image.thumbnailUrl}
                            alt={selection.image.alt}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />

                        {/* Order badge */}
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                            <span className={`text-[9px] font-bold ${colors.text}`}>
                                {selection.order}
                            </span>
                        </div>

                        {/* Remove button on hover */}
                        <button
                            onClick={(e) => handleRemove(e, selection.imageId)}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500/80 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Seçimi Kaldır"
                        >
                            <X className="w-3 h-3 text-white" />
                        </button>

                        {/* Photographer credit on hover */}
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] text-white/70 truncate block">
                                {selection.image.photographer}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Add more placeholder if not full */}
                {canAddMore && (
                    <button
                        onClick={handleAddMore}
                        className={`w-16 h-16 rounded-lg border-2 border-dashed ${colors.border} flex items-center justify-center hover:bg-white/5 transition-colors flex-shrink-0`}
                        title="Görsel Ekle"
                    >
                        <Plus className={`w-5 h-5 ${colors.text} opacity-50`} />
                    </button>
                )}
            </div>
        </div>
    );
}
