/**
 * TrendCard Component
 * 
 * Displays a trend item with engagement metrics, NES tooltip, and script generation button.
 * 
 * @module components/molecules/TrendCard
 */

import { Card, Badge, TrendTypeBadge } from '../atoms';
import { NesTooltip } from './NesTooltip';
import { ArrowUp, MessageCircle, Clock, Flame, Sparkles } from 'lucide-react';
import type { TrendClassification } from '../../lib/api';

interface TrendCardProps {
    id: string;
    title: string;
    subreddit: string;
    category: string;
    nes: number;
    score: number;
    numComments: number;
    upvoteRatio: number;
    ageHours: number;
    engagementVelocity: number;
    controversyFactor: number;
    permalink: string;
    onGenerateScript?: () => void;
    /** Optional trend classification for type badge display */
    classification?: TrendClassification;
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
        return `${Math.round(hours * 60)} dk önce`;
    }
    if (hours < 24) {
        return `${Math.round(hours)} saat önce`;
    }
    return `${Math.round(hours / 24)} gün önce`;
}

function getNesVariant(nes: number): 'success' | 'warning' | 'danger' | 'default' {
    if (nes >= 1000) return 'success';
    if (nes >= 500) return 'warning';
    if (nes >= 100) return 'danger';
    return 'default';
}

export function TrendCard({
    title,
    subreddit,
    nes,
    score,
    numComments,
    upvoteRatio,
    ageHours,
    engagementVelocity,
    controversyFactor,
    permalink,
    onGenerateScript,
    classification,
}: TrendCardProps) {
    return (
        <Card padding="md" className="group">
            <div className="flex items-start justify-between gap-4 mb-3">
                <NesTooltip
                    nes={nes}
                    score={score}
                    numComments={numComments}
                    upvoteRatio={upvoteRatio}
                    ageHours={ageHours}
                    engagementVelocity={engagementVelocity}
                    controversyFactor={controversyFactor}
                    subreddit={subreddit}
                >
                    <Badge variant={getNesVariant(nes)} size="md">
                        <Flame className="w-3.5 h-3.5 mr-1" />
                        NES: {Math.round(nes)}
                    </Badge>
                </NesTooltip>
                {classification && (
                    <TrendTypeBadge
                        type={classification.trendType}
                        confidence={classification.confidence}
                        size="sm"
                    />
                )}
                <span className="text-xs text-slate-500 ml-auto">r/{subreddit}</span>
            </div>

            <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-4 text-slate-100 font-medium leading-snug hover:text-indigo-400 transition-colors line-clamp-3"
            >
                {title}
            </a>

            <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                    <ArrowUp className="w-4 h-4" />
                    <span>{formatNumber(score)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{formatNumber(numComments)}</span>
                </div>
                <div className="flex items-center gap-1 text-green-400">
                    <span>{Math.round(upvoteRatio * 100)}%</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatAge(ageHours)}</span>
                </div>

                {/* Script Generate Button */}
                {onGenerateScript && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onGenerateScript();
                        }}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-700/50 hover:border-indigo-600 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 active:scale-95"
                        title="AI ile script oluştur"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Script Oluştur</span>
                        <span className="xs:hidden">AI</span>
                    </button>
                )}
            </div>
        </Card>
    );
}
