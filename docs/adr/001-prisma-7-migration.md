# ADR-001: Migration to Prisma 7 with Adapter Pattern

## Status

Accepted

## Date

2025-11-26

## Context

The project was initially using Prisma 6.19.0. Prisma 7.0 introduced significant breaking changes, particularly around database connection configuration:

1. **Datasource URL Removal**: The `url` field is no longer supported in `schema.prisma`. Connection configuration must be moved to `prisma.config.ts` for CLI tools and passed via adapters at runtime.

2. **Adapter Pattern**: Prisma 7 requires driver adapters even for natively supported databases like PostgreSQL. This provides better connection pooling control and aligns with edge computing requirements.

3. **CLI Configuration Issues**: Prisma 7.0.0 and 7.0.1 have known issues with `prisma.config.ts` parsing, making CLI commands like `prisma migrate dev` and `prisma db push` fail even with correct configuration.

## Decision

We have migrated to Prisma 7.0.1 using the adapter pattern with the following approach:

### 1. Package Updates

```json
{
  "dependencies": {
    "@prisma/client": "^7.0.1",
    "@prisma/adapter-pg": "^7.0.1",
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "@types/pg": "^8.15.6",
    "prisma": "^7.0.1"
  }
}
```

### 2. Schema Configuration

**File**: `apps/backend/prisma/schema.prisma`

- Removed `url = env("DATABASE_URL")` from datasource block
- Updated generator output path to match pnpm virtual store:

  ```prisma
  generator client {
    provider = "prisma-client-js"
    output   = "../../../node_modules/.pnpm/@prisma+client@7.0.1_prisma@7.0.1_typescript@5.9.3/node_modules/.prisma/client"
  }

  datasource db {
    provider = "postgresql"
    // Prisma 7: URL configured in prisma.config.ts
    // At runtime, connection is passed via adapter in database.service.ts
  }
  ```

### 3. Runtime Database Service

**File**: `apps/backend/src/services/database.service.ts`

Implemented adapter-based connection:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export class DatabaseService extends PrismaClient {
  private static instance: DatabaseService;

  private constructor() {
    const connectionString = process.env['DATABASE_URL'] || 'postgresql://localhost:5432/mydb';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
}
```

### 4. Test Updates

Updated `apps/backend/src/tests/integration/database.test.ts` to use adapter pattern:

```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let pool: Pool;

beforeAll(() => {
  const connectionString =
    process.env['DATABASE_URL'] ||
    'postgresql://postgres:postgres@localhost:5432/nextnode?schema=public';
  pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  prisma = new PrismaClient({ adapter });
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});
```

### 5. Schema Synchronization Workaround

Due to CLI configuration parsing issues in Prisma 7.0.0/7.0.1, we created a manual SQL initialization script:

**File**: `apps/backend/prisma/init.sql`

This script creates all tables, indexes, and enum types directly in PostgreSQL, bypassing the broken `prisma migrate` and `prisma db push` commands.

**Applied via**: `docker exec -i devcontainer-db-1 psql -U postgres -d nextnode < init.sql`

### 6. Configuration File Attempts

We attempted to create `prisma.config.ts` at various locations with different formats:

- Root directory with `schema` path specification
- Both `.ts` and `.js` extensions
- CommonJS and ESM export formats
- With and without type annotations

**Result**: All attempts failed with "Failed to parse syntax of config file" error, indicating a Prisma CLI bug that requires upstream fix.

## Consequences

### Positive

1. **Better Connection Management**: Explicit control over PostgreSQL connection pool via `pg` driver
2. **Type Safety**: Full TypeScript support maintained with adapter pattern
3. **Future-Proof**: Aligned with Prisma's direction for edge computing and serverless
4. **Runtime Success**: Application and tests work correctly with Prisma 7 at runtime
5. **Test Results**: 22 unit tests passing (increased from 11), database integration tests working

### Negative

1. **CLI Limitations**: Cannot use `prisma migrate dev` or `prisma db push` due to config parsing bug
2. **Manual Schema Sync**: Must manually maintain SQL scripts or wait for Prisma CLI fix
3. **Complexity**: Additional dependencies (`@prisma/adapter-pg`, `pg`) and configuration
4. **Documentation Gap**: Limited official examples for monorepo + pnpm + adapter setup

### Workarounds Required

1. Schema changes must be applied via:
   - Manual SQL scripts
   - Direct database modifications
   - OR downgrade to Prisma 6 temporarily for migrations only
   - OR wait for Prisma 7.0.2+ with CLI fixes

## References

- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-7)
- [Database Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers#driver-adapters)
- [GitHub Issue #28573](https://github.com/prisma/prisma/issues/28573) - prisma.config.ts parsing issues
- [Prisma 7 Release Notes](https://github.com/prisma/prisma/releases/tag/7.0.0)

## Notes

- **Migration Date**: November 26, 2025
- **Prisma Versions**: 6.19.0 → 7.0.1
- **Node.js**: v24.5.0 (warning: Prisma recommends v25.0.0+)
- **Database**: PostgreSQL 16 (postgres:16-alpine)
- **Testing**: Vitest 4.0.12, integration tests passing with adapter pattern
