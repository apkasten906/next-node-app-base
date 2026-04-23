# ADR 018: Infra-only Docker for Local Development and E2E Testing

Status: Accepted
Date: 2026-04-23

## Context

The local development and E2E testing workflow originally supported two modes:

1. **Full Docker stack** — all services (postgres, redis, backend, frontend) run as containers via `docker-compose up`. This is the CI deployment mode.
2. **Pure local** — all processes run on the developer's machine; requires a locally-installed PostgreSQL and Redis instance.

Both modes had practical problems:

- **Full Docker** causes VS Code to freeze and slows down iteration:
  - Docker log streaming saturates the Docker Desktop API
  - Container rebuilds are required after every source change (no HMR)
  - `playwright.config.ts` `webServer` launch conflicts with already-running containers produce confusing errors
  - The overall resource cost (CPU/RAM) is high during active development
- **Pure local** requires each developer to install and maintain postgres and redis at the right versions, matching the exact credentials expected by the project. This is error-prone and undocumented.
- Neither mode was clearly documented, leading to inconsistent setup across contributors and CI differences.

An additional symptom: the postgres healthcheck was using `pg_isready`, which does not verify the target database exists. This caused PostgreSQL to log `FATAL: database "devuser" does not exist` at startup, which was misleading but non-blocking.

## Decision

We adopt **Pattern 2: infra-only Docker + local application processes** as the standard local development and E2E testing model.

### Model

```
┌─────────────────────────────────────┐
│  Docker (infrastructure layer only) │
│  ├─ postgres (port 5432)            │
│  └─ redis    (port 6379)            │
└─────────────────────────────────────┘
        ↑ connects
┌─────────────────────────────────────┐
│  Local processes (application layer)│
│  ├─ backend  pnpm --filter backend dev  (port 3001) │
│  └─ frontend pnpm --filter frontend dev (port 3000) │
└─────────────────────────────────────┘
        ↑ drives
┌─────────────────────────────────────┐
│  Playwright / VS Code Test Explorer │
└─────────────────────────────────────┘
```

### Implementation details

- `docker-compose.yml` uses [Compose profiles](https://docs.docker.com/compose/how-tos/profiles/) to separate infrastructure from application services:
  - Default profile (no `--profile`): starts `postgres` and `redis` only
  - `app` profile: additionally starts `backend` and `frontend` containers (for CI/staging validation only)
- `playwright.config.ts` uses `reuseExistingServer: true` locally and `false` in CI:
  - If a local backend/frontend is already running (e.g. `pnpm dev`), Playwright reuses it
  - Otherwise, Playwright starts the backend and frontend as child processes via `webServer`
- The backend `webServer` env in Playwright injects `REDIS_MOCK=true`, `DISABLE_QUEUES=true`, and `DISABLE_WEBSOCKETS=true`, so only the database is a hard dependency during E2E runs
- All credentials are standardised on `devuser`/`devpassword`/`nextnode_dev` to align `docker-compose.yml`, `.env.example`, and `apps/backend/.env.example`

### Starting infrastructure for local development

```powershell
# Start only postgres and redis (recommended — default profile)
docker-compose up -d

# Start the full application stack in containers (CI validation)
docker-compose --profile app up -d

# Stop all
docker-compose down
```

### Starting the application locally

```powershell
# From monorepo root — starts backend and frontend with hot-reload
pnpm dev
```

### Running Playwright E2E tests

```powershell
# Infrastructure must be running (docker-compose up -d)
# Then from the frontend package:
pnpm --filter frontend test:e2e

# Or use VS Code Test Explorer directly
```

## Consequences

### Positive

- VS Code no longer freezes: app processes are local Node.js, not Docker-managed
- Hot-module reloading works correctly during development
- `docker-compose up -d` (no flags) is safe and cheap — starts only the two infra containers
- No local PostgreSQL or Redis installation required
- Playwright `webServer` starts a clean backend/frontend with test-appropriate env flags
- Credentials and database names are consistent across all config files
- CI still has access to the full Docker stack via the `app` profile

### Negative

- Developers must have Docker Desktop running to work locally (acceptable; was already required)
- The postgres healthcheck now uses `psql SELECT 1` instead of `pg_isready`; slightly slower to pass on first boot

### Neutral

- The `devcontainer` setup already followed this model (only `db` and `redis` in its compose file); this ADR aligns the main `docker-compose.yml` with it
- Full-stack Docker (`--profile app`) remains available for CI validation and smoke testing against built images

## Alternatives Considered

### Alternative 1: Full Docker stack (previous default)

**Pros:**

- All dependencies encapsulated; no local installs needed
- Production-like environment

**Cons:**

- High resource usage causes VS Code freezing
- No HMR; slow dev iteration
- Playwright `webServer` conflicts with running containers

**Why rejected:** Developer experience is unacceptably degraded. CI is the appropriate environment for full-stack container tests.

### Alternative 2: Pure local (no Docker)

**Pros:**

- Fastest possible local processes
- No Docker dependency

**Cons:**

- Requires installing and managing postgres + redis locally at the right versions and credentials
- Cross-platform setup complexity (especially on Windows)
- Not reproducible across team members without significant documentation overhead

**Why rejected:** Too much setup friction. Docker is already a project dependency.

### Alternative 3: SQLite/in-process database for E2E

**Pros:**

- Zero infrastructure dependencies for tests

**Cons:**

- Prisma schema and migrations would need adapting for SQLite semantics
- Production uses PostgreSQL; test fidelity would be lower
- Redis-backed features (sessions, queues) still need an infra dependency

**Why rejected:** Not practical given Prisma + PostgreSQL + Redis architecture.

## Related

- [ADR 002: Turborepo Monorepo](./002-turborepo-monorepo.md)
- [ADR 012: Use Vitest as the Primary Test Runner](./012-testing-framework-vitest.md)
- [ADR 014: E2E Personas — JSON Overrides over Admin UI](./014-e2e-personas-json-over-admin-ui.md)
- [docs/TESTING.md](../TESTING.md)
- [docker-compose.yml](../../docker-compose.yml)
- [apps/frontend/playwright.config.ts](../../apps/frontend/playwright.config.ts)
