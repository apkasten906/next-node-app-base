# Changesets

Add a changeset for every pull request that changes a workspace package's public behavior:

```bash
pnpm changeset
```

Choose each affected package, select the semantic version bump, and describe the user-visible change. Documentation, tests, CI, and repository-only maintenance do not require a changeset.

After changesets reach `master`, the Version Packages workflow opens or updates a release pull request. Merging that pull request updates package versions and package changelogs; publishing remains an explicit action through the existing Publish Packages workflow.
