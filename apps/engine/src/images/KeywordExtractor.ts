/**
 * Keyword Extractor
 * 
 * Extracts relevant search keywords from trend data and script content
 * for image discovery.
 * 
 * @module images/KeywordExtractor
 */

import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('keyword-extractor');

/**
 * Common stop words to filter out
 */
const STOP_WORDS = new Set([
    // English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what',
    'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'into',
    // Turkish
    've', 'bir', 'bu', 'şu', 'o', 'ile', 'için', 'de', 'da', 'den', 'dan', 'mi',
    'mu', 'mı', 'mü', 'ne', 'nasıl', 'neden', 'nerede', 'kim', 'ya', 'ama', 'ancak',
    'gibi', 'kadar', 'çok', 'daha', 'en', 'her', 'hiç', 'bazı', 'şey', 'olan',
    // Common Reddit/Social
    'reddit', 'post', 'comment', 'upvote', 'downvote', 'karma', 'sub', 'subreddit',
    'oc', 'til', 'eli5', 'ama', 'iama', 'nsfw', 'sfw', 'tl;dr', 'tldr', 'edit',
    'update', 'deleted', 'removed', 'locked', 'megathread',
]);

/**
 * Category to keyword mappings for context enrichment
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    technology: ['tech', 'digital', 'computer', 'software', 'innovation'],
    gaming: ['game', 'gaming', 'esports', 'controller', 'console'],
    science: ['science', 'research', 'laboratory', 'experiment', 'discovery'],
    business: ['business', 'office', 'corporate', 'professional', 'meeting'],
    entertainment: ['entertainment', 'movie', 'music', 'celebrity', 'show'],
    sports: ['sports', 'athlete', 'competition', 'stadium', 'team'],
    lifestyle: ['lifestyle', 'modern', 'urban', 'trendy', 'aesthetic'],
    food: ['food', 'cuisine', 'cooking', 'restaurant', 'delicious'],
    travel: ['travel', 'destination', 'adventure', 'tourism', 'explore'],
    health: ['health', 'wellness', 'fitness', 'medical', 'healthy'],
    art: ['art', 'creative', 'artistic', 'design', 'gallery'],
    nature: ['nature', 'landscape', 'wildlife', 'outdoor', 'environment'],
    finance: ['finance', 'money', 'investment', 'stock', 'banking'],
    education: ['education', 'learning', 'student', 'school', 'knowledge'],
};

/**
 * Input for keyword extraction
 */
export interface KeywordExtractionInput {
    title: string;
    category?: string;
    subreddit?: string;
    hookContent?: string;
    bodyContent?: string;
}

/**
 * Extracted keywords result
 */
export interface ExtractedKeywords {
    primary: string[];      // Main keywords (1-3)
    secondary: string[];    // Supporting keywords
    searchQuery: string;    // Combined search query
    category?: string;
}

/**
 * Keyword Extractor Class
 */
export class KeywordExtractor {
    /**
     * Extract keywords from trend/script content
     */
    extract(input: KeywordExtractionInput): ExtractedKeywords {
        const allKeywords: Map<string, number> = new Map();

        // Process title (highest weight)
        this.extractFromText(input.title, 3).forEach(kw => {
            allKeywords.set(kw, (allKeywords.get(kw) || 0) + 3);
        });

        // Process hook content (high weight)
        if (input.hookContent) {
            this.extractFromText(input.hookContent, 2).forEach(kw => {
                allKeywords.set(kw, (allKeywords.get(kw) || 0) + 2);
            });
        }

        // Process body content (medium weight)
        if (input.bodyContent) {
            this.extractFromText(input.bodyContent, 1).forEach(kw => {
                allKeywords.set(kw, (allKeywords.get(kw) || 0) + 1);
            });
        }

        // Add category keywords (low weight)
        if (input.category) {
            const categoryKws = CATEGORY_KEYWORDS[input.category.toLowerCase()] || [];
            categoryKws.forEach(kw => {
                allKeywords.set(kw, (allKeywords.get(kw) || 0) + 0.5);
            });
        }

        // Sort by score and extract top keywords
        const sorted = Array.from(allKeywords.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([kw]) => kw);

        const primary = sorted.slice(0, 3);
        const secondary = sorted.slice(3, 8);

        // Build search query
        const searchQuery = this.buildSearchQuery(primary, secondary, input.category);

        logger.debug({
            input: {
                title: input.title,
                category: input.category,
            },
            primary,
            secondary,
            searchQuery,
        }, 'Keywords extracted');

        return {
            primary,
            secondary,
            searchQuery,
            category: input.category,
        };
    }

    /**
     * Extract keywords from text
     */
    private extractFromText(text: string, limit: number): string[] {
        // Clean and normalize text
        const cleaned = text
            .toLowerCase()
            .replace(/[^\w\s'-]/g, ' ')  // Remove special chars except hyphens and apostrophes
            .replace(/\s+/g, ' ')
            .trim();

        // Tokenize
        const words = cleaned.split(' ')
            .filter(word => {
                // Filter criteria
                if (word.length < 3) return false;
                if (word.length > 20) return false;
                if (STOP_WORDS.has(word)) return false;
                if (/^\d+$/.test(word)) return false; // Only numbers
                return true;
            });

        // Simple frequency counting
        const frequency: Map<string, number> = new Map();
        words.forEach(word => {
            frequency.set(word, (frequency.get(word) || 0) + 1);
        });

        // Sort by frequency and take top N
        return Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word]) => word);
    }

    /**
     * Build optimized search query for image API
     */
    private buildSearchQuery(
        primary: string[],
        secondary: string[],
        category?: string
    ): string {
        // Start with primary keywords
        const queryParts: string[] = [...primary];

        // Add one secondary keyword if available
        if (secondary.length > 0) {
            queryParts.push(secondary[0]);
        }

        // Add category context if not already included
        if (category && !queryParts.some(p => p.includes(category.toLowerCase()))) {
            const categoryContext = CATEGORY_KEYWORDS[category.toLowerCase()]?.[0];
            if (categoryContext && !queryParts.includes(categoryContext)) {
                queryParts.push(categoryContext);
            }
        }

        // Limit query length for API
        const query = queryParts.slice(0, 5).join(' ');

        return query;
    }

    /**
     * Suggest search variations for better results
     */
    suggestVariations(keywords: ExtractedKeywords): string[] {
        const variations: string[] = [keywords.searchQuery];

        // Add category-focused query
        if (keywords.category && keywords.primary.length > 0) {
            variations.push(`${keywords.primary[0]} ${keywords.category}`);
        }

        // Add abstract/aesthetic query
        if (keywords.primary.length > 0) {
            variations.push(`${keywords.primary[0]} abstract background`);
        }

        // Add minimal query
        if (keywords.primary.length >= 2) {
            variations.push(`${keywords.primary[0]} ${keywords.primary[1]}`);
        }

        return variations;
    }
}

/**
 * Singleton Keyword Extractor instance
 */
let extractorInstance: KeywordExtractor | null = null;

/**
 * Gets the singleton Keyword Extractor
 */
export function getKeywordExtractor(): KeywordExtractor {
    if (!extractorInstance) {
        extractorInstance = new KeywordExtractor();
    }
    return extractorInstance;
}
