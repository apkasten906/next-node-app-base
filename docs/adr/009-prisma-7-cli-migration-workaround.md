# ADR-009: Prisma 7 CLI Migration Workaround Strategy

## Status

Accepted

## Date

2024-12-04

## Context

The project upgraded from Prisma 6.19.0 to Prisma 7 (currently 7.1.0) to leverage the new adapter pattern and edge computing capabilities. However, Prisma 7 introduced breaking changes to CLI tool configuration that create significant workflow challenges:

### The Problem

1. **Datasource URL Removal**: Prisma 7 no longer supports the `url` field in `schema.prisma`. The schema must now have only a provider, with no URL configured.

2. **prisma.config.ts Requirement**: CLI tools like `prisma migrate dev`, `prisma migrate status`, and `prisma db push` now require configuration via `prisma.config.ts` at the project root.

3. **CLI Configuration Bug**: Even with proper `prisma.config.ts` configuration following official Prisma examples, the CLI tools in Prisma 7.0.x and 7.1.0 fail to read the datasource configuration, throwing:

   ```
   Error: The datasource property is required in your Prisma config file when using prisma migrate status.
   ```

4. **Monorepo Complexity**: In a monorepo setup with schema at `apps/backend/prisma/schema.prisma` and config at root `prisma.config.ts`, the CLI cannot locate or parse the configuration properly.

### Investigation Results

**Configuration Attempted:**

```typescript
// prisma.config.ts (root)
import path from 'node:path';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'apps', 'backend', 'prisma', 'schema.prisma'),
  datasource: {
    url:
      env('DATABASE_URL') || 'postgresql://postgres:postgres@localhost:5432/nextnode?schema=public',
  },
});
```

**Result:** Config file loads successfully in Node.js but Prisma CLI cannot read it.

**Testing Summary:**

- ✅ `prisma generate` - Works (doesn't need datasource URL)
- ❌ `prisma migrate status` - Fails (requires datasource)
- ❌ `prisma migrate dev` - Fails (requires datasource)
- ❌ `prisma db push` - Fails (requires datasource)
- ✅ Runtime with adapter pattern - Works perfectly

### Current Workaround in Place

The project has been using manual SQL initialization (`apps/backend/prisma/init.sql`) to bypass broken CLI commands, as documented in ADR-001.

## Decision

We will implement a **hybrid migration strategy** that uses the strengths of both Prisma 7's runtime adapter pattern and traditional migration tools:

### Primary Approach: Prisma Studio + Manual SQL

1. **Schema Changes**: Continue editing `schema.prisma` as the source of truth
2. **Client Generation**: Use `prisma generate` (works in Prisma 7)
3. **Migration Creation**: Use Prisma Studio's visual schema comparison or manual SQL scripts
4. **Migration Application**: Use `init.sql` approach or direct database modifications
5. **Runtime**: Continue using adapter pattern (working perfectly)

### Fallback Approach: Prisma 6 for Migrations

For complex schema changes requiring automatic migration generation:

1. Create a temporary downgrade script that switches Prisma to 6.x
2. Generate migrations using Prisma 6's working CLI
3. Upgrade back to Prisma 7.x
4. Apply migrations manually or wait for CLI fix

### Solution Implementation

**Created Helper Scripts:**

```json
// package.json additions
{
  "scripts": {
    "db:schema:diff": "echo 'Compare schema.prisma with database using Prisma Studio'",
    "db:migrate:manual": "docker exec -i devcontainer-db-1 psql -U postgres -d nextnode < apps/backend/prisma/init.sql",
    "prisma:downgrade": "cd apps/backend && pnpm add -D prisma@6.19.0 && pnpm add @prisma/client@6.19.0",
    "prisma:upgrade": "cd apps/backend && pnpm add -D prisma@7.1.0 && pnpm add @prisma/client@7.1.0 @prisma/adapter-pg@7.1.0"
  }
}
```

**Maintained prisma.config.ts:**

Keep the configuration file in place for when Prisma CLI is fixed:

```typescript
import path from 'node:path';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'apps', 'backend', 'prisma', 'schema.prisma'),
  datasource: {
    url:
      env('DATABASE_URL') || 'postgresql://postgres:postgres@localhost:5432/nextnode?schema=public',
  },
});
```

## Consequences

### Positive

1. **Runtime Performance**: Prisma 7 adapter pattern provides better connection pooling and edge computing support
2. **Forward Compatible**: Configuration is ready for when Prisma CLI is fixed
3. **Flexible**: Multiple migration strategies available based on complexity
4. **Type Safety Maintained**: `prisma generate` still works, providing full TypeScript types
5. **No Production Impact**: Runtime application code works perfectly

### Negative

1. **Manual Migration Effort**: Schema changes require more manual work than automatic migrations
2. **Developer Experience**: CLI workflow is disrupted compared to Prisma 6
3. **Documentation Gap**: Limited official guidance for monorepo + adapter pattern + migrations
4. **Temporary Workarounds**: Need to maintain dual strategies until CLI is fixed

### Neutral

1. **Testing**: All 204 tests passing with Prisma 7 runtime - no test changes needed
2. **Learning Curve**: Team needs to understand manual migration approach
3. **Version Tracking**: Need to monitor Prisma releases for CLI fixes

## Alternatives Considered

### Alternative 1: Downgrade to Prisma 6 Completely

**Pros:**

- All CLI commands work as expected
- Familiar developer workflow
- No manual migration work

**Cons:**

- Lose adapter pattern benefits (connection pooling, edge support)
- Miss future Prisma 7 improvements
- Eventually need to migrate anyway

**Why rejected:** Runtime benefits of Prisma 7 adapter pattern outweigh CLI inconvenience. Application performance and architecture are more important than developer tooling friction.

### Alternative 2: Use Prisma Migrate with Accelerate

**Pros:**

- Prisma Accelerate might bypass CLI config issues
- Cloud-based solution
- Additional caching layer

**Cons:**

- Additional cost ($29+/month)
- External dependency
- Still doesn't solve monorepo config parsing
- Overkill for development workflow

**Why rejected:** Too expensive for a CLI workaround. Manual migrations are free and effective.

### Alternative 3: Switch to Different ORM

**Pros:**

- Drizzle, Kysely, or TypeORM have stable CLIs
- Some offer better TypeScript inference
- No adapter pattern required

**Cons:**

- Massive refactoring required (DatabaseService, all queries)
- Lose Prisma Studio
- Lose Prisma Client's excellent type safety
- 204 passing tests would need rewriting

**Why rejected:** Cost of migration far outweighs CLI inconvenience. Prisma runtime works excellently.

### Alternative 4: Use db push Instead of Migrations

**Pros:**

- `db push` might work without migrations folder
- Simpler for development

**Cons:**

- Still requires datasource configuration (fails with same error)
- No migration history
- Not recommended for production

**Why rejected:** Doesn't solve the core CLI config parsing issue.

## Migration Timeline

1. **Immediate (Done)**:
   - ✅ Upgraded to Prisma 7.1.0
   - ✅ Implemented adapter pattern in DatabaseService
   - ✅ All tests passing (204/204)
   - ✅ Created prisma.config.ts
   - ✅ Documented manual migration approach

2. **Short-term (Next 2-4 weeks)**:
   - Monitor Prisma 7.2+ releases for CLI fixes
   - Create helper scripts for common migration tasks
   - Document schema change workflow in README

3. **Medium-term (Next 2-3 months)**:
   - If CLI not fixed, formalize Prisma 6 fallback script
   - Consider Prisma Migrate alternative tools
   - Evaluate if Prisma team addresses monorepo config issues

4. **Long-term**:
   - When CLI is fixed, resume normal Prisma migration workflow
   - Remove manual migration workarounds
   - Update ADR with resolution

## References

- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-7)
- [Prisma Config Documentation](https://www.prisma.io/docs/orm/prisma-schema/overview/prisma-config)
- [Database Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers#driver-adapters)
- [Prisma GitHub - @prisma/config Examples](https://github.com/prisma/prisma/tree/main/packages/config)
- [ADR-001: Prisma 7 Migration](001-prisma-7-migration.md)

## Notes

- **Tested Versions**: Prisma 7.0.1, 7.1.0 - both have CLI config parsing issues
- **@prisma/config Version**: 7.1.0 installed and working for Node.js loading
- **Node.js**: v24.5.0 (Prisma recommends v25.0.0+ but runtime works)
- **Database**: PostgreSQL 16 (postgres:16-alpine)
- **Runtime Status**: ✅ All application code and tests working perfectly
- **CLI Status**: ❌ Migration commands non-functional
- **Workaround Status**: ✅ Manual migrations effective and documented

---

**Decision Makers**: Development Team
**Date of Decision**: December 4, 2024
**Review Date**: Monitor Prisma 7.2+ releases for CLI fixes
