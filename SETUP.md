# Setup Instructions

## ✅ Installation Complete!

Your Next.js + Node.js monorepo base template is now set up and ready for development.

## What's Been Set Up

- ✅ Node.js 25 for native TypeScript support ([ADR-001](docs/adr/001-node-js-25-native-typescript.md))
- ✅ pnpm package manager (v8.15.0)
- ✅ Turborepo monorepo configuration
- ✅ Workspace structure (apps/frontend, apps/backend, packages/\*)
- ✅ Git hooks with Husky
- ✅ Conventional commits with Commitlint
- ✅ Code formatting with Prettier
- ✅ Lint-staged for pre-commit checks

## Project Structure

```
next-node-app-base/
├── apps/
│   ├── frontend/          # Next.js application (placeholder)
│   └── backend/           # Node.js API (placeholder)
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Common utilities
│   ├── constants/         # Shared constants
│   └── config/            # Shared configurations
├── .github/
│   └── prompts/
│       └── plan-nextNodeAppBase.prompt.md  # Complete implementation plan
└── (root config files)
```

## Available Commands

```powershell
# Development
pnpm dev                    # Start all apps in dev mode
pnpm dev:frontend           # Start only frontend
pnpm dev:backend            # Start only backend

# Building
pnpm build                  # Build all apps

# Testing
pnpm test                   # Run all tests
pnpm test:unit              # Run unit tests
pnpm test:integration       # Run integration tests
pnpm test:e2e               # Run E2E tests

# Code Quality
pnpm lint                   # Lint all code
pnpm lint:fix               # Fix linting issues
pnpm format                 # Format code with Prettier
pnpm typecheck              # Run TypeScript type checking

# Utilities
pnpm clean                  # Clean all build artifacts
```

## Next Steps

Follow the comprehensive plan in `.github/prompts/plan-nextNodeAppBase.prompt.md` to implement:

### Phase 1: Foundation (Start Here)

1. **Set up TypeScript configurations** for apps and packages
2. **Configure ESLint** with OWASP security rules
3. **Initialize Git repository** and make first commit
4. **Set up Dev Container** for consistent development environment

### Phase 2: Backend Core

1. **Initialize Express server** with TypeScript
2. **Set up Prisma** with PostgreSQL
3. **Implement authentication** with OAuth 2.0/OIDC
4. **Add security middleware** (Helmet, CORS, etc.)

### Phase 3: Frontend Core

1. **Initialize Next.js 14+** with App Router
2. **Set up NextAuth.js** for authentication
3. **Configure Tailwind CSS** for styling
4. **Implement i18n** with next-i18next

### Phase 4: Infrastructure

1. **Set up Docker Compose** for local development
2. **Configure Kubernetes** manifests
3. **Install Istio** service mesh
4. **Set up CI/CD** with GitHub Actions

### Phase 5: Testing

1. **Configure Vitest** for unit tests
2. **Set up Playwright** for E2E tests
3. **Integrate Pact** for contract testing
4. **Add OWASP ZAP** for security testing

## Documentation

All documentation is available in the repository:

- **Implementation Plan**: `.github/prompts/plan-nextNodeAppBase.prompt.md`
- **Security Policy**: `SECURITY.md`
- **Contributing Guide**: `CONTRIBUTING.md`
- **Changelog**: `CHANGELOG.md`

## Quick Start Development

Once you implement the apps, you can start development with:

```powershell
# 1. Start development services (PostgreSQL, Redis, etc.)
docker-compose up -d

# 2. Run database migrations
pnpm db:migrate

# 3. Start all development servers
pnpm dev
```

## Need Help?

- 📖 Read the complete plan: `.github/prompts/plan-nextNodeAppBase.prompt.md`
- 🔒 Security concerns: See `SECURITY.md`
- 🤝 Want to contribute: See `CONTRIBUTING.md`
- 📝 View changes: See `CHANGELOG.md`

## Verification

Your setup is working if:

- ✅ `node --version` returns v25.x.x or higher
- ✅ `pnpm --version` returns a version number
- ✅ `pnpm dev` runs without errors (currently shows placeholder messages)
- ✅ Git hooks are installed in `.husky/`
- ✅ All workspace packages are linked

## Node.js 25 Native TypeScript

This project uses Node.js 25 for native TypeScript execution. See [ADR-001](docs/adr/001-node-js-25-native-typescript.md) for details.

**Development:**
```bash
# Run TypeScript files natively
node --experimental-strip-types src/index.ts
```

**Production:**
```bash
# Still transpile for optimization
pnpm build
pnpm start
```

---

**You're all set! Start implementing Phase 1 from the plan. 🚀**
