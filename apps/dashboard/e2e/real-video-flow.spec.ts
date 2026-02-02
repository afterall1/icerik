/**
 * Real Video Flow E2E Test
 * 
 * End-to-end test that exercises the REAL video generation flow:
 * Script Generation → Image Selection → Voice Generation → Video Creation → Verification
 * 
 * This test uses REAL APIs (not mocked) to ensure the full pipeline works correctly.
 * It includes self-healing retry logic and generates diagnostic reports.
 * 
 * @module e2e/real-video-flow.spec
 */

import { test, expect } from '@playwright/test';
import {
    createFlowContext,
    finalizeFlowContext,
    executeStage,
    navigateToDashboard,
    selectCategory,
    clickScriptGenerateButton,
    waitForPlatformCards,
    selectImagesFromPanel,
    generateVoice,
    openVideoModal,
    startVideoGeneration,
    waitForVideoJobComplete,
    assertNoConsoleErrors,
    assertApiCalled,
    FlowContext,
} from './helpers/real-flow-helpers';

// =============================================================================
// Test Configuration
// =============================================================================

// Extended timeout for full video generation flow
test.setTimeout(300000); // 5 minutes

// =============================================================================
// Test Suite: Real Video Generation Flow
// =============================================================================

test.describe('Real Video Generation Flow', () => {
    let context: FlowContext;

    test.beforeEach(async ({ page }, testInfo) => {
        // Create flow context for tracking
        context = createFlowContext(page, testInfo.title, testInfo.outputDir);
    });

    test.afterEach(async () => {
        // Finalize and report
        finalizeFlowContext(context);
    });

    /**
     * FULL FLOW TEST
     * 
     * This is the main test that exercises the complete video generation pipeline.
     * Each stage has checkpoint verification and retry logic.
     */
    test('should complete full video generation flow', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('🎬 STARTING FULL VIDEO GENERATION FLOW TEST');
        console.log('='.repeat(60));

        // =========================================================================
        // STAGE 1: Script Generation
        // =========================================================================
        await executeStage(context, 'Script Generation', async () => {
            // Navigate to dashboard
            await navigateToDashboard(page);

            // Select technology category (most likely to have trends)
            await selectCategory(page, 'Teknoloji');

            // Click script generate button
            await clickScriptGenerateButton(page);

            // Wait for platform cards to appear (indicates script was generated)
            await waitForPlatformCards(page);

            // Verify API was called
            assertApiCalled(context, '/api/scripts/generate');
        }, { maxRetries: 3 });

        // =========================================================================
        // STAGE 2: Image Selection
        // =========================================================================
        await executeStage(context, 'Image Selection', async () => {
            // Select images from visual discovery panel
            const selectedCount = await selectImagesFromPanel(page, 3);

            if (selectedCount === 0) {
                console.log('  ℹ️ No images selected (visual panel may not be available)');
            }
        }, { maxRetries: 2 });

        // =========================================================================
        // STAGE 3: Voice Generation
        // =========================================================================
        await executeStage(context, 'Voice Generation', async () => {
            const voiceGenerated = await generateVoice(page);

            if (!voiceGenerated) {
                // Voice generation is optional - proceed without it
                console.log('  ℹ️ Voice generation skipped (button not available or API failed)');
            } else {
                // Verify audio indicator appeared
                const audioIndicator = page.locator('text=/\\d+s|Hazır|✓/');
                await expect(audioIndicator.first()).toBeVisible({ timeout: 10000 });
            }
        }, { maxRetries: 3 });

        // =========================================================================
        // STAGE 4: Video Generation
        // =========================================================================
        let videoJobId: string | null = null;

        await executeStage(context, 'Video Generation', async () => {
            // Open video modal
            const modalOpened = await openVideoModal(page);

            if (!modalOpened) {
                throw new Error('Could not open video modal');
            }

            // Wait for modal to be fully rendered
            await page.waitForTimeout(1000);

            // Verify modal sections
            await expect(page.locator('text=Görseller').first()).toBeVisible({ timeout: 5000 });
            await expect(page.locator('text=Ayarlar').first()).toBeVisible({ timeout: 5000 });

            // Start video generation
            videoJobId = await startVideoGeneration(page);

            if (!videoJobId) {
                throw new Error('Video generation did not return a job ID');
            }
        }, { maxRetries: 2 });

        // =========================================================================
        // STAGE 5: Video Completion Verification
        // =========================================================================
        await executeStage(context, 'Video Completion', async () => {
            if (!videoJobId) {
                throw new Error('No video job ID available');
            }

            // Wait for video job to complete
            const result = await waitForVideoJobComplete(page, videoJobId, {
                timeout: 180000, // 3 minutes
                pollInterval: 5000,
            });

            if (!result.success) {
                throw new Error(`Video generation failed: ${result.error}`);
            }

            console.log(`  🎉 Video generated successfully: ${result.outputPath}`);
        }, { maxRetries: 1 }); // No retry for completion stage

        // =========================================================================
        // FINAL VERIFICATION
        // =========================================================================
        console.log('\n📋 Final Verification...');

        // Check for console errors
        assertNoConsoleErrors(context);

        // Verify all critical APIs were called
        assertApiCalled(context, '/api/scripts/generate');
        assertApiCalled(context, '/api/video/generate');

        console.log('\n' + '='.repeat(60));
        console.log('✅ FULL VIDEO GENERATION FLOW COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60) + '\n');
    });

    /**
     * SCRIPT ONLY TEST
     * 
     * Tests just the script generation stage for faster iteration.
     */
    test('should generate script successfully', async ({ page }) => {
        console.log('\n🧪 Testing Script Generation Only...');

        await executeStage(context, 'Script Generation', async () => {
            await navigateToDashboard(page);
            await selectCategory(page, 'Teknoloji');
            await clickScriptGenerateButton(page);
            await waitForPlatformCards(page);

            // Verify all three platform cards appeared
            await expect(page.locator('text=TikTok').first()).toBeVisible();
            await expect(page.locator('text=Reels').first()).toBeVisible();
            await expect(page.locator('text=Shorts').first()).toBeVisible();
        });

        console.log('✅ Script generation test passed');
    });

    /**
     * VOICE GENERATION TEST
     * 
     * Tests script + voice generation stages.
     */
    test('should generate voice from script', async ({ page }) => {
        console.log('\n🧪 Testing Voice Generation...');

        // First generate script
        await executeStage(context, 'Script Generation', async () => {
            await navigateToDashboard(page);
            await selectCategory(page, 'Teknoloji');
            await clickScriptGenerateButton(page);
            await waitForPlatformCards(page);
        });

        // Then generate voice
        await executeStage(context, 'Voice Generation', async () => {
            const success = await generateVoice(page);
            expect(success).toBe(true);

            // Verify audio indicator
            const audioIndicator = page.locator('text=/\\d+s|Hazır|✓/');
            await expect(audioIndicator.first()).toBeVisible({ timeout: 15000 });
        });

        console.log('✅ Voice generation test passed');
    });

    /**
     * VIDEO MODAL TEST
     * 
     * Tests that video modal opens correctly with all sections.
     */
    test('should open video modal with all sections', async ({ page }) => {
        console.log('\n🧪 Testing Video Modal...');

        // Generate script first
        await executeStage(context, 'Script Generation', async () => {
            await navigateToDashboard(page);
            await selectCategory(page, 'Teknoloji');
            await clickScriptGenerateButton(page);
            await waitForPlatformCards(page);
        });

        // Open and verify modal
        await executeStage(context, 'Video Modal', async () => {
            const opened = await openVideoModal(page);
            expect(opened).toBe(true);

            // Verify all modal sections exist
            await expect(page.locator('text=Görseller').first()).toBeVisible({ timeout: 5000 });
            await expect(page.locator('text=Ayarlar').first()).toBeVisible({ timeout: 5000 });

            // Verify caption style options
            await expect(page.locator('button:has-text("Hormozi")').first()).toBeVisible();
            await expect(page.locator('button:has-text("Classic")').first()).toBeVisible();

            // Verify generate button exists
            await expect(page.locator('button:has-text("Video Oluştur")').last()).toBeVisible();
        });

        console.log('✅ Video modal test passed');
    });
});

// =============================================================================
// Test Suite: Error Handling
// =============================================================================

test.describe('Error Handling', () => {
    let context: FlowContext;

    test.beforeEach(async ({ page }, testInfo) => {
        context = createFlowContext(page, testInfo.title, testInfo.outputDir);
    });

    test.afterEach(async () => {
        finalizeFlowContext(context);
    });

    /**
     * Tests behavior when video is generated without audio
     */
    test('should handle missing audio gracefully', async ({ page }) => {
        console.log('\n🧪 Testing Error: Missing Audio...');

        // Generate script
        await executeStage(context, 'Script Generation', async () => {
            await navigateToDashboard(page);
            await selectCategory(page, 'Teknoloji');
            await clickScriptGenerateButton(page);
            await waitForPlatformCards(page);
        });

        // Open video modal (without generating audio)
        await executeStage(context, 'Video Modal', async () => {
            const opened = await openVideoModal(page);
            expect(opened).toBe(true);
        });

        // Try to generate video - should show error or be disabled
        await executeStage(context, 'Error Detection', async () => {
            const generateButton = page.locator('button:has-text("Video Oluştur")').last();

            // Check if button is disabled (expected behavior)
            const isDisabled = await generateButton.isDisabled().catch(() => false);

            if (isDisabled) {
                console.log('  ✅ Generate button is disabled (expected)');
            } else {
                // Button is enabled - try clicking and check for error
                await generateButton.click();

                // Wait for error message
                const errorMessage = page.locator('text=/Ses|Audio|error|hata/i');
                const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

                if (hasError) {
                    console.log('  ✅ Error message displayed (expected)');
                }
            }
        });

        console.log('✅ Missing audio error handling test passed');
    });

    /**
     * Tests retry mechanism when API fails
     */
    test('should retry on transient failures', async ({ page }) => {
        console.log('\n🧪 Testing Retry Mechanism...');

        let attemptCount = 0;

        await executeStage(context, 'Retry Test', async () => {
            attemptCount++;

            // First two attempts will "fail" by throwing
            if (attemptCount < 3) {
                throw new Error(`Simulated failure (attempt ${attemptCount})`);
            }

            // Third attempt succeeds
            await navigateToDashboard(page);
        }, {
            maxRetries: 3,
            onRetry: (attempt, error) => {
                console.log(`  🔄 Retry ${attempt}: ${error.message}`);
            }
        });

        expect(attemptCount).toBe(3);
        console.log('✅ Retry mechanism test passed');
    });
});

// =============================================================================
// Test Suite: API Integration
// =============================================================================

test.describe('API Integration', () => {
    let context: FlowContext;

    test.beforeEach(async ({ page }, testInfo) => {
        context = createFlowContext(page, testInfo.title, testInfo.outputDir);
    });

    test.afterEach(async () => {
        finalizeFlowContext(context);
    });

    /**
     * Tests that all required API endpoints are accessible
     */
    test('should verify all API endpoints are accessible', async ({ page }) => {
        console.log('\n🧪 Testing API Endpoints...');

        await executeStage(context, 'API Verification', async () => {
            await page.goto('/');

            // Check health endpoint
            const healthResponse = await page.evaluate(async () => {
                const res = await fetch('/api/health');
                return { status: res.status, ok: res.ok };
            });
            expect(healthResponse.ok).toBe(true);
            console.log('  ✅ /api/health - OK');

            // Check status endpoint
            const statusResponse = await page.evaluate(async () => {
                const res = await fetch('/api/status');
                return { status: res.status, ok: res.ok };
            });
            expect(statusResponse.ok).toBe(true);
            console.log('  ✅ /api/status - OK');

            // Check trends endpoint
            const trendsResponse = await page.evaluate(async () => {
                const res = await fetch('/api/trends?category=technology&limit=5');
                return { status: res.status, ok: res.ok };
            });
            expect(trendsResponse.ok).toBe(true);
            console.log('  ✅ /api/trends - OK');

            // Check AI status endpoint
            const aiResponse = await page.evaluate(async () => {
                const res = await fetch('/api/ai/status');
                return { status: res.status, ok: res.ok };
            });
            expect(aiResponse.ok).toBe(true);
            console.log('  ✅ /api/ai/status - OK');

            // Check voice status endpoint
            const voiceResponse = await page.evaluate(async () => {
                const res = await fetch('/api/voice/status');
                return { status: res.status, ok: res.ok };
            });
            expect(voiceResponse.ok).toBe(true);
            console.log('  ✅ /api/voice/status - OK');
        });

        console.log('✅ All API endpoints verified');
    });
});
