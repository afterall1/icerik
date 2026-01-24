/**
 * VisualCard Component
 * 
 * Displays a single visual with validation badge, preview, and actions.
 * Used in VisualDiscoveryPanel grid.
 * 
 * @module components/atoms/VisualCard
 */

import { useState, useCallback } from 'react';
import { ExternalLink, Check, AlertTriangle, Download, ZoomIn, X } from 'lucide-react';
import type { ValidatedImage } from '../../lib/useVisualSearch';

interface VisualCardProps {
    /** Image data */
    image: ValidatedImage;
    /** Optional click handler */
    onClick?: () => void;
    /** Whether this image is selected */
    isSelected?: boolean;
    /** Selection order number (1 or 2) */
    selectionOrder?: number;
    /** Callback when select button is clicked */
    onSelect?: () => void;
    /** Whether selection is disabled (section full and not selected) */
    selectionDisabled?: boolean;
}

/**
 * VisualCard - Individual image card with preview and validation status
 */
export function VisualCard({
    image,
    onClick,
    isSelected = false,
    selectionOrder = 0,
    onSelect,
    selectionDisabled = false,
}: VisualCardProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleImageLoad = useCallback(() => {
        setIsLoaded(true);
    }, []);

    const handleImageError = useCallback(() => {
        setImageError(true);
        setIsLoaded(true);
    }, []);

    const handleDownload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(image.fullUrl, '_blank');
    }, [image.fullUrl]);

    const handleFullscreen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowFullscreen(true);
    }, []);

    const handleSelect = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSelect && !selectionDisabled) {
            onSelect();
        }
    }, [onSelect, selectionDisabled]);

    const isClean = image.validation?.isClean ?? true;
    const hasText = image.validation?.hasText ?? false;

    return (
        <>
            <div
                className={`group relative bg-slate-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${isSelected
                    ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-slate-900'
                    : 'hover:ring-2 hover:ring-indigo-500/50'
                    }`}
                onClick={onClick}
            >
                {/* Loading skeleton */}
                {!isLoaded && (
                    <div className="absolute inset-0 bg-slate-700 animate-pulse" />
                )}

                {!imageError ? (
                    <img
                        src={image.thumbnailUrl}
                        alt={image.alt}
                        className={`w-full aspect-video object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full aspect-video bg-slate-700 flex items-center justify-center">
                        <span className="text-slate-500 text-xs">Yüklenemedi</span>
                    </div>
                )}

                {/* Validation Badge */}
                <div className="absolute top-2 left-2">
                    {isClean ? (
                        <div
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] font-medium rounded"
                            title="Temiz görsel - metin/watermark yok"
                        >
                            <Check className="w-3 h-3" />
                            Temiz
                        </div>
                    ) : hasText ? (
                        <div
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/90 text-white text-[10px] font-medium rounded"
                            title="Metin/watermark içeriyor"
                        >
                            <AlertTriangle className="w-3 h-3" />
                            Metin
                        </div>
                    ) : null}
                </div>

                {/* Selection Order Badge */}
                {isSelected && selectionOrder > 0 && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">{selectionOrder}</span>
                    </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                        onClick={handleFullscreen}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        title="Tam ekran"
                    >
                        <ZoomIn className="w-4 h-4 text-white" />
                    </button>
                    <button
                        onClick={handleDownload}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        title="İndir / Aç"
                    >
                        <Download className="w-4 h-4 text-white" />
                    </button>
                    {/* Select Button */}
                    {onSelect && (
                        <button
                            onClick={handleSelect}
                            className={`p-2 rounded-full transition-colors ${isSelected
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : selectionDisabled
                                        ? 'bg-slate-500/50 cursor-not-allowed'
                                        : 'bg-white/20 hover:bg-indigo-500'
                                }`}
                            title={isSelected ? 'Seçildi' : selectionDisabled ? 'Maksimum seçim' : 'Seç'}
                            disabled={selectionDisabled && !isSelected}
                        >
                            <Check className={`w-4 h-4 ${isSelected ? 'text-white' : selectionDisabled ? 'text-slate-400' : 'text-white'}`} />
                        </button>
                    )}
                </div>

                {/* Photographer Credit */}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                        <a
                            href={image.photographerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-white/70 hover:text-white flex items-center gap-1 truncate"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {image.photographer}
                            <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Fullscreen Modal */}
            {showFullscreen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setShowFullscreen(false)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        onClick={() => setShowFullscreen(false)}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <img
                        src={image.fullUrl}
                        alt={image.alt}
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                        <p className="text-white/70 text-sm">{image.alt}</p>
                        <a
                            href={image.photographerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 text-xs"
                        >
                            📸 {image.photographer}
                        </a>
                    </div>
                </div>
            )}
        </>
    );
}
