/**
 * Observatory API Module
 * 
 * Provides endpoints for the Project Observatory dashboard.
 * Returns project metrics, AI prompts, architecture data, and health info.
 * 
 * AUTO-UPDATE: All data is parsed from memory files at runtime.
 * No manual updates needed - just run /memory-sync workflow.
 * 
 * @module api/observatory
 */

import { Hono } from 'hono';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createChildLogger } from '../utils/logger.js';
import { SUBREDDIT_CONFIG, CATEGORY_LABELS, ALL_PLATFORMS } from '@icerik/shared';
import {
    getRoadmapData,
    getADRData,
    getEndpointsData,
    getArchitectureData,
    getProjectMetadata,
    getFutureIdeas,
    type ParsedPhase,
    type ParsedADR,
    type ParsedEndpoint,
    type ParsedSystem,
} from './memoryParser.js';

const logger = createChildLogger('observatory');

// Get the directory path for knowledge files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AI_KNOWLEDGE_PATH = join(__dirname, '..', 'ai', 'knowledge');

/**
 * Observatory metrics response
 */
interface ObservatoryMetrics {
    version: string;
    projectName: string;
    totalPhases: number;
    completedPhases: number;
    totalEndpoints: number;
    totalPlatforms: number;
    totalCategories: number;
    totalSubreddits: number;
    knowledgeFiles: number;
    lastUpdate: string;
    autoUpdated: boolean;
}

/**
 * AI Prompt structure
 */
interface AIPrompt {
    id: string;
    name: string;
    category: 'platform' | 'content-pattern' | 'embedded';
    description: string;
    content: string;
    source: string;
    wordCount: number;
}

/**
 * Embedded prompt (from code)
 */
interface EmbeddedPrompt {
    id: string;
    name: string;
    type: 'category' | 'tone' | 'language' | 'few-shot';
    entries: { key: string; value: string }[];
}

/**
 * Read a knowledge file and return its content
 */
async function readKnowledgeFile(relativePath: string): Promise<string | null> {
    try {
        const fullPath = join(AI_KNOWLEDGE_PATH, relativePath);
        const content = await readFile(fullPath, 'utf-8');
        return content;
    } catch (error) {
        logger.warn({ relativePath, error }, 'Failed to read knowledge file');
        return null;
    }
}

/**
 * Count words in content
 */
function countWords(content: string): number {
    return content.split(/\s+/).filter(Boolean).length;
}

/**
 * Create Observatory API router
 */
export function createObservatoryRouter(): Hono {
    const observatory = new Hono();

    /**
     * GET /api/observatory/metrics
     * Returns project overview metrics - AUTO-UPDATED from memory files
     */
    observatory.get('/metrics', async (c) => {
        try {
            // Get data from memory parsers (cached)
            const [metadata, phases, endpoints] = await Promise.all([
                getProjectMetadata(),
                getRoadmapData(),
                getEndpointsData(),
            ]);

            // Count knowledge files
            let knowledgeFileCount = 0;
            try {
                const platformFiles = await readdir(join(AI_KNOWLEDGE_PATH, 'platforms'));
                const patternFiles = await readdir(join(AI_KNOWLEDGE_PATH, 'content-patterns'));
                knowledgeFileCount = platformFiles.filter(f => f.endsWith('.md')).length +
                    patternFiles.filter(f => f.endsWith('.md')).length;
            } catch {
                knowledgeFileCount = 6; // Default known count
            }

            const completedPhases = phases.filter(p => p.status === 'complete').length;

            const metrics: ObservatoryMetrics = {
                version: metadata.version,
                projectName: 'İçerik Trend Engine',
                totalPhases: phases.length,
                completedPhases,
                totalEndpoints: endpoints.length,
                totalPlatforms: ALL_PLATFORMS.length,
                totalCategories: Object.keys(CATEGORY_LABELS).length,
                totalSubreddits: SUBREDDIT_CONFIG.length,
                knowledgeFiles: knowledgeFileCount,
                lastUpdate: metadata.lastUpdate,
                autoUpdated: true, // Flag to indicate this is auto-updated
            };

            return c.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get observatory metrics');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/observatory/prompts
     * Returns all AI prompts from knowledge base and embedded sources
     */
    observatory.get('/prompts', async (c) => {
        try {
            const prompts: AIPrompt[] = [];

            // Dynamically discover platform knowledge files
            try {
                const platformDir = join(AI_KNOWLEDGE_PATH, 'platforms');
                const platformFiles = await readdir(platformDir);

                for (const file of platformFiles) {
                    if (!file.endsWith('.md')) continue;
                    const content = await readKnowledgeFile(`platforms/${file}`);
                    if (content) {
                        // Extract title from first heading
                        const titleMatch = content.match(/^# (.+)/m);
                        const name = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

                        prompts.push({
                            id: `platforms_${file.replace('.md', '')}`,
                            name,
                            category: 'platform',
                            description: `Platform algorithm knowledge for ${name}`,
                            content,
                            source: `ai/knowledge/platforms/${file}`,
                            wordCount: countWords(content),
                        });
                    }
                }
            } catch (error) {
                logger.warn({ error }, 'Failed to read platform files');
            }

            // Dynamically discover content pattern files
            try {
                const patternDir = join(AI_KNOWLEDGE_PATH, 'content-patterns');
                const patternFiles = await readdir(patternDir);

                for (const file of patternFiles) {
                    if (!file.endsWith('.md')) continue;
                    const content = await readKnowledgeFile(`content-patterns/${file}`);
                    if (content) {
                        // Extract title from first heading
                        const titleMatch = content.match(/^# (.+)/m);
                        const name = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

                        prompts.push({
                            id: `patterns_${file.replace('.md', '')}`,
                            name,
                            category: 'content-pattern',
                            description: `Content pattern: ${name}`,
                            content,
                            source: `ai/knowledge/content-patterns/${file}`,
                            wordCount: countWords(content),
                        });
                    }
                }
            } catch (error) {
                logger.warn({ error }, 'Failed to read pattern files');
            }

            // Embedded prompts summary (from code - these are truly embedded)
            const embeddedPrompts: EmbeddedPrompt[] = [
                {
                    id: 'category_prompts',
                    name: 'Kategori Prompt\'ları',
                    type: 'category',
                    entries: [
                        { key: 'technology', value: 'Focus on tech innovation, impact on users, and future implications.' },
                        { key: 'finance', value: 'Highlight financial impact, market implications, and practical advice.' },
                        { key: 'entertainment', value: 'Emphasize entertainment value, cultural impact, and emotional connection.' },
                        { key: 'gaming', value: 'Focus on gameplay mechanics, community reactions, and gaming culture.' },
                        { key: 'lifestyle', value: 'Provide practical value, personal connection, and actionable insights.' },
                        { key: 'news', value: 'Present facts clearly, provide context, maintain objectivity.' },
                        { key: 'drama', value: 'Build narrative tension, present multiple perspectives.' },
                        { key: 'sports', value: 'Capture excitement, highlight key moments.' },
                        { key: 'science', value: 'Make complex topics accessible, use analogies, spark curiosity.' },
                        { key: 'other', value: 'Focus on most engaging aspects, create compelling narrative.' },
                    ],
                },
                {
                    id: 'tone_prompts',
                    name: 'Ton Talimatları',
                    type: 'tone',
                    entries: [
                        { key: 'casual', value: 'Use conversational language, contractions, and a friendly tone.' },
                        { key: 'professional', value: 'Maintain polished, authoritative tone while being engaging.' },
                        { key: 'humorous', value: 'Incorporate wit, jokes, and playful language.' },
                        { key: 'dramatic', value: 'Use dramatic pauses, emphasis, and emotional language.' },
                    ],
                },
                {
                    id: 'language_prompts',
                    name: 'Dil Talimatları',
                    type: 'language',
                    entries: [
                        { key: 'en', value: 'Write in natural, conversational American English.' },
                        { key: 'tr', value: 'Scripti Türkçe yaz. Doğal ve günlük Türkçe kullan. Gen Z ve milenyallara hitap et.' },
                    ],
                },
                {
                    id: 'fewshot_examples',
                    name: 'Few-Shot Örnekleri',
                    type: 'few-shot',
                    entries: [
                        { key: 'technology', value: '[HOOK] Ring kapı zili sizi gizlice takip ediyor! [BODY] Flock güvenlik sistemi... [CTA] Bunu herkes bilsin, paylaş!' },
                        { key: 'finance', value: '[HOOK] 3 haftada emekli oldu, nasıl mı? [BODY] GameStop hisseleri yine patladı... [CTA] Yorumlara yaz, sen girdin mi?' },
                        { key: 'entertainment', value: '[HOOK] Bu sahne interneti kırdı! [BODY] Yeni Marvel filmindeki plot twist... [CTA] İzledin mi? Yorum bırak!' },
                        { key: 'gaming', value: '[HOOK] Bu oyuncu tarihe geçti! [BODY] Dünya şampiyonasında son saniye... [CTA] Sen olsan ne yapardın?' },
                    ],
                },
            ];

            return c.json({
                success: true,
                data: {
                    knowledgePrompts: prompts,
                    embeddedPrompts: embeddedPrompts,
                    summary: {
                        totalKnowledgeFiles: prompts.length,
                        totalEmbeddedTypes: embeddedPrompts.length,
                        totalWords: prompts.reduce((sum, p) => sum + p.wordCount, 0),
                    },
                    autoUpdated: true,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get observatory prompts');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/observatory/endpoints
     * Returns API endpoint documentation - AUTO-UPDATED from endpoints.md
     */
    observatory.get('/endpoints', async (c) => {
        try {
            const endpoints = await getEndpointsData();

            const grouped = endpoints.reduce((acc, ep) => {
                if (!acc[ep.category]) {
                    acc[ep.category] = [];
                }
                acc[ep.category].push(ep);
                return acc;
            }, {} as Record<string, ParsedEndpoint[]>);

            return c.json({
                success: true,
                data: {
                    endpoints,
                    grouped,
                    summary: {
                        total: endpoints.length,
                        byCategory: Object.fromEntries(
                            Object.entries(grouped).map(([k, v]) => [k, v.length])
                        ),
                    },
                    autoUpdated: true,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get observatory endpoints');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/observatory/architecture
     * Returns architecture documentation - AUTO-UPDATED from memory/architecture/
     */
    observatory.get('/architecture', async (c) => {
        try {
            const [systems, adrs] = await Promise.all([
                getArchitectureData(),
                getADRData(),
            ]);

            // Component structure (this is relatively static)
            const components = {
                backend: [
                    'apps/engine/src/api/ - Hono REST API',
                    'apps/engine/src/cache/ - SQLite cache layer',
                    'apps/engine/src/ingestion/ - Reddit data ingestion',
                    'apps/engine/src/processing/ - NES calculation',
                    'apps/engine/src/ai/ - AI modules (agents, orchestrator, supervisor)',
                    'apps/engine/src/worker/ - Background polling',
                ],
                frontend: [
                    'apps/dashboard/src/pages/ - Main pages',
                    'apps/dashboard/src/components/ - Atomic Design components',
                    'apps/dashboard/src/stores/ - Zustand state management',
                    'apps/dashboard/src/lib/ - API clients and hooks',
                ],
                shared: [
                    'packages/shared/src/types.ts - Core type definitions',
                    'packages/shared/src/platformTypes.ts - Platform-specific types',
                    'packages/shared/src/constants.ts - Subreddit config, category labels',
                ],
            };

            return c.json({
                success: true,
                data: {
                    systems,
                    adrs,
                    components,
                    autoUpdated: true,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get observatory architecture');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    /**
     * GET /api/observatory/roadmap
     * Returns roadmap and feature status - AUTO-UPDATED from roadmap.md
     */
    observatory.get('/roadmap', async (c) => {
        try {
            const [phases, futureIdeas] = await Promise.all([
                getRoadmapData(),
                getFutureIdeas(),
            ]);

            const completed = phases.filter(p => p.status === 'complete').length;
            const inProgress = phases.filter(p => p.status === 'in-progress').length;
            const completionPercentage = phases.length > 0
                ? Math.round((completed / phases.length) * 100)
                : 0;

            return c.json({
                success: true,
                data: {
                    phases,
                    futureIdeas,
                    summary: {
                        totalPhases: phases.length,
                        completed,
                        inProgress,
                        completionPercentage,
                    },
                    autoUpdated: true,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get observatory roadmap');
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    return observatory;
}
