/**
 * Knowledge Base Loader
 *
 * Loads and compiles platform-specific knowledge from markdown files
 * for injection into AI agent prompts.
 *
 * @module ai/knowledge/loader
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Platform, ContentCategory } from '@icerik/shared';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('knowledgeLoader');

// Get current directory for knowledge file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const KNOWLEDGE_DIR = resolve(__dirname);

/**
 * Knowledge file paths relative to knowledge directory
 */
const KNOWLEDGE_FILES = {
    platforms: {
        tiktok: 'platforms/tiktok-algorithm.md',
        reels: 'platforms/instagram-reels.md',
        shorts: 'platforms/youtube-shorts.md',
    },
    patterns: {
        hooks: 'content-patterns/viral-hooks.md',
        cta: 'content-patterns/cta-templates.md',
        structures: 'content-patterns/script-structures.md',
    },
} as const;

/**
 * Cache for loaded knowledge to avoid repeated file reads
 */
const knowledgeCache = new Map<string, string>();

/**
 * Load a knowledge file with caching
 */
function loadKnowledgeFile(relativePath: string): string {
    const cacheKey = relativePath;

    if (knowledgeCache.has(cacheKey)) {
        return knowledgeCache.get(cacheKey)!;
    }

    const fullPath = join(KNOWLEDGE_DIR, relativePath);

    if (!existsSync(fullPath)) {
        logger.warn({ path: fullPath }, 'Knowledge file not found');
        return '';
    }

    try {
        const content = readFileSync(fullPath, 'utf-8');
        knowledgeCache.set(cacheKey, content);
        logger.debug({ path: relativePath, size: content.length }, 'Knowledge file loaded');
        return content;
    } catch (error) {
        logger.error({ error, path: fullPath }, 'Failed to load knowledge file');
        return '';
    }
}

/**
 * Extract key sections from a markdown knowledge document
 * This creates a condensed version for prompt injection
 */
function extractKeySections(content: string, maxLength: number = 4000): string {
    if (!content) return '';

    // Priority sections to extract (in order)
    const prioritySections = [
        'Core Algorithm Principles',
        'Primary Ranking Signals',
        'Duration Strategy',
        'Hook Engineering',
        'Loop Engineering',
        'Comment Engineering',
        'Audio Strategy',
        'Content Lifecycle',
        'Hashtag Strategy',
        'Success Metrics',
        // Content patterns sections
        'Hook Categories',
        'CTA Strategies',
        'Core Structure Philosophy',
        'Structure Templates',
    ];

    const extractedParts: string[] = [];
    let currentLength = 0;

    for (const sectionName of prioritySections) {
        if (currentLength >= maxLength) break;

        // Match section with flexible heading levels (## or ###)
        const sectionRegex = new RegExp(
            `^#{2,3}\\s*(?:[^\\n]*)?${escapeRegex(sectionName)}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{2,3}\\s|$)`,
            'im'
        );
        const match = content.match(sectionRegex);

        if (match && match[1]) {
            const sectionContent = match[1].trim();
            if (sectionContent.length > 0) {
                const remaining = maxLength - currentLength;
                const truncated = sectionContent.length > remaining
                    ? sectionContent.slice(0, remaining) + '...'
                    : sectionContent;
                extractedParts.push(`### ${sectionName}\n${truncated}`);
                currentLength += truncated.length + sectionName.length + 10;
            }
        }
    }

    return extractedParts.join('\n\n');
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get platform-specific algorithm knowledge
 */
export function getPlatformKnowledge(platform: Platform): string {
    const filePath = KNOWLEDGE_FILES.platforms[platform];
    if (!filePath) {
        logger.warn({ platform }, 'No knowledge file for platform');
        return '';
    }

    const fullContent = loadKnowledgeFile(filePath);
    return extractKeySections(fullContent, 5000);
}

/**
 * Get viral hook patterns knowledge
 */
export function getHookPatterns(): string {
    const content = loadKnowledgeFile(KNOWLEDGE_FILES.patterns.hooks);
    return extractKeySections(content, 3000);
}

/**
 * Get CTA templates knowledge
 */
export function getCtaTemplates(platform: Platform): string {
    const content = loadKnowledgeFile(KNOWLEDGE_FILES.patterns.cta);
    if (!content) return '';

    // Extract platform-specific CTA section
    const platformLabels: Record<Platform, string> = {
        tiktok: 'TikTok',
        reels: 'Instagram Reels',
        shorts: 'YouTube Shorts',
    };

    const label = platformLabels[platform];
    const regex = new RegExp(
        `### ${label} CTAs\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`,
        'i'
    );
    const match = content.match(regex);

    if (match && match[1]) {
        return `### ${label} CTA Best Practices\n${match[1].trim()}`;
    }

    return extractKeySections(content, 2000);
}

/**
 * Get script structure patterns knowledge
 */
export function getScriptStructures(): string {
    const content = loadKnowledgeFile(KNOWLEDGE_FILES.patterns.structures);
    return extractKeySections(content, 3000);
}

/**
 * Compile complete knowledge context for a platform agent
 * Returns a condensed, prompt-ready knowledge block
 */
export function compilePlatformKnowledge(platform: Platform): string {
    const platformKnowledge = getPlatformKnowledge(platform);
    const hookPatterns = getHookPatterns();
    const ctaTemplates = getCtaTemplates(platform);
    const scriptStructures = getScriptStructures();

    const parts: string[] = [];

    if (platformKnowledge) {
        parts.push(`## ${platform.toUpperCase()} Algorithm Intelligence\n\n${platformKnowledge}`);
    }

    if (hookPatterns) {
        parts.push(`## Viral Hook Patterns\n\n${hookPatterns}`);
    }

    if (ctaTemplates) {
        parts.push(`## CTA Strategy\n\n${ctaTemplates}`);
    }

    if (scriptStructures) {
        parts.push(`## Script Structure Patterns\n\n${scriptStructures}`);
    }

    const compiled = parts.join('\n\n---\n\n');

    logger.info({
        platform,
        knowledgeLength: compiled.length,
        sections: parts.length,
    }, 'Platform knowledge compiled');

    return compiled;
}

/**
 * Get knowledge statistics for debugging
 */
export function getKnowledgeStats(): {
    platforms: Record<Platform, { loaded: boolean; size: number }>;
    patterns: Record<string, { loaded: boolean; size: number }>;
    cacheSize: number;
} {
    const platforms: Record<Platform, { loaded: boolean; size: number }> = {
        tiktok: { loaded: false, size: 0 },
        reels: { loaded: false, size: 0 },
        shorts: { loaded: false, size: 0 },
    };

    const patterns: Record<string, { loaded: boolean; size: number }> = {
        hooks: { loaded: false, size: 0 },
        cta: { loaded: false, size: 0 },
        structures: { loaded: false, size: 0 },
    };

    for (const [platform, path] of Object.entries(KNOWLEDGE_FILES.platforms)) {
        const fullPath = join(KNOWLEDGE_DIR, path);
        const exists = existsSync(fullPath);
        const cached = knowledgeCache.get(path);
        platforms[platform as Platform] = {
            loaded: exists,
            size: cached?.length || 0,
        };
    }

    for (const [pattern, path] of Object.entries(KNOWLEDGE_FILES.patterns)) {
        const fullPath = join(KNOWLEDGE_DIR, path);
        const exists = existsSync(fullPath);
        const cached = knowledgeCache.get(path);
        patterns[pattern] = {
            loaded: exists,
            size: cached?.length || 0,
        };
    }

    return {
        platforms,
        patterns,
        cacheSize: knowledgeCache.size,
    };
}

/**
 * Clear knowledge cache (for development/testing)
 */
export function clearKnowledgeCache(): void {
    knowledgeCache.clear();
    logger.info('Knowledge cache cleared');
}

/**
 * Preload all knowledge files into cache
 */
export function preloadKnowledge(): void {
    logger.info('Preloading knowledge files...');

    for (const path of Object.values(KNOWLEDGE_FILES.platforms)) {
        loadKnowledgeFile(path);
    }

    for (const path of Object.values(KNOWLEDGE_FILES.patterns)) {
        loadKnowledgeFile(path);
    }

    logger.info({ cacheSize: knowledgeCache.size }, 'Knowledge preload complete');
}
