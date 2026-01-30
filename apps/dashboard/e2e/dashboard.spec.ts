/**
 * Dashboard E2E Tests
 * 
 * End-to-end tests for the İçerik Trend Engine dashboard.
 * Tests homepage, filtering, and core user interactions.
 */

import { test, expect } from '@playwright/test';
import { mockTrendsApi } from './helpers/test-helpers';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Set up API mocking BEFORE navigation to ensure mock data is available
        await mockTrendsApi(page);
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
    test.beforeEach(async ({ page }) => {
        await mockTrendsApi(page);
    });

    test('should display trend cards with NES scores', async ({ page }) => {
        await page.goto('/?category=technology');
        await page.waitForLoadState('networkidle');

        // Trend cards should have NES badge
        const nesBadge = page.locator('text=/NES: \\d+/').first();
        await expect(nesBadge).toBeVisible({ timeout: 15000 });
    });

    // TODO: This test is flaky due to CSS hover transitions
    // The button has sm:opacity-0 sm:group-hover:opacity-100 which doesn't reliably trigger in Playwright
    // Skipping until we add data-testid selectors or force visibility
    test.skip('should show script generate button on hover', async ({ page }) => {
        await page.goto('/?category=technology');
        await page.waitForLoadState('networkidle');

        // Wait for trend cards to appear
        await page.waitForSelector('[class*="Card"]', { timeout: 10000 });

        // Find first trend card and hover
        const trendCard = page.locator('[class*="Card"]').first();
        await trendCard.hover();

        // Wait a bit for hover CSS transition
        await page.waitForTimeout(500);

        // Script button should exist in DOM (has visibility controlled by CSS hover)
        // Check button is clickable (visibility may vary by viewport)
        const scriptButton = page.locator('button[title="AI ile script oluştur"]').first();
        await expect(scriptButton).toBeAttached({ timeout: 5000 });
    });
});

test.describe('URL State Sync', () => {
    test.beforeEach(async ({ page }) => {
        await mockTrendsApi(page);
    });

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

    // TODO: Browser back/forward navigation is flaky due to mock API not persisting across navigation
    // The page shows blank after goBack() because route mocks don't survive navigation
    // Skipping until we implement persistent mocking or separate integration test
    test.skip('should support browser back/forward navigation', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Navigate through categories with explicit waits
        await page.click('button:has-text("Teknoloji")');
        await page.waitForURL(/category=technology/, { timeout: 5000 });

        await page.click('button:has-text("Oyun")');
        await page.waitForURL(/category=gaming/, { timeout: 5000 });

        // Go back - should return to technology
        await page.goBack();
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL(/category=technology/, { timeout: 5000 });

        // Go forward - should return to gaming  
        await page.goForward();
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL(/category=gaming/, { timeout: 5000 });
    });
});
