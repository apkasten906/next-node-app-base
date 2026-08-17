# Git and VS Code Sync Performance

This guide records the measures used to diagnose and improve slow source-control synchronization in this monorepo.

## Diagnosis

Timing local and remote operations separately identified two sources of delay:

- `git status` initially took about 2.7 seconds because the workspace contained roughly 134,000 files, mostly in `node_modules/` and a workspace-local `.pnpm-store/`.
- A direct `git push` took about 24 seconds because the Husky pre-push hook compiled TypeScript, generated Prisma Client, and ran quick backend tests.
- The GitHub operation itself was responsive.

Use these commands to distinguish working-tree scanning from push-hook or network delays:

```bash
time git status --short
time git push
```

The terminal is preferable for diagnosis because it displays hook output more clearly than VS Code.

## Keep the pnpm store outside the workspace

```bash
pnpm config set store-dir ~/.pnpm-store
pnpm store path
```

Confirm that the reported path is outside the repository. Then verify and remove the obsolete workspace-local store:

```bash
pwd
ls -ld .pnpm-store
rm -rf .pnpm-store
```

The store is a package cache; removing the old copy does not remove source files or installed dependencies.

## Enable Git working-tree optimizations

Enable these settings for this repository:

```bash
git config feature.manyFiles true
git config core.untrackedCache true
```

Verify that both commands print `true`:

```bash
git config --get feature.manyFiles
git config --get core.untrackedCache
```

After these changes and removal of the local pnpm store, `git status --short` improved from about 2.7 seconds to about 1.5 seconds in the measured development container.

To undo the settings:

```bash
git config --unset feature.manyFiles
git config --unset core.untrackedCache
```

## Reduce VS Code filesystem watching

If Source Control remains sluggish, exclude generated directories in VS Code settings:

```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.pnpm-store/**": true,
    "**/.next/**": true,
    "**/.turbo/**": true
  }
}
```

Run **Developer: Reload Window** after changing the pnpm store or watcher settings.

## Expected pre-push delay

The Husky pre-push hook performs TypeScript compilation, Prisma Client generation, and selected Vitest tests before contacting GitHub. A push taking approximately 20–25 seconds can therefore be normal, even when it ends with `Everything up-to-date`.

Prefer `git push` in a terminal for visible progress. In an emergency, `git push --no-verify` bypasses the hook, but it also skips the repository's local safeguards and should be used sparingly.
