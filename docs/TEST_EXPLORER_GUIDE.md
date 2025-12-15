# VSCode Test Explorer Configuration

## Overview

VSCode Test Explorer shows two separate test runners:

1. **Jest Tests** (Backend) - ~214 tests
2. **Playwright Tests** (E2E) - 435 tests (87 tests × 5 browser projects)

## Required Extensions

To see all tests in VSCode Test Explorer, install the **Playwright Test** extension:

1. Open Extensions (Ctrl+Shift+X)
2. Search for "Playwright Test"
3. Install `ms-playwright.playwright`

Alternatively, VSCode will prompt you to install recommended extensions when you open the workspace.

## Setup Requirements

### 1. Install Playwright Browsers

Before running Playwright tests, install the required browsers:

```bash
# From workspace root
pnpm playwright install

# Or from frontend directory
cd apps/frontend
pnpm exec playwright install
```

This installs Chromium, Firefox, and WebKit browsers needed for testing.

### 2. Reload VSCode Window

After installing the Playwright extension and browsers:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Reload Window"
3. Select "Developer: Reload Window"

This ensures VSCode discovers the Playwright tests.

## Viewing Tests

### Backend Tests (Jest)

- Location: `apps/backend/src/tests/**/*.test.ts`
- Runner: Jest (via `orta.vscode-jest` extension)
- Count: ~214 tests
- View: Automatically discovered in Test Explorer sidebar

### E2E Tests (Playwright)

- Location: `apps/frontend/e2e/tests/**/*.spec.ts`
- Runner: Playwright Test
- Count: 435 tests (87 unique tests across 5 browser projects)
- Projects:
  - chromium (Desktop Chrome)
  - firefox (Desktop Firefox)
  - webkit (Desktop Safari)
  - Mobile Chrome
  - Mobile Safari

**After installing Playwright extension:**

1. Test Explorer will show a "Playwright Tests" section
2. Expand to see all 5 browser projects
3. Each project shows 87 tests (auth, user-management, api-integration, error-handling)

## Running Tests from VSCode

### Backend Tests

```bash
# Run all backend tests
pnpm --filter backend test

# Run specific test file
pnpm --filter backend test queue.service.test.ts

# Run with coverage
pnpm --filter backend test:coverage
```

### E2E Tests (Playwright)

**From workspace root:**

```bash
# Run all E2E tests across all browsers
pnpm test:e2e

# Run with interactive UI
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report

# Run Playwright commands directly
pnpm playwright test --project=chromium
pnpm playwright test auth.spec.ts --headed
```

**From apps/frontend directory:**

```bash
cd apps/frontend

# Run all E2E tests
pnpm test:e2e

# Run in UI mode (interactive)
pnpm test:e2e:ui

# Run specific browser
pnpm exec playwright test --project=chromium

# Run specific test file
pnpm exec playwright test e2e/tests/auth.spec.ts
pnpm --filter frontend test:e2e auth.spec.ts
```

## Test Explorer Features

### With Playwright Extension Installed

**Test Discovery:**

- Automatic discovery of all Playwright tests
- Group by browser project
- Filter by test file, describe block, or test name

**Running Tests:**

- Click play button next to any test/suite/project
- Right-click for options (Run, Debug, Show in Test Explorer)
- Debug with breakpoints in VSCode

**Test Results:**

- ✅ Green checkmark for passing tests
- ❌ Red X for failing tests
- ⏸️ Skipped tests indicator
- View test output inline

**Debugging:**

- Set breakpoints in test files
- Click debug icon in Test Explorer
- Step through test execution
- Inspect variables and page state

## VSCode Settings

Current settings in `.vscode/settings.json`:

```json
{
  "playwright.reuseBrowser": true,
  "playwright.showTrace": false,
  "playwright.env": {
    "CI": "false"
  },
  "playwright.searchForWorkspaceFiles": true,
  "testing.automaticallyOpenPeekView": "never"
}
```

**Configuration options:**

- `playwright.reuseBrowser`: Reuse browser between test runs for speed
- `playwright.showTrace`: Auto-open trace viewer on failure
- `playwright.env`: Environment variables for test runs
- `playwright.searchForWorkspaceFiles`: Search all workspace folders for Playwright configs
- `testing.automaticallyOpenPeekView`: Control when peek view opens

## Test Count Breakdown

### Total: 435 Playwright Tests

**By Browser Project:**

- chromium: 87 tests
- firefox: 87 tests
- webkit: 87 tests
- Mobile Chrome: 87 tests
- Mobile Safari: 87 tests

**By Test Suite (per project):**

- Authentication: 9 tests
- User Management: 18 tests
- API Integration: 35 tests
- Error Handling: 25 tests

**Backend (Jest): ~214 tests**

- Service tests: ~150 tests
- Controller tests: ~40 tests
- Utility tests: ~24 tests

## Troubleshooting

### "playwright command not found" in terminal

**Problem:** Running `npx playwright test` or `playwright test` gives "command not found"

**Solution:**

Playwright is installed in the `apps/frontend` workspace, not globally. Use one of these methods:

```bash
# Method 1: From workspace root (recommended)
pnpm test:e2e
pnpm playwright test

# Method 2: From apps/frontend directory
cd apps/frontend
pnpm test:e2e
pnpm exec playwright test

# Method 3: Using pnpm filter from root
pnpm --filter=frontend test:e2e
```

### Playwright Tests Not Showing in Test Explorer

**Problem:** Test Explorer only shows 214 backend tests, no Playwright tests

**Solution:**

1. Install Playwright Test extension (`ms-playwright.playwright`)
2. Install Playwright browsers: `pnpm playwright install`
3. Reload VSCode window: Press `Ctrl+Shift+P` → Type "Reload Window" → Enter
4. Verify `apps/frontend/playwright.config.ts` exists
5. Check Test Explorer sidebar - expand to see "Playwright Tests" section
6. Wait 10-30 seconds for test discovery to complete

### Tests Failing in Test Explorer

**Problem:** Tests pass in terminal but fail in Test Explorer

**Solution:**

1. Ensure browsers are installed: `pnpm playwright install`
2. Check if services are running (frontend on :3000, backend on :4000)
3. Verify environment variables in `.env.test`
4. Clear Playwright cache: `pnpm playwright install --force`
5. Check Playwright output in Test Explorer Output panel

### Slow Test Discovery

**Problem:** Test Explorer takes long to discover tests

**Solution:**

1. Reduce browser projects in `playwright.config.ts` for local dev
2. Use test filtering: `--grep @critical` for important tests
3. Enable `playwright.reuseBrowser: true` in settings

## Additional Resources

- [Playwright Test Extension Docs](https://playwright.dev/docs/getting-started-vscode)
- [VSCode Test Explorer API](https://code.visualstudio.com/api/extension-guides/testing)
- [E2E Testing Guide](../apps/frontend/docs/E2E_TESTING.md)

---

**Last Updated:** December 15, 2025
