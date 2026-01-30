/**
 * E2E Test Helpers
 * 
 * Common utilities for Playwright E2E tests.
 * Includes API mocking, wait helpers, and test fixtures.
 * 
 * @module e2e/helpers
 */

import { Page, Route, expect } from '@playwright/test';

// =============================================================================
// Types
// =============================================================================

export interface MockVideoJob {
    jobId: string;
    status: 'queued' | 'building-timeline' | 'generating-captions' | 'composing-video' | 'encoding' | 'complete' | 'failed';
    progress: number;
    currentStep: string;
    outputPath?: string;
    error?: string;
}

export interface MockTrendData {
    id: string;
    title: string;
    subreddit: string;
    category: string;
    score: number;
    upvoteRatio: number;
    numComments: number;
    createdUtc: number;
    nes: number;
    engagementVelocity: number;
    controversyFactor: number;
    ageHours: number;
    sourceUrl: string;
    permalink: string;
    fetchedAt: string;
}

export interface MockApiResponses {
    videoGenerate?: Partial<MockVideoJob>;
    videoStatus?: Partial<MockVideoJob>;
    voiceGenerate?: {
        data?: ArrayBuffer;
        error?: string;
    };
    scriptsGenerate?: object;
    trends?: MockTrendData[];
}

// =============================================================================
// API Mocking Helpers
// =============================================================================

/**
 * Set up mock responses for video API
 */
export async function mockVideoApi(page: Page, responses: MockApiResponses = {}) {
    // Mock video generation endpoint
    await page.route('**/api/video/generate', async (route: Route) => {
        const response = responses.videoGenerate || {
            success: true,
            jobId: 'test-job-' + Date.now(),
            message: 'Video generation started',
        };

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
        });
    });

    // Mock video status endpoint
    await page.route('**/api/video/status/**', async (route: Route) => {
        const response = responses.videoStatus || {
            jobId: 'test-job',
            status: 'complete',
            progress: 100,
            currentStep: 'Done',
            outputPath: '/videos/test.mp4',
        };

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
        });
    });

    // Mock video jobs list
    await page.route('**/api/video/jobs', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
        });
    });
}

/**
 * Set up mock responses for voice API
 */
export async function mockVoiceApi(page: Page, responses: MockApiResponses = {}) {
    await page.route('**/api/voice/generate', async (route: Route) => {
        if (responses.voiceGenerate?.error) {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: responses.voiceGenerate.error }),
            });
            return;
        }

        // Return mock audio data
        const audioData = responses.voiceGenerate?.data || createMockAudioBuffer();

        await route.fulfill({
            status: 200,
            contentType: 'audio/mpeg',
            headers: {
                'X-Voice-Provider': 'mock',
                'X-Audio-Duration': '10',
            },
            body: Buffer.from(audioData),
        });
    });
}

/**
 * Create a minimal valid MP3 buffer for testing
 */
function createMockAudioBuffer(): ArrayBuffer {
    // Minimal MP3 frame header (for testing purposes only)
    const header = new Uint8Array([
        0xFF, 0xFB, 0x90, 0x00, // MP3 frame sync
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
    ]);
    return header.buffer;
}

/**
 * Generate mock trend data for testing
 */
function generateMockTrends(count: number = 10): MockTrendData[] {
    const categories = [
        { name: 'technology', subreddits: ['technology', 'programming', 'gadgets'] },
        { name: 'finance', subreddits: ['wallstreetbets', 'investing', 'cryptocurrency'] },
        { name: 'gaming', subreddits: ['gaming', 'pcgaming', 'games'] },
        { name: 'entertainment', subreddits: ['movies', 'television', 'music'] },
        { name: 'news', subreddits: ['news', 'worldnews', 'politics'] },
    ];

    const mockTitles: Record<string, string[]> = {
        technology: [
            'New AI breakthrough changes everything about machine learning',
            'Apple announces revolutionary new product launching next month',
            'Google reveals major update to search algorithm',
            'Microsoft AI integration causing controversy in tech community',
            'OpenAI releases GPT-5 with unprecedented capabilities',
        ],
        finance: [
            'Bitcoin breaks all-time high amid market volatility',
            'Fed announces unexpected interest rate decision',
            'This stock is up 500% and still climbing',
            'Major bank announces billions in quarterly losses',
            'Cryptocurrency regulation incoming - what you need to know',
        ],
        gaming: [
            'GTA 6 gameplay leak reveals stunning graphics',
            'Nintendo announces surprise Direct for next week',
            'Steam sale breaks all-time concurrent user records',
            'Elden Ring DLC gets release date announcement',
            'PlayStation exclusive coming to PC confirmed',
        ],
        entertainment: [
            'Blockbuster movie sequel confirmed with original cast',
            'Netflix cancels beloved show after 5 seasons',
            'Oscars controversy sparks heated debate online',
            'Popular band announces surprise reunion tour',
            'Streaming wars heat up with new platform launch',
        ],
        news: [
            'Breaking: Major policy change announced today',
            'Scientists discover potential cure for common disease',
            'International summit reaches historic agreement',
            'Tech billionaire makes shocking announcement',
            'Climate report reveals urgent findings',
        ],
    };

    const trends: MockTrendData[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const categoryData = categories[i % categories.length];
        const category = categoryData.name;
        const subreddit = categoryData.subreddits[i % categoryData.subreddits.length];
        const titles = mockTitles[category] || mockTitles.technology;
        const title = titles[i % titles.length];

        const score = Math.floor(Math.random() * 10000) + 1000;
        const numComments = Math.floor(Math.random() * 500) + 50;
        const ageHours = Math.random() * 24;

        trends.push({
            id: `mock-trend-${i}-${Date.now()}`,
            title,
            subreddit,
            category,
            score,
            upvoteRatio: 0.85 + Math.random() * 0.1,
            numComments,
            createdUtc: Math.floor((now - ageHours * 3600000) / 1000),
            nes: Math.floor(Math.random() * 80) + 20,
            engagementVelocity: Math.random() * 100,
            controversyFactor: Math.random() * 2,
            ageHours,
            sourceUrl: `https://reddit.com/r/${subreddit}/comments/${i}`,
            permalink: `/r/${subreddit}/comments/mock${i}/`,
            fetchedAt: new Date().toISOString(),
        });
    }

    return trends;
}

/**
 * Set up mock responses for trends API
 * This enables tests to run without real API data
 */
export async function mockTrendsApi(page: Page, customTrends?: MockTrendData[]) {
    const mockTrends = customTrends || generateMockTrends(20);

    // Mock trends endpoint with category filtering
    await page.route('**/api/trends**', async (route: Route) => {
        const url = new URL(route.request().url());
        const category = url.searchParams.get('category');
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);

        let filtered = mockTrends;

        // Filter by category if specified
        if (category) {
            filtered = mockTrends.filter(t => t.category === category);
        }

        // Apply limit
        filtered = filtered.slice(0, limit);

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: filtered,
                timestamp: new Date().toISOString(),
            }),
        });
    });

    // Mock categories endpoint
    await page.route('**/api/categories**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: [
                    { id: 'technology', label: 'Teknoloji', count: 7 },
                    { id: 'finance', label: 'Finans', count: 5 },
                    { id: 'gaming', label: 'Oyun', count: 4 },
                    { id: 'entertainment', label: 'Eğlence', count: 6 },
                    { id: 'news', label: 'Haberler', count: 3 },
                ],
                timestamp: new Date().toISOString(),
            }),
        });
    });

    // Mock status endpoint
    await page.route('**/api/status**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    engine: { status: 'healthy', version: '1.24.0' },
                    cache: { size: 100, hitRate: 0.85 },
                },
                timestamp: new Date().toISOString(),
            }),
        });
    });
}

// =============================================================================
// Wait Helpers
// =============================================================================

/**
 * Wait for element to be visible with custom timeout
 */
export async function waitForVisible(page: Page, selector: string, timeout = 10000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 30000) {
    await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 30000) {
    return page.waitForResponse(
        response => {
            const url = response.url();
            return typeof urlPattern === 'string'
                ? url.includes(urlPattern)
                : urlPattern.test(url);
        },
        { timeout }
    );
}

/**
 * Wait for multiple API responses
 */
export async function waitForApiResponses(page: Page, patterns: (string | RegExp)[], timeout = 30000) {
    return Promise.all(patterns.map(pattern => waitForApiResponse(page, pattern, timeout)));
}

// =============================================================================
// Navigation Helpers
// =============================================================================

/**
 * Navigate to dashboard
 */
export async function goToDashboard(page: Page) {
    await page.goto('/');
    await waitForNetworkIdle(page);
}

/**
 * Select a category
 */
export async function selectCategory(page: Page, category: string) {
    await page.click(`button:has-text("${category}")`);
    await waitForNetworkIdle(page);
}

/**
 * Generate script for first trend using stable testid selector
 * Uses force:true to bypass CSS opacity:0 on desktop viewports
 */
export async function generateScriptForFirstTrend(page: Page) {
    const trendCard = page.locator('[class*="Card"]').first();
    await expect(trendCard).toBeVisible({ timeout: 10000 });

    // Hover to trigger potential CSS transitions
    await trendCard.hover();
    await page.waitForTimeout(300);

    // Use data-testid selector with toBeAttached (not toBeVisible)
    // Button may have opacity:0 on desktop viewport
    const scriptButton = trendCard.locator('[data-testid="generate-script-btn"]');
    await expect(scriptButton).toBeAttached({ timeout: 5000 });

    // Force click bypasses opacity:0 CSS
    await scriptButton.click({ force: true });

    // Wait for API response
    await waitForApiResponse(page, '/api/scripts/generate', 60000);

    // Wait for platform cards
    await page.waitForSelector('text=TikTok', { timeout: 15000 });
}

/**
 * Full setup with API isolation for video/voice tests
 * Includes all necessary mocks and waits for script generation
 */
export async function setupWithGeneratedScript(page: Page) {
    // Apply ALL mocks before navigation
    await mockVideoGenerationApis(page);

    // Navigate and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Select technology category
    await page.click('button:has-text("Teknoloji")');
    await page.waitForLoadState('networkidle');

    // Wait for trend cards
    await expect(page.locator('[class*="Card"]').first()).toBeVisible({ timeout: 15000 });

    // Generate script with stable method
    await generateScriptForFirstTrend(page);

    // Wait for platform cards to confirm script generation
    await expect(page.locator('text=TikTok').first()).toBeVisible({ timeout: 15000 });
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Check if element contains text (case-insensitive)
 */
export async function containsText(page: Page, selector: string, text: string) {
    const element = page.locator(selector);
    const content = await element.textContent();
    return content?.toLowerCase().includes(text.toLowerCase()) ?? false;
}

/**
 * Check if console has specific log
 */
export function createConsoleLogger(page: Page) {
    const logs: { type: string; text: string }[] = [];

    page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
    });

    return {
        getLogs: () => logs,
        hasLog: (pattern: string | RegExp) => logs.some(log =>
            typeof pattern === 'string'
                ? log.text.includes(pattern)
                : pattern.test(log.text)
        ),
        getErrors: () => logs.filter(l => l.type === 'error'),
        clear: () => logs.length = 0,
    };
}

// =============================================================================
// Script Generation Mock
// =============================================================================

/**
 * Mock script generation API for video tests
 * Returns realistic Turkish script content for all platforms
 */
export async function mockScriptsApi(page: Page) {
    const mockScript = {
        hook: 'Bu teknolojiyi duymadıysanız, çok şey kaçırıyorsunuz!',
        body: 'Yapay zeka artık günlük hayatımızın vazgeçilmez bir parçası haline geldi. Son gelişmeler gösteriyor ki, bu teknoloji hayatımızı tamamen değiştirecek. Uzmanlar bu konuda hemfikir: gelecek yapay zekanın elinde.',
        cta: 'Daha fazlası için takip edin ve bildirimleri açın!',
        sections: [
            { type: 'hook', text: 'Bu teknolojiyi duymadıysanız, çok şey kaçırıyorsunuz!' },
            { type: 'body', text: 'Yapay zeka artık günlük hayatımızın vazgeçilmez bir parçası haline geldi.' },
            { type: 'cta', text: 'Daha fazlası için takip edin ve bildirimleri açın!' }
        ],
        metadata: {
            wordCount: 45,
            estimatedDuration: 30,
            platform: 'tiktok'
        }
    };

    // Mock script generate endpoint
    await page.route('**/api/scripts/generate**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    platform: 'tiktok',
                    script: mockScript,
                    platforms: {
                        tiktok: { ...mockScript, platform: 'tiktok' },
                        reels: { ...mockScript, platform: 'reels' },
                        shorts: { ...mockScript, platform: 'shorts' }
                    },
                    generationTime: 1.5,
                    model: 'gemini-2.0-flash'
                },
                timestamp: new Date().toISOString()
            })
        });
    });

    // Mock script iterate endpoint
    await page.route('**/api/scripts/iterate**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    script: mockScript,
                    changes: ['Hook made more engaging', 'CTA strengthened'],
                    iteration: 1
                },
                timestamp: new Date().toISOString()
            })
        });
    });
}

/**
 * Mock images API for video tests
 * Returns mock image URLs for visual selection
 */
export async function mockImagesApi(page: Page) {
    const mockImages = Array.from({ length: 6 }, (_, i) => ({
        id: `mock-image-${i}`,
        url: `https://images.pexels.com/photos/${1000000 + i}/pexels-photo.jpeg`,
        thumbnail: `https://images.pexels.com/photos/${1000000 + i}/pexels-photo-thumb.jpeg`,
        photographer: 'Mock Photographer',
        width: 1920,
        height: 1080,
        alt: `Mock image ${i + 1}`
    }));

    await page.route('**/api/images/**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    images: mockImages,
                    total: 6,
                    query: 'technology'
                },
                timestamp: new Date().toISOString()
            })
        });
    });
}

/**
 * Setup all mocks needed for video generation tests
 */
export async function mockVideoGenerationApis(page: Page) {
    await mockTrendsApi(page);
    await mockScriptsApi(page);
    await mockImagesApi(page);
    await mockVoiceApi(page);
}

// =============================================================================
// Test Data
// =============================================================================

export const TEST_DATA = {
    categories: ['Teknoloji', 'Finans', 'Oyun', 'Eğitim'],
    platforms: ['TikTok', 'Reels', 'Shorts'],
    captionStyles: ['Hormozi', 'Classic', 'Minimal'],
    transitionStyles: ['Smooth', 'Dynamic', 'Minimal'],
};
