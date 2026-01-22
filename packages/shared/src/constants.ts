import type { ContentCategory, SubredditConfig } from './types.js';

/**
 * Subreddit to Category Mapping
 * Organized by category with tier assignments for polling frequency
 */
export const SUBREDDIT_CONFIG: SubredditConfig[] = [
    // Technology - Tier 1 (High volume, poll frequently)
    { name: 'technology', category: 'technology', tier: 1, baselineScore: 5000, subscribers: 15000000 },
    { name: 'programming', category: 'technology', tier: 1, baselineScore: 2000, subscribers: 6000000 },
    { name: 'apple', category: 'technology', tier: 1, baselineScore: 3000, subscribers: 4000000 },
    { name: 'Android', category: 'technology', tier: 2, baselineScore: 1500, subscribers: 3000000 },
    { name: 'gadgets', category: 'technology', tier: 2, baselineScore: 2000, subscribers: 20000000 },
    { name: 'Futurology', category: 'technology', tier: 2, baselineScore: 3000, subscribers: 18000000 },
    { name: 'artificial', category: 'technology', tier: 1, baselineScore: 1000, subscribers: 500000 },

    // Finance - Tier 1
    { name: 'wallstreetbets', category: 'finance', tier: 1, baselineScore: 5000, subscribers: 15000000 },
    { name: 'stocks', category: 'finance', tier: 1, baselineScore: 1000, subscribers: 6000000 },
    { name: 'cryptocurrency', category: 'finance', tier: 1, baselineScore: 2000, subscribers: 6500000 },
    { name: 'Bitcoin', category: 'finance', tier: 2, baselineScore: 1500, subscribers: 5000000 },
    { name: 'personalfinance', category: 'finance', tier: 2, baselineScore: 3000, subscribers: 18000000 },

    // Entertainment - Tier 1
    { name: 'movies', category: 'entertainment', tier: 1, baselineScore: 5000, subscribers: 32000000 },
    { name: 'television', category: 'entertainment', tier: 1, baselineScore: 3000, subscribers: 18000000 },
    { name: 'Music', category: 'entertainment', tier: 2, baselineScore: 2000, subscribers: 32000000 },
    { name: 'videos', category: 'entertainment', tier: 1, baselineScore: 5000, subscribers: 26000000 },
    { name: 'funny', category: 'entertainment', tier: 1, baselineScore: 10000, subscribers: 50000000 },
    { name: 'memes', category: 'entertainment', tier: 1, baselineScore: 15000, subscribers: 22000000 },

    // Gaming - Tier 1
    { name: 'gaming', category: 'gaming', tier: 1, baselineScore: 10000, subscribers: 37000000 },
    { name: 'pcgaming', category: 'gaming', tier: 2, baselineScore: 2000, subscribers: 6000000 },
    { name: 'Games', category: 'gaming', tier: 2, baselineScore: 1500, subscribers: 3500000 },
    { name: 'PS5', category: 'gaming', tier: 2, baselineScore: 1000, subscribers: 4000000 },

    // Lifestyle - Tier 2
    { name: 'LifeProTips', category: 'lifestyle', tier: 1, baselineScore: 5000, subscribers: 25000000 },
    { name: 'todayilearned', category: 'lifestyle', tier: 1, baselineScore: 10000, subscribers: 32000000 },
    { name: 'GetMotivated', category: 'lifestyle', tier: 2, baselineScore: 3000, subscribers: 18000000 },
    { name: 'Fitness', category: 'lifestyle', tier: 2, baselineScore: 1000, subscribers: 11000000 },

    // News - Tier 1
    { name: 'worldnews', category: 'news', tier: 1, baselineScore: 10000, subscribers: 32000000 },
    { name: 'news', category: 'news', tier: 1, baselineScore: 8000, subscribers: 25000000 },
    { name: 'UpliftingNews', category: 'news', tier: 2, baselineScore: 5000, subscribers: 18000000 },

    // Drama - Tier 1 (High engagement)
    { name: 'AmItheAsshole', category: 'drama', tier: 1, baselineScore: 8000, subscribers: 10000000 },
    { name: 'relationship_advice', category: 'drama', tier: 1, baselineScore: 3000, subscribers: 9000000 },
    { name: 'tifu', category: 'drama', tier: 1, baselineScore: 10000, subscribers: 18000000 },
    { name: 'confessions', category: 'drama', tier: 2, baselineScore: 2000, subscribers: 4000000 },

    // Science - Tier 2
    { name: 'science', category: 'science', tier: 1, baselineScore: 8000, subscribers: 30000000 },
    { name: 'space', category: 'science', tier: 2, baselineScore: 5000, subscribers: 23000000 },
    { name: 'Astronomy', category: 'science', tier: 3, baselineScore: 2000, subscribers: 2000000 },

    // Sports - Tier 2
    { name: 'sports', category: 'sports', tier: 2, baselineScore: 3000, subscribers: 20000000 },
    { name: 'nba', category: 'sports', tier: 1, baselineScore: 5000, subscribers: 10000000 },
    { name: 'soccer', category: 'sports', tier: 1, baselineScore: 3000, subscribers: 5000000 },
];

/**
 * Polling intervals by tier (in milliseconds)
 */
export const POLL_INTERVALS: Record<1 | 2 | 3, number> = {
    1: 5 * 60 * 1000,   // 5 minutes
    2: 15 * 60 * 1000,  // 15 minutes
    3: 30 * 60 * 1000,  // 30 minutes
};

/**
 * Reddit API endpoints
 */
export const REDDIT_ENDPOINTS = {
    BASE_URL: 'https://www.reddit.com',
    OAUTH_URL: 'https://oauth.reddit.com',
    TOKEN_URL: 'https://www.reddit.com/api/v1/access_token',
} as const;

/**
 * Default query limits
 */
export const DEFAULT_LIMITS = {
    POSTS_PER_SUBREDDIT: 25,
    MAX_POSTS_PER_SUBREDDIT: 100,
    TOP_TRENDS_LIMIT: 50,
    CACHE_TTL_SECONDS: 300,
} as const;

/**
 * NES Algorithm constants
 */
export const NES_CONSTANTS = {
    MIN_SCORE_THRESHOLD: 100,
    CONTROVERSY_WEIGHT: 2,
    VELOCITY_DECAY_HOURS: 24,
} as const;

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<ContentCategory, string> = {
    technology: 'Teknoloji',
    finance: 'Finans',
    entertainment: 'Eğlence',
    gaming: 'Oyun',
    lifestyle: 'Yaşam Tarzı',
    news: 'Haberler',
    drama: 'Drama',
    sports: 'Spor',
    science: 'Bilim',
    other: 'Diğer',
};

/**
 * Category to suggested video format mapping
 */
export const CATEGORY_VIDEO_FORMATS: Record<ContentCategory, string[]> = {
    technology: ['Explainer', 'News Commentary', 'Review'],
    finance: ['Hot Take', 'Analysis', 'News'],
    entertainment: ['Recreation', 'Commentary', 'Reaction'],
    gaming: ['Review', 'News', 'Tips'],
    lifestyle: ['Tips', 'How-To', 'Story-time'],
    news: ['Commentary', 'Analysis', 'Hot Take'],
    drama: ['Story-time', 'Reaction', 'Commentary'],
    sports: ['Highlights', 'Commentary', 'Analysis'],
    science: ['Explainer', 'News', 'Deep Dive'],
    other: ['Commentary', 'Story-time'],
};
