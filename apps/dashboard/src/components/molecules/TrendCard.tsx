import { Card, Badge } from '../atoms';
import { ArrowUp, MessageCircle, Clock, Flame } from 'lucide-react';

interface TrendCardProps {
    id: string;
    title: string;
    subreddit: string;
    nes: number;
    score: number;
    numComments: number;
    upvoteRatio: number;
    ageHours: number;
    permalink: string;
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
    permalink,
}: TrendCardProps) {
    return (
        <Card padding="md" className="group">
            <div className="flex items-start justify-between gap-4 mb-3">
                <Badge variant={getNesVariant(nes)} size="md">
                    <Flame className="w-3.5 h-3.5 mr-1" />
                    NES: {Math.round(nes)}
                </Badge>
                <span className="text-xs text-slate-500">r/{subreddit}</span>
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
                <div className="flex items-center gap-1 ml-auto">
                    <Clock className="w-4 h-4" />
                    <span>{formatAge(ageHours)}</span>
                </div>
            </div>
        </Card>
    );
}
