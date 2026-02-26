# Pull Request

## Summary

- DRYs GitHub Actions setup by introducing a reusable composite action for Node + pnpm: `.github/actions/setup-node-pnpm/action.yml`
- Updates core CI workflows to use the shared setup action (reduces duplication and keeps Node/pnpm versions consistent):
  - `.github/workflows/backend-tests.yml`
  - `.github/workflows/e2e-tests.yml`
  - `.github/workflows/bdd-status.yml`
  - `.github/workflows/adr-check.yml`
  - `.github/workflows/security-scan.yml`
  - `.github/workflows/publish.yml`
- Small follow-ups bundled on this branch:
  - Updates the plan status/“branches on hold” notes: `.github/prompts/plan-nextNodeAppBase.prompt.md`
  - Cleans Playwright global-setup output to avoid eslint `no-console`: `apps/frontend/e2e/global-setup.ts`

## Testing

- `pnpm lint:workflows` (actionlint) — pass (run locally on Windows)
- CI — pending on PR

## Checklist

- [ ] CI is green
- [x] No secrets added/printed

### If this PR touches `.github/workflows/` or `.github/dependabot.yml`

- [x] Workflow/job `permissions:` are least-privilege
- [x] Actions are pinned to commit SHAs (kept the `# vX` comments)
- [x] No `:latest` Docker images
- [x] `Workflow Lint` check passes
- [x] CI toolchain matches root `package.json` (`engines.node`, `packageManager`)
