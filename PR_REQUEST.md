# Pull Request

## Summary

Completes the BDD base-repo scenario coverage push and clearly separates base-template obligations from adopter-specific guidance.

- Promotes implemented base-repo scenarios to `@ready` across backend foundation, backend core, security, API design, observability, file storage, notifications, message queue, advanced testing, Kubernetes/DevOps, and websocket coverage.
- Marks product-specific or provider-specific scenarios as permanent `@wip @adopter` guidance, especially in frontend/auth/security areas.
- Adds deterministic Cucumber step definitions for backend BDD coverage, including security/auth contracts, API design, observability, storage, notifications, queues, websocket, Docker/Kubernetes, and advanced testing checks.
- Adds frontend BDD coverage and supporting implementation for base Next.js behavior: backend-only auth wiring, protected dashboard access, error pages, loading UI, error boundaries, typed API client, debounce/offline hooks, accessibility, and form validation.
- Adds supporting base-repo scaffolding for CI/testability and adopter readiness:
  - Kubernetes app manifests
  - Pact contract assets
  - k6 load-test scaffold
  - OWASP ZAP baseline scaffold
  - backend integration/coverage workflow steps
  - OpenAPI schema coverage
  - devcontainer/tooling fixes
- Updates `PROGRESS.md`, the planning prompt, ADR index/docs, and BDD audit notes to record the completed base-vs-adopter scope.

The resulting BDD status is:

- Backend: `139/265` ready
- Frontend: `32/122` ready
- Overall: `171/387` ready

Remaining `@wip` scenarios are intentionally adopter-owned guidance rather than base-repo completion blockers.

## Testing

- [x] `pnpm bdd:status`

  ```text
  backend    total=265 ready=139 wip=126 manual=0 skip=0 other=0
  frontend   total=122 ready=32 wip=90 manual=0 skip=0 other=0
  overall    total=387 ready=171 wip=216 manual=0 skip=0 other=0
  ```

- [x] `pnpm --dir apps/backend exec cucumber-js -p all --tags @ready --dry-run --format summary`

  ```text
  161 scenarios (161 skipped)
  1035 steps (1035 skipped)
  ```

- [x] `git diff --check origin/master...HEAD`

## Checklist

- [ ] CI is green
- [x] No secrets added/printed

### If this PR touches `.github/workflows/` or `.github/dependabot.yml`

- [x] Workflow/job `permissions:` are least-privilege
- [x] Actions are pinned to commit SHAs (keep the `# vX` comment)
- [x] No `:latest` Docker images (prefer pinned versions)
- [ ] `Workflow Lint` check passes
- [x] CI toolchain matches root `package.json` (`engines.node`, `packageManager`)
