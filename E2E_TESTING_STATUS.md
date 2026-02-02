# E2E Testing Status Report

## Summary

Playwright E2E testing is configured to run end-to-end against both apps, with automatic startup via Playwright `webServer`.

## Current Setup

- Playwright runs tests from `apps/frontend/e2e` across 5 browser projects.
- Servers auto-start for local runs:
  - Backend: `http://localhost:3001/health`
  - Frontend: `http://localhost:3000`
- The Playwright config injects E2E-friendly env vars (e.g., disables queues/websockets and enables an auth dev fallback) so tests can run without external dependencies.

## How To Run

```bash
# From repo root
pnpm test:e2e

# UI mode
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

If you prefer to run servers manually, start `pnpm dev:backend` and `pnpm dev:frontend` in separate terminals, then run `pnpm test:e2e`.

## Notes

- Backend unit/integration tests use Vitest (`pnpm --filter backend test`).
- If you see seed failures, ensure `E2E_SEED_TOKEN` matches between your environment and the Playwright `webServer` config.

## Related Files

- `apps/frontend/playwright.config.ts` - Playwright config (webServer + env)
- `apps/frontend/docs/E2E_TESTING.md` - Authoring/running E2E tests
- `docs/TEST_EXPLORER_GUIDE.md` - VS Code Test Explorer setup

Last Updated: 2026-02-02
