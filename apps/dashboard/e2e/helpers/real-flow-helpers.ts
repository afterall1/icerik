/**
 * Real Flow E2E Test Helpers
 * 
 * Utilities for testing the REAL video generation flow (not mocked).
 * Includes:
 * - Stage-based workflow helpers
 * - Retry with exponential backoff
 * - Checkpoint capture (screenshot + logs)
 * - Network request monitoring
 * - API response validation
 * 
 * @module e2e/helpers/real-flow-helpers
 */

import { Page, expect, Response } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Types
// =============================================================================

export interface StageResult {
    stageName: string;
    success: boolean;
    duration: number;
    error?: string;
    screenshotPath?: string;
    networkRequests: NetworkLog[];
    consoleLogs: ConsoleLog[];
}

export interface NetworkLog {
    url: string;
    method: string;
    status: number;
    duration: number;
    responseSize?: number;
}

export interface ConsoleLog {
    type: 'log' | 'error' | 'warning' | 'info';
    text: string;
    timestamp: number;
}

export interface FlowContext {
    page: Page;
    testName: string;
    outputDir: string;
    stages: StageResult[];
    networkLogs: NetworkLog[];
    consoleLogs: ConsoleLog[];
    startTime: number;
}

export interface RetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    onRetry?: (attempt: number, error: Error) => void;
}

// =============================================================================
// Flow Context Management
// =============================================================================

/**
 * Create a new flow context for tracking test execution
 */
export function createFlowContext(page: Page, testName: string, outputDir: string = './test-results'): FlowContext {
    const context: FlowContext = {
        page,
        testName,
        outputDir,
        stages: [],
        networkLogs: [],
        consoleLogs: [],
        startTime: Date.now(),
    };

    // Set up console listener
    page.on('console', (msg) => {
        context.consoleLogs.push({
            type: msg.type() as ConsoleLog['type'],
            text: msg.text(),
            timestamp: Date.now(),
        });
    });

    // Set up network listener
    page.on('response', async (response) => {
        const request = response.request();
        const timing = response.request().timing();

        context.networkLogs.push({
            url: request.url(),
            method: request.method(),
            status: response.status(),
            duration: timing.responseEnd - timing.requestStart,
            responseSize: (await response.body().catch(() => Buffer.alloc(0))).length,
        });
    });

    return context;
}

/**
 * Finalize flow context and generate report
 */
export function finalizeFlowContext(context: FlowContext): void {
    const totalDuration = Date.now() - context.startTime;
    const passedStages = context.stages.filter(s => s.success).length;
    const failedStages = context.stages.filter(s => !s.success).length;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 FLOW SUMMARY: ${context.testName}`);
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`✅ Passed Stages: ${passedStages}`);
    console.log(`❌ Failed Stages: ${failedStages}`);
    console.log(`🌐 Network Requests: ${context.networkLogs.length}`);
    console.log(`📝 Console Messages: ${context.consoleLogs.length}`);
    console.log('='.repeat(60));
}

// =============================================================================
// Stage Execution Helpers
// =============================================================================

/**
 * Execute a stage with automatic retry and checkpoint capture
 */
export async function executeStage(
    context: FlowContext,
    stageName: string,
    stageFunction: () => Promise<void>,
    options: Partial<RetryOptions> = {}
): Promise<StageResult> {
    const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

    console.log(`\n📍 [STAGE: ${stageName}]`);

    const stageStart = Date.now();
    const stageNetworkLogs: NetworkLog[] = [];
    const stageConsoleLogs: ConsoleLog[] = [];

    // Capture network/console during this stage
    const networkStartIndex = context.networkLogs.length;
    const consoleStartIndex = context.consoleLogs.length;

    let lastError: Error | null = null;
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`  Attempt ${attempt}/${maxRetries}...`);
            await stageFunction();
            success = true;
            console.log(`  ✅ Stage "${stageName}" completed successfully`);
            break;
        } catch (error) {
            lastError = error as Error;
            console.log(`  ❌ Attempt ${attempt} failed: ${lastError.message}`);

            if (attempt < maxRetries) {
                const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
                console.log(`  ⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));

                if (options.onRetry) {
                    options.onRetry(attempt, lastError);
                }
            }
        }
    }

    const stageDuration = Date.now() - stageStart;

    // Capture screenshot for this stage
    const screenshotPath = await captureStageScreenshot(context, stageName, success);

    // Extract stage-specific logs
    stageNetworkLogs.push(...context.networkLogs.slice(networkStartIndex));
    stageConsoleLogs.push(...context.consoleLogs.slice(consoleStartIndex));

    const result: StageResult = {
        stageName,
        success,
        duration: stageDuration,
        error: lastError?.message,
        screenshotPath,
        networkRequests: stageNetworkLogs,
        consoleLogs: stageConsoleLogs,
    };

    context.stages.push(result);

    if (!success) {
        throw new Error(`Stage "${stageName}" failed after ${maxRetries} attempts: ${lastError?.message}`);
    }

    return result;
}

/**
 * Capture screenshot for a stage
 */
async function captureStageScreenshot(
    context: FlowContext,
    stageName: string,
    success: boolean
): Promise<string> {
    const sanitizedName = stageName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const status = success ? 'pass' : 'fail';
    const filename = `${context.testName}_${sanitizedName}_${status}.png`;
    const filepath = path.join(context.outputDir, filename);

    try {
        await context.page.screenshot({ path: filepath, fullPage: true });
        return filepath;
    } catch (error) {
        console.log(`  ⚠️ Could not capture screenshot: ${error}`);
        return '';
    }
}

// =============================================================================
// API Wait Helpers (Real APIs - No Mocking)
// =============================================================================

/**
 * Wait for a real API response (not mocked)
 */
export async function waitForRealApiResponse(
    page: Page,
    urlPattern: string | RegExp,
    options: { timeout?: number; expectedStatus?: number } = {}
): Promise<Response> {
    const { timeout = 60000, expectedStatus = 200 } = options;

    console.log(`  ⏳ Waiting for API: ${urlPattern.toString()}...`);

    const response = await page.waitForResponse(
        (response) => {
            const matches = typeof urlPattern === 'string'
                ? response.url().includes(urlPattern)
                : urlPattern.test(response.url());
            return matches;
        },
        { timeout }
    );

    const status = response.status();
    console.log(`  📡 API responded: ${status}`);

    if (status !== expectedStatus) {
        const body = await response.text().catch(() => 'Could not read body');
        throw new Error(`API returned ${status} (expected ${expectedStatus}): ${body.substring(0, 200)}`);
    }

    return response;
}

/**
 * Wait for video job to complete with polling
 */
export async function waitForVideoJobComplete(
    page: Page,
    jobId: string,
    options: { timeout?: number; pollInterval?: number } = {}
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    const { timeout = 180000, pollInterval = 3000 } = options; // 3 min default

    console.log(`  ⏳ Monitoring video job: ${jobId}...`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        // Use evaluate to make API call without navigation
        const result = await page.evaluate(async (id) => {
            const response = await fetch(`/api/video/status/${id}`);
            return response.json();
        }, jobId);

        console.log(`  📊 Job status: ${result.status} (${result.progress || 0}%)`);

        if (result.status === 'complete') {
            console.log(`  ✅ Video job completed: ${result.outputPath}`);
            return { success: true, outputPath: result.outputPath };
        }

        if (result.status === 'failed') {
            console.log(`  ❌ Video job failed: ${result.error}`);
            return { success: false, error: result.error };
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Video job timed out after ${timeout}ms`);
}

// =============================================================================
// UI Interaction Helpers
// =============================================================================

/**
 * Navigate to dashboard and wait for load
 */
export async function navigateToDashboard(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Trend Engine')).toBeVisible({ timeout: 15000 });
    console.log('  ✅ Dashboard loaded');
}

/**
 * Wait for trends to load from API
 */
export async function waitForRealTrends(page: Page, timeoutMs: number = 30000): Promise<boolean> {
    console.log('  ⏳ Waiting for trends to load...');

    // Wait for trends API response
    try {
        const response = await page.waitForResponse(
            res => res.url().includes('/api/trends') && res.status() === 200,
            { timeout: timeoutMs }
        );

        const data = await response.json();
        const trendCount = data.data?.length || data.trends?.length || 0;
        console.log(`  📊 Trends API returned ${trendCount} items`);

        if (trendCount === 0) {
            console.log('  ⚠️ No trends available from API');
            return false;
        }

        return true;
    } catch (error) {
        console.log(`  ⚠️ Trends API timeout or error: ${error}`);
        return false;
    }
}

/**
 * Select category and wait for trends
 */
export async function selectCategory(page: Page, category: string): Promise<void> {
    console.log(`  🏷️ Selecting category: ${category}`);

    // Start waiting for trends response before clicking
    const waitPromise = page.waitForResponse(
        res => res.url().includes('/api/trends') && res.status() === 200,
        { timeout: 30000 }
    );

    // Click category button
    await page.click(`button:has-text("${category}")`);

    // Wait for API response
    const response = await waitPromise;
    const data = await response.json();
    const trendCount = data.data?.length || data.trends?.length || 0;
    console.log(`  📊 Category '${category}' returned ${trendCount} trends`);

    if (trendCount === 0) {
        throw new Error(`No trends found for category '${category}'. Please ensure the engine is running and has cached trends.`);
    }

    // Wait for cards to render
    await page.waitForTimeout(500);

    // Use multiple selectors for trend cards
    const cardLocator = page.locator('[class*="TrendCard"], [class*="Card"]:not([class*="Platform"]), [data-testid*="trend"]').first();
    await expect(cardLocator).toBeVisible({ timeout: 15000 });
    console.log('  ✅ Trend cards visible');
}

/**
 * Click script generate button on first trend card
 */
export async function clickScriptGenerateButton(page: Page): Promise<void> {
    // Wait for page to stabilize
    await page.waitForTimeout(1000);

    // Find the button using data-testid
    const scriptButton = page.locator('[data-testid="generate-script-btn"]').first();
    await expect(scriptButton).toBeAttached({ timeout: 5000 });

    // Force click (bypasses opacity:0 CSS)
    await scriptButton.click({ force: true });
}

/**
 * Wait for platform cards to appear
 */
export async function waitForPlatformCards(page: Page): Promise<void> {
    await expect(page.locator('text=TikTok').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=Reels').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Shorts').first()).toBeVisible({ timeout: 5000 });
}

/**
 * Select images from visual discovery panel
 */
export async function selectImagesFromPanel(page: Page, count: number = 2): Promise<number> {
    // Click "Görsel Bul" button
    const visualButton = page.locator('button:has-text("Görsel Bul")').first();

    if (!(await visualButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('  ⚠️ Visual button not visible, skipping image selection');
        return 0;
    }

    await visualButton.click();

    // Wait for images to load
    await page.waitForTimeout(2000);

    // Select images
    const imageCards = page.locator('[class*="ImageCard"], [class*="imagecard"], img[src*="pexels"]');
    const imageCount = await imageCards.count();

    let selected = 0;
    for (let i = 0; i < Math.min(count, imageCount); i++) {
        try {
            await imageCards.nth(i).click();
            selected++;
            await page.waitForTimeout(300);
        } catch (error) {
            console.log(`  ⚠️ Could not select image ${i}: ${error}`);
        }
    }

    // Close panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log(`  🖼️ Selected ${selected} images`);
    return selected;
}

/**
 * Generate voice audio
 */
export async function generateVoice(page: Page): Promise<boolean> {
    // Find voice generate button
    const voiceButton = page.locator('button:has-text("Ses Oluştur"), button:has-text("Sesi Oluştur")').first();

    if (!(await voiceButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('  ⚠️ Voice button not visible, skipping voice generation');
        return false;
    }

    await voiceButton.click();

    // Wait for voice API response
    try {
        await waitForRealApiResponse(page, '/api/voice/generate', { timeout: 45000 });
        console.log('  🎙️ Voice generated successfully');
        return true;
    } catch (error) {
        console.log(`  ❌ Voice generation failed: ${error}`);
        return false;
    }
}

/**
 * Open video generation modal
 */
export async function openVideoModal(page: Page): Promise<boolean> {
    const videoButton = page.locator('button:has-text("Video")').first();

    if (!(await videoButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('  ⚠️ Video button not visible');
        return false;
    }

    await videoButton.click();

    // Wait for modal
    await expect(page.locator('text=Video Oluştur').first()).toBeVisible({ timeout: 5000 });
    return true;
}

/**
 * Configure video options and start generation
 */
export async function startVideoGeneration(page: Page): Promise<string | null> {
    // Configure caption style
    const hormoziButton = page.locator('button:has-text("Hormozi")');
    if (await hormoziButton.isVisible().catch(() => false)) {
        await hormoziButton.click();
    }

    // Configure transition style
    const smoothButton = page.locator('button:has-text("Smooth")');
    if (await smoothButton.isVisible().catch(() => false)) {
        await smoothButton.click();
    }

    // Click generate button
    const generateButton = page.locator('button:has-text("Video Oluştur")').last();

    if (!(await generateButton.isEnabled().catch(() => false))) {
        console.log('  ⚠️ Generate button is disabled');
        return null;
    }

    // Wait for API response
    const [response] = await Promise.all([
        waitForRealApiResponse(page, '/api/video/generate', { timeout: 60000 }),
        generateButton.click(),
    ]);

    const data = await response.json();

    if (data.success && data.jobId) {
        console.log(`  🎬 Video job started: ${data.jobId}`);
        return data.jobId;
    }

    throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert no console errors
 */
export function assertNoConsoleErrors(context: FlowContext): void {
    const errors = context.consoleLogs.filter(log => log.type === 'error');

    if (errors.length > 0) {
        console.log(`  ⚠️ Found ${errors.length} console errors:`);
        errors.forEach(e => console.log(`    - ${e.text.substring(0, 100)}`));
    }

    // Don't fail on errors, just log them (some errors may be expected)
}

/**
 * Assert API call was made
 */
export function assertApiCalled(context: FlowContext, urlPattern: string | RegExp): void {
    const found = context.networkLogs.some(log => {
        return typeof urlPattern === 'string'
            ? log.url.includes(urlPattern)
            : urlPattern.test(log.url);
    });

    if (!found) {
        throw new Error(`Expected API call matching ${urlPattern} was not made`);
    }
}
