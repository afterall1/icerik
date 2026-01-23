/**
 * NesTooltip Component - Enhanced Version
 * 
 * Displays detailed NES (Normalized Engagement Score) breakdown on hover.
 * Shows how the score is calculated with educational explanations.
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
    Info,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Users,
    ArrowUp
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

// Subreddit baseline scores with subscriber counts
const SUBREDDIT_DATA: Record<string, { baseline: number; subscribers: string }> = {
    technology: { baseline: 5000, subscribers: '15M' },
    programming: { baseline: 2000, subscribers: '6M' },
    apple: { baseline: 3000, subscribers: '4M' },
    android: { baseline: 1500, subscribers: '3M' },
    gadgets: { baseline: 2000, subscribers: '20M' },
    futurology: { baseline: 3000, subscribers: '18M' },
    artificial: { baseline: 1000, subscribers: '500K' },
    wallstreetbets: { baseline: 5000, subscribers: '15M' },
    stocks: { baseline: 1000, subscribers: '6M' },
    cryptocurrency: { baseline: 2000, subscribers: '6.5M' },
    bitcoin: { baseline: 1500, subscribers: '5M' },
    movies: { baseline: 5000, subscribers: '32M' },
    television: { baseline: 3000, subscribers: '18M' },
    gaming: { baseline: 10000, subscribers: '37M' },
    worldnews: { baseline: 10000, subscribers: '32M' },
    news: { baseline: 8000, subscribers: '25M' },
    science: { baseline: 8000, subscribers: '30M' },
    default: { baseline: 2000, subscribers: '?' },
};

function getSubredditData(subreddit: string): { baseline: number; subscribers: string } {
    const key = subreddit.toLowerCase();
    return SUBREDDIT_DATA[key] || SUBREDDIT_DATA.default;
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

function getVelocityInfo(velocity: number, score: number, comments: number, ageHours: number): {
    label: string;
    color: string;
    explanation: string;
} {
    const totalEngagement = score + (comments * 2);
    const perHour = Math.round(totalEngagement / ageHours);

    if (velocity >= 500) {
        return {
            label: 'Viral yayılım! 🚀',
            color: 'text-green-400',
            explanation: `Saatte ~${formatNumber(perHour)} etkileşim! Bu çok yüksek.`
        };
    }
    if (velocity >= 200) {
        return {
            label: 'Hızla yayılıyor',
            color: 'text-green-400',
            explanation: `Saatte ~${formatNumber(perHour)} etkileşim alıyor.`
        };
    }
    if (velocity >= 100) {
        return {
            label: 'Orta hızda',
            color: 'text-yellow-400',
            explanation: `Saatte ~${formatNumber(perHour)} etkileşim.`
        };
    }
    if (velocity >= 50) {
        return {
            label: 'Yavaş yükseliş',
            color: 'text-slate-400',
            explanation: `Saatte ~${formatNumber(perHour)} etkileşim.`
        };
    }
    return {
        label: 'Durgun',
        color: 'text-slate-500',
        explanation: `Saatte sadece ~${formatNumber(perHour)} etkileşim.`
    };
}

function getControversyInfo(factor: number, upvoteRatio: number): {
    label: string;
    color: string;
    explanation: string;
    range: string;
} {
    const downvotePercent = Math.round((1 - upvoteRatio) * 100);

    if (upvoteRatio < 0.4) {
        return {
            label: 'Çok tartışmalı (cezalı)',
            color: 'text-red-400',
            explanation: `%${downvotePercent} downvote! İçerik çok tartışmalı, NES düşürüldü.`,
            range: '×0.5'
        };
    }
    if (factor > 1.3) {
        return {
            label: 'Tartışmalı (bonus!) ⚡',
            color: 'text-amber-400',
            explanation: `%${downvotePercent} downvote - tartışmalı ama ilgi çekici! Bonus kazandı.`,
            range: '×1.3-1.6'
        };
    }
    if (factor > 1.1) {
        return {
            label: 'Biraz tartışmalı',
            color: 'text-yellow-400',
            explanation: `%${downvotePercent} downvote - hafif tartışma, küçük bonus.`,
            range: '×1.1-1.3'
        };
    }
    return {
        label: 'Normal etkileşim',
        color: 'text-slate-400',
        explanation: `%${100 - downvotePercent} beğeni - standart içerik, bonus/ceza yok.`,
        range: '×1.0'
    };
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

// Expandable Info Section Component
function InfoSection({
    title,
    value,
    explanation,
    icon: Icon,
    iconColor,
    defaultExpanded = false
}: {
    title: string;
    value: string;
    explanation: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    defaultExpanded?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    <span className="text-sm text-slate-300">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-slate-200">{value}</span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <div className="px-3 py-2 bg-slate-800/20 border-t border-slate-700/30">
                    <p className="text-xs text-slate-400 leading-relaxed">{explanation}</p>
                </div>
            )}
        </div>
    );
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

    const subredditData = getSubredditData(subreddit);
    const normalizedScore = score / subredditData.baseline;
    const velocityInfo = getVelocityInfo(engagementVelocity, score, numComments, ageHours);
    const controversyInfo = getControversyInfo(controversyFactor, upvoteRatio);
    const nesInfo = getNesLabel(nes);

    const calculatePosition = useCallback(() => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipWidth = 360;
        const tooltipHeight = 520;
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
                fixed z-50 w-[360px] p-4
                bg-slate-900/95 backdrop-blur-md
                border border-slate-700/50 rounded-xl
                shadow-2xl shadow-black/30
                transform transition-all duration-200 origin-top
                max-h-[85vh] overflow-y-auto
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
                <div className="flex-1">
                    <div className="text-sm font-medium text-slate-300">
                        NES Skoru Nasıl Hesaplandı?
                    </div>
                    <div className={`text-xs ${nesInfo.color}`}>
                        {nesInfo.label}
                    </div>
                </div>
                <HelpCircle className="w-4 h-4 text-slate-500" />
            </div>

            {/* Raw Metrics - Compact */}
            <div className="mb-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Ham Veriler (Reddit'ten)
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                        <ArrowUp className="w-4 h-4 text-blue-400" />
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
                            <div className="text-xs text-slate-500">Beğeni Oranı</div>
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
                <p className="text-xs text-slate-500 mt-2 italic">
                    Puan = Upvotes - Downvotes (Reddit'in net oy sayısı)
                </p>
            </div>

            {/* Calculation Factors - Expandable */}
            <div className="space-y-2 mb-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calculator className="w-3 h-3" />
                    Hesaplama Faktörleri (Tıkla: Detay)
                </div>

                {/* Velocity Factor */}
                <InfoSection
                    title="Hız Faktörü"
                    value={`×${engagementVelocity.toFixed(1)}`}
                    explanation={`
                        Formül: (Puan + Yorumlar×2) ÷ Yaş × Zaman Çürümesi
                        
                        • Yorumlar 2× değerli sayılır (daha fazla etkileşim)
                        • Eski postlar aynı puanı almak için daha fazla etkileşim gerektirir
                        • ${velocityInfo.explanation}
                    `.trim().split('\n').map(l => l.trim()).join('\n')}
                    icon={TrendingUp}
                    iconColor="text-indigo-400"
                    defaultExpanded
                />

                {/* Controversy Factor */}
                <InfoSection
                    title="Tartışma Faktörü"
                    value={`×${controversyFactor.toFixed(2)}`}
                    explanation={`
                        Beğeni oranına göre hesaplanır:
                        
                        • %70+ beğeni → ×1.0 (bonus yok)
                        • %40-70 beğeni → ×1.0-1.6 (tartışmalı = viral potansiyel!)
                        • %40'ın altı → ×0.5 (çok olumsuz = ceza)
                        
                        ${controversyInfo.explanation}
                    `.trim().split('\n').map(l => l.trim()).join('\n')}
                    icon={Zap}
                    iconColor="text-amber-400"
                />

                {/* Subreddit Baseline */}
                <InfoSection
                    title="Subreddit Ortalaması"
                    value={formatNumber(subredditData.baseline)}
                    explanation={`
                        Her subreddit'in ortalama post performansı farklıdır:
                        
                        • r/${subreddit} → ${formatNumber(subredditData.baseline)} ortalama puan
                        • ${subredditData.subscribers} üye
                        
                        Büyük subredditler (r/gaming: 10K) vs küçükler (r/artificial: 1K)
                        Normalizasyon sayesinde farklı boyuttaki subredditler karşılaştırılabilir.
                    `.trim().split('\n').map(l => l.trim()).join('\n')}
                    icon={Users}
                    iconColor="text-slate-400"
                />
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
                        = (Puan ÷ Baseline) × Hız × Tartışma
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-1">
                        = ({formatNumber(score)} ÷ {formatNumber(subredditData.baseline)}) × {engagementVelocity.toFixed(1)} × {controversyFactor.toFixed(2)}
                    </div>
                    <div className="text-xs font-mono text-indigo-300 mt-1">
                        = {normalizedScore.toFixed(2)} × {engagementVelocity.toFixed(1)} × {controversyFactor.toFixed(2)} ≈ {Math.round(nes)}
                    </div>
                </div>
            </div>

            {/* Footer Tip */}
            <div className="mt-3 pt-3 border-t border-slate-700/30">
                <p className="text-xs text-slate-500 text-center">
                    💡 Yüksek NES = Viral potansiyel! Video içeriği için ideal.
                </p>
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
