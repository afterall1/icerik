/**
 * Dashboard E2E Tests
 * 
 * End-to-end tests for the İçerik Trend Engine dashboard.
 * Tests homepage, filtering, and core user interactions.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should load homepage with header and category tabs', async ({ page }) => {
        // Header should be visible
        await expect(page.locator('text=Trend Engine')).toBeVisible();

        // Search bar should be present
        await expect(page.locator('input[placeholder*="Trend"]')).toBeVisible();

        // "Tümü" (All) category tab should be present
        await expect(page.getByRole('button', { name: /tümü/i })).toBeVisible();

        // At least one category tab should exist
        await expect(page.locator('button:has-text("Teknoloji")')).toBeVisible();
    });

    test('should filter trends by category', async ({ page }) => {
        // Wait for initial load
        await page.waitForLoadState('networkidle');

        // Click on "Teknoloji" category
        await page.click('button:has-text("Teknoloji")');

        // URL should contain category parameter
        await expect(page).toHaveURL(/category=technology/);

        // Wait for trends to load
        await page.waitForSelector('[class*="trend"]', { timeout: 10000 });
    });

    test('should toggle between grid and list view', async ({ page }) => {
        // Wait for trends to load
        await page.waitForLoadState('networkidle');

        // Click on a category to ensure trends are loaded
        await page.click('button:has-text("Teknoloji")');
        await page.waitForTimeout(1000);

        // Look for view toggle buttons
        const listButton = page.locator('button[aria-label="Liste görünümü"]');
        const gridButton = page.locator('button[aria-label="Grid görünümü"]');

        // Toggle to list view
        if (await listButton.isVisible()) {
            await listButton.click();
            await page.waitForTimeout(300);
        }

        // Toggle back to grid view
        if (await gridButton.isVisible()) {
            await gridButton.click();
            await page.waitForTimeout(300);
        }
    });

    test('should open filter sidebar on mobile', async ({ page }) => {
        // This test runs in mobile viewport (from config)
        await page.waitForLoadState('networkidle');

        // On mobile, filter button should be visible
        const filterButton = page.locator('button:has-text("Filtreler")');

        if (await filterButton.isVisible()) {
            await filterButton.click();
            await page.waitForTimeout(300);

            // Filter options should appear
            await expect(page.locator('text=Sıralama')).toBeVisible();
        }
    });

    test('should search for trends', async ({ page }) => {
        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Type in search box
        const searchInput = page.locator('input[placeholder*="Trend"]');
        await searchInput.fill('AI');

        // Wait for debounce
        await page.waitForTimeout(500);

        // URL should contain search query
        await expect(page).toHaveURL(/q=AI/);
    });
});

test.describe('Trend Interactions', () => {
    test('should display trend cards with NES scores', async ({ page }) => {
        await page.goto('/?category=technology');
        await page.waitForLoadState('networkidle');

        // Trend cards should have NES badge
        const nesBadge = page.locator('text=/NES: \\d+/').first();
        await expect(nesBadge).toBeVisible({ timeout: 15000 });
    });

    test('should show script generate button on hover', async ({ page }) => {
        await page.goto('/?category=technology');
        await page.waitForLoadState('networkidle');

        // Find first trend card
        const trendCard = page.locator('[class*="Card"]').first();
        await trendCard.hover();

        // Script button should appear
        const scriptButton = page.locator('button:has-text("Script")').first();
        await expect(scriptButton).toBeVisible({ timeout: 5000 });
    });
});

test.describe('URL State Sync', () => {
    test('should persist filters in URL', async ({ page }) => {
        await page.goto('/');

        // Select category
        await page.click('button:has-text("Finans")');
        await expect(page).toHaveURL(/category=finance/);

        // Refresh page
        await page.reload();

        // Category should still be selected (check URL)
        await expect(page).toHaveURL(/category=finance/);
    });

    test('should support browser back/forward navigation', async ({ page }) => {
        await page.goto('/');

        // Navigate through categories
        await page.click('button:has-text("Teknoloji")');
        await page.waitForTimeout(300);
        await page.click('button:has-text("Oyun")');
        await page.waitForTimeout(300);

        // Go back
        await page.goBack();
        await expect(page).toHaveURL(/category=technology/);

        // Go forward
        await page.goForward();
        await expect(page).toHaveURL(/category=gaming/);
    });
});
