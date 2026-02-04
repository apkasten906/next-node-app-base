import { defineConfig, devices } from '@playwright/test';

// Keep config synchronous so VS Code Test Explorer can import it.
// To make Playwright reuse an already-running local server (e.g. Docker),
// set `REUSE_EXISTING_SERVER=true` in the environment that launches the tests.
// By default we reuse the server locally (non-CI).

const backendUrl = 'http://localhost:3001/health';
const frontendUrl = 'http://localhost:3000';

const reuseExisting = process.env['REUSE_EXISTING_SERVER'] === 'true' || !process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/tests/**'],

  globalSetup: './e2e/global-setup.ts',

  timeout: 60 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env['CI'] ? ['github'] : ['list'],
  ],

  use: {
    baseURL: process.env['E2E_BASE_URL'] || frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
    navigationTimeout: 45 * 1000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: [
    {
      command: 'pnpm --filter=backend dev',
      url: backendUrl,
      reuseExistingServer: reuseExisting,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DISABLE_QUEUES: 'true',
        DISABLE_WEBSOCKETS: 'true',
        REDIS_MOCK: 'true',
        TEST_EXTERNAL_SERVICES: 'false',
        E2E_SEED_TOKEN: process.env['E2E_SEED_TOKEN'] || 'local-e2e-seed-token',
        AUTH_ENABLE_DEV_FALLBACK: 'true',
        NODE_ENV: process.env['NODE_ENV'] || 'development',
      },
    },
    {
      command: 'pnpm --filter=frontend dev',
      url: frontendUrl,
      reuseExistingServer: reuseExisting,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NEXTAUTH_URL: frontendUrl,
        NEXTAUTH_SECRET: '6a3f5d8e9c2b1a7f4e8d6c5b3a2f1e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f',
        DATABASE_URL:
          process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/nextnode',
        NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001',
      },
    },
  ],
});
