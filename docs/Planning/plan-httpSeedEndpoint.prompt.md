WSJF (suggested): BV=8, TC=6, RR/OE=8, JS=3 ⇒ WSJF ≈ 7.33; prioritize soon after any “blocking” CI/test failures.
Pick persona strategy: minimal “user-only” fixtures first vs include related domain setup (preferences, roles, orgs) as follow-ups.

## Plan: Add HTTP E2E Seed Endpoint

Add a dev-only, token-protected `POST /api/e2e/seed` endpoint that idempotently upserts case-specific “persona” users (and later scenario fixtures). Wire Playwright to call it once before tests so E2E setup is deterministic. Use WSJF to prioritize: high risk-reduction and low job size makes it a strong near-term win without derailing current work.

### Steps

1. Define endpoint requirements (path, fixtures list, idempotent upserts, no prod access).
2. Add a small router for `POST /api/e2e/seed` and mount it in `apps/backend/src/index.ts` alongside existing `/api/*` routes.
3. Implement strict gating: block when `NODE_ENV === 'production'` and require `x-e2e-seed-token` to match `E2E_SEED_TOKEN` (pattern aligns with dev-only seeding in `apps/backend/src/index.ts`).
4. Implement initial fixtures: upsert baseline + case-specific persona users (start from `test@example.com` / `admin@example.com` already used by auth fallback in `apps/backend/src/routes/auth.routes.ts`).
5. Update Playwright setup to call the endpoint once pre-run (either fix and use `apps/frontend/e2e/global-setup.ts` or call it from your existing e2e runner), using the same backend base URL your auth helper already hits in `apps/frontend/e2e/helpers/test-helpers.ts`.

### Further Considerations

1. WSJF (suggested): BV=8, TC=6, RR/OE=8, JS=3 ⇒ WSJF ≈ 7.33; prioritize soon after any “blocking” CI/test failures.
2. Pick persona strategy: minimal “user-only” fixtures first vs include related domain setup (preferences, roles, orgs) as follow-ups.
