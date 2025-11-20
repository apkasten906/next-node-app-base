# ADR 001: Use Node.js 25 for Native TypeScript Support

## Status

**Accepted** - November 20, 2025

## Context

The backend application is built with TypeScript, which traditionally requires transpilation to JavaScript before execution. This adds complexity to the development workflow:

- Requires ts-node or tsx for development
- Necessitates build steps before running code
- Slows down the development feedback loop
- Adds complexity to the toolchain

Node.js 25 introduced native TypeScript support through the `--experimental-strip-types` flag, which allows direct execution of TypeScript files without external transpilation tools.

### Requirements

- Fast development feedback loop
- Minimal toolchain complexity
- Type-safe backend development
- Production-ready runtime
- Modern ECMAScript features

## Decision

We will use **Node.js 25** as the minimum required version for this project to leverage native TypeScript support.

### Implementation Details

- **`.nvmrc`**: Set to `25`
- **`package.json` engines**: Require `>=25.0.0`
- **Dev Container**: Use `node:25-bookworm` base image
- **Runtime flags**: Use `--experimental-strip-types` for TypeScript execution

### Usage Pattern

```bash
# Development - run TypeScript directly
node --experimental-strip-types src/index.ts

# Alternative with tsx for enhanced DX
tsx src/index.ts

# Production - still transpile for optimization
tsc && node dist/index.js
```

## Consequences

### Positive

- ✅ **Faster development**: No transpilation step needed during development
- ✅ **Simpler toolchain**: Reduced dependency on external tools like ts-node
- ✅ **Better DX**: Instant TypeScript execution without build watchers
- ✅ **Modern runtime**: Access to latest V8 optimizations and ECMAScript features
- ✅ **Consistent environment**: Same Node.js version in dev and production
- ✅ **Type safety**: Full TypeScript type checking during development

### Negative

- ⚠️ **Experimental feature**: `--experimental-strip-types` is still experimental
- ⚠️ **Version constraint**: Requires developers to use Node.js 25+
- ⚠️ **Breaking change**: Not compatible with older Node.js versions
- ⚠️ **Limited adoption**: Fewer production deployments using Node.js 25 initially

### Neutral

- 🔄 **Production builds**: Still recommend transpilation for production for maximum optimization
- 🔄 **Type checking**: Still requires `tsc` for type checking (types are stripped, not checked)
- 🔄 **Learning curve**: Team needs to understand when to use native TS vs transpiled

## Alternatives Considered

### Alternative 1: Node.js 18 LTS with ts-node

**Pros:**
- Stable and widely adopted
- Long-term support (LTS)
- Well-tested in production
- Broader ecosystem compatibility

**Cons:**
- Requires ts-node or tsx as additional dependency
- Slower development feedback loop
- More complex build configuration
- Additional tooling to maintain

**Why rejected:** Slower development experience and unnecessary toolchain complexity when native support is available.

### Alternative 2: Node.js 22 LTS with tsx

**Pros:**
- LTS support
- Mature and stable
- Good TypeScript tooling with tsx
- Proven production track record

**Cons:**
- No native TypeScript support
- Still requires external transpilation
- Misses latest Node.js 25 features
- Additional dependency (tsx)

**Why rejected:** Doesn't provide the native TypeScript benefits we're seeking, and Node.js 25 is production-ready.

### Alternative 3: Bun Runtime

**Pros:**
- Native TypeScript support
- Extremely fast runtime
- Built-in package manager
- Modern development experience

**Cons:**
- Different runtime than Node.js
- Smaller ecosystem
- Less production adoption
- Team familiarity concerns
- Potential compatibility issues with Node.js-specific packages

**Why rejected:** Too radical a departure from Node.js ecosystem. Risk of compatibility issues with enterprise packages.

## Migration Path

For teams not ready for Node.js 25:

1. **Phase 1**: Use tsx in development with Node.js 22
   ```bash
   pnpm add -D tsx
   "dev": "tsx watch src/index.ts"
   ```

2. **Phase 2**: Upgrade to Node.js 25 when comfortable
   ```bash
   nvm install 25
   nvm use 25
   ```

3. **Phase 3**: Remove tsx and use native TypeScript
   ```bash
   "dev": "node --experimental-strip-types src/index.ts"
   ```

## Production Considerations

### Recommendation

For production deployments, continue to use transpiled JavaScript:

```json
{
  "scripts": {
    "dev": "node --experimental-strip-types src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Rationale

- Maximum optimization from TypeScript compiler
- Remove experimental flag dependency
- Faster cold starts (no type stripping overhead)
- Proven production stability

## Monitoring & Review

This decision will be reviewed after:

- 6 months of usage (May 2026)
- Node.js 26 release (when 25 becomes non-current)
- Team feedback on development experience
- Any production issues related to Node.js 25

## Related

- [Node.js 25 Release Notes](https://nodejs.org/en/blog/release/v25.0.0)
- [Node.js TypeScript Support Documentation](https://nodejs.org/docs/latest/api/typescript.html)
- [Project Setup Documentation](../../SETUP.md)
- [Development Environment](.devcontainer/devcontainer.json)

## References

- Node.js 25.0.0 Release: Native TypeScript support via `--experimental-strip-types`
- TypeScript 5.x: Compatibility with Node.js native type stripping
- Phase 1 Implementation: Foundation & Governance
- Phase 2 Implementation: Security Framework
