/**
 * NesTooltip Component
 * 
 * Displays detailed NES (Normalized Engagement Score) breakdown on hover.
 * Shows how the score is calculated with all contributing factors.
 * 
 * @module components/molecules/NesTooltip
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Flame,
    TrendingUp,
    Zap,
    MessageCircle,
    Clock,
    ThumbsUp,
    Calculator,
    Info
} from 'lucide-react';

interface NesTooltipProps {
    nes: number;
    score: number;
    numComments: number;
    upvoteRatio: number;
    ageHours: number;
    engagementVelocity: number;
    controversyFactor: number;
    subreddit: string;
    children: React.ReactNode;
}

interface TooltipPosition {
    top: number;
    left: number;
}

// Subreddit baseline scores (approximate)
const SUBREDDIT_BASELINES: Record<string, number> = {
    technology: 5000,
    programming: 2000,
    apple: 3000,
    android: 1500,
    gadgets: 2000,
    futurology: 3000,
    artificial: 1000,
    gaming: 5000,
    games: 3000,
    news: 10000,
    worldnews: 15000,
    science: 8000,
    askscience: 4000,
    default: 2000,
};

function getBaselineForSubreddit(subreddit: string): number {
    const key = subreddit.toLowerCase();
    return SUBREDDIT_BASELINES[key] || SUBREDDIT_BASELINES.default;
}

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatAge(hours: number): string {
    if (hours < 1) {
        return `${Math.round(hours * 60)} dk`;
    }
    if (hours < 24) {
        return `${Math.round(hours)} saat`;
    }
    return `${Math.round(hours / 24)} gün`;
}

function getVelocityLabel(velocity: number): { label: string; color: string } {
    if (velocity >= 500) {
        return { label: 'Viral yayılım! 🚀', color: 'text-green-400' };
    }
    if (velocity >= 200) {
        return { label: 'Hızla yayılıyor', color: 'text-green-400' };
    }
    if (velocity >= 100) {
        return { label: 'Orta hızda', color: 'text-yellow-400' };
    }
    if (velocity >= 50) {
        return { label: 'Yavaş yükseliş', color: 'text-slate-400' };
    }
    return { label: 'Durgun', color: 'text-slate-500' };
}

function getControversyLabel(factor: number, upvoteRatio: number): { label: string; color: string } {
    if (upvoteRatio < 0.4) {
        return { label: 'Çok tartışmalı (cezalı)', color: 'text-red-400' };
    }
    if (factor > 1.3) {
        return { label: 'Tartışmalı (bonus!) ⚡', color: 'text-amber-400' };
    }
    if (factor > 1.1) {
        return { label: 'Biraz tartışmalı', color: 'text-yellow-400' };
    }
    return { label: 'Normal etkileşim', color: 'text-slate-400' };
}

function getNesLabel(nes: number): { label: string; color: string; bg: string } {
    if (nes >= 1000) {
        return { label: '🔥 ÇOK SICAK', color: 'text-green-400', bg: 'bg-green-500/10' };
    }
    if (nes >= 500) {
        return { label: '⚡ SICAK', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    }
    if (nes >= 200) {
        return { label: '📈 Yükselen', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }
    return { label: '📊 Normal', color: 'text-slate-400', bg: 'bg-slate-500/10' };
}

export function NesTooltip({
    nes,
    score,
    numComments,
    upvoteRatio,
    ageHours,
    engagementVelocity,
    controversyFactor,
    subreddit,
    children,
}: NesTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const baseline = getBaselineForSubreddit(subreddit);
    const normalizedScore = score / baseline;
    const velocityInfo = getVelocityLabel(engagementVelocity);
    const controversyInfo = getControversyLabel(controversyFactor, upvoteRatio);
    const nesInfo = getNesLabel(nes);

    const calculatePosition = useCallback(() => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipWidth = 340;
        const tooltipHeight = 400;
        const padding = 12;

        let top = rect.bottom + padding;
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

        // Adjust if tooltip would go off-screen horizontally
        if (left < padding) {
            left = padding;
        } else if (left + tooltipWidth > window.innerWidth - padding) {
            left = window.innerWidth - tooltipWidth - padding;
        }

        // Adjust if tooltip would go off-screen vertically
        if (top + tooltipHeight > window.innerHeight - padding) {
            top = rect.top - tooltipHeight - padding;
        }

        setPosition({ top, left });
    }, []);

    const handleMouseEnter = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            calculatePosition();
            setIsVisible(true);
        }, 300);
    }, [calculatePosition]);

    const handleMouseLeave = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 150);
    }, []);

    // Keep tooltip visible when hovering over it
    const handleTooltipMouseEnter = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const handleTooltipMouseLeave = useCallback(() => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 150);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const tooltipContent = (
        <div
            ref={tooltipRef}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            className={`
                fixed z-50 w-[340px] p-4
                bg-slate-900/95 backdrop-blur-md
                border border-slate-700/50 rounded-xl
                shadow-2xl shadow-black/30
                transform transition-all duration-200 origin-top
                ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
            `}
            style={{ top: position.top, left: position.left }}
            role="tooltip"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
                <div className={`p-2 rounded-lg ${nesInfo.bg}`}>
                    <Flame className={`w-5 h-5 ${nesInfo.color}`} />
                </div>
                <div>
                    <div className="text-sm font-medium text-slate-300">
                        NES Skoru Nasıl Hesaplandı?
                    </div>
                    <div className={`text-xs ${nesInfo.color}`}>
                        {nesInfo.label}
                    </div>
                </div>
            </div>

            {/* Raw Metrics */}
            <div className="space-y-2 mb-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Ham Metrikler
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <div>
                            <div className="text-xs text-slate-500">Puan</div>
                            <div className="text-sm font-medium text-slate-200">{formatNumber(score)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                        <MessageCircle className="w-4 h-4 text-purple-400" />
                        <div>
                            <div className="text-xs text-slate-500">Yorumlar</div>
                            <div className="text-sm font-medium text-slate-200">{formatNumber(numComments)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                        <div>
                            <div className="text-xs text-slate-500">Beğeni</div>
                            <div className="text-sm font-medium text-slate-200">{Math.round(upvoteRatio * 100)}%</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <div>
                            <div className="text-xs text-slate-500">Yaş</div>
                            <div className="text-sm font-medium text-slate-200">{formatAge(ageHours)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calculation Factors */}
            <div className="space-y-3 mb-4 pb-4 border-b border-slate-700/50">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Hesaplama Faktörleri
                </div>

                {/* Engagement Velocity */}
                <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm text-slate-300">Hız Faktörü</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono font-medium text-indigo-400">
                            ×{engagementVelocity.toFixed(1)}
                        </div>
                        <div className={`text-xs ${velocityInfo.color}`}>
                            {velocityInfo.label}
                        </div>
                    </div>
                </div>

                {/* Controversy Factor */}
                <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-slate-300">Tartışma Faktörü</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono font-medium text-amber-400">
                            ×{controversyFactor.toFixed(2)}
                        </div>
                        <div className={`text-xs ${controversyInfo.color}`}>
                            {controversyInfo.label}
                        </div>
                    </div>
                </div>

                {/* Subreddit Baseline */}
                <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">Subreddit Baseline</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono text-slate-400">
                            {formatNumber(baseline)}
                        </div>
                        <div className="text-xs text-slate-500">
                            r/{subreddit} ort.
                        </div>
                    </div>
                </div>
            </div>

            {/* Final Calculation */}
            <div className="p-3 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-slate-400">Final Hesaplama</span>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        NES: {Math.round(nes)}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-1">
                        = ({formatNumber(score)}/{formatNumber(baseline)}) × {engagementVelocity.toFixed(1)} × {controversyFactor.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                        = {normalizedScore.toFixed(2)} × {engagementVelocity.toFixed(1)} × {controversyFactor.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="inline-block cursor-help"
        >
            {children}
            {createPortal(tooltipContent, document.body)}
        </div>
    );
}
