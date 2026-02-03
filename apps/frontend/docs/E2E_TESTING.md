# E2E Testing Guide

This document provides comprehensive guidance for writing and running E2E tests using Playwright in the next-node-app-base project.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Best Practices](#best-practices)
- [Debugging](#debugging)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

Our E2E testing suite uses Playwright to test the entire application stack from the user's perspective. We follow these principles:

- **BDD-Driven**: All tests are based on feature files written in Gherkin syntax
- **Page Object Model**: UI interactions are encapsulated in page objects
- **Multi-Browser**: Tests run on Chromium, Firefox, and WebKit
- **Accessibility-First**: Tests verify keyboard navigation and ARIA attributes
- **Responsive Design**: Tests validate mobile and desktop viewports

## Architecture

```
apps/frontend/
├── features/                    # BDD feature files (Gherkin)
│   ├── 01-authentication.feature
│   ├── 02-user-management.feature
│   ├── 03-api-integration.feature
│   └── 04-error-handling.feature
├── e2e/
│   ├── pages/                   # Page Object Model
│   │   ├── auth.page.ts
│   │   └── dashboard.page.ts
│   ├── helpers/                 # Test utilities
│   │   └── test-helpers.ts
│   ├── tests/                   # Test implementations
│   │   ├── auth.spec.ts
│   │   ├── user-management.spec.ts
│   │   ├── api-integration.spec.ts
│   │   └── error-handling.spec.ts
│   ├── global-setup.ts          # Global test setup
│   └── global-teardown.ts       # Global test cleanup
└── playwright.config.ts         # Playwright configuration
```

### Feature Files

BDD scenarios define test coverage:

- **01-authentication.feature**: Sign-in, sign-out, session management, OAuth
- **02-user-management.feature**: Profile, settings, 2FA, account management
- **03-api-integration.feature**: CRUD, search, filter, pagination, real-time updates
- **04-error-handling.feature**: Error boundaries, HTTP errors, network issues, validation

### Page Objects

Page objects encapsulate UI interactions:

```typescript
// Example: AuthPage
export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/signin');
  }

  async signIn(email: string, password: string) {
    await this.page.locator('[data-testid="email-input"]').fill(email);
    await this.page.locator('[data-testid="password-input"]').fill(password);
    await this.page.locator('[data-testid="signin-button"]').click();
  }
}
```

### Test Helpers

Reusable utilities for common tasks:

- **TestData**: Generate test data (users, emails, names)
- **AuthHelpers**: Sign-in via API, clear authentication
- **WaitHelpers**: Wait for API responses, WebSockets, loading states
- **ScreenshotHelpers**: Capture full-page or element screenshots
- **AccessibilityHelpers**: Test keyboard navigation, ARIA roles

## Getting Started

### Prerequisites

- Node.js 25+
- pnpm 8+
- Browser binaries (installed automatically)

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm --filter frontend exec playwright install
```

### Environment Variables

Create a `.env.test` file in the frontend directory:

```env
E2E_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=your-test-secret
DATABASE_URL=your-test-database-url
```

## Writing Tests

### 1. Define BDD Scenarios

Start by writing Gherkin scenarios in a feature file:

```gherkin
Feature: User Authentication

  @e2e @authentication @critical
  Scenario: User signs in with valid credentials
    Given the user is on the sign-in page
    When the user enters valid credentials
    And clicks the sign-in button
    Then the user should be redirected to the dashboard
    And the authentication token should be stored
```

### 2. Create Page Objects

Encapsulate page interactions:

```typescript
export class SignInPage {
  private readonly emailInput = this.page.locator('[data-testid="email-input"]');
  private readonly passwordInput = this.page.locator('[data-testid="password-input"]');
  private readonly signInButton = this.page.locator('[data-testid="signin-button"]');

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/signin');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async getFieldError(field: string) {
    return this.page.locator(`[data-testid="${field}-error"]`).textContent();
  }
}
```

### 3. Implement Tests

Write test implementations using page objects:

```typescript
import { test, expect } from '@playwright/test';
import { SignInPage } from '../pages/signin.page';
import { TestData } from '../helpers/test-helpers';

test.describe('Authentication', () => {
  let signInPage: SignInPage;

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page);
    await signInPage.goto();
  });

  test('Sign in with valid credentials', async ({ page }) => {
    const user = TestData.getValidUser();
    await signInPage.signIn(user.email, user.password);

    // Verify redirect
    await expect(page).toHaveURL('/dashboard');

    // Verify token stored
    const token = await page.evaluate(() => localStorage.getItem('auth-token'));
    expect(token).toBeTruthy();
  });
});
```

### 4. Use Test Helpers

Leverage helpers for common tasks:

```typescript
import { AuthHelpers, WaitHelpers } from '../helpers/test-helpers';

// Sign in via API (faster than UI)
await AuthHelpers.signInViaAPI(page, email, password);

// Wait for API response
await WaitHelpers.waitForAPIResponse(page, '/api/items', 'POST');

// Wait for WebSocket connection
await WaitHelpers.waitForWebSocket(page);

// Test keyboard navigation
await AccessibilityHelpers.testKeyboardNavigation(page, ['Tab', 'Enter']);
```

## Running Tests

### Prerequisites

**Automatic Server Startup (Default)**

Playwright is configured to automatically start both frontend and backend servers before running tests:

- **Backend**: `http://localhost:3001` (started first, health check on `/health`)
- **Frontend**: `http://localhost:3000` (started after backend is ready)

The `webServer` configuration in `playwright.config.ts` handles this automatically. You don't need to start servers manually!

**Manual Server Startup (Alternative)**

If you prefer to run servers manually or are debugging:

```bash
# Terminal 1: Start backend
pnpm dev:backend

# Terminal 2: Start frontend
pnpm dev:frontend

# Terminal 3: Run tests (will reuse existing servers)
pnpm test:e2e
```

The config uses `reuseExistingServer: true` in development, so it won't conflict with manually started servers.

### Local Development

```bash
# Run all tests (servers start automatically)
pnpm --filter frontend test:e2e

# Run in UI mode (interactive)
pnpm --filter frontend test:e2e:ui

# Run in headed mode (see browser)
pnpm --filter frontend test:e2e:headed

# Run in debug mode
pnpm --filter frontend test:e2e:debug

# Run specific test file
pnpm --filter frontend test:e2e auth.spec.ts

# Run tests with specific tag
pnpm --filter frontend test:e2e --grep @critical
```

### Browser-Specific

```bash
# Run on specific browser
pnpm --filter frontend test:e2e --project=chromium
pnpm --filter frontend test:e2e --project=firefox
pnpm --filter frontend test:e2e --project=webkit

# Run on mobile browsers
pnpm --filter frontend test:e2e --project="Mobile Chrome"
pnpm --filter frontend test:e2e --project="Mobile Safari"
```

### Parallel Execution

```bash
# Run with specific number of workers
pnpm --filter frontend test:e2e --workers=4

# Run serially (one test at a time)
pnpm --filter frontend test:e2e --workers=1
```

### Reports

```bash
# Show HTML report
pnpm --filter frontend test:e2e:report

# Generate JSON report
pnpm --filter frontend test:e2e --reporter=json

# Generate JUnit report (for CI)
pnpm --filter frontend test:e2e --reporter=junit
```

## Best Practices

### 1. Use Data Test IDs

Always use `data-testid` attributes for stable selectors:

```html
<!-- Good -->
<button data-testid="signin-button">Sign In</button>

<!-- Avoid -->
<button class="btn-primary">Sign In</button>
```

### 2. Wait for Network

Wait for API responses instead of arbitrary timeouts:

```typescript
// Good
const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items', 'POST');
await page.click('[data-testid="save-button"]');
await responsePromise;

// Avoid
await page.click('[data-testid="save-button"]');
await page.waitForTimeout(2000);
```

### 3. Use Page Objects

Encapsulate UI interactions in page objects:

```typescript
// Good
await signInPage.signIn(email, password);

// Avoid
await page.fill('[data-testid="email"]', email);
await page.fill('[data-testid="password"]', password);
await page.click('[data-testid="signin"]');
```

### 4. Test User Flows

Test complete user journeys, not individual components:

```typescript
// Good - End-to-end flow
test('User can create and edit item', async ({ page }) => {
  await signIn();
  await createItem('New Item');
  await editItem('Updated Item');
  await verifyItem('Updated Item');
});

// Avoid - Isolated component test
test('Button is clickable', async ({ page }) => {
  await page.click('button');
});
```

### 5. Clean Up Test Data

Use hooks to clean up after tests:

```typescript
test.afterEach(async ({ page }) => {
  // Delete test data
  await page.request.delete('/api/test-data');

  // Clear auth
  await AuthHelpers.clearAuth(page);
});
```

### 6. Handle Flakiness

Make tests deterministic:

```typescript
// Wait for specific conditions
await expect(page.locator('[data-testid="item-list"]')).toBeVisible();

// Use retry-friendly assertions
await expect(async () => {
  const count = await page.locator('[data-testid="item"]').count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 5000 });
```

## Debugging

### 1. UI Mode

Run tests in interactive UI mode:

```bash
pnpm --filter frontend test:e2e:ui
```

Features:

- Watch mode with hot reload
- Time travel debugging
- Network inspector
- Trace viewer

### 2. Debug Mode

Run tests with debugger:

```bash
pnpm --filter frontend test:e2e:debug
```

Or add `await page.pause()` in your test:

```typescript
test('Debug test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Debugger will open here
  await page.click('button');
});
```

### 3. Trace Viewer

View traces of failed tests:

```bash
pnpm exec playwright show-trace test-results/path/to/trace.zip
```

### 4. Screenshots and Videos

Playwright automatically captures:

- Screenshots on failure
- Videos on failure (retention mode)
- Traces on first retry

Files are saved to `test-results/` directory.

### 5. Verbose Logging

Enable debug logs:

```bash
DEBUG=pw:api pnpm --filter frontend test:e2e
```

## CI/CD Integration

### GitHub Actions

The `.github/workflows/e2e-tests.yml` workflow runs E2E tests on:

- Pull requests to `master`
- Manual dispatch

**Browser Matrix**:

- Ubuntu: Chromium, Firefox, WebKit
- Windows: Chromium
- macOS: WebKit

**Artifacts**:

- HTML reports (30 days)
- Videos on failure (7 days)
- Traces on failure (7 days)

### Environment Variables

Configured in GitHub Actions (env/secrets as appropriate):

- `TEST_DATABASE_URL`: Test database connection
- `NEXTAUTH_SECRET`: NextAuth secret for tests
- `E2E_BASE_URL`: Frontend URL (default: `http://localhost:3000`)
- `E2E_BACKEND_URL`: Backend base URL used by E2E global setup/seeding (default: `http://localhost:3001`)
- `NEXT_PUBLIC_API_URL`: Backend URL (default: `http://localhost:3001`)
- `E2E_SEED_TOKEN`: Token required by the backend E2E seed endpoint; set uniquely per CI run to make seeding deterministic

### Test Sharding

For faster CI runs, shard tests across multiple jobs:

```yaml
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]

steps:
  - run: pnpm test:e2e --shard=${{ matrix.shard }}
```

## Troubleshooting

### Tests Timing Out

**Cause**: Services not ready, slow API calls
**Solution**:

- Increase timeout: `test.setTimeout(60000)`
- Wait for services in `global-setup.ts`
- Use `waitForAPIResponse` instead of `waitForTimeout`

### Flaky Tests

**Cause**: Race conditions, network issues
**Solution**:

- Use explicit waits: `await expect(locator).toBeVisible()`
- Retry assertions: `toPass({ timeout: 5000 })`
- Disable animations: `page.emulateMedia({ reducedMotion: 'reduce' })`

### Browser Not Installed

**Cause**: Playwright browsers missing
**Solution**:

```bash
pnpm exec playwright install
```

### Port Already in Use

**Cause**: Services running from previous test run
**Solution**:

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
E2E_BASE_URL=http://localhost:3001 pnpm test:e2e
```

### Authentication Failures

**Cause**: Expired tokens, invalid credentials
**Solution**:

- Check `.env.test` configuration
- Verify `NEXTAUTH_SECRET` matches backend
- Use `AuthHelpers.clearAuth()` in `beforeEach`

### Database Conflicts

**Cause**: Test data persisting between runs
**Solution**:

- Use isolated test database
- Implement `global-teardown.ts` to clean up
- Use transactions that rollback after each test

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

## Contributing

When adding new E2E tests:

1. Write BDD scenario in appropriate feature file
2. Create/update page objects as needed
3. Implement test using page objects and helpers
4. Run tests locally across all browsers
5. Verify tests pass in CI
6. Update this documentation if adding new patterns

---

**Last Updated**: December 2025
**Maintainer**: Development Team
