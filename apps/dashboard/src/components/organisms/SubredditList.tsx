import { SubredditItem } from '../molecules';

interface Subreddit {
    name: string;
    subscribers: number;
    tier: 1 | 2 | 3;
}

interface SubredditListProps {
    subreddits: Subreddit[];
    selectedSubreddit: string | null;
    onSubredditSelect: (name: string) => void;
    isLoading?: boolean;
    categoryLabel?: string;
}

export function SubredditList({
    subreddits,
    selectedSubreddit,
    onSubredditSelect,
    isLoading = false,
    categoryLabel,
}: SubredditListProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-16 bg-slate-800 rounded-xl animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (subreddits.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <p>Bu kategoride subreddit bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {categoryLabel && (
                <h3 className="text-sm font-medium text-slate-400 mb-2">
                    {categoryLabel} - Top {subreddits.length} Subreddit
                </h3>
            )}
            {subreddits.map((subreddit, index) => (
                <div key={subreddit.name} className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono text-sm w-6 text-right">
                        {index + 1}.
                    </span>
                    <div className="flex-1">
                        <SubredditItem
                            name={subreddit.name}
                            subscribers={subreddit.subscribers}
                            tier={subreddit.tier}
                            isSelected={selectedSubreddit === subreddit.name}
                            onClick={onSubredditSelect}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
