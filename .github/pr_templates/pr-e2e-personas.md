# Pull Request

## Summary

Add lightweight E2E persona registry with optional JSON overrides, wire Playwright global-setup to seed the backend, and document the flow.

### What changed

- Added persona registry and example: `apps/frontend/e2e/fixtures/personas.ts`, `apps/frontend/e2e/fixtures/personas.example.json`.
- Added local override starter (git-ignored): `apps/frontend/e2e/fixtures/personas.local.json`.
- Wired Playwright global setup to call the backend seed endpoint: `apps/frontend/e2e/global-setup.ts`.
- Propagated persona-file env through `apps/frontend/playwright.config.ts`.
- Backend seed route now accepts validated persona payloads: `apps/backend/src/routes/e2e.routes.ts`.

## Testing

1. From repo root set the persona file and run E2E:

   ```powershell
   $env:E2E_PERSONAS_FILE='apps/frontend/e2e/fixtures/personas.local.json'
   pnpm --filter frontend test:e2e
   ```

2. Playwright will call the backend seed endpoint at `/api/e2e/seed` using the dev seed token (`E2E_SEED_TOKEN`) and run the tests.

## Checklist

- [ ] CI is green
- [ ] No secrets added/printed

### Docs & governance

- E2E documentation: `apps/frontend/docs/E2E_TESTING.md`.
- ADR created: `docs/adr/014-e2e-personas-json-over-admin-ui.md`.
- README updated with a short note pointing to the E2E docs.

### Test artifacts

- Playwright HTML report and machine-readable results included for review: `apps/frontend/playwright-report/` and `apps/frontend/test-results/` (committed to this branch for convenience).

### Notes

- The seed endpoint is dev-only and token-protected (`E2E_SEED_TOKEN`).
- Persona JSON overrides are optional and documented in `apps/frontend/docs/E2E_TESTING.md`.

### If this PR touches `.github/workflows/` or `.github/dependabot.yml`

- [ ] Workflow/job `permissions:` are least-privilege
- [ ] Actions are pinned to commit SHAs (keep the `# vX` comment)
- [ ] No `:latest` Docker images (prefer pinned versions)
- [ ] `Workflow Lint` check passes
- [ ] CI toolchain matches root `package.json` (`engines.node`, `packageManager`)
