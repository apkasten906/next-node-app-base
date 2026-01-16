import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/tests/**'],

  globalSetup: './e2e/global-setup.ts',

  /* Maximum time one test can run */
  timeout: 60 * 1000,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env['CI'],

  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env['CI'] ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env['CI'] ? ['github'] : ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env['E2E_BASE_URL'] || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Maximum time for each action */
    actionTimeout: 10 * 1000,

    /* Maximum time for navigation */
    navigationTimeout: 45 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'pnpm --filter=backend dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        // Make E2E deterministic and avoid Redis/DI noise
        DISABLE_QUEUES: 'true',
        DISABLE_WEBSOCKETS: 'true',
        // Token required for /api/e2e/seed
        E2E_SEED_TOKEN: process.env['E2E_SEED_TOKEN'] || 'local-e2e-seed-token',
        // Use backend-only auth without DB dependency for E2E
        AUTH_ENABLE_DEV_FALLBACK: 'true',
        NODE_ENV: process.env['NODE_ENV'] || 'development',
      },
    },
    {
      command: 'pnpm --filter=frontend dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: '6a3f5d8e9c2b1a7f4e8d6c5b3a2f1e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f',
        DATABASE_URL:
          process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/nextnode',
        NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001',
      },
    },
  ],
});
