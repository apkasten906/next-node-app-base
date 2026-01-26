# Workflow Change Review Playbook

This playbook is for reviewing changes under `.github/workflows/` and `.github/dependabot.yml`.

## Branch protection baseline (recommended)

Configure this in GitHub: `Settings → Branches → Branch protection rules`.

- Require pull request before merging
- Require approvals: **1**
- Require review from Code Owners
- Require conversation resolution
- Require status checks to pass (recommended minimum): `Workflow Lint / actionlint`, `Backend Unit Tests / Backend Unit Tests`

E2E is usually best kept non-required until it proves stable; if you do require it, prefer requiring only the Linux/Chromium leg.

## For GitHub Action bumps (Dependabot PRs)

1. Confirm the action repository is expected (owner/repo) and still maintained.
2. Confirm the update is a straight version bump (no suspicious new steps).
3. Check release notes / changelog for the action version being adopted.
4. Verify permissions did not broaden unexpectedly:
   - Prefer job-level `permissions:` over repo-wide.
   - Keep `contents: read` as default.
   - Only add `packages: write`, `security-events: write`, `issues: write` when required.
5. Confirm the action is still pinned to a commit SHA.
6. Ensure CI is green.

## For workflow logic changes (human PRs)

1. Minimize secrets exposure:
   - Avoid printing env vars.
   - Avoid passing secrets to untrusted inputs.
2. Prefer fixed versions over floating refs:
   - Avoid Docker image `:latest`.
   - Avoid GitHub Actions tags (`@v4`) unless explicitly allowed.
3. Keep changes scoped:
   - Restrict triggers with `branches:` and `paths:` where applicable.
4. Keep the CI toolchain aligned:
   - Node version should match root `package.json` `engines.node`.
   - pnpm version should match root `package.json` `packageManager`.
5. Validate with linting:
   - The `Workflow Lint` check (actionlint) should pass.

## Common “safe” permission patterns

- Default (most jobs):
  - `contents: read`
- Publishing to GHCR / GitHub Packages:
  - `packages: write`
- Uploading SARIF:
  - `security-events: write`
- Commenting on PRs:
  - `issues: write`
