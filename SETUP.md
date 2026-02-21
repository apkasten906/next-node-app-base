# Setup Instructions

This repo is a working Next.js + Node.js monorepo (frontend + backend), with Docker, BDD governance tooling, and test infrastructure already in place.

## Prerequisites

- Node.js 25+
- pnpm 8+
- Docker + Docker Compose

## Option A: Docker Compose (fastest)

Runs Postgres + Redis + backend + frontend.

```bash
pnpm install
docker compose up --build
```

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:3001/health>

See `docs/DOCKER.md` for details and overrides.

## Option B: Local dev servers + Docker dependencies

1. Install dependencies:

```bash
pnpm install
```

2. Start Postgres + Redis (only):

```bash
docker compose up -d postgres redis
```

3. Create local env files:

- Copy `apps/backend/.env.example` to `apps/backend/.env` (or export env vars another way).
- Copy `apps/frontend/.env.local.example` to `apps/frontend/.env.local` and ensure it contains at least:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret-change-in-production
```

4. Run migrations and start dev:

```bash
pnpm db:migrate
pnpm dev
```

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
pnpm format:check
pnpm typecheck
```

## Frontend build verification

- Build command: `pnpm -w -C apps/frontend run build`
- Status: Verified locally (originally on branch `chore/ci-dry-workflows`, merged in PR #29) — the Next.js production build completes successfully.
- Windows caveat: On Windows the build may require Developer Mode to allow creation of filesystem symlinks. If Developer Mode is not enabled you can see `EPERM` errors during linking. Some setups may also emit a "IO error: provided value is too long when setting link name" warning for certain symlinked files; the build artifacts are still produced. Workarounds:
  - Enable Windows Developer Mode (recommended for native Windows development).
  - Use WSL2 or a Linux/macOS CI runner to avoid Windows symlink/long-path issues.

Reproduce locally:

```bash
pnpm -w -C apps/frontend run build
```

## Where To Look Next

- `docs/BDD.md` and `docs/BDD_IMPLEMENTATION_AUDIT.md` for BDD governance/tagging and audit scripts
- `docs/CORRELATION_ID.md` for request tracing via `X-Correlation-ID` (plus ADR 013)
- `docs/TESTING.md` and `docs/TEST_EXPLORER_GUIDE.md` for test running and VS Code integration
- `PROGRESS.md` for the current implementation status
