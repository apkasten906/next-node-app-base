# Plan: Reusable Platform Extraction and UI/API Boundary Cleanup

## Objective

Reframe this repository from a single reusable app template into a reusable platform source that can seed future applications such as `the-azure-citadel` without carrying accidental app-specific coupling.

This plan is analysis-first. It does not authorize destructive moves. It should guide safe, incremental refactoring.

## Guardrails

- Do not start with broad file moves or package splits.
- Preserve current behavior wherever possible.
- Prefer small, reversible changes with focused validation.
- Keep TypeScript explicit.
- Use self-documenting names over clever abstractions.
- Document architectural reasoning as decisions are made.
- Enforce the boundary rule: UI components must not directly call backend or auth endpoints.

## A. Current Structure

### Workspace shape

- `apps/frontend`: Next.js app-router frontend with pages in `app/`, presentational components in `components/`, transport code in `lib/`, and a small hook layer in `hooks/` and `src/hooks/`.
- `apps/backend`: Express + TSyringe backend with routes, middleware, services, repositories, Prisma schema, and observability code under `src/`.
- `packages/types`: the only materially implemented shared package today; contains contracts and interfaces reused across frontend and backend.
- `packages/config`, `packages/utils`, `packages/constants`: present but largely placeholders and not yet meaningful shared-platform packages.
- `.github`, `scripts`, `docker-compose.yml`, `kubernetes/`, root lint/build/test config: repo-level delivery and infrastructure assets.
- `docs/` and ADRs: substantial architectural and operational documentation.

### Frontend shape today

- `app/` contains route files and server-rendered pages.
- `components/` mixes presentation with some application behavior.
- `lib/api-client.ts` already provides a useful transport abstraction.
- `hooks/use-api.ts` uses the API client correctly for resource operations.
- Some pages and one client component bypass the intended abstraction layers and call endpoints directly.

### Backend shape today

- `src/routes` exposes HTTP endpoints.
- `src/services` holds most domain and infrastructure behavior.
- `src/middleware` and `src/security` handle cross-cutting concerns.
- `src/infrastructure/observability` is already separated in a portable way.
- `src/container.ts` wires shared services centrally.

## B. Classification

### Portable code

- `packages/types/src/**`
  Reason: shared contracts, interfaces, websocket types, notification/storage/auth abstractions are already cross-app by design.
- `apps/backend/src/services/auth/authorization.service.ts`
- `apps/backend/src/services/auth/policy-engine.service.ts`
- `apps/backend/src/services/auth/policy-store.service.ts`
- `apps/backend/src/services/auth/jwt.service.ts`
- `apps/backend/src/services/auth/encryption.service.ts`
  Reason: these are reusable platform security services with minimal app-branding.
- `apps/backend/src/services/audit/audit-log.service.ts`
- `apps/backend/src/infrastructure/observability/**`
- `apps/backend/src/middleware/correlation-id.middleware.ts`
- `apps/backend/src/middleware/metrics.middleware.ts`
- `apps/backend/src/utils/hateoas.ts`
  Reason: platform cross-cutting concerns.
- `apps/backend/src/services/storage/**`
- `apps/backend/src/services/notification/**`
- `apps/backend/src/services/queue/**`
- `apps/backend/src/services/webhook/**`
- `apps/backend/src/services/secrets/**`
  Reason: provider abstractions and service adapters are strong package candidates.
- `apps/frontend/lib/api-client.ts`
- `apps/frontend/lib/correlation-id.ts`
- `apps/frontend/lib/correlation-id-policy.ts`
- `apps/frontend/lib/error-logger.ts`
- `apps/frontend/src/hooks/useWebSocket.ts`
  Reason: these are reusable frontend platform primitives.

### Portable infra/template assets

- `.github/workflows/**`
- `.github/actions/**`
- `.github/CODEOWNERS`
- `.github/prompts/**`
- root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.js`
- `docker-compose.yml`
- `scripts/**`
- `kubernetes/**`
- `docs/adr/**`
- repo-wide setup and governance docs such as `SETUP.md`, `SECURITY.md`, `CONTRIBUTING.md`
  Reason: these define delivery, governance, and runtime scaffolding that future apps can inherit or sync.

### App-specific code

- `apps/frontend/app/page.tsx`
- `apps/frontend/app/layout.tsx`
- `apps/frontend/app/dashboard/**`
- `apps/frontend/app/auth/**`
- `apps/frontend/components/home-client.tsx`
- `apps/frontend/components/dashboard-client.tsx`
- `apps/frontend/components/language-switcher.tsx`
- translation content and app copy under the frontend app
  Reason: routes, UX, branding, copy, and app flow should remain app-local.
- `apps/backend/src/controllers/user.controller.ts`
- `apps/backend/src/repositories/user.repository.ts`
- `apps/backend/src/routes/users.routes.ts`
- `apps/backend/src/routes/user.routes.ts`
- `apps/backend/src/routes/users-v2.routes.ts`
- `apps/backend/prisma/schema.prisma`
  Reason: resource model, route surface, and schema are application-specific until proven otherwise.
- `apps/backend/src/routes/bdd-admin.routes.ts`
- `apps/frontend/app/dashboard/bdd/**`
  Reason: governance UI and admin endpoints are repo-specific tooling, not product-platform code.

### Boundary cleanup needed

- `apps/frontend/components/signin-client.tsx`
  Issue: client UI performs direct auth POST.
- `apps/frontend/app/dashboard/page.tsx`
  Issue: server page performs direct auth session fetch.
- `apps/frontend/app/dashboard/bdd/page.tsx`
  Issue: server page performs direct auth fetch and direct admin API fetch.
- `apps/frontend/components/*`
  Rule going forward: presentational components may receive callbacks and view models, but may not own endpoint URLs, cookies, or auth transport.

## C. Direct UI Endpoint Calls

### Confirmed direct calls from UI-facing code

- `apps/frontend/components/signin-client.tsx`
  Direct call: `POST ${baseUrl}/api/auth/login`
  Problem: the component owns auth endpoint knowledge, correlation header setup, request body shape, and redirect behavior.
- `apps/frontend/app/dashboard/page.tsx`
  Direct call: `GET ${baseUrl}/api/auth/me`
  Problem: the route component owns auth/session transport and cookie forwarding instead of delegating to a server-side application service.
- `apps/frontend/app/dashboard/bdd/page.tsx`
  Direct call: `GET ${baseUrl}/api/auth/me`
  Direct call: `GET ${baseUrl}/api/admin/bdd/status`
  Problem: the page mixes rendering, authorization gating, cookie propagation, and backend transport.

### Calls that are acceptable or near-acceptable

- `apps/frontend/hooks/use-api.ts`
  Uses `apiClient` rather than raw endpoint calls. This is aligned with the desired direction, though the hook layer can be renamed toward application intent over generic transport naming.
- `apps/frontend/lib/api-client.ts`
  Direct fetch is expected here. This is the transport boundary, not a UI boundary violation.
- `apps/frontend/lib/error-logger.ts`
  Sends browser-side logging through a local route. This is cross-cutting infrastructure, not presentation logic.

## D. Target Architecture

Use a layered structure that separates presentation, application intent, transport, and platform code.

### Target frontend layering

`UI component`
→ `presentation hook or view-model interface`
→ `application service`
→ `API client / server gateway`
→ `endpoint calls`

### Practical frontend shape

```text
apps/frontend/
  app/
    ... route entries only
  components/
    ... pure or mostly pure UI
  src/
    application/
      auth/
      dashboard/
      users/
    hooks/
      auth/
      dashboard/
      users/
    server/
      auth/
      bdd/
    view-models/
  lib/
    api/
      api-client.ts
      auth-api.ts
      users-api.ts
      bdd-api.ts
    telemetry/
    websocket/
```

### Target backend shape

```text
apps/backend/src/
  api/
    routes/
    controllers/
    middleware/
  application/
    auth/
    users/
    admin/
  domain/
    auth/
    users/
    shared/
  infrastructure/
    observability/
    persistence/
    notifications/
    storage/
    queue/
    secrets/
```

This does not require an immediate folder move. It is the target direction for future extraction and naming.

## E. Package Boundaries

Introduce package boundaries only after a slice is stable behind an internal app-local API.

### Phase 1 package candidates

- `@repo/contracts`
  Start from the current `@repo/types` package.
  Scope: DTOs, request/response types, auth claims, websocket contracts, shared interfaces.
- `@repo/platform-observability`
  Scope: correlation id utilities, metrics interfaces, logging helpers, shared observability contracts.
- `@repo/platform-auth-core`
  Scope: authorization policy interfaces, policy evaluation primitives, token/auth types, audit event types.

### Phase 2 package candidates

- `@repo/platform-storage`
  Scope: provider interfaces, shared storage types, common validation helpers.
- `@repo/platform-notifications`
  Scope: provider contracts and neutral application-facing service interfaces.
- `@repo/platform-websocket`
  Scope: shared websocket contracts, event names, room/presence types.

### Packages to avoid extracting yet

- `packages/config`
- `packages/utils`
- `packages/constants`

Reason: they are not yet cohesive and would become junk-drawer packages if extracted prematurely.

## F. Template/Sync Boundaries

These assets should be treated as template or sync-managed repo assets rather than code packages.

### Strong template candidates

- GitHub workflows and composite actions
- root toolchain config
- Docker and Docker Compose scaffolding
- Kubernetes base manifests and observability stack
- reusable scripts for ADR checks, BDD status, publishing, workflow linting
- repo prompts, pull request templates, code ownership rules
- baseline docs for setup, testing, publishing, security, and architecture governance

### Sync strategy

- Keep these in-repo for now.
- Later, group them under a documented template manifest such as `template-map.json` or `sync-manifest.json`.
- Sync by file set, not by package publish.
- Allow consumer apps to override a small set of app-owned files without forking the whole template surface.

## G. App-Specific Items To Keep Local

- route structure and page composition
- branding, metadata, copy, locale text, and navigation
- Prisma schema and domain entities that reflect a specific product
- app-owned API routes and product admin pages
- user workflows such as dashboard behavior and sign-in redirect destinations
- any auth-provider choice or fallback mode that depends on a specific deployment model
- E2E personas and fixtures once they become product-facing rather than template-facing

## H. Target Auth/API Layering

### Rule

UI components must not directly call backend or auth endpoints.

### Target pattern for client-side auth actions

`SignInForm component`
→ `useSignIn()`
→ `authApplicationService.signIn(credentials)`
→ `authApi.login(credentials)`
→ `apiClient.post('/api/auth/login', ...)`

### Target pattern for server-rendered auth/session checks

`dashboard page`
→ `getDashboardPageData()`
→ `serverAuthApplicationService.requireCurrentUser()`
→ `serverAuthGateway.getCurrentUser(cookieHeader, correlationId)`
→ backend endpoint call

### Responsibilities by layer

- UI component
  Owns form state, rendering, and event wiring only.
- Hook or presentation-facing interface
  Owns loading, error, optimistic UI, and view-model transformation.
- Application service
  Owns use-case semantics such as sign-in, sign-out, require-current-user, load-bdd-snapshot.
- API client or gateway
  Owns URLs, headers, cookie forwarding, correlation ids, retries, and low-level error mapping.

## I. Migration Plan

### 1. Freeze boundaries before moving code

- Add a short architecture rule section to this prompt and later ADRs.
- Treat raw `fetch` in `components/` and route pages as a smell unless it is inside a dedicated transport module.

### 2. Introduce app-local service seams first

- Add `apps/frontend/src/application/auth/` and `apps/frontend/src/server/auth/`.
- Add app-local transport adapters under `apps/frontend/lib/api/`.
- Do not extract packages yet.

### 3. Refactor the highest-risk UI/auth violations first

- Replace direct login fetch in `signin-client.tsx` with `useSignIn()` + `authApplicationService`.
- Replace direct auth fetch in `dashboard/page.tsx` with `requireCurrentUser()`.
- Replace direct auth/admin fetches in `dashboard/bdd/page.tsx` with `requireCurrentUser()` and `getBddStatusSnapshot()`.

### 4. Normalize naming and responsibility

- Keep `api-client.ts` as the low-level transport.
- Add intent-specific gateway modules such as `auth-api.ts`, `users-api.ts`, `bdd-api.ts`.
- Keep route files thin.

### 5. Add a lightweight architectural enforcement mechanism

- Add ESLint restrictions or a simple grep-based CI rule preventing raw endpoint fetches inside `apps/frontend/components/**` and selected page files.
- Allow exceptions only in `lib/api/**`, route handlers, and test code.

### 6. Stabilize contracts before extraction

- Move only neutral interfaces and DTOs into `@repo/types` or its successor package.
- Keep product-specific DTOs local until a second app proves reuse.

### 7. Extract reusable backend services by slice

- Start with observability and auth-core.
- Then extract storage, notification, and websocket contracts.
- Avoid extracting user-domain behavior.

### 8. Separate template assets from app assets

- Define a template manifest for workflows, scripts, docker, kubernetes, and root config.
- Keep product pages, schema, and branding outside that sync surface.

### 9. Only then consider file moves

- Once seams are stable and validated, move folders toward the target structure with mechanical, low-risk refactors.

## J. First Concrete Changes

Best risk/reward sequence:

1. Introduce `apps/frontend/lib/api/auth-api.ts` as the single auth transport module.
   Why first: minimal surface area, removes endpoint ownership from UI, reuses existing `api-client.ts` pattern.
2. Introduce `apps/frontend/src/application/auth/sign-in.ts` and `apps/frontend/src/hooks/auth/use-sign-in.ts`.
   Why first: creates the intended layering without changing backend behavior.
3. Refactor `apps/frontend/components/signin-client.tsx` to call the hook instead of `fetch`.
   Why first: highest-confidence direct boundary fix.
4. Introduce `apps/frontend/src/server/auth/require-current-user.ts`.
   Why first: centralizes cookie forwarding and correlation-id propagation for SSR.
5. Refactor `apps/frontend/app/dashboard/page.tsx` and `apps/frontend/app/dashboard/bdd/page.tsx` to use server application services.
   Why first: removes duplicate server-page transport logic and makes later extraction easier.
6. Add a narrow lint rule or CI check forbidding raw auth/backend endpoint fetches in UI components.
   Why first: prevents regression immediately after the first cleanup.

## K. ADR Notes

### ADR: Separate platform code from product code

Context: the repo mixes reusable infrastructure and abstractions with app-local pages, schema, and workflows.
Decision: extract only neutral, repeated capabilities into packages; keep product flow and schema local.
Consequence: reuse improves without turning shared packages into catch-all dumping grounds.

### ADR: UI must not own endpoint knowledge

Context: UI-facing files currently know auth URLs, cookie semantics, and backend route details.
Decision: endpoint knowledge belongs to application services and transport adapters, not components.
Consequence: components become portable, testable, and easier to swap across apps.

### ADR: Template assets are synced, not published

Context: workflows, scripts, docker, and kubernetes assets are reusable but not runtime libraries.
Decision: manage them as template or syncable files rather than npm packages.
Consequence: versioning and override behavior stay simpler for downstream app repos.

### ADR: Extract after seam stabilization

Context: broad early moves create churn and hide coupling.
Decision: introduce app-local seams first, validate behavior, then extract packages.
Consequence: lower migration risk and clearer package boundaries.

## L. Risks

- False-positive reuse: extracting code before a second app proves the boundary can create brittle shared packages.
- Auth coupling risk: current auth flow depends on cookies, environment variables, and dev fallback behavior that may not generalize cleanly.
- SSR/client mismatch: server page services and client hooks need separate implementations with shared semantics.
- Hidden schema coupling: backend services that look generic may still assume the current Prisma schema or user model.
- Template drift: without a manifest and ownership rules, syncable infra files will diverge across future apps.
- Test fragility: E2E and BDD assets may rely on current route names and auth behavior during migration.
- Over-abstraction: package extraction too early can slow delivery and reduce clarity.

## Immediate Working Assumptions

- `packages/types` is the best current seed for a real contracts package.
- `packages/config`, `packages/utils`, and `packages/constants` should remain local placeholders until they gain clear ownership and content.
- The first refactoring wave should stay entirely inside `apps/frontend` and should not require backend behavior changes.
- No file moves should happen until the UI/auth boundary cleanup is in place and validated.
