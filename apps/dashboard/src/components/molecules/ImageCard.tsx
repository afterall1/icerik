import { useState } from 'react';

/**
 * Validated image from the API
 */
export interface ValidatedImage {
    id: string;
    source: 'pexels';
    thumbnailUrl: string;
    previewUrl: string;
    fullUrl: string;
    width: number;
    height: number;
    alt: string;
    photographer: string;
    photographerUrl: string;
    avgColor: string;
    pageUrl: string;
    validation: {
        imageUrl: string;
        isClean: boolean;
        hasText: boolean;
        hasOverlay: boolean;
        confidenceScore: number;
        detectedElements: string[];
    };
    searchQuery: string;
}

interface ImageCardProps {
    image: ValidatedImage;
    onSelect?: (image: ValidatedImage) => void;
    selected?: boolean;
    showValidation?: boolean;
    size?: 'small' | 'medium' | 'large';
}

/**
 * ImageCard Component
 * 
 * Displays a single image with validation status badge.
 * Supports selection and download functionality.
 */
export function ImageCard({
    image,
    onSelect,
    selected = false,
    showValidation = true,
    size = 'medium',
}: ImageCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const sizeStyles = {
        small: { width: 120, height: 80 },
        medium: { width: 180, height: 120 },
        large: { width: 240, height: 160 },
    };

    const dimensions = sizeStyles[size];

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    const handleClick = () => {
        onSelect?.(image);
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await fetch(image.fullUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `image-${image.id}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleCopyUrl = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(image.fullUrl);
    };

    const getValidationBadge = () => {
        if (!showValidation) return null;

        if (image.validation.isClean) {
            return (
                <div
                    className="image-card__badge image-card__badge--clean"
                    title="Temiz - Görsel üzerinde yazı yok"
                >
                    ✓
                </div>
            );
        }

        if (image.validation.hasText || image.validation.hasOverlay) {
            return (
                <div
                    className="image-card__badge image-card__badge--warning"
                    title={`Uyarı: ${image.validation.detectedElements.join(', ') || 'Yazı/overlay tespit edildi'}`}
                >
                    !
                </div>
            );
        }

        return null;
    };

    return (
        <div
            className={`image-card ${selected ? 'image-card--selected' : ''} ${onSelect ? 'image-card--clickable' : ''}`}
            style={{
                width: dimensions.width,
                backgroundColor: image.avgColor,
            }}
            onClick={handleClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Image Container */}
            <div
                className="image-card__image-container"
                style={{ height: dimensions.height }}
            >
                {isLoading && (
                    <div className="image-card__loader">
                        <div className="image-card__spinner" />
                    </div>
                )}

                {hasError ? (
                    <div className="image-card__error">
                        <span>⚠️</span>
                        <span>Yüklenemedi</span>
                    </div>
                ) : (
                    <img
                        src={image.thumbnailUrl}
                        alt={image.alt || 'Stock image'}
                        className="image-card__image"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        loading="lazy"
                    />
                )}

                {/* Validation Badge */}
                {getValidationBadge()}

                {/* Selection Indicator */}
                {selected && (
                    <div className="image-card__selected-indicator">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                    </div>
                )}

                {/* Hover Actions */}
                <div className="image-card__actions">
                    <button
                        className="image-card__action-btn"
                        onClick={handleDownload}
                        title="İndir"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                    </button>
                    <button
                        className="image-card__action-btn"
                        onClick={handleCopyUrl}
                        title="URL Kopyala"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                    </button>
                    <a
                        href={image.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="image-card__action-btn"
                        onClick={(e) => e.stopPropagation()}
                        title="Pexels'te Aç"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div className="image-card__tooltip">
                    <div className="image-card__tooltip-content">
                        <span className="image-card__photographer">
                            📷 {image.photographer}
                        </span>
                        {!image.validation.isClean && (
                            <span className="image-card__warning-text">
                                ⚠️ {image.validation.detectedElements.join(', ') || 'Yazı içerebilir'}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .image-card {
                    position: relative;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .image-card--clickable {
                    cursor: pointer;
                }

                .image-card--clickable:hover {
                    transform: scale(1.03);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
                }

                .image-card--selected {
                    box-shadow: 0 0 0 3px #22c55e, 0 8px 20px rgba(34, 197, 94, 0.3);
                }

                .image-card__image-container {
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                }

                .image-card__image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .image-card__loader {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.1);
                }

                .image-card__spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .image-card__error {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    font-size: 12px;
                    gap: 4px;
                }

                .image-card__badge {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 2;
                }

                .image-card__badge--clean {
                    background: #22c55e;
                    color: white;
                }

                .image-card__badge--warning {
                    background: #f59e0b;
                    color: white;
                }

                .image-card__selected-indicator {
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #22c55e;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                }

                .image-card__actions {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px;
                    background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .image-card:hover .image-card__actions {
                    opacity: 1;
                }

                .image-card__action-btn {
                    width: 28px;
                    height: 28px;
                    border: none;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                    text-decoration: none;
                }

                .image-card__action-btn:hover {
                    background: rgba(255, 255, 255, 0.4);
                }

                .image-card__tooltip {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-bottom: 4px;
                    z-index: 10;
                }

                .image-card__tooltip-content {
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    white-space: nowrap;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .image-card__photographer {
                    opacity: 0.9;
                }

                .image-card__warning-text {
                    color: #fbbf24;
                }
            `}</style>
        </div>
    );
}
