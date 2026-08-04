# Next.js + Node.js Monorepo Base Template

A production-oriented starter repository for a Next.js frontend and an Express backend, managed as a pnpm workspace with Turborepo.

## Included

- Next.js App Router frontend with TypeScript, Tailwind CSS, TanStack Query, and internationalization
- Express backend with Prisma/PostgreSQL, Redis integration, JWT authentication, RBAC/ABAC, and Swagger
- Shared workspace packages for types, configuration, constants, and utilities
- Vitest, Playwright, and Cucumber BDD testing and governance
- Docker Compose, Kubernetes examples, and a Prometheus/Grafana/Jaeger/Loki observability stack
- Changesets package versioning with a reviewable Version Packages pull request
- Security, ADR, workflow-linting, and dependency-governance foundations

Adopter-specific scenarios remain tagged @wip @adopter as implementation guides. See [PROGRESS.md](PROGRESS.md) for current scope and priorities.

## Prerequisites

- Node.js 25 or newer
- pnpm 11, using the version declared by packageManager in [package.json](package.json)
- Docker with Docker Compose

Corepack is the recommended way to activate the repository's pnpm version:

```bash
corepack enable
corepack install
```

## Quick Start

```bash
git clone https://github.com/apkasten906/next-node-app-base.git
cd next-node-app-base
pnpm install

cp .env.docker.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

Start the full Docker Compose environment:

```bash
docker compose up --build
```

Or run the applications locally while PostgreSQL and Redis run in Docker:

```bash
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Frontend: <http://localhost:3000>
- Backend health: <http://localhost:3001/health>
- API documentation: <http://localhost:3001/api-docs>

PostgreSQL and Redis are internal-only by default. See [Docker documentation](docs/DOCKER.md) for host-port overrides. For a Dev Container setup, open the repository in VS Code with the Dev Containers extension and select **Reopen in Container**.

## Common Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:bdd
pnpm bdd:status
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm changeset
pnpm changeset:status
```

Install Playwright browsers before the first E2E run:

```bash
pnpm --filter frontend exec playwright install
```

## Workspace Layout

```text
next-node-app-base/
|-- apps/
|   |-- backend/
|   +-- frontend/
|-- packages/
|   |-- config/
|   |-- constants/
|   |-- types/
|   +-- utils/
|-- docs/
|-- kubernetes/
|-- scripts/
+-- .github/
```

Applications consume shared packages through pnpm's workspace protocol. Workspace packages are currently private, which prevents accidental registry publication; this does not affect using the repository as a public GitHub template.

## Testing and BDD

Playwright starts the frontend and backend automatically for E2E runs and uses deterministic seed personas. CI exercises Chromium, Firefox, and WebKit on Linux, plus selected Windows and macOS projects.

BDD status:

- @ready: implemented base-repository behavior in the default BDD gate
- @wip @adopter: guidance for applications created from this template
- @manual: behavior requiring manual verification

The [BDD implementer coverage reference](docs/BDD.md#implementer-coverage-reference) explains how to browse every scenario and isolate the `@wip @adopter` implementation backlog in the admin-only BDD dashboard. See also the [testing documentation](docs/TESTING.md) and [E2E guide](apps/frontend/docs/E2E_TESTING.md).

## Versioning and Publishing

Changesets manages package versions independently:

1. Run pnpm changeset in a pull request that changes a workspace package's public behavior.
2. When preparing a release, manually run the Version Packages workflow to open or update the release PR from changesets accumulated on master.
3. Merge the release PR to update package versions and changelogs.
4. Publish explicitly through the Publish Packages workflow after the intended package is marked publishable.

Repository/template releases are separate Git tags and GitHub releases. Repository-only documentation, CI, and tooling changes do not require artificial package changesets. See [Publishing Packages](docs/PUBLISHING.md).

## Documentation

- [Setup](SETUP.md)
- [Security policy](SECURITY.md)
- [Security governance](docs/security-governance.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Authorization](docs/ABAC_GUIDE.md)
- [Docker](docs/DOCKER.md)
- [File storage](docs/FILE_STORAGE.md)
- [Notifications](docs/NOTIFICATION_SERVICE.md)
- [Queues](docs/QUEUE_SYSTEM.md)
- [WebSockets](docs/WEBSOCKET.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development standards and the pull-request process. File bugs and feature requests in [GitHub Issues](https://github.com/apkasten906/next-node-app-base/issues).

## License

This project is licensed under the [MIT License](LICENSE).
