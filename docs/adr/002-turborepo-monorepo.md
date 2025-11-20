# ADR 002: Use Turborepo for Monorepo Management

## Status

**Accepted** - November 20, 2025

## Context

This project requires managing multiple applications (frontend, backend) and shared packages (types, utils, constants, config) in a single repository. A monorepo approach was chosen to:

- Share code between frontend and backend
- Ensure consistent TypeScript types across applications
- Enable atomic commits across multiple packages
- Simplify dependency management and versioning

### Requirements

- Fast incremental builds
- Efficient caching mechanism
- Parallel task execution
- Simple configuration
- Good developer experience
- CI/CD optimization

### Alternatives Evaluated

Several monorepo tools were considered:

1. **Nx** - Comprehensive, but heavy with many features we don't need
2. **Lerna** - Classic choice, but slower and less modern
3. **Rush** - Enterprise-focused, overly complex for our needs
4. **Yarn/npm Workspaces alone** - No task orchestration
5. **Turborepo** - Modern, fast, simple

## Decision

We will use **Turborepo** as our monorepo build system.

### Implementation

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

### Key Features Used

- **Remote Caching**: Share build artifacts across team and CI
- **Parallel Execution**: Run tasks across packages simultaneously
- **Incremental Builds**: Only rebuild what changed
- **Pipeline Configuration**: Define task dependencies
- **pnpm Integration**: Works seamlessly with pnpm workspaces

## Consequences

### Positive

- ✅ **Excellent performance**: Fastest monorepo tool available
- ✅ **Simple configuration**: Minimal setup compared to alternatives
- ✅ **Great caching**: Remote caching speeds up CI dramatically
- ✅ **Active development**: Well-maintained by Vercel
- ✅ **Next.js integration**: First-class support from the Next.js team
- ✅ **Developer experience**: Easy to understand and use
- ✅ **CI optimization**: Significant time savings in continuous integration

### Negative

- ⚠️ **Vercel ecosystem**: Tightly coupled to Vercel's tooling
- ⚠️ **Younger tool**: Less mature than Nx or Lerna
- ⚠️ **Remote caching setup**: Requires Vercel account or self-hosting for remote cache

### Neutral

- 🔄 **Learning curve**: Team needs to understand pipeline configuration
- 🔄 **Caching strategy**: Need to configure outputs correctly for optimal caching
- 🔄 **Monorepo patterns**: Need to establish conventions for package dependencies

## Alternatives Considered

### Alternative 1: Nx

**Pros:**

- Most feature-rich monorepo tool
- Excellent dependency graph visualization
- Powerful code generation
- Great plugin ecosystem
- Built-in affected command

**Cons:**

- Heavy and opinionated
- Steeper learning curve
- More configuration required
- Slower than Turborepo
- Many features we don't need

**Why rejected:** Overkill for our needs. We don't require the extensive code generation and plugin ecosystem that Nx provides.

### Alternative 2: Lerna

**Pros:**

- Battle-tested and mature
- Well-known in the ecosystem
- Simple versioning and publishing
- Large community

**Cons:**

- Slower build performance
- No built-in caching
- Less active development
- Outdated architecture
- Limited task orchestration

**Why rejected:** Turborepo provides better performance and modern features. Lerna is showing its age.

### Alternative 3: pnpm Workspaces Only

**Pros:**

- Built into pnpm
- No additional dependencies
- Simple and straightforward
- Fast package installation

**Cons:**

- No task orchestration
- No caching mechanism
- No parallel execution optimization
- Must script everything manually

**Why rejected:** Lacks task orchestration and caching that Turborepo provides. Would need to build these features ourselves.

## Configuration

### Pipeline Tasks

- **build**: Compile TypeScript and build applications
- **dev**: Start development servers (no caching)
- **test**: Run all tests
- **lint**: Lint all code
- **typecheck**: Run TypeScript type checking
- **clean**: Remove build artifacts

### Workspace Structure

```
apps/
  frontend/     # Next.js app
  backend/      # Node.js API

packages/
  types/        # Shared TypeScript types
  utils/        # Common utilities
  constants/    # Shared constants
  config/       # Shared configurations
```

## Performance Impact

Expected improvements with Turborepo:

- **Local builds**: 3-5x faster with caching
- **CI builds**: 5-10x faster with remote caching
- **Development**: Instant rebuilds for unchanged packages
- **Team efficiency**: Shared cache benefits entire team

## Migration Path

If we need to migrate away from Turborepo:

1. **To Nx**: Straightforward migration path exists
2. **To other tools**: Task definitions easily portable
3. **Manual scripts**: Can fall back to pnpm scripts if needed

## Monitoring & Review

This decision will be reviewed:

- After 3 months of usage (February 2026)
- If build performance degrades
- When evaluating new monorepo features
- If remote caching becomes problematic

## Related

- [ADR-003: pnpm as Package Manager](003-pnpm-package-manager.md)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Project Structure](../../README.md#project-structure)

## References

- Turborepo v1.13.4
- pnpm workspaces integration
- Remote caching via Vercel or self-hosted
