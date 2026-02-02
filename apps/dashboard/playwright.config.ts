import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Optimized for real video generation flow testing with:
 * - Dev server (5173) for real-time testing
 * - Extended timeouts for video generation
 * - Always capture screenshots and video
 * - Custom diagnostic reporter
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false, // Video tests should run sequentially
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1, // Always retry once locally
    workers: 1, // Single worker for video tests
    reporter: [
        ['html'],
        ['list'],
        ['./e2e/reporters/diagnostic-reporter.ts']
    ],

    // Global timeout for video generation tests
    timeout: 300000, // 5 minutes

    // Expect timeout for assertions
    expect: {
        timeout: 30000, // 30 seconds for element assertions
    },

    use: {
        // Use dev server for real-time testing
        baseURL: 'http://localhost:5173',

        // Always capture trace for debugging
        trace: 'on',

        // Always capture screenshots
        screenshot: 'on',

        // Always record video
        video: 'on',

        // Extended action timeout
        actionTimeout: 30000,

        // Extended navigation timeout
        navigationTimeout: 60000,
    },

    // Output directories
    outputDir: './test-results',

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
            },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        // Mobile viewports
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],

    // Dev server configuration
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120 * 1000,
    },
});
