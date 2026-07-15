# Implementation Progress

## Architecture Decisions

Key architectural decisions are documented in [Architecture Decision Records (ADRs)](docs/adr/):

- [ADR-001: Node.js 25 for Native TypeScript Support](docs/adr/001-node-js-25-native-typescript.md) - Adopted Node.js 25 for native TypeScript execution

## Completed Phases

### ✅ Phase 1: Foundation & Governance

**Completed:** Initial commit (commit: 1200741)

- ✅ Initialize monorepo with Turborepo
- ✅ Set up pnpm workspaces
- ✅ Create frontend and backend apps
- ✅ Configure TypeScript (strict mode)
- ✅ Set up ESLint + Prettier + OWASP ESLint plugin
- ✅ Configure Husky + lint-staged + commitlint
- ✅ Create SECURITY.md and security governance docs
- ✅ Configure Dev Container
  - ✅ devcontainer.json with VSCode settings
  - ✅ docker-compose.yml for PostgreSQL, Redis
  - ✅ Dockerfile with Node.js, pnpm
  - ✅ Post-create script for dependencies
  - ✅ VSCode extensions configured
  - ✅ Port forwarding setup
  - ✅ Environment variables configured

### ✅ Phase 2: Security Framework

**Completed:** feat commit (commit: c6f9a8d)

- ✅ Implement DI container (TSyringe)
- ✅ Create security abstraction interfaces
  - ✅ Authentication (OAuth 2.0/OIDC, JWT)
  - ✅ Encryption service
  - ✅ Storage providers
  - ✅ Notification service
  - ✅ Search service
  - ✅ Event bus
  - ✅ Payment service
  - ✅ Analytics service
  - ✅ Secrets manager
  - ✅ Webhook service
  - ✅ Cache service
- ✅ Implement JWT service with refresh tokens
- ✅ Create encryption service (bcrypt + AES-256-GCM)
- ✅ Implement RBAC/ABAC authorization service
- ✅ Create authorization middleware
  - ✅ authenticate()
  - ✅ requireRole()
  - ✅ requirePermission()
  - ✅ requireAccess()
  - ✅ optionalAuth()
- ✅ Configure Helmet.js security headers
- ✅ Implement CORS configuration
- ✅ Create audit logging service
- ✅ Set up environment-based secrets manager

### ✅ Phase 3: Backend Core

The backend core is implemented and running.

- ✅ Express server bootstrapping with DI container
- ✅ Prisma + Postgres integration (migrations, client)
- ✅ Logging (Morgan + structured app logging)
- ✅ Health/readiness endpoints (`/health`, `/ready`) and metrics endpoint (`/metrics`)
- ✅ Swagger UI + OpenAPI spec endpoints (`/api-docs`, `/api-docs.json`)
- ✅ Webhook delivery service (HMAC signing/verification, queue-based delivery)
- ✅ WebSocket service (optional; can be disabled for E2E)
- ✅ File storage service with provider implementations

### ✅ Phase 10: Observability — Loki, Promtail, Alertmanager, Trace↔Log Correlation

**Completed:** PR #58 merged to master (May 2026)

- ✅ Loki deployment, config, service, and NetworkPolicy manifests
- ✅ Promtail DaemonSet with RBAC-narrowed ClusterRole, `/tmp` emptyDir, and log path glob
- ✅ Alertmanager deployment, config (updated to `matchers:` syntax), secret template, NetworkPolicy
- ✅ Prometheus NetworkPolicy Istio egress rules
- ✅ All observability NetworkPolicies updated with Istio sidecar egress (TCP 15012/15014)
- ✅ Grafana `tracesToLogsV2` datasource link wired to Loki for trace-to-log correlation
- ✅ Backend `injectTraceContext` Winston format step; `logger.service.test.ts` unit tests added
- ✅ ADR-020 authored and index regenerated

### ✅ Chore: DevContainer Toolchain Alignment

**Completed:** PR #59 merged to master (May 2026)

- ✅ pnpm engine constraint raised to `>=11.0.0`; `packageManager` pinned to `pnpm@11.1.3+sha512`
- ✅ Devcontainer extensions list reorganised with labelled sections
- ✅ `openai.chatgpt` extension added under AI section
- ✅ Spell-check word list additions

### ✅ Chore: Turborepo v2 Upgrade and pnpm 11 Toolchain Alignment

**Completed:** PR #60 merged to master (May 2026)

- ✅ `turbo` upgraded from `^1.11.3` to `2.9.14`
- ✅ `turbo.json` `pipeline` key renamed to `tasks` (Turborepo v2 breaking rename)
- ✅ pnpm version unified to `11.1.3` across root `package.json`, CI workflows, and devcontainer
- ✅ Orphaned `node_modules/turbo-windows-64` directory removed (was causing ghost v1.13.4 resolution)
- ✅ ADR-003 and `CONTRIBUTING.md` updated with corepack hash discipline

## Current Focus / Next Steps

### Current Objective: BDD Base-Repo Scenario Coverage Complete

**Goal:** Promote all base-repo scenarios to `@ready`. Adopter scenarios remain `@wip @adopter` permanently — they are implementation guides for teams forking the template, not coverage obligations here. See [plan prompt](/.github/prompts/plan-nextNodeAppBase.prompt.md) section N for the full base-vs-adopter scope tables.

**Current tracked status (July 8, 2026):** backend 139/265 ready; frontend 32/122 ready; overall 171/387 ready. Frontend/security adopter-only scenarios are explicitly classified with `@adopter`.

**Priority order** (highest coverage gap first):

| #   | Feature                   | Base ready / Base total | Gap | Status                 |
| --- | ------------------------- | ----------------------- | --- | ---------------------- |
| 1   | 14-websocket              | 18 / 18                 | 0   | ✅ Base slice complete |
| 2   | 10-observability          | 19 / 19                 | 0   | ✅ Base slice complete |
| 3   | 08-file-storage           | 11 / 11                 | 0   | ✅ Base slice complete |
| 4   | 06-notifications          | 5 / 5                   | 0   | ✅ Base slice complete |
| 5   | 02-security               | 9 / 9                   | 0   | ✅ Base slice complete |
| 6   | 13-message-queue          | 10 / 10                 | 0   | ✅ Base slice complete |
| 7   | 11-advanced-testing       | 8 / 8                   | 0   | ✅ Base slice complete |
| 8   | 12-kubernetes-devops      | 10 / 10                 | 0   | ✅ Base slice complete |
| 9   | Frontend base (~32 total) | 32 / 32                 | 0   | ✅ Base slice complete |

**BDD prerequisite before frontend auth scenarios:** ✅ ADR-011 backend auth contract coverage added via `@impl_backend_only_auth_contract`, with deterministic checks for `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, HttpOnly/SameSite cookie behavior, refresh-token flow, and frontend server-gateway cookie forwarding to `/api/auth/me`. This keeps frontend auth coverage aligned with backend-only auth instead of old NextAuth assumptions.

**Already complete:**

- ✅ 01-foundation — 11/11
- ✅ 03-backend-core — 19/19 (15 ready; 4 remaining are `@wip` adopter scenarios)
- ✅ 05-testing — infrastructure scenarios covered
- ✅ 07-api-design — ~13/19 base scenarios ready
- ✅ Frontend: 01-i18n — 1/1
- ✅ Frontend: 04-nextjs-frontend — first base batch ready: App Router, ADR-011 backend-only auth setup/login, dashboard auth gateway, TanStack Query provider, Tailwind wiring, metadata, route handler, and middleware
- ✅ Frontend: 04-error-handling — first base batch ready: global error boundary, 404 page, 500 error page, retry recovery, JavaScript error logging, and accessible error messages
- ✅ Frontend: 09-frontend-core — expanded base batch ready: type-safe API client, error-boundary recovery, loading state, debounce hook, TanStack Query caching, offline detection, semantic accessibility, keyboard navigation, and form validation
- ✅ Frontend: 04-nextjs-frontend — final base batch ready: responsive layout, route-level authentication, custom error pages, and loading UI
- ✅ BDD classification cleanup — adopter-only frontend/security scenarios are tagged `@adopter` and remain `@wip` guidance
- ✅ 10-observability — 19/19 base scenarios ready; ELK, Sentry, and runtime profiling classified as adopter concerns
- ✅ 08-file-storage — 11/11 base scenarios ready; cloud providers, authenticated file APIs, prefix/pagination/copy/move, and provider switching remain adopter guides
- ✅ 06-notifications — 5/5 base scenarios ready; SendGrid/Twilio/FCM, templates, attachments, bulk sends, provider switching, and failure UX remain adopter guides
- ✅ 13-message-queue — 10/10 base scenarios ready; domain-specific job types and event handlers remain adopter guides
- ✅ 11-advanced-testing — 8/8 base scenarios ready; visual regression, accessibility, mutation, chaos, monkey, property-based, approval, factory, distributed, and flaky-test workflows remain adopter guides
- ✅ 12-kubernetes-devops — 10/10 base scenarios ready; ingress, HPA/VPA, rollback, stateful workloads, production deployment strategies, GitOps, vault, notifications, service mesh, operators, backup, and cost optimization remain adopter guides

### Up Next

- [ ] E2E personas moderator (`chore/e2e-personas-moderator`) — resume now that BDD base coverage and adopter classification cleanup are complete; `moderator` persona + `MODERATOR` role branch has one commit ready and then needs PR, green CI, and merge
- [ ] Contract package extraction — promote stable DTOs into `@repo/contracts` once `fasciculum-instrumentorum` fork proves reuse
- [ ] Phase 11 Feature Management System — `IFeatureFlagService`, evaluation engine, flag CRUD API, React hooks; begin with ADR and interface contracts

## Technology Stack Implemented

### Dependencies Installed

**Production:**

- tsyringe: 4.10.0
- reflect-metadata: 0.2.2
- jsonwebtoken: 9.0.2
- bcrypt: 6.0.0
- helmet: 8.1.0
- passport: 0.7.0
- passport-oauth2: 1.8.0
- passport-jwt: 4.0.1
- passport-local: 1.0.0
- express: 5.1.0

**Development:**

- typescript: 5.9.3
- @types/node: 24.10.1
- @types/express: 5.0.5
- @types/jsonwebtoken: 9.0.10
- @types/bcrypt: 6.0.0
- @types/passport: 1.0.17
- @types/passport-jwt: 4.0.1
- @types/passport-local: 1.0.38
- @types/passport-oauth2: 1.8.0
- eslint: 9.39.1
- @typescript-eslint/eslint-plugin: 8.47.0
- @typescript-eslint/parser: 8.47.0
- eslint-plugin-security: 3.0.1
- prettier: 3.6.2

### Project Structure

```
next-node-app-base/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── container.ts                    # DI container setup
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts          # Auth middleware
│   │   │   │   └── security.middleware.ts      # Security headers
│   │   │   ├── services/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── jwt.service.ts          # JWT generation/validation
│   │   │   │   │   ├── encryption.service.ts   # Encryption/hashing
│   │   │   │   │   └── authorization.service.ts # RBAC/ABAC
│   │   │   │   ├── audit/
│   │   │   │   │   └── audit-log.service.ts    # Security audit logs
│   │   │   │   └── secrets/
│   │   │   │       └── secrets-manager.service.ts
│   │   │   └── tsconfig.json
│   │   └── package.json
│   └── frontend/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── types/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── authentication.ts
│   │   │   │   ├── encryption.ts
│   │   │   │   ├── storage.ts
│   │   │   │   ├── notification.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── event-bus.ts
│   │   │   │   ├── payment.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── secrets.ts
│   │   │   │   ├── webhook.ts
│   │   │   │   └── cache.ts
│   │   │   └── types/
│   │   │       └── common.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── utils/
│   ├── constants/
│   └── config/
├── .devcontainer/
│   ├── devcontainer.json
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── post-create.sh
├── .vscode/
│   ├── extensions.json
│   └── settings.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── .nvmrc
├── tsconfig.base.json
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── README.md
├── SECURITY.md
├── CONTRIBUTING.md
├── LICENSE
├── CHANGELOG.md
└── SETUP.md
```

## Security Features Implemented

### Authentication & Authorization

- ✅ JWT-based authentication (access + refresh tokens)
- ✅ Password hashing with bcrypt
- ✅ Role-Based Access Control (RBAC)
- ✅ Attribute-Based Access Control (ABAC)
- ✅ Permission-based authorization
- ✅ OAuth 2.0/OIDC ready (Passport.js installed)

### Encryption & Security

- ✅ AES-256-GCM encryption
- ✅ Bcrypt password hashing (10 rounds default)
- ✅ Secure random token generation
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Content Security Policy

### Audit & Compliance

- ✅ Security audit logging service
- ✅ Authentication event logging
- ✅ Authorization event logging
- ✅ Data access logging
- ✅ Security event tracking

### Infrastructure Security

- ✅ Environment-based secrets manager
- ✅ Secret rotation support
- ✅ Secret versioning
- ✅ Secrets metadata management

## Configuration Examples

### Environment Variables Required

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=your-encryption-key-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Usage Examples

### Authentication Middleware

```typescript
import { authenticate, requireRole, requirePermission } from './middleware/auth.middleware';

// Protect route with authentication
app.get('/api/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Require specific role
app.get('/api/admin', authenticate, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin only' });
});

// Require specific permission
app.post('/api/posts', authenticate, requirePermission('posts:create'), (req, res) => {
  res.json({ message: 'Post created' });
});
```

### JWT Service

```typescript
import { container } from './container';
import { JwtService } from './services/auth/jwt.service';

const jwtService = container.resolve(JwtService);

// Generate tokens
const tokens = jwtService.generateTokens({
  userId: '123',
  email: 'user@example.com',
  roles: ['user'],
  permissions: ['posts:read', 'posts:create'],
});

// Validate token
const payload = await jwtService.validateAccessToken(accessToken);
```

### Audit Logging

```typescript
import { container } from './container';
import { AuditLogService, AuditAction } from './services/audit/audit-log.service';

const auditLog = container.resolve(AuditLogService);

// Log authentication event
await auditLog.logAuth({
  userId: '123',
  action: AuditAction.LOGIN,
  success: true,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// Log authorization event
await auditLog.logAuthz({
  userId: '123',
  action: AuditAction.ACCESS_GRANTED,
  resource: 'posts',
  resourceId: 'post-456',
  success: true,
});
```

## Git History

```
c6f9a8d - feat: implement Phase 2 - Security Framework
1200741 - chore: initial commit with Phase 1 complete - Foundation & Governance
```
