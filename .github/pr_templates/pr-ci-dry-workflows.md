# Pull Request

## Summary

## Testing

## Checklist

- [ ] CI is green
- [ ] No secrets added/printed

### If this PR touches `.github/workflows/` or `.github/dependabot.yml`

- [ ] Workflow/job `permissions:` are least-privilege
- [ ] Actions are pinned to commit SHAs (keep the `# vX` comment)
- [ ] No `:latest` Docker images (prefer pinned versions)
- [ ] `Workflow Lint` check passes
- [ ] CI toolchain matches root `package.json` (`engines.node`, `packageManager`)
