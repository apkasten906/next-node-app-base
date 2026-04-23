# Testing Infrastructure

This document describes the testing setup and how to run tests across the monorepo.

## Overview

The project uses multiple testing frameworks:

- **Backend Tests**: Vitest for unit and integration tests
- **Frontend Unit Tests**: Vitest for fast unit tests
- **Frontend E2E Tests**: Playwright for end-to-end browser testing
- **Coverage**: c8 for backend code coverage reporting

## Local Development Model (Pattern 2: Infra-only Docker)

> See [ADR 018](./adr/018-infra-only-docker-local-dev.md) for full rationale.

The recommended local setup runs **infrastructure in Docker** (postgres + redis) and **application code as local processes**. This avoids VS Code freezing, enables hot-module reloading, and keeps the E2E loop fast.

```
Docker (infra only)          Local processes
├── postgres :5432    ←──    backend  pnpm dev  :3001
└── redis    :6379    ←──    frontend pnpm dev  :3000
                                  ↑
                             Playwright / Test Explorer
```

### Prerequisites

- Docker Desktop running
- `pnpm install` completed at the monorepo root

### Starting infrastructure

```powershell
# Start postgres and redis only (default — recommended for local dev and E2E)
docker-compose up -d

# Stop infrastructure
docker-compose down

# Start full containerised stack (CI validation only)
docker-compose --profile app up -d
```

### Credentials (local Docker infra)

| Service  | Value                                                          |
| -------- | -------------------------------------------------------------- |
| Postgres | `postgresql://devuser:devpassword@localhost:5432/nextnode_dev` |
| Redis    | `redis://:devredis@localhost:6379`                             |

These are the defaults in `apps/backend/.env` and `apps/backend/.env.example`. **Do not change them** to match the devcontainer or CI values without also updating `docker-compose.yml`.

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

### Architecture

E2E tests use Playwright with the **infra-only Docker** model (ADR 018):

- `docker-compose up -d` starts postgres and redis on localhost
- Playwright's `webServer` directive starts the backend and frontend as local Node.js processes
- `reuseExistingServer: true` locally — if you already have `pnpm dev` running, Playwright reuses those processes; otherwise it starts them automatically
- The backend `webServer` env injects `REDIS_MOCK=true`, `DISABLE_QUEUES=true`, and `DISABLE_WEBSOCKETS=true`, so only postgres is a hard dependency during E2E runs
- In CI, `REUSE_EXISTING_SERVER=false` forces Playwright to start fresh processes

### Prerequisites for E2E

1. Infrastructure running: `docker-compose up -d`
2. Playwright browsers installed: `pnpm --filter frontend exec playwright install --with-deps`

### Running E2E Tests

```powershell
# Ensure infra is up first
docker-compose up -d

# From the frontend package
cd apps\frontend

# Run all E2E tests (headless)
pnpm test:e2e

# Run with Playwright UI (interactive, great for debugging)
pnpm test:e2e:ui

# Run in headed mode (see the browser)
pnpm test:e2e:headed

# Debug a specific test
pnpm test:e2e:debug

# View last HTML report
pnpm test:e2e:report
```

You can also run E2E tests directly from the **VS Code Test Explorer** — the config handles server startup automatically.

### Frontend E2E Setup

The frontend uses Playwright for end-to-end testing:

- **Test Runner**: Playwright 1.56.1
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Reports**: HTML reporter with screenshots and traces
- **Config**: `apps/frontend/playwright.config.ts`

### Frontend Test Structure

```text
apps/frontend/e2e/
├── global-setup.ts               # Waits for services and seeds E2E personas
├── fixtures/
│   └── personas.ts               # Default test user personas
├── home.spec.ts                  # Home page tests
├── auth.spec.ts                  # Authentication flow tests
└── dashboard.spec.ts             # Dashboard and protected routes
```

### E2E Test Examples

- **Home Page**: Display content, navigation, feature grid
- **Authentication**: OAuth providers, sign in/out flow, session handling
- **Dashboard**: Protected routes, API integration, user actions

### Writing E2E Tests

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

CI uses the same pattern but starts fresh processes (no reuse). The `CI=true` environment variable is set automatically by GitHub Actions, which causes `playwright.config.ts` to set `reuseExistingServer: false` and start backend/frontend processes via `webServer`.

Postgres and Redis are provided by GitHub Actions `services`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '25'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter backend test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/backend/coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: devuser
          POSTGRES_PASSWORD: devpassword
          POSTGRES_DB: nextnode_dev
        ports:
          - 5432:5432
        options: >-
          --health-cmd "psql -U devuser -d nextnode_dev -c 'SELECT 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '25'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter frontend exec playwright install --with-deps
      - run: pnpm --filter frontend test:e2e
        env:
          DATABASE_URL: postgresql://devuser:devpassword@localhost:5432/nextnode_dev
          CI: true
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/frontend/playwright-report/
```

## Environment Setup

### Backend (`apps/backend/.env`)

Copy from `apps/backend/.env.example`. The defaults work out of the box with `docker-compose up -d`:

```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/nextnode_dev"
DATABASE_READ_REPLICA_URL="postgresql://devuser:devpassword@localhost:5432/nextnode_dev"

REDIS_URL="redis://:devredis@localhost:6379"

JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production
SESSION_SECRET=dev-session-secret-change-in-production

CORS_ORIGIN=http://localhost:3000

E2E_SEED_TOKEN=local-e2e-seed-token

# Test/dev toggles
TEST_EXTERNAL_SERVICES=false
REDIS_MOCK=true
DISABLE_QUEUES=true
DISABLE_WEBSOCKETS=true
AUTH_ENABLE_DEV_FALLBACK=true
```

### Frontend (`apps/frontend/.env.local`)

```env
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/nextnode_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=6a3f5d8e9c2b1a7f4e8d6c5b3a2f1e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## Troubleshooting

### Common Issues

#### 1. Tests fail with module not found

- Ensure import paths are correct (relative paths from the test file)
- Ensure `tsconfig.json` paths are configured
- Verify `vitest.config.ts` has correct path aliases

#### 2. Database tests fail

- Ensure postgres is running: `docker-compose up -d`
- Verify the `DATABASE_URL` in `apps/backend/.env` matches the Docker credentials (`devuser`/`devpassword`/`nextnode_dev`)
- Run `pnpm --filter backend prisma:generate` to regenerate the Prisma Client

#### 3. Redis tests fail

- Ensure redis is running: `docker-compose up -d`
- Backend E2E runs use `REDIS_MOCK=true` (no real Redis needed for Playwright)
- For integration tests that need real Redis, verify `REDIS_URL=redis://:devredis@localhost:6379`

#### 4. E2E tests timeout or "port already in use"

This typically means a previous process is still bound to `:3000` or `:3001`.

```powershell
# Find and kill processes on those ports
Get-NetTCPConnection -LocalPort 3000, 3001 -State Listen |
  Select-Object -ExpandProperty OwningProcess |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

If you have the full Docker stack running (`--profile app`), stop it before running the Test Explorer:

```powershell
docker-compose --profile app down
docker-compose up -d   # restart infra only
```

#### 5. VS Code Test Explorer freezes or is slow

Running the full Docker stack (backend + frontend containers) while using the Test Explorer causes Docker Desktop to stream logs into VS Code, consuming significant resources. The solution is to use the infra-only model:

```powershell
docker-compose --profile app down   # stop app containers
docker-compose up -d                # start infra only
```

#### 6. Coverage reports empty

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
