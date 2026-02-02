# Next.js + Node.js Monorepo Base Template

A production-ready base repository for rapidly starting new web applications with a Next.js frontend, Node.js backend, comprehensive testing, and DevOps infrastructure.

## Features

This template includes both implemented functionality and scaffolding for planned components.

### Implemented

- Monorepo: Turborepo with pnpm workspaces
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend: Express + TypeScript + Prisma
- Docker: Docker Compose + multi-stage Dockerfiles
- BDD: Cucumber features + status/implementation governance tooling + dashboard
- Tests: Vitest (backend) and Playwright (E2E)

### Scaffolded / Planned

- Contract tests (Pact)
- Security testing (OWASP ZAP)
- Load testing (k6)
- Additional deployment/observability building blocks (Kubernetes/Istio manifests and docs)

## Quick Start

### Prerequisites

- Node.js 25+ (for native TypeScript support - see [ADR-001](docs/adr/001-node-js-25-native-typescript.md))
- pnpm 8+
- Docker & Docker Compose
- VSCode (recommended for Dev Containers)

### Option 1: Dev Container (Recommended)

1. Install [VSCode](https://code.visualstudio.com/) and [Docker](https://www.docker.com/)
2. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Clone the repository
4. Open in VSCode and click "Reopen in Container"
5. Wait for the container to build and dependencies to install
6. Start developing

### Option 2: Local Setup

```bash
# Clone the repository
git clone <repository-url>
cd next-node-app-base

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.development
# Edit .env.development with your configuration

# Start development services (PostgreSQL, Redis, etc.)
docker compose up -d

# Run database migrations
cd apps/backend
pnpm prisma migrate dev

# Seed the database
pnpm prisma db seed

# Start the development servers
cd ../..
pnpm dev
```

Note: By default, Postgres/Redis are not published to localhost ports (to avoid conflicts with existing local services). See `docs/DOCKER.md` for how to expose ports via an override file if you need host access.

## Project Structure

```
next-node-app-base/
├── .devcontainer/          # Dev Container configuration
├── apps/
│   ├── frontend/           # Next.js application
│   └── backend/            # Node.js API
├── packages/               # Shared packages
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Common utilities
│   ├── constants/          # Shared constants
│   └── config/             # Shared configurations
├── kubernetes/             # Kubernetes + Istio manifests
├── docs/                   # Documentation
└── scripts/                # Repo scripts (linting, BDD status/audit, etc.)
```

## Development

### Available Scripts

````bash
# Development
pnpm dev                    # Start all apps in development mode
pnpm dev:frontend           # Start only frontend
pnpm dev:backend            # Start only backend

# Building
pnpm build                  # Build all apps
pnpm build:frontend         # Build frontend
pnpm build:backend          # Build backend

# Testing

## First-Time Setup

Install Playwright browsers (required for E2E tests):

```bash
# Windows
.\scripts\setup-playwright.ps1

# Linux/Mac
./scripts/setup-playwright.sh

# Or manually
pnpm playwright install
````

## Running Tests

**Important for E2E tests:** Playwright automatically starts both frontend and backend servers before running tests. No manual server startup required!

```bash
pnpm test                   # Run all tests
pnpm test:unit              # Run unit tests
pnpm test:integration       # Run integration tests
pnpm test:e2e               # Run E2E tests (automatically starts servers)
pnpm test:e2e:ui            # Run E2E tests in interactive UI mode
pnpm test:e2e:debug         # Run E2E tests in debug mode
pnpm test:contract          # Run contract tests
pnpm test:security          # Run security tests
pnpm test:load              # Run load tests (requires k6 + scenarios; scaffolded)
```

**E2E Test Details:**

- Runs across multiple browser projects (Chromium, Firefox, WebKit, mobile emulation)
- Servers auto-start: Backend (port 3001) + Frontend (port 3000)
- Tests wait for servers to be ready before executing
- Servers auto-shutdown after tests complete

See [TEST_EXPLORER_GUIDE.md](docs/TEST_EXPLORER_GUIDE.md) for VSCode Test Explorer setup.

#### Code Quality

pnpm lint # Lint all code
pnpm lint:fix # Fix linting issues
pnpm lint:workflows # Lint GitHub Actions workflows (actionlint)
pnpm format # Format code with Prettier
pnpm typecheck # Run TypeScript type checking

#### Database

pnpm db:migrate # Run database migrations
pnpm db:seed # Seed database
pnpm db:studio # Open Prisma Studio
pnpm db:reset # Reset database

```

### Git hooks

This repository uses Husky hooks to enforce linting, commit message rules, and a fast test gate before pushing.

- `pre-commit`: runs `lint-staged` (Prettier + ESLint) and a quick TypeScript check on `apps/backend`.
- `commit-msg`: runs `commitlint` to enforce conventional commit messages.
- `pre-push`: runs a quick mocked backend test run via `scripts/run-backend-tests-ci.js` which sets `TEST_EXTERNAL_SERVICES=false` and `REDIS_MOCK=true`.

If a hook fails, fix the issues locally and re-run the commands. CI runs the same checks and will block merges if they fail.

## Security

This project follows OWASP security standards and best practices:

- **Governance**: OWASP-oriented security governance docs and standards
- **Security Headers**: Helmet.js baseline middleware
- **Authorization**: RBAC/ABAC services and middleware
- **Encryption**: Encryption/hashing services for secrets and credentials
- Planned/scaffolded: Istio mTLS integration, dependency scanning, OWASP ZAP DAST

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Documentation

Docs live in `docs/` (plus some app-specific docs under `apps/*/docs/`). Start here:

- `docs/BDD.md`
- `docs/BDD_IMPLEMENTATION_AUDIT.md`
- `docs/DOCKER.md`
- `docs/TESTING.md`
- `docs/TEST_EXPLORER_GUIDE.md`
- `docs/WEBSOCKET.md`
- `docs/security-governance.md`
- ADRs: `docs/adr/`

## Internationalization

The application supports multiple languages:

- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)

Translations live under `apps/frontend/public/locales/` and i18n configuration is in `apps/frontend/i18n.ts`.

## Deployment

### Deployment Strategies

Kubernetes/Istio deployment content is included as scaffolding and examples (for example, see the Verdaccio manifests).

- **Blue-Green**: Zero-downtime deployments with instant rollback
- **Canary**: Gradual traffic shifting (5% → 25% → 50% → 100%)
- **A/B Testing**: User segment-based routing

See:

- `docs/DOCKER.md` for local Docker workflows
- `kubernetes/verdaccio/README.md` for a Kubernetes + Istio example

### Environments

- **Development**: Local development with Docker Compose
- **Staging**: Kubernetes cluster with Istio (pre-production)
- **Production**: Kubernetes cluster with Istio (high availability)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow
- Pull request process
- Coding standards
- Commit message conventions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with amazing open-source technologies:

- [Next.js](https://nextjs.org/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [Turborepo](https://turbo.build/)
- [Istio](https://istio.io/)
- [Kubernetes](https://kubernetes.io/)
- And many more...

## Support

- 📧 Email: support@example.com
- 💬 Slack: [Join our community](#)
- 📖 Wiki: [Project Wiki](#)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/next-node-app-base/issues)

---

**⭐ If this template helps you, please give it a star!**
```
