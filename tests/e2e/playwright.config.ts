// playwright.config.ts — LCP #712 Browser Standard Test Suite
// See docs/standartTest/README.md for usage instructions

import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://laudiumpost.co.za';
// LCP #712: Steven verified correct API base for Laudium Post admin auth is https://laudiumpost.co.za/laudium/api/v1/
const TEST_API_BASE_URL = process.env.TEST_API_BASE_URL || 'https://laudiumpost.co.za/laudium/api/v1/';

export default defineConfig({
  // testDir resolved relative to this config file's directory
  testDir: '.',
  testMatch: '**/*.spec.ts',

  // Run all tests in parallel for speed (use --workers=1 for debugging)
  workers: 1, // Reduced to 1 for stability with UI interactions
  fullyParallel: false,

  // Retry failed tests (useful for flaky AI-dependent tests)
  retries: 1,

  // Reporter: list + JSON for CI, HTML for local debugging
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/e2e/playwright-results.json' }],
  ],

  // Global timeout
  timeout: 60_000, // 60 seconds per test
  expect: {
    timeout: 10_000, // 10 seconds for expect assertions
  },

  use: {
    // Base URLs
    baseURL: TEST_BASE_URL,

    // Trace files for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    // Video recording on failure
    video: 'on-first-retry',

    // Action timeout
    actionTimeout: 15_000,

    // Ignore HTTPS errors (useful for local dev with self-signed certs)
    ignoreHTTPSErrors: true,

    // Locale
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',

    // Custom headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-ZA,en;q=0.9',
    },
  },

  projects: [
    // Chromium (primary browser for all tests)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Viewport
        viewport: { width: 1280, height: 720 },
        // Launch options
        launchOptions: {
          args: [
            '--disable-web-security', // Allow CORS for API testing
            '--disable-features=IsolateOrigins,site-per-process',
          ],
        },
        // Context options
        contextOptions: {
          ignoreHTTPSErrors: true,
          recordVideo: undefined, // Don't record video by default
        },
      },
    },

    // Firefox (optional secondary browser)
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile Safari (optional)
    {
      name: 'mobile-chrome',
      use: devices['Pixel 5'],
    },
  ],

  // Output directories
  outputDir: 'tests/e2e/playwright-results/',

  // Web server configuration (optional - for local dev)
  // Uncomment if running frontend with npm run dev
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: true,
  //   timeout: 120_000,
  // },


});
