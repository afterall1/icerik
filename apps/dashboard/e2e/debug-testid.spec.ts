/**
 * Simple test - just verify data-testid is present
 */
import { test, expect } from '@playwright/test';
import { mockTrendsApi } from './helpers/test-helpers';

test.setTimeout(20000);

test('data-testid is present', async ({ page }) => {
    await mockTrendsApi(page);
    await page.goto('/?category=technology');
    await page.waitForTimeout(3000);

    // Count buttons with data-testid="generate-script-btn"
    const testIdButtons = await page.locator('[data-testid="generate-script-btn"]').count();
    console.log('Buttons with testid:', testIdButtons);

    // Assert
    expect(testIdButtons).toBe(4);
});
