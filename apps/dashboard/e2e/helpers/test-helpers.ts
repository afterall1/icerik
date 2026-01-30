/**
 * E2E Test Helpers
 * 
 * Common utilities for Playwright E2E tests.
 * Includes API mocking, wait helpers, and test fixtures.
 * 
 * @module e2e/helpers
 */

import { Page, Route } from '@playwright/test';

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

export interface MockApiResponses {
    videoGenerate?: Partial<MockVideoJob>;
    videoStatus?: Partial<MockVideoJob>;
    voiceGenerate?: {
        data?: ArrayBuffer;
        error?: string;
    };
    scriptsGenerate?: object;
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
 * Generate script for first trend
 */
export async function generateScriptForFirstTrend(page: Page) {
    const trendCard = page.locator('[class*="Card"]').first();
    await trendCard.hover();

    const scriptButton = page.locator('button:has-text("Script")').first();
    await scriptButton.click();

    // Wait for API response
    await waitForApiResponse(page, '/api/scripts/generate', 60000);

    // Wait for platform cards
    await page.waitForSelector('text=TikTok', { timeout: 15000 });
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
// Test Data
// =============================================================================

export const TEST_DATA = {
    categories: ['Teknoloji', 'Finans', 'Oyun', 'Eğitim'],
    platforms: ['TikTok', 'Reels', 'Shorts'],
    captionStyles: ['Hormozi', 'Classic', 'Minimal'],
    transitionStyles: ['Smooth', 'Dynamic', 'Minimal'],
};
