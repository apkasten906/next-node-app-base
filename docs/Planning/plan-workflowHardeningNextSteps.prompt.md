# Workflow hardening: next steps plan

WSJF formula used: (Business Value + Time Criticality + Risk Reduction) / Job Size

1. Verify Dependabot is running and opening PRs (and that label application works).
   WSJF: (8 + 7 + 6) / 2 = 10.5
   - Watch for the first Dependabot PR for GitHub Actions updates.
   - If Dependabot PRs fail to apply labels, either:
     - create the `dependencies` and `ci` labels in GitHub, or
     - remove the `labels:` block from `.github/dependabot.yml`.

2. Add a lightweight review policy for workflow changes (CODEOWNERS / required reviews).
   WSJF: (7 + 6 + 7) / 4 = 5.0
   - Scope: `.github/workflows/**` and `.github/dependabot.yml`.
   - Goal: ensure action bumps and workflow permission changes get a quick human review.

3. Add an action-bump review playbook and optionally enable auto-merge for Dependabot PRs.
   WSJF: (6 + 4 + 5) / 5 = 3.0
   - Review checklist ideas:
     - Confirm the action repo is correct and still maintained.
     - Skim upstream release notes/changelog.
     - Ensure permissions didn’t broaden unexpectedly.
     - Ensure CI passes.
   - Auto-merge: only after CI is green; decide governance threshold first.
