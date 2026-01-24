import { useState, useEffect, useCallback } from 'react';
import { ImageCard, type ValidatedImage } from './ImageCard';

interface ImageSuggestionsPanelProps {
    /** Trend title to search images for */
    title: string;
    /** Category context for better search results */
    category?: string;
    /** Hook content for keyword extraction */
    hookContent?: string;
    /** Called when user selects an image */
    onImageSelect?: (image: ValidatedImage) => void;
    /** Number of images to display */
    imageCount?: number;
    /** Whether to show validation status */
    showValidation?: boolean;
}

interface ImageSearchResult {
    query: string;
    images: ValidatedImage[];
    totalFound: number;
    validCount: number;
    invalidCount: number;
    cachedAt?: number;
}

/**
 * ImageSuggestionsPanel Component
 * 
 * Displays suggested images for script content with AI-powered validation.
 * Integrates with the Image Discovery API.
 */
export function ImageSuggestionsPanel({
    title,
    category,
    hookContent,
    onImageSelect,
    imageCount = 6,
    showValidation = true,
}: ImageSuggestionsPanelProps) {
    const [images, setImages] = useState<ValidatedImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [stats, setStats] = useState<{ validCount: number; invalidCount: number } | null>(null);

    const fetchImages = useCallback(async () => {
        if (!title) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/images/search-for-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    category,
                    hookContent,
                    count: imageCount,
                    validate: showValidation,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Görsel arama başarısız');
            }

            if (data.success && data.data) {
                const result: ImageSearchResult = data.data;
                setImages(result.images);
                setSearchQuery(result.query);
                setStats({
                    validCount: result.validCount,
                    invalidCount: result.invalidCount,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Beklenmeyen hata');
        } finally {
            setLoading(false);
        }
    }, [title, category, hookContent, imageCount, showValidation]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    const handleImageSelect = (image: ValidatedImage) => {
        setSelectedId(image.id);
        onImageSelect?.(image);
    };

    const handleRefresh = () => {
        setSelectedId(null);
        fetchImages();
    };

    if (error) {
        return (
            <div className="image-suggestions-panel image-suggestions-panel--error">
                <div className="image-suggestions-panel__error-content">
                    <span className="image-suggestions-panel__error-icon">⚠️</span>
                    <span className="image-suggestions-panel__error-text">{error}</span>
                    <button
                        className="image-suggestions-panel__retry-btn"
                        onClick={handleRefresh}
                    >
                        Tekrar Dene
                    </button>
                </div>
                <style>{panelStyles}</style>
            </div>
        );
    }

    return (
        <div className="image-suggestions-panel">
            {/* Header */}
            <div className="image-suggestions-panel__header">
                <div className="image-suggestions-panel__title-row">
                    <h4 className="image-suggestions-panel__title">
                        🖼️ Önerilen Görseller
                    </h4>
                    <button
                        className="image-suggestions-panel__refresh-btn"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Yenile"
                    >
                        <svg
                            className={loading ? 'spinning' : ''}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                        </svg>
                    </button>
                </div>

                {searchQuery && (
                    <div className="image-suggestions-panel__query">
                        <span className="image-suggestions-panel__query-label">Arama:</span>
                        <span className="image-suggestions-panel__query-text">"{searchQuery}"</span>
                    </div>
                )}

                {stats && showValidation && (
                    <div className="image-suggestions-panel__stats">
                        <span className="image-suggestions-panel__stat image-suggestions-panel__stat--valid">
                            ✓ {stats.validCount} temiz
                        </span>
                        {stats.invalidCount > 0 && (
                            <span className="image-suggestions-panel__stat image-suggestions-panel__stat--warning">
                                ⚠ {stats.invalidCount} yazılı
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="image-suggestions-panel__content">
                {loading ? (
                    <div className="image-suggestions-panel__loading">
                        <div className="image-suggestions-panel__loader" />
                        <span>Görseller aranıyor...</span>
                    </div>
                ) : images.length === 0 ? (
                    <div className="image-suggestions-panel__empty">
                        <span>Görsel bulunamadı</span>
                    </div>
                ) : (
                    <div className="image-suggestions-panel__grid">
                        {images.map((image) => (
                            <ImageCard
                                key={image.id}
                                image={image}
                                onSelect={handleImageSelect}
                                selected={selectedId === image.id}
                                showValidation={showValidation}
                                size="medium"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="image-suggestions-panel__footer">
                <span className="image-suggestions-panel__powered-by">
                    Powered by <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>
                </span>
                {showValidation && (
                    <span className="image-suggestions-panel__validation-info">
                        AI ile metin kontrolü yapıldı
                    </span>
                )}
            </div>

            <style>{panelStyles}</style>
        </div>
    );
}

const panelStyles = `
    .image-suggestions-panel {
        background: var(--card-bg, #1a1a2e);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    }

    .image-suggestions-panel--error {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
    }

    .image-suggestions-panel__error-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        text-align: center;
    }

    .image-suggestions-panel__error-icon {
        font-size: 32px;
    }

    .image-suggestions-panel__error-text {
        color: var(--text-secondary, #a0a0a0);
        font-size: 14px;
    }

    .image-suggestions-panel__retry-btn {
        padding: 8px 16px;
        border-radius: 6px;
        background: var(--primary, #8b5cf6);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
    }

    .image-suggestions-panel__retry-btn:hover {
        background: var(--primary-hover, #7c3aed);
    }

    .image-suggestions-panel__header {
        margin-bottom: 16px;
    }

    .image-suggestions-panel__title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .image-suggestions-panel__title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary, white);
    }

    .image-suggestions-panel__refresh-btn {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: var(--text-secondary, #a0a0a0);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, color 0.2s;
    }

    .image-suggestions-panel__refresh-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        color: white;
    }

    .image-suggestions-panel__refresh-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .image-suggestions-panel__refresh-btn .spinning {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .image-suggestions-panel__query {
        font-size: 12px;
        color: var(--text-secondary, #a0a0a0);
        margin-bottom: 8px;
    }

    .image-suggestions-panel__query-label {
        opacity: 0.7;
    }

    .image-suggestions-panel__query-text {
        color: var(--primary, #8b5cf6);
        font-style: italic;
    }

    .image-suggestions-panel__stats {
        display: flex;
        gap: 12px;
        font-size: 12px;
    }

    .image-suggestions-panel__stat {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .image-suggestions-panel__stat--valid {
        color: #22c55e;
    }

    .image-suggestions-panel__stat--warning {
        color: #f59e0b;
    }

    .image-suggestions-panel__content {
        min-height: 140px;
    }

    .image-suggestions-panel__loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px;
        color: var(--text-secondary, #a0a0a0);
        font-size: 14px;
    }

    .image-suggestions-panel__loader {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(139, 92, 246, 0.2);
        border-top-color: var(--primary, #8b5cf6);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    .image-suggestions-panel__empty {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: var(--text-secondary, #a0a0a0);
        font-size: 14px;
    }

    .image-suggestions-panel__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
    }

    .image-suggestions-panel__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        font-size: 11px;
        color: var(--text-secondary, #a0a0a0);
    }

    .image-suggestions-panel__powered-by a {
        color: var(--primary, #8b5cf6);
        text-decoration: none;
    }

    .image-suggestions-panel__powered-by a:hover {
        text-decoration: underline;
    }

    .image-suggestions-panel__validation-info {
        opacity: 0.7;
    }
`;
