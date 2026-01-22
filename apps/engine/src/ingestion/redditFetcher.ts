import { getEnv } from '../utils/env.js';
import { createChildLogger } from '../utils/logger.js';
import { getRateLimiter } from './rateLimiter.js';
import type { RedditPost, TimeRange } from '@icerik/shared';

const logger = createChildLogger('reddit-fetcher');

const REDDIT_BASE_URL = 'https://www.reddit.com';

type SortType = 'hot' | 'new' | 'top' | 'rising';

interface FetchOptions {
    subreddit: string;
    sort?: SortType;
    timeRange?: TimeRange;
    limit?: number;
}

interface RedditListingChild {
    kind: string;
    data: {
        id: string;
        title: string;
        selftext: string;
        author: string;
        subreddit: string;
        score: number;
        ups: number;
        upvote_ratio: number;
        num_comments: number;
        created_utc: number;
        url: string;
        permalink: string;
        is_video: boolean;
        domain: string;
        over_18: boolean;
        spoiler: boolean;
        stickied: boolean;
    };
}

interface RedditListingResponse {
    kind: string;
    data: {
        children: RedditListingChild[];
        after: string | null;
        before: string | null;
        dist: number;
    };
}

/**
 * Custom error class for Reddit fetch errors
 */
export class RedditFetchError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly subreddit?: string,
        public readonly isRateLimit: boolean = false
    ) {
        super(message);
        this.name = 'RedditFetchError';
    }
}

/**
 * Reddit Fetcher - Uses .json URL append method (no API key required)
 * 
 * How it works:
 * - Appends .json to any Reddit URL to get JSON data
 * - Example: https://www.reddit.com/r/technology/hot.json
 * - Rate limited to ~10 requests per minute (we stay conservative at 8)
 */
export class RedditFetcher {
    private readonly userAgent: string;
    private readonly rateLimiter = getRateLimiter();

    constructor() {
        const env = getEnv();
        this.userAgent = env.REDDIT_USER_AGENT;
        logger.info({ userAgent: this.userAgent }, 'Reddit fetcher initialized (no API key required)');
    }

    /**
     * Fetch posts from a subreddit using .json URL append method
     */
    async fetchSubreddit(options: FetchOptions): Promise<RedditPost[]> {
        const { subreddit, sort = 'hot', timeRange = 'day', limit = 25 } = options;

        await this.rateLimiter.waitForSlot();

        const url = this.buildUrl(subreddit, sort, timeRange, limit);

        try {
            logger.debug({ url, subreddit, sort }, 'Fetching subreddit');

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json',
                },
            });

            if (response.status === 429) {
                this.rateLimiter.recordRateLimitHit();
                throw new RedditFetchError(
                    `Rate limited by Reddit (429)`,
                    429,
                    subreddit,
                    true
                );
            }

            if (response.status === 403) {
                this.rateLimiter.recordError();
                throw new RedditFetchError(
                    `Access forbidden - subreddit may be private or banned`,
                    403,
                    subreddit
                );
            }

            if (response.status === 404) {
                throw new RedditFetchError(
                    `Subreddit not found: r/${subreddit}`,
                    404,
                    subreddit
                );
            }

            if (!response.ok) {
                this.rateLimiter.recordError();
                throw new RedditFetchError(
                    `Reddit returned ${response.status}: ${response.statusText}`,
                    response.status,
                    subreddit
                );
            }

            const data: RedditListingResponse = await response.json();

            if (!data.data?.children) {
                throw new RedditFetchError(
                    `Invalid response structure from Reddit`,
                    undefined,
                    subreddit
                );
            }

            this.rateLimiter.recordSuccess();

            const posts = data.data.children
                .filter((child): child is RedditListingChild => child.kind === 't3')
                .map(child => this.normalizePost(child.data));

            logger.info(
                { subreddit, postCount: posts.length, sort },
                'Successfully fetched subreddit'
            );

            return posts;

        } catch (error) {
            if (error instanceof RedditFetchError) {
                throw error;
            }

            this.rateLimiter.recordError();
            logger.error({ error, subreddit, url }, 'Failed to fetch subreddit');

            throw new RedditFetchError(
                error instanceof Error ? error.message : 'Unknown fetch error',
                undefined,
                subreddit
            );
        }
    }

    /**
     * Fetch posts from multiple subreddits with error tolerance
     */
    async fetchMultipleSubreddits(
        subreddits: string[],
        options: Omit<FetchOptions, 'subreddit'> = {}
    ): Promise<Map<string, RedditPost[]>> {
        const results = new Map<string, RedditPost[]>();
        const errors: Array<{ subreddit: string; error: string }> = [];

        for (const subreddit of subreddits) {
            try {
                const posts = await this.fetchSubreddit({ ...options, subreddit });
                results.set(subreddit, posts);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push({ subreddit, error: errorMessage });

                if (error instanceof RedditFetchError && error.isRateLimit) {
                    logger.warn(
                        { subreddit, remainingSubreddits: subreddits.length - results.size },
                        'Rate limited, stopping batch fetch'
                    );
                    break;
                }

                logger.warn({ subreddit, error: errorMessage }, 'Failed to fetch subreddit, continuing...');
                results.set(subreddit, []);
            }
        }

        if (errors.length > 0) {
            logger.info(
                { successCount: results.size - errors.length, errorCount: errors.length },
                'Completed batch fetch with some errors'
            );
        }

        return results;
    }

    /**
     * Build the Reddit .json endpoint URL
     */
    private buildUrl(
        subreddit: string,
        sort: SortType,
        timeRange: TimeRange,
        limit: number
    ): string {
        const params = new URLSearchParams({
            limit: Math.min(limit, 100).toString(),
            raw_json: '1',
        });

        if (sort === 'top') {
            params.set('t', timeRange);
        }

        return `${REDDIT_BASE_URL}/r/${subreddit}/${sort}.json?${params.toString()}`;
    }

    /**
     * Normalize Reddit post data to our interface
     */
    private normalizePost(raw: RedditListingChild['data']): RedditPost {
        return {
            id: raw.id,
            title: raw.title || '',
            selftext: raw.selftext || '',
            author: raw.author || '[deleted]',
            subreddit: raw.subreddit,
            score: raw.score ?? raw.ups ?? 0,
            upvote_ratio: raw.upvote_ratio ?? 1,
            num_comments: raw.num_comments ?? 0,
            created_utc: raw.created_utc ?? Date.now() / 1000,
            url: raw.url || '',
            permalink: raw.permalink ? `https://reddit.com${raw.permalink}` : '',
            is_video: raw.is_video ?? false,
            domain: raw.domain || '',
            over_18: raw.over_18 ?? false,
            spoiler: raw.spoiler ?? false,
            stickied: raw.stickied ?? false,
        };
    }

    /**
     * Get rate limiter status
     */
    getRateLimitStatus() {
        return this.rateLimiter.getStatus();
    }
}

// Singleton instance
let fetcherInstance: RedditFetcher | null = null;

export function getRedditFetcher(): RedditFetcher {
    if (!fetcherInstance) {
        fetcherInstance = new RedditFetcher();
    }
    return fetcherInstance;
}
