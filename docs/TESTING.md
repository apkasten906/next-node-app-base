# Testing Infrastructure

This document describes the testing setup and how to run tests across the monorepo.

## Overview

The project uses multiple testing frameworks:

- **Backend Tests**: Vitest for unit and integration tests
- **Frontend Unit Tests**: Vitest for fast unit tests
- **Frontend E2E Tests**: Playwright for end-to-end browser testing
- **Coverage**: c8 for backend code coverage reporting

## Backend Testing

### Backend Setup

The backend uses Vitest with the following configuration:

- **Test Runner**: Vitest 4.0.12
- **Coverage**: c8 (text, JSON, and HTML reports)
- **Environment**: Node.js
- **Test Globals**: Enabled (describe, it, expect available globally)

### Running Tests (Backend)

````powershell
# From the monorepo root
cd apps\backend

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration
```text
```text
end
````

<!-- end -->

### Backend Test Structure

Tests are typically colocated under `src/tests/` for package-scoped organization, but tests placed in a top-level `test/` directory are also supported by the repository Vitest configs.

Common layouts:

```text
apps/backend/src/tests/
├── setup.ts                      # Global test setup
├── services/                     # Unit tests for services
│   ├── jwt.service.test.ts
│   ├── encryption.service.test.ts
│   └── logger.service.test.ts
└── integration/                  # Integration tests
    ├── user.routes.test.ts       # API endpoint tests
    ├── database.test.ts          # Prisma database tests
    └── redis.test.ts             # Redis cache tests
```

Or, if you prefer a top-level test folder (also supported by Vitest config):

```text
apps/backend/test/
├── setup.ts
├── unit/
│   └── services.spec.ts
└── integration/
    └── user.routes.spec.ts
```

### Unit Tests

Unit tests focus on individual services in isolation:

- **JWT Service**: Token signing, verification, expiration, refresh tokens
- **Encryption Service**: Password hashing (bcrypt), data encryption (AES-256-GCM), token generation
- **Logger Service**: Winston logging, child loggers, correlation IDs

### Integration Tests

Integration tests verify the interaction between components:

- **API Routes**: HTTP endpoints with Express and middleware
- **Database**: Prisma CRUD operations, transactions, constraints
- **Redis**: Caching, pub/sub, data structures (hash, list, set, sorted set)

### Writing Tests

Example unit test:

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { container } from 'tsyringe';
import { MyService } from '../../services/my.service';

describe('MyService', () => {
  let myService: MyService;

  beforeEach(() => {
    container.clearInstances();
    myService = container.resolve(MyService);
  });

  it('should do something', () => {
    const result = myService.doSomething();
    expect(result).toBe('expected value');
  });
});
```

Example integration test:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

describe('API Integration', () => {
  it('should return 200', async () => {
    const response = await request(app).get('/api/endpoint').expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## Frontend Unit Testing

### Running Tests (Frontend)

```powershell
# From the monorepo root
cd apps\frontend

# Run unit tests
pnpm test:unit

# Or run all frontend tests (currently the same as unit)
pnpm test
```

### Configuration

See `apps/frontend/vitest.config.ts`.

## Frontend E2E Testing

### Frontend Setup

The frontend uses Playwright for end-to-end testing:

- **Test Runner**: Playwright 1.56.1
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Reports**: HTML reporter with screenshots and traces

### Running Tests

```powershell
# From the monorepo root
cd apps\frontend

# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests
pnpm test:e2e:debug

# View last test report
pnpm test:e2e:report
```

### Frontend Test Structure

```text
apps/frontend/e2e/
├── home.spec.ts                  # Home page tests
├── auth.spec.ts                  # Authentication flow tests
└── dashboard.spec.ts             # Dashboard and protected routes
```

### E2E Test Examples

- **Home Page**: Display content, navigation, feature grid
- **Authentication**: OAuth providers, sign in/out flow, session handling
- **Dashboard**: Protected routes, API integration, user actions

### Writing E2E Tests

Example:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/page');

    const element = page.getByRole('button', { name: 'Click Me' });
    await expect(element).toBeVisible();

    await element.click();
    await expect(page).toHaveURL('/new-page');
  });
});
```

## Test Coverage

### Backend Coverage

Coverage reports are generated using c8:

```powershell
cd apps\backend
pnpm test:coverage
```

Coverage reports are available in:

- **Console**: Text summary
- **JSON**: `coverage/coverage-final.json`
- **HTML**: `coverage/index.html` (open in browser)

### Coverage Targets

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '25'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm --filter backend test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/backend/coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '25'
          cache: 'pnpm'

      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm --filter frontend test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/frontend/playwright-report/
```

## Environment Setup

Create `apps/backend/.env.test`:

```env
NODE_ENV=test
DATABASE_URL="postgresql://localhost:5432/test_db"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
JWT_SECRET=test-jwt-secret
JWT_REFRESH_SECRET=test-refresh-secret
ENCRYPTION_KEY=test-encryption-key-32-characters
```

### Frontend Tests

Playwright uses `baseURL: 'http://localhost:3000'` and auto-starts the dev server.

## Troubleshooting

### Common Issues

#### 1. Tests fail with module not found

- Ensure import paths are correct (relative paths from the test file)
- Ensure `tsconfig.json` paths are configured
- Verify `vitest.config.ts` has correct path aliases

#### 2. Database tests fail

- Ensure PostgreSQL is running
- Database connection string is correct in `.env.test`
- Run `pnpm prisma:generate` to update Prisma Client

#### 3. Redis tests fail

- Ensure Redis server is running
- Check Redis connection settings
- Use separate DB for tests (e.g., `REDIS_DB=1`)

#### 4. E2E tests timeout

- Increase timeout in `playwright.config.ts`
- Check if dev server is starting correctly
- Verify baseURL is accessible

#### 5. Coverage reports empty

- Ensure test files are in correct directories
- Check `vitest.config.ts` coverage exclude patterns
- Run tests with `--coverage` flag explicitly

## Best Practices

### Backend Tests

1. **Use beforeEach to clear DI container**: Prevents state leakage between tests
2. **Mock external dependencies**: Database, Redis, third-party APIs
3. **Test error cases**: Invalid inputs, edge cases, error handling
4. **Use descriptive test names**: "should return user when ID exists"
5. **Keep tests focused**: One assertion per test when possible

### E2E Tests

1. **Use data-testid attributes**: For stable element selection
2. **Wait for elements**: Use `expect().toBeVisible()` instead of delays
3. **Mock API responses**: For predictable test data
4. **Test user journeys**: Complete workflows, not isolated actions
5. **Handle authentication**: Use cookies or session mocking
6. **Run in CI**: Test across multiple browsers

### General

1. **Keep tests fast**: Unit tests < 1s, integration tests < 5s
2. **Avoid test interdependence**: Each test should run in isolation
3. **Use factories for test data**: Consistent, reusable test objects
4. **Document complex tests**: Add comments explaining non-obvious logic
5. **Review coverage regularly**: Aim for high coverage, but focus on critical paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [c8 Coverage](https://github.com/bcoe/c8)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/ladjs/supertest)

---

For more information, see the individual test files and configurations in the `apps/backend` and `apps/frontend` directories.
