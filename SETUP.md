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

1. Start Postgres + Redis (only):

```bash
docker compose up -d postgres redis
```

1. Create local env files:

- Copy `apps/backend/.env.example` to `apps/backend/.env` (or export env vars another way).
- Copy `apps/frontend/.env.local.example` to `apps/frontend/.env.local` and ensure it contains at least:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret-change-in-production
```

1. Run migrations and start dev:

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

## Where To Look Next

- `docs/BDD.md` and `docs/BDD_IMPLEMENTATION_AUDIT.md` for BDD governance/tagging and audit scripts
- `docs/TESTING.md` and `docs/TEST_EXPLORER_GUIDE.md` for test running and VS Code integration
- `PROGRESS.md` for the current implementation status
