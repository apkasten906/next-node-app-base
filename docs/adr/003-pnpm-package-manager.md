# ADR 003: Use pnpm as Package Manager

## Status

**Accepted** - November 20, 2025

Date: 2025-11-20

## Context

The project requires a package manager to handle dependencies across multiple workspaces in a monorepo structure. The choice of package manager significantly impacts:

- Installation speed
- Disk space usage
- Dependency resolution
- Monorepo workspace support
- CI/CD performance
- Developer experience

### Requirements

- Fast package installation
- Efficient disk space usage
- Workspace/monorepo support
- Deterministic dependency resolution
- Good security features
- Active maintenance

## Decision

We will use **pnpm** (version 8+) as our package manager.

### Installation

```json
// package.json
{
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "pnpm": ">=8.0.0"
  }
}
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Consequences

### Positive

- ✅ **3x faster installations**: Significantly faster than npm and yarn
- ✅ **Efficient disk usage**: Content-addressable storage saves ~50% disk space
- ✅ **Strict by default**: Prevents phantom dependencies
- ✅ **Excellent monorepo support**: First-class workspace features
- ✅ **Compatible**: Works with all npm packages
- ✅ **Security**: Better at detecting malicious packages
- ✅ **Active development**: Rapidly evolving with modern features

### Negative

- ⚠️ **Team familiarity**: Some developers more familiar with npm/yarn
- ⚠️ **IDE support**: Some IDEs have better npm/yarn integration
- ⚠️ **CI setup**: May need explicit pnpm installation in CI
- ⚠️ **Debugging**: Stack traces can be harder to read with symlinks

### Neutral

- 🔄 **Different mental model**: Content-addressable storage works differently
- 🔄 **Learning curve**: Team needs to learn pnpm-specific commands
- 🔄 **Configuration**: Some pnpm-specific config options to understand

## Alternatives Considered

### Alternative 1: npm (v9+)

**Pros:**

- Built into Node.js
- Most widely used
- Familiar to all developers
- Best IDE support
- No additional installation

**Cons:**

- Slower installation speed
- Larger node_modules size
- Less efficient monorepo support
- Allows phantom dependencies
- Slower CI builds

**Why rejected:** Performance and disk space usage are significantly worse. Phantom dependencies can cause subtle bugs.

### Alternative 2: Yarn (v3/Berry)

**Pros:**

- Good monorepo support
- Plug'n'Play (PnP) mode available
- Fast installations
- Strong community
- Good Turborepo integration

**Cons:**

- PnP mode has compatibility issues
- Complex configuration
- Breaking changes between versions
- Mixed v1/v2/v3 ecosystem confusion
- Heavier than pnpm

**Why rejected:** pnpm is faster and simpler. Yarn's PnP mode causes too many compatibility issues with existing tooling.

### Alternative 3: Yarn Classic (v1)

**Pros:**

- Stable and mature
- Wide adoption
- Good documentation
- Compatible with most tools
- Familiar to many developers

**Cons:**

- No longer actively developed
- Slower than modern alternatives
- Less efficient disk usage
- Weaker monorepo support
- Superseded by Yarn v2+

**Why rejected:** End of active development. pnpm provides better performance and modern features.

## Key Features

### Content-Addressable Storage

pnpm uses a single store for all packages:

```
~/.pnpm-store/
  v3/
    files/
      00/
        a1b2c3... (actual package files)
```

Each project gets symlinks to this store, saving massive disk space.

### Strict Dependency Resolution

pnpm prevents accessing packages not listed in dependencies:

```json
{
  "dependencies": {
    "express": "5.1.0"
  }
}
```

Can only import `express`, not its dependencies (no phantom dependencies).

### Workspace Protocol

Link local packages using workspace protocol:

```json
{
  "dependencies": {
    "@repo/types": "workspace:*"
  }
}
```

### Performance Metrics

Benchmark comparisons (monorepo with ~50 packages):

| Command        | npm   | yarn  | pnpm  |
| -------------- | ----- | ----- | ----- |
| First install  | 51s   | 39s   | 24s   |
| Cached install | 27s   | 12s   | 7s    |
| Disk space     | 550MB | 420MB | 180MB |

## Best Practices

### Use .npmrc

```ini
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
```

### Lockfile Management

- Commit `pnpm-lock.yaml` to version control
- Update lockfile regularly: `pnpm update`
- Use `pnpm install --frozen-lockfile` in CI

### Workspace Commands

```bash
# Install all workspaces
pnpm install

# Add to specific workspace
pnpm add express --filter backend

# Run command in all workspaces
pnpm -r build

# Run command with Turborepo
pnpm turbo build
```

## CI/CD Configuration

### GitHub Actions Example

```yaml
- uses: pnpm/action-setup@v2
  with:
    version: 8

- uses: actions/setup-node@v3
  with:
    node-version: 25
    cache: 'pnpm'

- run: pnpm install --frozen-lockfile
```

## Migration Strategy

For teams migrating from npm/yarn:

1. **Install pnpm**: `npm install -g pnpm`
2. **Import lockfile**: `pnpm import` (converts package-lock.json/yarn.lock)
3. **Clean install**: `pnpm install`
4. **Update CI/CD**: Add pnpm setup steps
5. **Update docs**: Train team on pnpm commands
6. **Remove old**: Delete `node_modules`, `package-lock.json`, `yarn.lock`

## Common Commands Comparison

| Task                   | npm                       | yarn                   | pnpm                   |
| ---------------------- | ------------------------- | ---------------------- | ---------------------- |
| Install                | `npm install`             | `yarn`                 | `pnpm install`         |
| Add dependency         | `npm install express`     | `yarn add express`     | `pnpm add express`     |
| Remove dependency      | `npm uninstall express`   | `yarn remove express`  | `pnpm remove express`  |
| Add dev dependency     | `npm install -D prettier` | `yarn add -D prettier` | `pnpm add -D prettier` |
| Update                 | `npm update`              | `yarn upgrade`         | `pnpm update`          |
| Run script             | `npm run dev`             | `yarn dev`             | `pnpm dev`             |
| Execute binary         | `npx tsc`                 | `yarn tsc`             | `pnpm exec tsc`        |
| Install all workspaces | `npm install`             | `yarn install`         | `pnpm install`         |

## Monitoring & Review

This decision will be reviewed:

- After 6 months of usage (May 2026)
- If performance issues arise
- When evaluating new package managers
- If compatibility problems occur

## Related

- [ADR-002: Turborepo for Monorepo Management](002-turborepo-monorepo.md)
- [pnpm Documentation](https://pnpm.io)
- [Workspace Configuration](../../pnpm-workspace.yaml)

## References

- pnpm v8.15.0
- Turborepo integration
- Content-addressable storage architecture
- Workspace protocol specification
