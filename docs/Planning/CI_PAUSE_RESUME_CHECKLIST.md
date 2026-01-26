# CI Pause/Resume Checklist

This repository intentionally uses GitHub Actions workflows under `.github/workflows/`.

If you are in a “baseline build” phase and want to minimize CI overhead, it’s reasonable to **pause** workflows and re-enable them later.

## Current state: paused

Workflows were switched to **manual-only** runs:

- All workflows have `on: workflow_dispatch` (no `push:`/`pull_request:`/`release:` triggers).

This keeps the workflow definitions around, but prevents automatic pipeline noise.

## Resume CI (recommended sequence)

1. **Update branch protection first (avoid stuck PRs)**
   - `Settings → Branches → Branch protection rules → master`
   - If you currently require status checks that are paused, either:
     - temporarily remove those required checks, or
     - temporarily disable “Require status checks to pass”.

2. **Re-enable workflow triggers**
   - Restore `on:` blocks in the workflows you want back.
   - Easiest approach: revert the commit that paused workflows.
     - Find the commit message: `chore(ci): pause workflows (manual dispatch only)`
     - Revert it in a PR.

3. **Pick a minimal required-checks baseline**
   Start small to reduce friction:
   - `Workflow Lint / Workflow Lint (actionlint)`
   - `Backend Unit Tests (CI) / Backend Unit Tests`

   Keep `E2E Tests` and `Security Scan` non-required until they are stable and fast.

4. **Make sure toolchain versions match the repo**
   - Node should match root `package.json` `engines.node`.
   - pnpm should match root `package.json` `packageManager`.

5. **Re-add required status checks**
   - Add back required checks only after you confirm the workflows actually run on PRs.

6. **Signed commits policy (optional)**
   If “Require signed commits” is enabled, ensure your local Git is configured to sign commits (SSH or GPG). Unsigned historical commits don’t get retro-signed without rewriting history.

## Notes on PR cleanup

GitHub pull requests generally can’t be permanently “deleted” from the UI.

Typical cleanup options:

- Close PRs you don’t want.
- Delete the source branches (especially Dependabot branches) after closing.
