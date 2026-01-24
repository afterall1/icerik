/**
 * RatingPanel Component
 *
 * Allows users to rate generated scripts with thumbs up/down
 * and optional star rating and feedback.
 *
 * @module components/molecules/RatingPanel
 */

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, MessageSquare, Check } from 'lucide-react';
import type { RatingType } from '../../lib/useScriptRating';

interface RatingPanelProps {
    /** Current rating if exists */
    currentRating?: RatingType;
    /** Current stars if exists */
    currentStars?: number;
    /** Submit rating callback */
    onRate: (rating: RatingType, stars?: number, feedback?: string) => void;
    /** Compact mode */
    compact?: boolean;
}

/**
 * RatingPanel - Script rating UI
 */
export function RatingPanel({
    currentRating,
    currentStars,
    onRate,
    compact = false,
}: RatingPanelProps) {
    const [selectedRating, setSelectedRating] = useState<RatingType | null>(currentRating || null);
    const [stars, setStars] = useState<number>(currentStars || 0);
    const [feedback, setFeedback] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);
    const [submitted, setSubmitted] = useState(!!currentRating);

    const handleRate = (rating: RatingType) => {
        if (submitted) return;
        setSelectedRating(rating);

        // If compact, submit immediately
        if (compact) {
            onRate(rating);
            setSubmitted(true);
        }
    };

    const handleStarClick = (starValue: number) => {
        if (submitted) return;
        setStars(starValue);
    };

    const handleSubmit = () => {
        if (!selectedRating) return;
        onRate(selectedRating, stars > 0 ? stars : undefined, feedback || undefined);
        setSubmitted(true);
    };

    // Compact mode - just thumbs
    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {submitted ? (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Check className="w-3 h-3 text-green-400" />
                        <span>Değerlendirildi</span>
                    </div>
                ) : (
                    <>
                        <span className="text-xs text-slate-500">Beğendin mi?</span>
                        <button
                            onClick={() => handleRate('like')}
                            className={`p-1.5 rounded-lg transition-all ${selectedRating === 'like'
                                    ? 'bg-green-500/30 text-green-400'
                                    : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
                                }`}
                            title="Beğendim"
                        >
                            <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleRate('dislike')}
                            className={`p-1.5 rounded-lg transition-all ${selectedRating === 'dislike'
                                    ? 'bg-red-500/30 text-red-400'
                                    : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                                }`}
                            title="Beğenmedim"
                        >
                            <ThumbsDown className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        );
    }

    // Full mode
    return (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            {submitted ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Teşekkürler! Değerlendirmeniz kaydedildi.</span>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Thumbs Rating */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-300">Bu script nasıldı?</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleRate('like')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${selectedRating === 'like'
                                        ? 'bg-green-500/30 text-green-400 ring-1 ring-green-500'
                                        : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
                                    }`}
                            >
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-sm">Beğendim</span>
                            </button>
                            <button
                                onClick={() => handleRate('dislike')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${selectedRating === 'dislike'
                                        ? 'bg-red-500/30 text-red-400 ring-1 ring-red-500'
                                        : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                                    }`}
                            >
                                <ThumbsDown className="w-4 h-4" />
                                <span className="text-sm">Beğenmedim</span>
                            </button>
                        </div>
                    </div>

                    {/* Star Rating (optional) */}
                    {selectedRating && (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">Detaylı puan (opsiyonel):</span>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => handleStarClick(value)}
                                        className="transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-5 h-5 ${value <= stars
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-slate-600'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Feedback toggle */}
                    {selectedRating && (
                        <div>
                            {!showFeedback ? (
                                <button
                                    onClick={() => setShowFeedback(true)}
                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
                                >
                                    <MessageSquare className="w-3 h-3" />
                                    Yorum ekle (opsiyonel)
                                </button>
                            ) : (
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Neyi beğendin/beğenmedin?"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                    rows={2}
                                />
                            )}
                        </div>
                    )}

                    {/* Submit button */}
                    {selectedRating && (
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                        >
                            Gönder
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default RatingPanel;
