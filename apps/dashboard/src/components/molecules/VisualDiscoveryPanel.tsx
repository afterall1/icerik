/**
 * VisualDiscoveryPanel Component
 * 
 * Slide-out panel for discovering and previewing visuals for a script section.
 * Integrates with /api/images/search-for-content endpoint.
 * 
 * @module components/molecules/VisualDiscoveryPanel
 */

import { useEffect, useCallback } from 'react';
import { X, Image, Loader2, AlertCircle, Search, RefreshCw, CheckCircle } from 'lucide-react';
import { VisualCard } from '../atoms/VisualCard';
import { useVisualSearch, type ValidatedImage } from '../../lib/useVisualSearch';

/**
 * Section type for visual discovery
 */
export type SectionType = 'hook' | 'body' | 'cta';

/**
 * Props for VisualDiscoveryPanel
 */
interface VisualDiscoveryPanelProps {
    /** Whether panel is open */
    isOpen: boolean;
    /** Callback to close panel */
    onClose: () => void;
    /** Section type being searched */
    sectionType: SectionType;
    /** Section content to search for */
    content: string;
    /** Category for better matching */
    category?: string;
    /** Optional callback when image is selected */
    onImageSelect?: (image: ValidatedImage) => void;
}

/**
 * Section icon mapping
 */
const SECTION_ICONS: Record<SectionType, string> = {
    hook: '🎣',
    body: '📝',
    cta: '📢',
};

/**
 * Section label mapping
 */
const SECTION_LABELS: Record<SectionType, string> = {
    hook: 'Hook',
    body: 'Body',
    cta: 'CTA',
};

/**
 * Section color mapping
 */
const SECTION_COLORS: Record<SectionType, string> = {
    hook: 'border-amber-500',
    body: 'border-indigo-500',
    cta: 'border-green-500',
};

/**
 * VisualDiscoveryPanel - Slide-out panel for visual search
 */
export function VisualDiscoveryPanel({
    isOpen,
    onClose,
    sectionType,
    content,
    category = 'general',
    onImageSelect,
}: VisualDiscoveryPanelProps) {
    const {
        images,
        isLoading,
        error,
        query,
        hasSearched,
        searchImages,
        clearResults,
    } = useVisualSearch({
        content,
        category,
        count: 12,
        validateImages: false, // Skip validation for faster results
    });

    // Auto-search when panel opens
    useEffect(() => {
        if (isOpen && !hasSearched && !isLoading) {
            searchImages();
        }
    }, [isOpen, hasSearched, isLoading, searchImages]);

    // Clear results when panel closes
    useEffect(() => {
        if (!isOpen && hasSearched) {
            clearResults();
        }
    }, [isOpen, hasSearched, clearResults]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleImageClick = useCallback((image: ValidatedImage) => {
        if (onImageSelect) {
            onImageSelect(image);
        }
    }, [onImageSelect]);

    const handleRetry = useCallback(() => {
        clearResults();
        searchImages();
    }, [clearResults, searchImages]);

    // Calculate stats
    const cleanImages = images.filter(img => img.validation?.isClean !== false);
    const textImages = images.filter(img => img.validation?.hasText === true);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-slate-900 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className={`border-l-4 ${SECTION_COLORS[sectionType]} px-4 py-3 bg-slate-800/50 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700 rounded-lg">
                            <Image className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                {SECTION_ICONS[sectionType]} {SECTION_LABELS[sectionType]} Görselleri
                            </h2>
                            <p className="text-xs text-slate-400 line-clamp-1">
                                {content.slice(0, 60)}...
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Query Info */}
                {query && (
                    <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-800 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-500" />
                        <span className="text-xs text-slate-400">
                            Arama: <span className="text-indigo-400 font-medium">{query}</span>
                        </span>
                        {!isLoading && (
                            <button
                                onClick={handleRetry}
                                className="ml-auto text-indigo-400 hover:text-indigo-300 p-1"
                                title="Yeniden Ara"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p className="text-sm">Görseller aranıyor...</p>
                            <p className="text-xs text-slate-500 mt-1">Pexels API kullanılıyor</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="p-3 bg-red-500/20 rounded-full mb-3">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <p className="text-sm text-red-400 font-medium">Hata oluştu</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-xs">{error}</p>
                            <button
                                onClick={handleRetry}
                                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tekrar Dene
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && hasSearched && images.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="p-3 bg-slate-800 rounded-full mb-3">
                                <Image className="w-8 h-8 text-slate-500" />
                            </div>
                            <p className="text-sm text-slate-400">Görsel bulunamadı</p>
                            <p className="text-xs text-slate-500 mt-1">Farklı bir içerik deneyin</p>
                        </div>
                    )}

                    {/* Image Grid */}
                    {!isLoading && !error && images.length > 0 && (
                        <>
                            {/* Stats */}
                            <div className="flex items-center gap-4 mb-4 text-xs">
                                <span className="flex items-center gap-1 text-slate-400">
                                    <Image className="w-3.5 h-3.5" />
                                    {images.length} görsel
                                </span>
                                {cleanImages.length > 0 && (
                                    <span className="flex items-center gap-1 text-green-400">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        {cleanImages.length} temiz
                                    </span>
                                )}
                                {textImages.length > 0 && (
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {textImages.length} metinli
                                    </span>
                                )}
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {images.map((image) => (
                                    <VisualCard
                                        key={image.id}
                                        image={image}
                                        onClick={() => handleImageClick(image)}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Kaynak: Pexels</span>
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
