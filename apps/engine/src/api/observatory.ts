/**
 * Observatory API Module
 * 
 * Provides endpoints for the Project Observatory dashboard.
 * Returns project metrics, AI prompts, architecture data, and health info.
 * 
 * @module api/observatory
 */

import { Hono } from 'hono';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createChildLogger } from '../utils/logger.js';
import { SUBREDDIT_CONFIG, CATEGORY_LABELS, ALL_PLATFORMS, PLATFORM_LABELS } from '@icerik/shared';

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
 * Architecture data
 */
interface ArchitectureData {
    systems: {
        name: string;
        description: string;
        docFile: string;
        status: 'active' | 'planned';
    }[];
    adrs: {
        id: string;
        title: string;
        status: 'accepted' | 'deprecated' | 'proposed';
        summary: string;
    }[];
    components: {
        backend: string[];
        frontend: string[];
        shared: string[];
    };
}

/**
 * API Endpoint documentation
 */
interface EndpointDoc {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    phase: number;
    category: string;
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
     * Returns project overview metrics
     */
    observatory.get('/metrics', async (c) => {
        try {
            // Count knowledge files
            let knowledgeFileCount = 0;
            try {
                const platformFiles = await readdir(join(AI_KNOWLEDGE_PATH, 'platforms'));
                const patternFiles = await readdir(join(AI_KNOWLEDGE_PATH, 'content-patterns'));
                knowledgeFileCount = platformFiles.length + patternFiles.length;
            } catch {
                knowledgeFileCount = 6; // Default known count
            }

            const metrics: ObservatoryMetrics = {
                version: '1.14.0',
                projectName: 'İçerik Trend Engine',
                totalPhases: 18,
                completedPhases: 18,
                totalEndpoints: 21,
                totalPlatforms: ALL_PLATFORMS.length,
                totalCategories: Object.keys(CATEGORY_LABELS).length,
                totalSubreddits: SUBREDDIT_CONFIG.length,
                knowledgeFiles: knowledgeFileCount,
                lastUpdate: '2026-01-24T03:30:00+03:00',
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

            // Platform knowledge files
            const platformFiles = [
                { file: 'platforms/tiktok-algorithm.md', name: 'TikTok Algoritma Bilgisi', desc: 'TikTok FYP algoritması, hook stratejileri, loop teknikleri' },
                { file: 'platforms/instagram-reels.md', name: 'Instagram Reels Bilgisi', desc: 'Reels Explore algoritması, share/save optimizasyonu' },
                { file: 'platforms/youtube-shorts.md', name: 'YouTube Shorts Bilgisi', desc: 'Shorts algoritması, retention, abone dönüşümü' },
            ];

            for (const pf of platformFiles) {
                const content = await readKnowledgeFile(pf.file);
                if (content) {
                    prompts.push({
                        id: pf.file.replace(/[/.]/g, '_'),
                        name: pf.name,
                        category: 'platform',
                        description: pf.desc,
                        content: content,
                        source: `ai/knowledge/${pf.file}`,
                        wordCount: countWords(content),
                    });
                }
            }

            // Content pattern files
            const patternFiles = [
                { file: 'content-patterns/viral-hooks.md', name: 'Viral Hook Şablonları', desc: 'Dikkat çekici açılış cümleleri ve pattern interrupt teknikleri' },
                { file: 'content-patterns/cta-templates.md', name: 'CTA Şablonları', desc: 'Platform-spesifik call-to-action şablonları' },
                { file: 'content-patterns/script-structures.md', name: 'Script Yapıları', desc: 'Farklı içerik formatları için script yapıları' },
            ];

            for (const pf of patternFiles) {
                const content = await readKnowledgeFile(pf.file);
                if (content) {
                    prompts.push({
                        id: pf.file.replace(/[/.]/g, '_'),
                        name: pf.name,
                        category: 'content-pattern',
                        description: pf.desc,
                        content: content,
                        source: `ai/knowledge/${pf.file}`,
                        wordCount: countWords(content),
                    });
                }
            }

            // Embedded prompts summary (from code)
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
     * Returns API endpoint documentation
     */
    observatory.get('/endpoints', (c) => {
        const endpoints: EndpointDoc[] = [
            // Core
            { method: 'GET', path: '/api/health', description: 'Sistem sağlık kontrolü', phase: 1, category: 'Core' },
            { method: 'GET', path: '/api/categories', description: 'Tüm kategorileri listele', phase: 1, category: 'Core' },
            { method: 'GET', path: '/api/subreddits', description: 'Subreddit\'leri listele', phase: 1, category: 'Core' },
            { method: 'GET', path: '/api/trends', description: 'Trend verilerini getir', phase: 1, category: 'Core' },
            { method: 'GET', path: '/api/status', description: 'Engine durumu', phase: 2, category: 'Core' },
            { method: 'GET', path: '/api/summary', description: 'Trend özeti', phase: 2, category: 'Core' },
            // Cache
            { method: 'GET', path: '/api/cache/stats', description: 'Cache istatistikleri', phase: 3, category: 'Cache' },
            { method: 'POST', path: '/api/cache/clear', description: 'Cache temizle', phase: 3, category: 'Cache' },
            { method: 'POST', path: '/api/cache/warm', description: 'Cache ısıt', phase: 3, category: 'Cache' },
            // Worker
            { method: 'GET', path: '/api/worker/status', description: 'Worker durumu', phase: 4, category: 'Worker' },
            { method: 'POST', path: '/api/worker/trigger', description: 'Worker tetikle', phase: 4, category: 'Worker' },
            // AI Content
            { method: 'POST', path: '/api/generate-script', description: 'Tek platform script üret', phase: 10, category: 'AI Content' },
            { method: 'POST', path: '/api/generate-scripts', description: 'Multi-platform script üret', phase: 11, category: 'AI Content' },
            { method: 'POST', path: '/api/generate-scripts/retry', description: 'Başarısız platformları tekrar dene', phase: 11, category: 'AI Content' },
            { method: 'GET', path: '/api/platforms', description: 'Platform listesi ve özellikleri', phase: 11, category: 'AI Content' },
            { method: 'GET', path: '/api/platforms/:platform/tips', description: 'Platform optimizasyon ipuçları', phase: 11, category: 'AI Content' },
            // Trend Intelligence
            { method: 'POST', path: '/api/trends/:id/classify', description: 'Trend sınıflandır', phase: 14, category: 'Intelligence' },
            { method: 'POST', path: '/api/scripts/score', description: 'Script viral puanı', phase: 14, category: 'Intelligence' },
            // AI Quality
            { method: 'GET', path: '/api/ai/metrics', description: 'AI operasyon metrikleri', phase: 15, category: 'AI Quality' },
            { method: 'POST', path: '/api/scripts/iterate', description: 'Script bölümü yeniden üret', phase: 15, category: 'AI Quality' },
            { method: 'POST', path: '/api/generate-script-variants', description: 'A/B test varyantları', phase: 15, category: 'AI Quality' },
        ];

        const grouped = endpoints.reduce((acc, ep) => {
            if (!acc[ep.category]) {
                acc[ep.category] = [];
            }
            acc[ep.category].push(ep);
            return acc;
        }, {} as Record<string, EndpointDoc[]>);

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
            },
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * GET /api/observatory/architecture
     * Returns architecture documentation
     */
    observatory.get('/architecture', (c) => {
        const architecture: ArchitectureData = {
            systems: [
                { name: 'Caching Layer', description: 'SQLite tabanlı trend cache sistemi', docFile: 'caching.md', status: 'active' },
                { name: 'Background Worker', description: 'Tier-based Reddit polling sistemi', docFile: 'worker.md', status: 'active' },
                { name: 'Multi-Agent System', description: 'Platform-specific AI agent\'ları (TikTok/Reels/Shorts)', docFile: 'multi-agent.md', status: 'active' },
                { name: 'Knowledge System', description: 'Native Gemini education sistemi', docFile: 'knowledge-system.md', status: 'active' },
                { name: 'AI Quality Pipeline', description: 'Metrics, Iterator, Variant Generator modülleri', docFile: 'ai-quality.md', status: 'active' },
                { name: 'Local Storage', description: 'Browser-native persistence (favorites, history, analytics)', docFile: 'local-storage.md', status: 'active' },
            ],
            adrs: [
                { id: 'ADR-001', title: 'SQLite over Redis', status: 'accepted', summary: 'MVP için SQLite tercih edildi' },
                { id: 'ADR-002', title: 'Public .json Endpoints', status: 'accepted', summary: 'Reddit API için public endpoints' },
                { id: 'ADR-003', title: 'NES Algorithm', status: 'accepted', summary: 'Normalized Engagement Score formülü' },
                { id: 'ADR-004', title: 'Tier-Based Polling', status: 'accepted', summary: 'Subreddit tier\'larına göre polling' },
                { id: 'ADR-005', title: 'Dynamic AI Import', status: 'accepted', summary: 'AI modüllerini lazy load et' },
                { id: 'ADR-006', title: 'Atomic Design', status: 'accepted', summary: 'Dashboard component yapısı' },
                { id: 'ADR-020', title: 'Local-First Analytics', status: 'accepted', summary: 'Auth gerektirmeyen client-side analytics' },
                { id: 'ADR-021', title: 'IndexedDB + localStorage', status: 'accepted', summary: 'Data tipine göre storage seçimi' },
                { id: 'ADR-022', title: 'GitHub Actions CI/CD', status: 'accepted', summary: 'pnpm ile automated deployment' },
                { id: 'ADR-023', title: 'Generic Type Bridge', status: 'accepted', summary: 'Circular dependency önleme pattern\'i' },
            ],
            components: {
                backend: [
                    'apps/engine/src/api/ - Hono REST API',
                    'apps/engine/src/cache/ - SQLite cache layer',
                    'apps/engine/src/ingestion/ - Reddit data ingestion',
                    'apps/engine/src/processing/ - NES calculation',
                    'apps/engine/src/ai/ - AI modules (agents, orchestrator, supervisor)',
                    'apps/engine/src/worker/ - Background polling',
                ],
                frontend: [
                    'apps/dashboard/src/pages/ - Main pages (TrendExplorer, UnifiedDashboard)',
                    'apps/dashboard/src/components/ - Atomic Design components',
                    'apps/dashboard/src/stores/ - Zustand state management',
                    'apps/dashboard/src/lib/ - API clients and hooks',
                ],
                shared: [
                    'packages/shared/src/types.ts - Core type definitions',
                    'packages/shared/src/platformTypes.ts - Platform-specific types',
                    'packages/shared/src/constants.ts - Subreddit config, category labels',
                ],
            },
        };

        return c.json({
            success: true,
            data: architecture,
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * GET /api/observatory/roadmap
     * Returns roadmap and feature status
     */
    observatory.get('/roadmap', (c) => {
        const phases = [
            { phase: 1, name: 'Core API', status: 'complete', features: ['Health endpoint', 'Categories', 'Subreddits', 'Trends'] },
            { phase: 2, name: 'Status & Summary', status: 'complete', features: ['Engine status', 'Trend summary'] },
            { phase: 3, name: 'Caching Layer', status: 'complete', features: ['SQLite cache', 'Cache stats', 'Cache management'] },
            { phase: 4, name: 'Background Worker', status: 'complete', features: ['Tier-based polling', 'Worker status'] },
            { phase: 5, name: 'NES Algorithm', status: 'complete', features: ['Engagement velocity', 'Controversy factor'] },
            { phase: 6, name: 'Dashboard UI', status: 'complete', features: ['Category grid', 'Trend cards', 'Filters'] },
            { phase: 7, name: 'React Query', status: 'complete', features: ['Data fetching', 'Caching', 'Loading states'] },
            { phase: 8, name: 'Zustand State', status: 'complete', features: ['Filter store', 'State management'] },
            { phase: 9, name: 'Error Handling', status: 'complete', features: ['Error boundaries', 'Retry logic'] },
            { phase: 10, name: 'AI Script Generation', status: 'complete', features: ['Gemini integration', 'Script generator'] },
            { phase: 11, name: 'Multi-Platform Agents', status: 'complete', features: ['TikTok/Reels/Shorts agents', 'Orchestrator'] },
            { phase: 12, name: 'Supervisor Agent', status: 'complete', features: ['Validation', 'Retry loop', 'Quality assurance'] },
            { phase: 13, name: 'Knowledge System', status: 'complete', features: ['Platform knowledge', 'Content patterns'] },
            { phase: 14, name: 'Trend Intelligence', status: 'complete', features: ['Trend classification', 'Algorithm scoring'] },
            { phase: 15, name: 'AI Quality Enhancement', status: 'complete', features: ['AIMetrics', 'Script iterator', 'Variant generator'] },
            { phase: 16, name: 'CI/CD', status: 'complete', features: ['GitHub Actions', 'Deployment automation'] },
            { phase: 17, name: 'Content Management', status: 'complete', features: ['Favorites', 'History', 'Export'] },
            { phase: 18, name: 'Advanced Analytics', status: 'complete', features: ['Script rating', 'Analytics dashboard'] },
        ];

        const futureIdeas = [
            'ML-based NES optimization',
            'Real-time trending alerts (WebSocket)',
            'Content performance tracking',
            'Team collaboration features',
            'Multi-platform API integration (X/Twitter, TikTok API)',
        ];

        return c.json({
            success: true,
            data: {
                phases,
                futureIdeas,
                summary: {
                    totalPhases: phases.length,
                    completed: phases.filter(p => p.status === 'complete').length,
                    inProgress: phases.filter(p => p.status === 'in-progress').length,
                    completionPercentage: 100,
                },
            },
            timestamp: new Date().toISOString(),
        });
    });

    return observatory;
}
