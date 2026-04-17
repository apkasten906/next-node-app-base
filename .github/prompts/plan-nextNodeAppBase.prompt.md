# Plan: Reusable Platform Extraction and UI/API Boundary Cleanup

## Objective

Turn this repository into a reusable platform source for future apps such as `the-azure-citadel` without mixing product-local code with reusable platform code.

## Guardrails

- No broad file moves yet.
- Preserve behavior where possible.
- Prefer small, reversible refactors.
- Keep TypeScript explicit.
- UI components must not directly call backend or auth endpoints.

## A. Current Structure

- `apps/frontend`: Next.js app with pages in `app/`, UI in `components/`, transport in `lib/`, and hooks under `hooks/` and `src/hooks/`.
- `apps/backend`: Express + TSyringe backend with routes, middleware, services, repositories, Prisma schema, and observability under `src/`.
- `packages/types`: the only strongly reusable package today.
- `packages/config`, `packages/utils`, `packages/constants`: placeholders, not yet good extraction targets.
- `.github`, `scripts`, root config, Docker, and Kubernetes: reusable repo/platform assets.

## B. Classification

### Portable code

- `packages/types/src/**`
- backend auth core: authorization, policy engine, policy store, JWT, encryption
- backend cross-cutting services: audit, observability, correlation-id, metrics, HATEOAS helpers
- backend provider-style services: storage, notification, queue, webhook, secrets
- frontend platform primitives: `lib/api-client.ts`, correlation-id utilities, error logging, websocket hook

### Portable infra/template assets

- `.github/workflows/**`
- `.github/actions/**`
- root toolchain config
- `docker-compose.yml`
- `scripts/**`
- `kubernetes/**`
- ADRs and setup/governance docs

### App-specific code

- frontend pages, layout, dashboard flow, sign-in flow, language switcher, copy, translations
- backend user controllers, user routes, user repository, Prisma schema
- BDD admin UI and repo-specific governance endpoints

### Boundary cleanup needed

- `apps/frontend/components/signin-client.tsx`
- `apps/frontend/app/dashboard/page.tsx`
- `apps/frontend/app/dashboard/bdd/page.tsx`

## C. Direct UI Endpoint Calls

Confirmed UI-facing endpoint calls before cleanup:

- `apps/frontend/components/signin-client.tsx` → `POST /api/auth/login`
- `apps/frontend/app/dashboard/page.tsx` → `GET /api/auth/me`
- `apps/frontend/app/dashboard/bdd/page.tsx` → `GET /api/auth/me`
- `apps/frontend/app/dashboard/bdd/page.tsx` → `GET /api/admin/bdd/status`

Acceptable transport boundary:

- `apps/frontend/lib/api-client.ts`
- `apps/frontend/hooks/use-api.ts`
- browser-side cross-cutting logging in `apps/frontend/lib/error-logger.ts`

## D. Target Architecture

Frontend layering:

`UI component`
→ `presentation hook`
→ `application service`
→ `API client or server gateway`
→ `endpoint call`

Target frontend shape:

```text
apps/frontend/
  app/
  components/
  src/
    application/
    hooks/
    server/
  lib/
    api/
    telemetry/
    websocket/
```

Target backend direction:

```text
apps/backend/src/
  api/
  application/
  domain/
  infrastructure/
```

## E. Package Boundaries

Phase 1 package targets:

- `@repo/contracts` from `@repo/types`
- `@repo/platform-observability`
- `@repo/platform-auth-core`

Phase 2 package targets:

- `@repo/platform-storage`
- `@repo/platform-notifications`
- `@repo/platform-websocket`

Do not extract yet:

- `packages/config`
- `packages/utils`
- `packages/constants`

## F. Template/Sync Boundaries

Treat these as syncable template assets rather than published packages:

- workflows and composite actions
- root toolchain files
- Docker and Kubernetes assets
- reusable scripts
- prompts, PR templates, CODEOWNERS, governance docs

## G. App-Specific Items To Keep Local

- route structure and page composition
- branding, copy, locale text, and navigation
- product schema and product entities
- product-owned API routes and admin pages
- app-specific auth/provider choices
- product-facing personas and fixtures

## H. Target Auth/API Layering

Client auth flow:

`SignInForm`
→ `useSignIn()`
→ `authApplicationService.signIn()`
→ `authApi.login()`
→ `apiClient.post('/api/auth/login')`

Server auth flow:

`dashboard page`
→ `requireCurrentUser()`
→ `server gateway`
→ `GET /api/auth/me`

Responsibilities:

- UI owns rendering and events only.
- Hooks own loading, error, and view-model state.
- Application services own use-case semantics.
- API/gateway modules own URLs, headers, cookies, retries, and error mapping.

## I. Migration Plan

1. Freeze the boundary rule and stop new raw endpoint calls in UI files.
2. Introduce app-local service seams inside `apps/frontend`.
3. Refactor sign-in to hook → service → auth API.
4. Refactor SSR auth checks to server services.
5. Add lint enforcement for raw `fetch` in UI files.
6. Stabilize contracts before extracting packages.
7. Extract reusable backend slices only after seams hold.
8. Split template assets from app assets with a sync manifest later.
9. Consider folder moves only after behavior is stable.

## J. First Concrete Changes

Best risk/reward order:

1. Add `apps/frontend/lib/api/auth-api.ts`
2. Add `apps/frontend/src/application/auth/sign-in.ts`
3. Add `apps/frontend/src/hooks/auth/use-sign-in.ts`
4. Refactor `signin-client.tsx`
5. Add `apps/frontend/src/server/auth/require-current-user.ts`
6. Refactor dashboard pages to server services
7. Add lint guard for raw `fetch` in UI files

## K. ADR Notes

- Separate platform code from product code: only extract neutral, repeated capabilities.
- UI must not own endpoint knowledge: endpoints belong to services and gateways.
- Template assets are synced, not published: workflows and infra are file assets, not runtime libraries.
- Extract after seam stabilization: local seams first, package moves later.

## L. Risks

- premature extraction creates brittle shared packages
- auth flow has cookie and environment coupling
- server and client services may diverge if not kept aligned
- backend services may hide schema coupling
- syncable template files can drift across downstream repos
- existing E2E flows may depend on current route/auth behavior

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

- ✅ DONE (WSJF 7.33): Deterministic E2E seeding is wired into CI and documented.
- ✅ DONE: Add lightweight persona management for forks (persona registry + optional JSON override via `E2E_PERSONAS_FILE`).
- 🟡 DONE (not merged): Expanded seeded personas minimally (added `moderator` + `MODERATOR` role) to keep fixtures deterministic and ready for new tests. (branch: `chore/e2e-personas-moderator`)
- ✅ DONE (merged): CI workflow DRY hardening: extracted shared Node+pnpm setup into a composite action and reused it across core workflows. (branch: `chore/ci-dry-workflows`, PR #29)
- ✅ DONE (Feb 2026): Hardened composite action API (removed `install-args`) and validated workflows.
- ✅ DONE (Feb 2026): Reduced Dependabot to Actions-only and updated plan/docs.
- ✅ DONE (March 2026): Fixed `metrics.middleware.ts` route label fallback (`req.path` instead of literal `'unmatched'`). Backend: 340 passing / 44 skipped / 0 failing.
- ✅ DONE (March 2026): Renamed branch `feat/phase-11-observability` → `feat/phase-10-observability`; old remote deleted; plan updated.
- ✅ DONE (March 2026): Grafana — `kubernetes/observability/grafana/` manifests (config, dashboards, deployment, secret, NetworkPolicy), 3 pre-provisioned dashboards (app-performance, infrastructure, business-kpis), ADR-017. See **Next check-in** below for full priority order.
- ⬜ BACKLOG (Phase 8.5): Feature Management System — `IFeatureFlagService`, evaluation engine, flag CRUD API, React hooks. No code exists yet.
- ✅ DONE: Finish converting remaining `@security` scenarios to integration tests and wire any missing Cucumber step-definitions to the integration harness. All 15 scenarios now covered. (owner: dev)
- ✅ DONE: Add a registry-agnostic publish script and GitHub Actions workflow that defaults to GitHub Packages but respects `REGISTRY_URL` and `NPM_AUTH_TOKEN` for an internal registry. (owner: dev)
- ✅ DONE: Create ADR documenting the artifact registry decision and how to swap registries through the service mesh. (owner: dev) — see `docs/adr/009-artifact-registry-github-packages.md`.
- ✅ DONE: Add an optional `test-setup` (Vitest `setupFiles`) to set `REDIS_MOCK=true` and `TEST_EXTERNAL_SERVICES=false` for local/CI fast gates.
- ✅ DONE: Fix all TypeScript compilation errors (29 errors resolved - test files + frontend tsconfig)
- ✅ DONE: Auto-fix ESLint issues (75 issues fixed - import ordering, missing globals, parser config)
- ✅ DONE: Implement full ABAC policy engine (PolicyEngine, PolicyStore, deny-overrides, operators, attribute sources, example policies, docs)
- ✅ DONE: Address ESLint code quality issues - achieved 0 errors, 0 warnings (100% clean - all 154 problems resolved with justifications)
- ✅ DONE: Add comprehensive Storage Service unit tests (28 tests covering all file operations, MIME validation, health checks)
- ✅ DONE: Improve cache service type safety - eliminated `any` types with IRedisClient interface (-11 warnings)
- ✅ DONE: Replace remaining `any` types with `unknown` and type aliases (query-helpers, policy-engine) - improved type safety with runtime guards
- ✅ DONE: Complete BDD @security scenario integration test coverage (JWT generation/validation, OWASP headers) - 18 new tests added

### In flight (branches on hold)

- `feat/phase-10-observability`: Active branch for Phase 10 remainder — Grafana, Jaeger, Loki, Alertmanager, Kiali. PR #38 (Prometheus) already merged. New PR needed when next milestone is ready.
- `chore/e2e-personas-moderator`: Adds `moderator` persona + `MODERATOR` role to backend seed + frontend fixtures; keeps dev auth fallback aligned.

### Notes on service-mesh friendliness

- The publish flow will be registry-agnostic. To swap in an internal registry that lives inside the cluster (Verdaccio, Artifactory, Nexus), set CI `REGISTRY_URL` to a stable internal address (e.g. `http://npm-registry.svc.cluster.local:4873`) and provide `NPM_AUTH_TOKEN` in secrets. The service mesh can expose/secure that endpoint; the CI/publish scripts remain unchanged.

### Next check-in

- **Current Focus (March 2026)**: **Phase 10: Observability Stack** (branch: `feat/phase-10-observability`). Priority order:
  1. ✅ Prometheus metrics collection — `MetricsService` (prom-client), `metrics.middleware.ts`, Kubernetes manifests (deployment, config, RBAC, NetworkPolicy, AlertRules ConfigMap), ADRs 015 + 016, BDD scenarios (@ready). 340 backend tests passing.
  2. ✅ Grafana dashboards (performance, infrastructure, business KPIs) — `kubernetes/observability/grafana/` manifests, 3 pre-provisioned dashboards, ADR-017.
  3. 🔄 **CURRENT NEXT**: Distributed tracing with Jaeger (automatic via Istio + custom spans) — add `kubernetes/observability/jaeger/` manifests
  4. ⬜ Centralized logging — **Loki + Grafana recommended** (cost-effective, Grafana-native; avoids separate Kibana/Elasticsearch overhead)
  5. ⬜ APM integration (Datadog or New Relic)
  6. ⬜ Alerting and incident management — Prometheus Alertmanager manifests + notification routing (Slack/PagerDuty)
  7. ⬜ Kiali for service mesh observability
- **Decision Point (RESOLVED)**: Use **Loki + Grafana** for centralized logging (cost-effective, Grafana-native, avoids ELK resource overhead for this template use-case).
- **Documentation**: ADRs 013/015/016/017 written. ADR-017 documents Grafana+Loki over ELK for this template use-case.
- **BDD Coverage**: `apps/backend/features/10-observability.feature` has 27+ scenarios (`@wip`); `apps/backend/features/observability/metrics.feature` has 12 scenarios (`@ready`/`@impl_prometheus_metrics`). Step definitions exist in `apps/backend/features/step_definitions/observability.steps.ts` + `metrics.steps.ts`.
- **Future**: After Phase 10 observability foundation is complete, proceed with Phase 11 (Testing Infrastructure) or shift to deployable template hardening using `/docs/Planning/wsjf-deployable-template.md` as the backlog.

---

## Target Blueprint

Create a production-ready base repository for rapidly starting new web applications with a Next.js frontend, Node.js backend, comprehensive testing, and DevOps infrastructure. The setup follows SOLID principles with dependency injection, includes logging/monitoring, PostgreSQL database support, OWASP security standards, Istio service mesh for infrastructure concerns, and is Kubernetes and CI/CD ready.

## Steps

### 1. Initialize monorepo foundation

Set up Turborepo with pnpm workspaces, create `apps/frontend` (Next.js) and `apps/backend` (Node.js/Express) directories, configure shared TypeScript configs, ESLint with OWASP security rules, Prettier, Husky git hooks, and commitlint for conventional commits

### 2. Establish project governance and security framework

Implement OWASP-compliant security standards, create security governance documentation, set up DI pattern for security library abstraction (authentication, authorization, encryption), configure OWASP Dependency-Check in CI pipeline, establish security review process, and create threat modeling documentation

### 3. Build backend architecture

Implement SOLID-compliant layers (controllers, services, repositories, entities) with TSyringe DI container, integrate Prisma with PostgreSQL schema including read replica configuration for horizontal read scaling, add Winston/Morgan/Sentry logging, configure Swagger/OpenAPI documentation with HATEOAS, set up Zod environment validation with separate configs per environment, implement header-based API versioning, configure multi-level caching strategy (in-memory L1, Redis L2, CDN L3), and implement webhook management system with delivery queue and retry logic

### 4. Configure authentication and authorization

Implement OAuth 2.0 + OpenID Connect (OIDC) with DI pattern for security provider abstraction, integrate Passport.js with pluggable strategies, add NextAuth.js for frontend, implement JWT handling with refresh tokens, create RBAC and permission-based authorization middleware, and add security audit logging

### 5. Configure frontend application

Initialize Next.js 14+ with App Router, create shared packages (`types`, `utils`, `constants`, `config`) for frontend-backend type safety, integrate Sentry error tracking, establish API client with HATEOAS support, add proper error boundaries, set up i18n with next-i18next for multilingual support (en, es, fr, de initially)

### 6. Establish testing infrastructure

Configure Vitest for unit tests in both apps with coverage reporting, set up Cucumber with example feature files and step definitions, integrate Playwright for E2E tests with Page Object Model pattern, add OWASP ZAP for security testing integration, and create test utilities for each testing type

### 7. Implement infrastructure services

Integrate Redis for caching/sessions with DI abstraction, set up Bull/BullMQ for message queuing and background jobs, implement WebSocket support with Socket.io and authentication, create health check endpoints for all services, and configure graceful shutdown handling

### 8. Implement file storage and advanced features

Add Multer for file uploads with DI storage adapter pattern (local/S3/Azure/GCP), implement feature flag system, configure cloud storage adapters with environment-based selection, add OWASP file upload security validations, and create comprehensive documentation

### 9. Integrate Istio service mesh

Install Istio in Kubernetes cluster, configure mTLS for service-to-service communication, set up VirtualServices for header-based API versioning and traffic management, create DestinationRules for circuit breakers and retry policies, implement AuthorizationPolicies for network-level security, configure distributed tracing with Jaeger, and set up Kiali for service mesh visualization

### 10. Implement additional service abstractions

Add notification service with DI (email, SMS, push notifications), implement search service abstraction (Elasticsearch, Algolia, MeiliSearch), create event bus interface (Redis Pub/Sub, RabbitMQ, Kafka), add payment gateway abstraction (Stripe, PayPal), implement analytics service (Mixpanel, Segment), and configure secrets management (HashiCorp Vault, AWS Secrets Manager)

### 11. Implement DevOps and production infrastructure

Create multi-stage Dockerfiles with security scanning, set up docker-compose.yml for local development, configure Kubernetes manifests for all services, set up GitHub Actions workflows for CI/CD (lint, test, build, E2E, security scans), implement APM integration (Datadog, New Relic), configure log aggregation (ELK Stack, Loki), add load testing with k6, implement database backup and recovery strategies, and create comprehensive monitoring and alerting

✅ **Infrastructure**: Redis, Bull/BullMQ (message queuing), Socket.io (WebSockets)

✅ **API Versioning**: Header-based with HATEOAS principles (Istio routing)

## Recommended Authentication Provider

- Managed service, fastest to implement

**Option B: Keycloak (Recommended for Control)**

- Self-hosted, open-source

- **Pros**: No vendor lock-in, full customization

| **Orchestration** | Kubernetes | Production container orchestration ✅ |

| **DI Library** | TSyringe | Clean API, TypeScript-first, lightweight |

| **Search** | DI Pattern (Elasticsearch/Algolia) | Full-text search capabilities ✅ |

| **Payments** | DI Pattern (Stripe/PayPal) | Payment processing abstraction ✅ |

| **Load Testing** | k6 | Performance and stress testing ✅ |
| **API Versioning** | Header-based + Istio Routing | Clean URLs, HATEOAS compatible ✅ |
| **Logging** | ELK Stack / Loki + Grafana | Centralized log aggregation ✅ |

| **APM** | Datadog / New Relic | Application performance monitoring ✅ |

| **CI/CD** | GitHub Actions | Native GitHub integration |
| **File Upload** | Multer + DI Storage Pattern | Secure file handling, provider-agnostic ✅ |
| **Feature Flags** | Custom with DI | Gradual rollouts, A/B testing |
| **Security Governance** | OWASP Standards | Industry best practices ✅ |

## OWASP Security Governance

### Security Standards & Compliance

1. **Broken Access Control** - RBAC/ABAC implementation, authorization middleware
2. **Injection** - Parameterized queries (Prisma), input validation (Zod)
3. **Insecure Design** - Threat modeling, security architecture review
4. **Security Misconfiguration** - Security headers, environment validation

5. **Vulnerable Components** - Dependency scanning, automated updates

6. **Software & Data Integrity** - Code signing, SRI, audit logging
7. **SSRF** - URL validation, allow-list approach
   **Security Practices**:

- Regular dependency audits (npm audit, Snyk, OWASP Dependency-Check)

- Static Application Security Testing (SAST) in CI

- Dynamic Application Security Testing (DAST) with OWASP ZAP
- Secret scanning (GitHub Advanced Security, GitGuardian)
- Container security scanning (Trivy, Snyk)
- Security code reviews for sensitive components
- Penetration testing guidelines

- Incident response procedures

**DI Pattern for Security Libraries**:

```typescript
// Security abstraction interfaces
interface IAuthenticationProvider {
  authenticate(credentials: any): Promise<AuthResult>;
  validateToken(token: string): Promise<TokenPayload>;
  refreshToken(refreshToken: string): Promise<TokenResult>;
}

interface IEncryptionService {
  encrypt(data: string): Promise<string>;
  decrypt(data: string): Promise<string>;
  hash(data: string): Promise<string>;
  compareHash(data: string, hash: string): Promise<boolean>;
}

interface IStorageProvider {
  upload(file: File, path: string): Promise<UploadResult>;
  download(path: string): Promise<File>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}

interface INotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;

  sendPushNotification(userId: string, message: string): Promise<void>;

}

interface ISearchService {
  index(document: SearchDocument): Promise<void>;
  search(query: SearchQuery): Promise<SearchResults>;
  deleteIndex(id: string): Promise<void>;
}

interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
}

interface IPaymentService {
  createPaymentIntent(amount: number, currency: string): Promise<PaymentIntent>;
  processPayment(paymentId: string): Promise<PaymentResult>;
  refund(paymentId: string, amount?: number): Promise<RefundResult>;
}

interface IAnalyticsService {
  track(event: string, properties?: Record<string, any>): Promise<void>;
  identify(userId: string, traits?: Record<string, any>): Promise<void>;

  page(name: string, properties?: Record<string, any>): Promise<void>;

}



interface ISecretsManager {

  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;

  register(url: string, events: string[], secret: string): Promise<WebhookRegistration>;

  unregister(webhookId: string): Promise<void>;

  verifySignature(payload: string, signature: string, secret: string): boolean;
  getDeliveryStatus(deliveryId: string): Promise<DeliveryStatus>;


interface ICacheService {


  invalidate(pattern: string): Promise<void>;

}



interface IFeatureFlagService {


}


  /* ... */


@injectable()

class S3StorageProvider implements IStorageProvider {

  /* ... */

}


@injectable()
class SendGridNotificationService implements INotificationService {
  /* ... */
}



@injectable()
class ElasticsearchService implements ISearchService {
  /* ... */
}


@injectable()

  /* ... */

class StripePaymentService implements IPaymentService {
}



@injectable()


}


  /* ... */


class WebhookService implements IWebhookService {


@injectable()


  // L2: Redis





  // Evaluation engine with targeting rules


```

## Recommended Directory Structure

```
next-node-app-base/
├── .devcontainer/           # Dev Container configuration
│   ├── devcontainer.json    # VSCode Dev Container config
│   ├── docker-compose.yml   # Development services
│   ├── Dockerfile           # Development container image
│   └── post-create.sh       # Post-creation setup script
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── security-scan.yml
│   │   ├── e2e-tests.yml

│   │   ├── load-test.yml

│   │   └── deploy.yml

│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   └── SECURITY.md

├── kubernetes/                  # Kubernetes + Istio configs

│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── frontend-deployment.yaml

│   │   ├── backend-deployment.yaml

│   │   ├── postgres-statefulset.yaml
│   │   └── redis-deployment.yaml
│   ├── istio/                   # Istio-specific configs

│   │   ├── gateway.yaml         # Ingress gateway

│   │   ├── virtual-services/
│   │   │   ├── frontend-vs.yaml
│   │   │   ├── backend-vs.yaml  # Header-based versioning

│   │   │   └── api-gateway-vs.yaml


│   │   ├── telemetry.yaml       # Tracing, metrics config

│   │       │   ├── blue-deployment.yaml
│   │       │   ├── green-deployment.yaml
│   │       │   └── switch-virtualservice.yaml
│   │       ├── canary/
│   │       │   ├── stable-deployment.yaml
│   │       │   ├── canary-deployment.yaml
│   │       │   ├── progressive-vs.yaml
│   │       │   └── analysis-template.yaml
│   │       └── ab-testing/
│   │           └── ab-test-vs.yaml
│   └── overlays/
│       ├── development/
│       ├── staging/
│       └── production/
├── apps/
│   ├── frontend/                 # Next.js app
│   │   ├── src/
│   │   │   ├── app/             # App router
│   │   │   │   ├── [locale]/   # i18n routing
│   │   │   │   └── api/         # API routes
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── lib/
│   │   │   │   ├── api/         # API client with HATEOAS
│   │   │   │   ├── auth/        # NextAuth.js config
│   │   │   │   ├── websocket/   # Socket.io client
│   │   │   │   ├── utils/
│   │   │   │   └── feature-flags/
│   │   │   ├── hooks/
│   │   │   ├── i18n/            # Internationalization
│   │   │   └── styles/
│   │   ├── public/
│   │   │   └── locales/         # Translation files
│   │   │       ├── en/
│   │   │       ├── es/
│   │   │       ├── fr/
│   │   │       └── de/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   ├── contract/        # Pact consumer tests
│   │   │   └── e2e/             # Playwright tests
│   │   ├── mocks/               # MSW mock handlers
│   │   │   ├── handlers/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── index.ts
│   │   │   ├── browser.ts       # MSW browser setup
│   │   │   └── server.ts        # MSW Node.js setup
│   │   ├── features/            # Cucumber features
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   ├── playwright.config.ts
│   │   └── vitest.config.ts
│   └── backend/                 # Node.js API
│       ├── src/
│       │   ├── api/
│       │   │   ├── controllers/
│       │   │   ├── middleware/
│       │   │   │   ├── auth.middleware.ts
│       │   │   │   ├── rbac.middleware.ts
│       │   │   │   ├── rate-limit.middleware.ts
│       │   │   │   ├── security.middleware.ts
│       │   │   │   └── version.middleware.ts
│       │   │   ├── routes/
│       │   │   └── validators/
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   ├── interfaces/
│       │   │   └── services/
│       │   ├── infrastructure/
│       │   │   ├── database/
│       │   │   │   ├── prisma/
│       │   │   │   └── repositories/
│       │   │   ├── logging/
│       │   │   │   ├── winston.config.ts
│       │   │   │   └── morgan.config.ts
│       │   │   ├── cache/       # Multi-level caching
│       │   │   │   ├── cache.interface.ts
│       │   │   │   ├── cache.service.ts
│       │   │   │   ├── l1-memory.cache.ts
│       │   │   │   ├── l2-redis.cache.ts
│       │   │   │   └── cache-warmer.service.ts
│       │   │   ├── webhooks/     # Webhook management
│       │   │   │   ├── webhook.interface.ts
│       │   │   │   ├── webhook.service.ts
│       │   │   │   ├── webhook.repository.ts
│       │   │   │   └── webhook-delivery.queue.ts
│       │   │   ├── storage/     # File storage (DI pattern)
│       │   │   │   ├── storage.interface.ts
│       │   │   │   ├── local.storage.ts
│       │   │   │   ├── s3.storage.ts
│       │   │   │   └── azure.storage.ts
│       │   │   ├── jobs/        # Bull/BullMQ
│       │   │   │   ├── queues/
│       │   │   │   ├── processors/
│       │   │   │   └── schedulers/
│       │   │   ├── websocket/   # Socket.io server
│       │   │   │   ├── socket.server.ts
│       │   │   │   ├── handlers/
│       │   │   │   └── middleware/
│       │   │   ├── notifications/  # Notification services
│       │   │   │   ├── notification.interface.ts
│       │   │   │   ├── email/
│       │   │   │   │   ├── sendgrid.service.ts
│       │   │   │   │   └── ses.service.ts
│       │   │   │   ├── sms/
│       │   │   │   │   └── twilio.service.ts
│       │   │   │   └── push/
│       │   │   │       └── fcm.service.ts
│       │   │   ├── search/      # Search services
│       │   │   │   ├── search.interface.ts
│       │   │   │   ├── elasticsearch.service.ts
│       │   │   │   └── algolia.service.ts
│       │   │   ├── events/      # Event bus
│       │   │   │   ├── event-bus.interface.ts
│       │   │   │   ├── redis-pubsub.service.ts
│       │   │   │   └── rabbitmq.service.ts
│       │   │   ├── payments/    # Payment services
│       │   │   │   ├── payment.interface.ts
│       │   │   │   ├── stripe.service.ts
│       │   │   │   └── paypal.service.ts
│       │   │   ├── analytics/   # Analytics services
│       │   │   │   ├── analytics.interface.ts
│       │   │   │   ├── mixpanel.service.ts
│       │   │   │   └── segment.service.ts
│       │   │   ├── secrets/     # Secrets management
│       │   │   │   ├── secrets.interface.ts
│       │   │   │   ├── vault.service.ts
│       │   │   │   └── aws-secrets.service.ts
│       │   │   ├── feature-flags/  # Feature flag system
│       │   │   │   ├── feature-flag.interface.ts
│       │   │   │   ├── feature-flag.service.ts
│       │   │   │   ├── feature-flag.repository.ts
│       │   │   │   ├── evaluation-engine.ts
│       │   │   │   └── flag-middleware.ts
│       │   │   └── security/    # Security implementations (DI)
│       │   │       ├── auth/
│       │   │       │   ├── auth.interface.ts
│       │   │       │   ├── oauth2.provider.ts
│       │   │       │   ├── jwt.service.ts
│       │   │       │   └── passport.config.ts
│       │   │       ├── encryption/
│       │   │       │   ├── encryption.interface.ts
│       │   │       │   └── encryption.service.ts
│       │   │       └── authorization/
│       │   │           ├── rbac.service.ts
│       │   │           └── permissions.ts
│       │   ├── di/              # DI container setup
│       │   │   ├── container.ts
│       │   │   ├── tokens.ts
│       │   │   └── bindings.ts
│       │   ├── config/
│       │   │   ├── env.ts       # Environment validation
│       │   │   ├── database.ts
│       │   │   ├── redis.ts
│       │   │   ├── storage.ts
│       │   │   ├── auth.ts
│       │   │   └── cors.ts
│       │   └── server.ts
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   ├── contract/        # Pact provider verification tests
│       │   └── security/        # OWASP ZAP tests
│       ├── features/            # Cucumber features
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── packages/                    # Shared packages
│   ├── types/                   # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── api/             # API DTOs and interfaces
│   │   │   ├── domain/          # Domain entities
│   │   │   ├── auth/            # Auth types
│   │   │   ├── websocket/       # WebSocket event types
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── utils/                   # Common utilities
│   │   ├── src/
│   │   │   ├── validation/
│   │   │   ├── formatting/
│   │   │   ├── crypto/
│   │   │   ├── security/        # Security utilities
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── constants/               # Shared constants and enums
│   │   ├── src/
│   │   │   ├── error-codes.ts
│   │   │   ├── status-codes.ts
│   │   │   ├── permissions.ts
│   │   │   ├── roles.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/                  # Shared configurations
│       ├── eslint-config/
│       │   ├── index.js
│       │   └── package.json     # Includes OWASP ESLint plugin
│       ├── typescript-config/
│       └── prettier-config/
├── docker/
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   ├── redis.Dockerfile
│   └── docker-compose.yml       # Local development services
├── docs/
│   ├── api/
│   │   ├── openapi.yaml
│   │   └── hateoas-guide.md
│   ├── architecture/
│   │   ├── decisions/           # ADRs
│   │   ├── diagrams/
│   │   ├── overview.md
│   │   ├── security-architecture.md
│   │   └── service-mesh.md      # Istio architecture
│   ├── security/
│   │   ├── threat-model.md
│   │   ├── owasp-compliance.md
│   │   ├── security-review-checklist.md
│   │   └── incident-response.md
│   ├── istio/               # Istio documentation
│   │   ├── setup.md
│   │   ├── traffic-management.md
│   │   ├── security-policies.md
│   │   └── observability.md
│   ├── services/            # Service integration guides
│   │   ├── notifications.md
│   │   ├── search.md
│   │   ├── payments.md
│   │   ├── analytics.md
│   │   └── secrets-management.md
│   ├── database/            # Database documentation
│   │   ├── read-replicas.md
│   │   ├── connection-pooling.md
│   │   └── backup-recovery.md
│   ├── webhooks/            # Webhook documentation
│   │   ├── webhook-setup.md
│   │   ├── security.md
│   │   └── testing.md
│   ├── caching/             # Caching documentation
│   │   ├── strategy.md
│   │   ├── invalidation.md
│   │   └── monitoring.md
│   ├── deployment/          # Deployment documentation
│   │   ├── blue-green.md
│   │   ├── canary.md
│   │   └── rollback.md
│   ├── testing/             # Testing documentation
│   │   ├── contract-testing.md
│   │   ├── api-mocking.md
│   │   ├── e2e-testing.md
│   │   └── load-testing.md
│   ├── i18n/
│   │   ├── translation-guide.md
│   │   └── supported-locales.md
│   ├── feature-flags/       # Feature flag documentation
│   │   ├── feature-flag-guide.md
│   │   ├── rollout-strategies.md
│   │   ├── ab-testing.md
│   │   └── flag-lifecycle.md
│   ├── development/         # Development documentation
│   │   ├── dev-containers.md
│   │   ├── local-setup.md
│   │   └── debugging.md
│   ├── setup.md
│   ├── contributing.md
│   └── deployment.md
├── load-tests/              # k6 load tests
│   ├── scenarios/
│   │   ├── api-load.js
│   │   └── stress-test.js
│   └── k6.config.js
├── .env.example
├── .env.development.example
├── .env.test.example
├── .env.production.example
├── .gitignore
├── .prettierrc
├── .prettierignore
├── .eslintrc.js
├── .eslintignore
├── .commitlintrc.js
├── .nvmrc
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── README.md
```

## HATEOAS API Design with Istio

### Header-Based Versioning (Istio VirtualService Routing)

```http
GET /api/users/123
Accept-version: 1.0.0
Authorization: Bearer <token>
```

**Istio VirtualService routes based on Accept-version header:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-api
spec:
  hosts:
    - backend-api
  http:
    - match:
        - headers:
            accept-version:
              exact: '2.0.0'
      route:
        - destination:
            host: backend-api
            subset: v2
    - route: # Default to v1
        - destination:
            host: backend-api
            subset: v1
```

### HATEOAS Response Format

```json
{
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "_links": {
    "self": { "href": "/api/users/123" },
    "update": { "href": "/api/users/123", "method": "PUT" },
    "delete": { "href": "/api/users/123", "method": "DELETE" },
    "orders": { "href": "/api/users/123/orders" },
    "avatar": { "href": "/api/users/123/avatar" }
  },
  "_meta": {
    "version": "1.0.0",
    "timestamp": "2025-11-20T10:00:00Z"
  }
}
```

## Production-Ready Features

### Core Infrastructure

1. **Environment Variable Management**
   - Type-safe validation with Zod schemas
   - Separate `.env` files per environment (dev/test/prod)
   - Environment-specific configuration loaders
   - `.env.example` templates for all required variables
   - Storage provider selection via env (`STORAGE_PROVIDER=local|s3|azure|gcp`)
   - Auth provider configuration via env

2. **Database Management**
   - Prisma schema with proper indexing
   - **Read Replicas Configuration**
     - Primary database for writes
     - Read replicas for read-heavy operations
     - Automatic read/write splitting
     - Replica lag monitoring
     - Fallback to primary on replica failure
   - Migration strategy and versioning
   - Seed data for development/testing
   - Connection pooling configuration (PgBouncer)
   - Soft delete support
   - Transaction handling utilities
   - Audit logging for data changes
   - Row-level security considerations

3. **Caching & Session Management (Redis)**
   - Redis integration for caching
   - Session storage with Redis
   - Cache invalidation patterns
   - TTL strategies per data type
   - Cache-aside pattern implementation
   - Redis Cluster support for production
   - Pub/Sub for real-time updates

4. **Message Queuing & Background Jobs (Bull/BullMQ)**
   - Job queues with Redis backing
   - Job processors with retry logic
   - Scheduled jobs (cron patterns)
   - Job monitoring dashboard (Bull Board)
   - Dead letter queue handling
   - Priority queues
   - Job progress tracking
   - Concurrent job processing

5. **WebSocket Support (Socket.io)**
   - Real-time bidirectional communication
   - Authentication middleware for connections
   - Room-based messaging
   - Event-driven architecture
   - Connection state management
   - Reconnection handling
   - Redis adapter for horizontal scaling
   - Rate limiting for socket events

### Service Mesh & Infrastructure (Istio)

6. **Istio Service Mesh**
   - Automatic mTLS between all services
   - Traffic management (routing, load balancing)
   - Circuit breakers and retry policies (DestinationRules)
   - Header-based API versioning (VirtualServices)
   - Distributed tracing with Jaeger
   - Service-to-service authorization policies
   - Fault injection for chaos testing
   - Traffic splitting for canary deployments
   - Observability (Prometheus, Grafana, Kiali)
   - Network-level rate limiting

7. **Secrets Management**
   - HashiCorp Vault or cloud provider integration
   - DI pattern for secrets provider abstraction
   - Automatic secret rotation
   - Audit logging for secret access
   - Environment-specific secret isolation
   - Encrypted secrets at rest

8. **Notification Services (DI Pattern)**
   - Email notifications (SendGrid, AWS SES)
   - SMS notifications (Twilio)
   - Push notifications (Firebase Cloud Messaging)
   - Template engine integration
   - Notification queue with retry logic
   - Delivery status tracking
   - Unsubscribe management

9. **Search Services (DI Pattern)**
   - Full-text search capability
   - Elasticsearch, Algolia, or MeiliSearch integration
   - Indexing pipeline
   - Search analytics
   - Autocomplete support
   - Faceted search
   - Relevance tuning

10. **Event Bus (DI Pattern)**
    - Domain event publishing/subscribing
    - Redis Pub/Sub, RabbitMQ, or Kafka
    - Event sourcing ready
    - Dead letter queue for failed events
    - Event replay capability
    - Event schema validation

11. **Payment Services (DI Pattern)**
    - Payment gateway abstraction
    - Stripe, PayPal, Square integration
    - Payment intent creation
    - Refund handling
    - Webhook verification
    - PCI compliance helpers
    - Payment reconciliation

12. **Analytics Services (DI Pattern)**
    - User behavior tracking
    - Mixpanel, Segment, Amplitude integration
    - Event tracking abstraction
    - User identification
    - Custom properties
    - Funnel analysis ready

13. **Database Read Replicas**
    - Prisma read replica configuration
    - Automatic read/write query routing
    - Primary database for all writes
    - Read replicas for SELECT queries
    - Replica lag monitoring and alerting
    - Automatic failover to primary if replica unavailable
    - Connection pool management for replicas
    - Health checks for replica availability
    - Read preference strategies (nearest, primary-preferred)
    - Replication lag thresholds
    - Load balancing across multiple read replicas

14. **Webhook Management System**
    - Webhook registration API
    - Event subscription management
    - HMAC signature generation and verification
    - Webhook delivery queue (Bull/BullMQ)
    - Automatic retry with exponential backoff
    - Dead letter queue for failed deliveries
    - Delivery status tracking and logging
    - Webhook endpoint health monitoring
    - Rate limiting per webhook endpoint
    - Webhook event filtering
    - Webhook testing/simulation tools
    - Delivery history and analytics
    - Webhook security best practices (IP whitelisting, HTTPS only)

15. **Multi-Level Caching Strategy**
    - **L1 Cache: In-Memory (node-cache)**
      - Process-local cache for frequently accessed data
      - Millisecond access times
      - Limited by available RAM
      - TTL-based expiration
    - **L2 Cache: Redis**
      - Distributed cache across instances
      - Session storage
      - API response caching
      - Database query result caching
    - **L3 Cache: CDN (Cloudflare, CloudFront)**
      - Static asset caching
      - API response caching for public endpoints
      - Geographic distribution
    - Cache invalidation strategies
      - Time-based (TTL)
      - Event-based (on data updates)
      - Tag-based invalidation
    - Cache warming on application startup
    - Cache stampede prevention (locking mechanism)
    - Cache hit/miss ratio monitoring
    - Automatic cache fallback (L1 → L2 → Source)

16. **Blue-Green & Canary Deployment Strategies**
    - **Blue-Green Deployments**
      - Istio VirtualService with weighted routing (100% blue or 100% green)
      - Zero-downtime deployments
      - Instant rollback capability
      - Database migration considerations
      - Smoke tests on green environment before switch
    - **Canary Deployments**
      - Gradual traffic shifting (5% → 25% → 50% → 100%)
      - Istio traffic splitting based on headers, user segments
      - Automatic rollback on error rate threshold
      - Canary analysis with Prometheus metrics
      - Flagger for automated canary deployments
    - **A/B Testing**
      - User segment-based routing
      - Feature flag integration
      - Metrics comparison between variants
    - Health check validation before promotion
    - Deployment approval workflows
    - Rollback automation on SLO breach

### Security & Authentication (OWASP Compliant + Istio)

17. **Authentication & Authorization**

- OAuth 2.0 + OpenID Connect (OIDC)
- Passport.js with pluggable strategies
- NextAuth.js for frontend
- JWT handling (access + refresh tokens)
- Token rotation and revocation
- Istio RequestAuthentication for JWT validation at gateway
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Multi-factor authentication (MFA) support
- Secure password hashing (argon2)
- Account lockout policies
- Session management
- Security audit logging

18. **API Security (OWASP + Istio)**

- Istio AuthorizationPolicy for service-level security
- Rate limiting: Istio (coarse-grained) + App (fine-grained with Redis)
- CORS configuration with environment whitelisting
- Helmet.js security headers
- CSRF protection
- Input validation and sanitization (Zod)
- SQL injection prevention (Prisma)
- XSS protection
- Request size limits
- HPP (HTTP Parameter Pollution) prevention
- Content type validation
- Istio mTLS for service-to-service communication

19. **Security Headers (OWASP + Istio)**

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (Clickjacking protection)
- X-Content-Type-Options (MIME sniffing prevention)
- Referrer-Policy
- Permissions-Policy
- X-XSS-Protection
- Strict-Transport-Security
- Configured via Helmet.js + Istio EnvoyFilter

20. **Encryption & Data Protection**

- DI pattern for encryption service
- Data encryption at rest
- Encryption in transit (TLS 1.3 + Istio mTLS)
- Secure key management via Vault
- Field-level encryption for sensitive data
- PII data handling
- GDPR compliance considerations

### API Design & Documentation

21. **API Versioning (Header-Based + HATEOAS + Istio)**
    - Accept-version header for versioning
    - Istio VirtualService routes based on headers
    - Clean, version-free URLs
    - Version deprecation strategy
    - Backward compatibility guidelines
    - API changelog
    - Migration guides between versions

22. **HATEOAS Implementation**
    - Hypermedia links in all responses
    - Self-documenting API
    - Dynamic client capabilities
    - State machine representation
    - Action availability based on permissions
    - Link relation types (RFC 8288)

23. **API Documentation**
    - OpenAPI 3.0 specification
    - Swagger UI integration
    - Request/response examples
    - Authentication documentation
    - Error code reference
    - HATEOAS link documentation
    - Postman collection generation
    - API versioning guide

24. **Input Validation & DTOs**
    - Zod schemas for all endpoints
    - Data Transfer Objects (DTOs)
    - Request body validation
    - Query parameter validation
    - Path parameter validation
    - Custom validation rules
    - File upload validation
    - OWASP validation guidelines

25. **Error Handling**
    - Centralized error handler middleware
    - Custom error classes hierarchy
    - Standardized error codes
    - User-friendly error messages
    - Error logging without sensitive data
    - Proper HTTP status codes
    - Error response format with HATEOAS
    - Security error handling (no info leak)

26. **API Features**
    - Cursor-based and offset pagination
    - Filtering and search capabilities
    - Sorting with multiple fields
    - Field selection (sparse fieldsets)
    - Response compression (gzip/brotli)
    - ETag support for caching
    - Conditional requests (If-Modified-Since)
    - Bulk operations

### Observability & Monitoring

27. **Logging Architecture**
    - Winston for application logs
    - Morgan for HTTP request logs
    - Structured JSON logging
    - Log levels per environment
    - Log rotation and retention
    - Request correlation IDs
    - User context in logs
    - Performance metrics logging
    - Security event logging (OWASP)
    - PII redaction in logs

28. **Error Tracking**
    - Sentry integration for both apps
    - Source map support
    - User context and breadcrumbs
    - Performance monitoring
    - Release tracking
    - Custom error fingerprinting
    - Security error tracking
    - Error rate alerting

29. **Health Checks & Monitoring**
    - `/health` endpoint (basic health)
    - `/ready` endpoint (readiness probe)
    - `/metrics` endpoint (Prometheus format)
    - Database connectivity checks
    - Redis connectivity checks
    - External service checks
    - Graceful degradation
    - APM integration points
    - WebSocket health monitoring
    - Queue health monitoring

30. **Request Tracking**
    - Correlation ID generation (leverages Istio trace headers)
    - Request ID in all logs
    - Request ID in response headers
    - Distributed tracing support
    - Performance timing headers
    - User action tracking

31. **Distributed Tracing (Istio + Jaeger)**
    - Automatic trace propagation via Istio sidecars
    - Jaeger integration for trace visualization
    - OpenTelemetry support
    - Trace sampling configuration
    - Service dependency mapping
    - Latency analysis across services
    - Error trace highlighting
    - Custom span annotations for business logic
    - Trace context in application logs
    - Trace-based alerting

32. **Metrics & Dashboards (Prometheus + Grafana)**
    - Istio service mesh metrics (RED: Rate, Errors, Duration)
    - Application-specific business metrics
    - Custom Prometheus metrics endpoints
    - Grafana dashboards for:
      - Service mesh health and traffic flow
      - API endpoint performance
      - Database query performance
      - Redis cache hit/miss rates
      - Message queue throughput
      - WebSocket connection metrics
      - User session analytics
      - Business KPIs
    - Alert rules configuration (Prometheus Alertmanager)
    - SLI/SLO tracking and reporting
    - Resource utilization monitoring

33. **Application Performance Monitoring (APM)**
    - Datadog or New Relic integration
    - Transaction tracing end-to-end
    - Database query performance analysis
    - External API call tracking and latency
    - Memory profiling and leak detection
    - CPU profiling and optimization insights
    - Custom business metrics and dashboards
    - Real User Monitoring (RUM) for frontend
    - Synthetic monitoring for critical paths
    - Performance budgets and alerts
    - Code-level performance insights

34. **Centralized Logging (ELK Stack / Loki)**
    - Log aggregation from all services and containers
    - **Option A: ELK Stack**
      - Elasticsearch for log storage and indexing
      - Logstash for log processing and enrichment
      - Kibana for log visualization and analysis
      - Filebeat for log shipping
    - **Option B: Loki + Grafana**
      - Loki for cost-effective log aggregation
      - Promtail for log collection from Kubernetes
      - Grafana for unified logs + metrics visualization
      - Label-based log querying
    - Log retention policies per environment
    - Full-text search and filtering
    - Log-based alerting (error rates, patterns)
    - Correlation with distributed traces and metrics
    - Log analytics and anomaly detection
    - Audit log separation and retention

35. **Alerting & Incident Management**
    - PagerDuty or OpsGenie integration
    - Alert routing based on severity and team
    - Escalation policies and on-call schedules
    - Incident response runbooks (automated)
    - Alert aggregation and deduplication
    - Status page integration (StatusPage.io, custom)
    - Post-incident review (PIR) templates
    - Alert fatigue prevention (noise reduction)
    - SLA/SLO breach notifications
    - Integration with Slack/Teams for notifications

36. **Service Mesh Observability (Kiali)**
    - Service mesh topology visualization
    - Real-time traffic flow analysis
    - Istio configuration validation
    - Service health checks overview
    - Distributed tracing integration with Jaeger
    - Metrics visualization (request rates, latency, errors)
    - Istio configuration management UI
    - Security policy visualization (mTLS, AuthorizationPolicies)
    - Traffic shifting and canary deployment monitoring
    - Namespace and workload filtering

### File & Storage Management (DI Pattern)

37. **File Upload Handling**
    - Multer middleware configuration
    - File type validation (MIME + magic numbers)
    - File size limits per endpoint
    - Virus scanning integration (ClamAV)
    - Image optimization (Sharp)
    - DI storage abstraction
    - Local storage implementation
    - S3 storage implementation
    - Azure Blob storage implementation
    - GCP Storage implementation
    - Environment-based provider selection
    - Signed URL generation
    - Multi-part upload for large files
    - Upload progress tracking

38. **Static Asset Management**
    - CDN configuration
    - Asset versioning and cache busting
    - Image optimization pipeline
    - Lazy loading strategies
    - Responsive images

### Internationalization (i18n)

39. **Multilingual Support**
    - next-i18next integration
    - Translation files (en, es, fr, de initially)
    - Language detection (Accept-Language header)
    - RTL language support
    - Date/time/number formatting
    - Pluralization rules
    - Currency formatting
    - Translation management workflow
    - Missing translation handling
    - Language switcher component
    - SEO for multilingual content

### Developer Experience

40. **Code Quality & Standards**
    - ESLint with TypeScript rules
    - ESLint plugin for OWASP security
    - Prettier for formatting
    - Husky for git hooks
    - lint-staged for pre-commit checks
    - commitlint for conventional commits
    - Code complexity limits
    - Import ordering rules
    - Unused code detection
    - Dependency cruiser for architecture

41. **Git Workflow**
    - Conventional Commits specification
    - Semantic versioning (semver)
    - Automated changelog generation
    - Branch naming conventions
    - PR templates
    - Code review guidelines
    - Security review checklist
    - CODEOWNERS file

42. **Documentation**
    - README files (root, apps, packages)
    - Architecture Decision Records (ADRs)
    - OWASP compliance documentation
    - Threat modeling documentation
    - Security review checklist
    - Contributing guidelines
    - Code of conduct
    - Development setup instructions
    - Deployment guides
    - API documentation
    - i18n translation guide
    - Troubleshooting guides
    - Security incident response

43. **Dev Containers (Development Environment)**
    - VSCode devcontainer.json configuration
    - Docker Compose for development services
    - Pre-configured development tools and extensions
    - Automatic installation of dependencies
    - PostgreSQL, Redis, and other services pre-configured
    - Consistent environment across team members
    - GitHub Codespaces ready
    - Port forwarding for local development
    - Volume mounts for code and node_modules
    - Pre-commit hooks automatically configured
    - Environment variables pre-set for development
    - Hot reload and debugging support
    - One-command setup for new developers

### Advanced Features

44. **Feature Flags**
    - Feature toggle system with DI
    - Environment-based flags
    - User-based flags
    - Percentage-based releases
    - A/B testing support
    - Flag management API
    - Feature flag audit logging

45. **Performance Optimization**
    - Response caching strategies
    - Database query optimization
    - N+1 query prevention
    - Connection pooling
    - Static page generation (Next.js)
    - Incremental Static Regeneration
    - API response compression
    - Redis caching layers
    - Query result caching
    - CDN integration

46. **Graceful Shutdown**
    - SIGTERM/SIGINT signal handling
    - In-flight request completion
    - Database connection closure
    - Redis connection cleanup
    - WebSocket connection cleanup
    - Background job completion
    - Queue draining
    - Kubernetes-ready lifecycle
    - Shutdown timeout configuration

47. **Contract Testing (Pact)**
    - Consumer-driven contract testing
    - Pact broker for contract sharing
    - Contract verification in CI/CD
    - Provider state management
    - Contract versioning and compatibility
    - Breaking change detection
    - Contract testing for REST APIs
    - Contract testing for message queues
    - Cross-team API governance
    - Contract test reports and dashboards

48. **API Mocking (Mock Service Worker)**
    - MSW for frontend development and testing
    - Request interception at network level
    - Mock API handlers for all endpoints
    - Development mode with mock data
    - Test mode with predictable responses
    - Browser and Node.js support
    - Realistic error scenario testing
    - GraphQL mocking support (if using GraphQL)
    - Debugging with MSW DevTools
    - Seamless transition to real APIs

49. **Artifact Registry & Publish Flow**
    - Default to GitHub Packages for minimal ops and GitHub-native CI integration
    - Provide a registry-agnostic publish script and CI workflow that accept `REGISTRY_URL` and `NPM_AUTH_TOKEN` so registry endpoint and auth can be swapped without code changes
    - Document scoped-package requirements for GitHub Packages (use `@apkasten906/*` scoped names for packages intended to be published)
    - Recommend internal registry (Verdaccio / Artifactory) deployment in-cluster behind the service mesh for organizations that need proxying, caching, or private unscoped packages
    - CI should place registry auth into `.npmrc` at runtime; publishing script should support `--dry-run` and `--ci` modes
    - Add `.npmrc.template` and `scripts/publish-packages.js` that write an ephemeral npmrc and run `pnpm -w -r publish --registry ${REGISTRY_URL}`

## Implementation Phases

> **Quality Assurance Process**: For each phase, follow this quality workflow:
>
> 1. **Implement Feature** - Code the functionality following SOLID principles and DI pattern
> 2. **Create BDD Scenarios** - Write Cucumber feature files with comprehensive scenarios covering all functionality
> 3. **Write Unit Tests** - Create unit tests with Vitest covering all code paths, edge cases, and error handling
> 4. **Run Tests** - Execute `pnpm test:unit` and verify all tests pass
> 5. **Lint/Type Check** - Run ESLint and TypeScript compiler (`pnpm lint`, `pnpm type-check`) to ensure zero errors
> 6. **Fix Issues** - Address any test failures, linting errors, or type errors immediately
> 7. **Commit** - Use conventional commits (feat/fix/docs/test/refactor) with descriptive messages
> 8. **Document** - Update relevant documentation (README, ADRs, feature guides, API docs)

### Phase 1: Foundation & Governance

- Initialize monorepo with Turborepo
- Set up pnpm workspaces
- Create frontend and backend apps
- Configure TypeScript (strict mode)
- Set up ESLint + Prettier + OWASP ESLint plugin
- Configure Husky + lint-staged + commitlint
- Create SECURITY.md and security governance docs
- Set up OWASP Dependency-Check
- Install local Kubernetes cluster (minikube/kind/k3s)
- Install Istio in development cluster
- Configure Dev Container
  - Create .devcontainer/devcontainer.json with VSCode settings
  - Set up docker-compose.yml for PostgreSQL, Redis, and other services
  - Configure Dockerfile with Node.js, pnpm, and development tools
  - Add post-create script for automatic dependency installation
  - Configure VSCode extensions (ESLint, Prettier, Prisma, etc.)
  - Set up port forwarding for all services
  - Configure volume mounts for optimal performance
  - Add environment variables for development

### Phase 2: Security Framework

- Implement DI container (TSyringe)
- Create security abstraction interfaces (auth, encryption, storage, notifications, search, events, payments, analytics, secrets)
- Implement OAuth 2.0/OIDC with Passport.js
- Configure NextAuth.js for frontend
- Implement JWT service with refresh tokens
- Create RBAC/ABAC middleware
- Add encryption service with DI
- Implement security audit logging
- Configure Helmet.js security headers
- Set up secrets management (Vault or cloud provider)

### Phase 3: Backend Core

- Initialize Express server
- Configure Prisma with PostgreSQL
  - Set up primary database for writes
  - Configure read replicas for reads
  - Implement automatic read/write query routing
  - Add replica lag monitoring
  - Configure connection pooling (PgBouncer)
- Implement SOLID architecture layers
- Add Winston + Morgan logging (simplified for Istio)
- Set up correlation ID middleware (leverage Istio trace headers)
- Configure environment validation with Zod
- Implement health check endpoints (/health, /ready, /metrics)
  - Add database primary health check
  - Add read replica health checks
  - Add cache layer health checks
- Add graceful shutdown handling
- Remove custom circuit breaker libraries (use Istio instead)
- Implement multi-level caching service
  - L1: In-memory cache with node-cache
  - L2: Redis distributed cache
  - Cache invalidation strategies
  - Cache warming on startup
  - Cache stampede prevention
- Implement webhook management system
  - Webhook registration and subscription API
  - HMAC signature generation/verification
  - Webhook delivery queue with Bull/BullMQ
  - Retry logic with exponential backoff
  - Delivery status tracking

### Phase 4: Istio Service Mesh Integration

- Configure Istio PeerAuthentication (STRICT mTLS)
- Create Istio Gateway for ingress
- Set up VirtualServices for header-based API versioning
- Configure DestinationRules (circuit breakers, retries, timeouts, load balancing)
- Implement AuthorizationPolicies (default-deny, service-to-service)
- Configure distributed tracing with Jaeger
- Set up Kiali for service mesh visualization
- Configure Istio telemetry for Prometheus and Grafana
- Implement network-level rate limiting with Istio
- Create fault injection policies for chaos testing

### Phase 5: Infrastructure Services

- Integrate Redis for caching and sessions
- Set up Bull/BullMQ for message queuing
- Implement background job processors
- Configure Socket.io for WebSockets
- Add WebSocket authentication
- Implement Redis adapter for Socket.io scaling
- Create queue monitoring dashboard (Bull Board)
- Configure Redis Cluster for production

### Phase 6: Additional Service Abstractions

- Implement notification service abstraction (email, SMS, push)
  - SendGrid/SES for email
  - Twilio for SMS
  - Firebase Cloud Messaging for push notifications
- Implement search service abstraction
  - Elasticsearch integration
  - Algolia integration (alternative)
- Implement event bus abstraction
  - Redis Pub/Sub implementation
  - RabbitMQ implementation (alternative)
- Implement payment service abstraction
  - Stripe integration
  - PayPal integration (alternative)
- Implement analytics service abstraction
  - Mixpanel integration
  - Segment integration (alternative)
- Configure secrets rotation and audit logging

### Phase 7: API Design

- Implement header-based versioning (simplified with Istio routing)
- Add HATEOAS response structure
- Configure Swagger/OpenAPI documentation
- Implement pagination, filtering, sorting
- Add fine-grained rate limiting with Redis (business logic)
- Configure CORS middleware
- Implement request validation with Zod
- Add centralized error handling
- Remove custom retry/timeout logic (use Istio)

### Phase 8: File Storage & i18n

- Implement storage abstraction interface
- Create local storage provider
- Create S3 storage provider
- Create Azure Blob storage provider
- Create GCP Storage provider
- Configure Multer with security validations
- Add virus scanning integration (ClamAV)
- Set up next-i18next
- Create translation files (en, es, fr, de)
- Add language detection and switching

### Phase 8.5: Feature Management System

- Implement feature flag service interface with DI pattern
- Create flag storage backend (database + Redis cache)
- Add flag evaluation engine
  - Environment-based flags (dev/staging/prod)
  - User-based flags (user ID, role, attributes)
  - Percentage-based rollouts (gradual releases)
  - Time-based flags (scheduled activation)
- Build flag management API (CRUD operations)
  - Create/update/delete flags
  - Enable/disable flags
  - Set flag targeting rules
  - Query flag status and history
- Implement flag audit logging
  - Track flag changes (who, what, when)
  - Log flag evaluations for debugging
  - Export flag usage analytics
- Add flag override mechanism for testing
  - Local development overrides
  - QA environment flag controls
  - Feature preview for stakeholders
- Create admin UI for flag management (optional)
  - Flag dashboard
  - Visual flag editor
  - Rollout progress visualization
  - User targeting interface
- Integrate with backend
  - Flag middleware for request-level evaluation
  - Service-level flag checks
  - Flag-based route enabling/disabling
- Integrate with frontend
  - Feature flag provider (React Context)
  - useFeatureFlag hook
  - Feature flag component wrappers
  - SSR-compatible flag evaluation
- Document flag lifecycle and rollout strategies
  - Flag naming conventions
  - Rollout best practices (percentage stages)
  - Deprecation and cleanup procedures
  - Emergency kill switch workflows
- Add flag-based A/B testing support
  - Variant assignment (A/B/C)
  - User bucketing and consistency
  - Integration with analytics service
  - Experiment result tracking
- Create BDD scenarios for feature flag behavior
  - Flag evaluation scenarios
  - Rollout progression scenarios
  - Permission-based flag access
- Add unit tests for flag evaluation logic
  - Targeting rule evaluation
  - Percentage distribution
  - Flag inheritance and defaults

### Phase 9: Frontend Core

- Initialize Next.js with App Router
- Configure shared packages (types, utils, constants, config)
- Set up API client with HATEOAS support
- Implement NextAuth.js integration
- Add WebSocket client
- Configure Sentry error tracking
- Add error boundaries
- Implement i18n routing
- Integrate feature flag system (from Phase 8.5)
- Set up Mock Service Worker (MSW) for development and testing
- Create mock API handlers for all backend endpoints
- Configure MSW for browser and Node.js environments

### Phase 10: Observability Stack

- Configure Prometheus for metrics collection
  - Istio service mesh metrics
  - Application business metrics
  - Custom metrics endpoints
- Set up Grafana dashboards
  - Service mesh health and traffic flow
  - API endpoint performance
  - Database and Redis performance
  - Message queue metrics
  - Business KPIs
- Configure Jaeger for distributed tracing
  - Automatic trace propagation via Istio
  - Custom span annotations for business logic
- Set up centralized logging (choose ELK Stack or Loki)
  - ELK: Elasticsearch, Logstash, Kibana, Filebeat
  - Loki: Loki, Promtail, Grafana
- Integrate APM (Datadog or New Relic)
  - Transaction tracing
  - Real User Monitoring (RUM)
  - Synthetic monitoring
- Configure alerting and incident management
  - Prometheus Alertmanager rules
  - PagerDuty or OpsGenie integration
  - Slack/Teams notifications
- Set up Kiali for service mesh observability

### Phase 11: Testing Infrastructure

- Configure Vitest for unit tests in both apps
- Set up Cucumber with BDD scenarios
- Configure Playwright for E2E tests with Page Object Model
- Add OWASP ZAP for security testing
- Create security test suite
- Set up coverage reporting
- Add visual regression testing
- Create test data factories
- Add load testing with k6
  - API load scenarios
  - Stress testing
  - Spike testing
  - Soak testing
- Set up Pact for contract testing
  - Configure Pact broker (self-hosted or PactFlow)
  - Create consumer contracts for frontend-backend communication
  - Implement provider verification tests in backend
  - Integrate contract testing into CI/CD pipeline
  - Set up contract versioning and compatibility matrix
- Integrate MSW with testing framework
  - Configure MSW handlers for unit and integration tests
  - Create reusable mock scenarios
  - Add MSW to Playwright tests for isolated E2E testing

### Phase 12: Kubernetes & DevOps

- Create Kubernetes base manifests
  - Namespace configurations
  - Deployments for frontend, backend
  - StatefulSets for PostgreSQL
  - Deployments for Redis
- Create Kustomize overlays (development, staging, production)
- Create multi-stage Dockerfiles with security scanning
- Configure docker-compose for local development
- Set up GitHub Actions CI/CD workflows
  - Lint and type checking
  - Unit tests
  - Integration tests
  - E2E tests with Playwright
  - OWASP ZAP security scans
  - Load tests with k6
  - Container image building and scanning (Trivy)
  - Deployment to Kubernetes
- Add SAST (static analysis security testing)
- Add dependency scanning (Snyk, OWASP Dependency-Check)
- Implement secret scanning (GitGuardian)
- Configure security notifications and alerts
- Implement database backup and recovery strategies

### Phase 13: Documentation & Polish

- Create comprehensive README files (root, apps, packages)
- Write Architecture Decision Records (ADRs)
  - Istio service mesh adoption
  - DI pattern for service abstractions
  - Technology choices
- Document OWASP compliance
- Create threat model documentation
- Document Istio architecture and configuration
- Add service integration guides (notifications, search, payments, analytics)
- Add contributing guidelines and PR templates
- Set up conventional commits and automated changelog
- Create deployment guides (local, staging, production)
- Add troubleshooting guides
- Create API client generation script
- Add code examples and tutorials
- Document secrets management workflows
- Create incident response playbooks

## Security Review Checklist

### Authentication & Authorization

- [ ] OAuth 2.0/OIDC properly configured with refresh token rotation
- [ ] NextAuth.js integrated with backend OAuth provider
- [ ] JWT signing with strong algorithms (RS256 or ES256)
- [ ] Short-lived access tokens (15-30 minutes)
- [ ] Refresh tokens stored securely with HttpOnly cookies
- [ ] RBAC/ABAC middleware applied to all protected routes
- [ ] Proper permission inheritance and delegation
- [ ] Account lockout after failed login attempts
- [ ] Multi-factor authentication support
- [ ] Session invalidation on logout and password change
- [ ] Secure password storage with bcrypt/argon2
- [ ] Password complexity requirements enforced

### Istio Service Mesh Security

- [ ] Istio PeerAuthentication set to STRICT mTLS mode
- [ ] Automatic mTLS certificate rotation configured
- [ ] AuthorizationPolicy configured with default-deny
- [ ] Service-to-service authorization policies defined
- [ ] Istio Gateway secured with TLS termination
- [ ] JWT validation policies configured in Istio RequestAuthentication
- [ ] Network policies enforced through Istio
- [ ] Service mesh security audit logging enabled
- [ ] Istio configuration scanned for security misconfigurations
- [ ] Only authorized workloads allowed in service mesh
- [ ] Istio telemetry protected and access-controlled
- [ ] Kiali dashboard authentication enforced

### Input Validation & Data Protection

- [ ] All user input validated with Zod schemas
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] XSS prevention with CSP headers
- [ ] CSRF protection enabled
- [ ] File upload validation (type, size, content)
- [ ] Virus scanning on uploaded files (ClamAV)
- [ ] Encryption at rest for sensitive data
- [ ] Field-level encryption for PII
- [ ] Secure data deletion (crypto shredding)
- [ ] No sensitive data in logs or error messages

### API Security

- [ ] Helmet.js configured with all security headers
- [ ] CORS properly restricted to allowed origins
- [ ] Rate limiting implemented (Redis + Istio)
- [ ] API versioning enforced (header-based with Istio VirtualServices)
- [ ] Request size limits configured
- [ ] Timeout policies set (Istio DestinationRules)
- [ ] Circuit breakers configured (Istio DestinationRules)
- [ ] GraphQL query depth/complexity limits (if using GraphQL)
- [ ] API documentation doesn't expose sensitive implementation details
- [ ] Error messages don't leak stack traces or sensitive information

### Infrastructure Security

- [ ] PostgreSQL access restricted to backend only
- [ ] Redis authentication enabled
- [ ] Redis commands restricted (no FLUSHALL, FLUSHDB, KEYS in production)
- [ ] Kubernetes network policies applied
- [ ] Secrets stored in Vault or cloud secrets manager
- [ ] No hardcoded credentials in code
- [ ] Environment variables validated on startup
- [ ] TLS 1.3 enforced for all external connections
- [ ] Container images scanned for vulnerabilities (Trivy)
- [ ] Minimal base images used (Alpine/distroless)
- [ ] Non-root containers enforced
- [ ] Read-only root filesystem where possible

### Database & Data Layer Security

- [ ] Read replica access restricted appropriately
- [ ] Connection strings for replicas secured in secrets manager
- [ ] Replica lag monitoring and alerting configured
- [ ] Fallback to primary database on replica failure tested
- [ ] Connection pooling limits prevent resource exhaustion
- [ ] Database audit logging enabled for primary
- [ ] Sensitive queries only run on primary (never cached)
- [ ] Cache poisoning prevention mechanisms in place
- [ ] Cache keys don't expose sensitive information
- [ ] Multi-level cache invalidation tested

### Webhook Security

- [ ] Webhook endpoints require HTTPS only
- [ ] HMAC signature verification enforced
- [ ] Webhook secrets stored securely in secrets manager
- [ ] Webhook delivery rate limiting configured
- [ ] IP whitelisting supported for webhook endpoints
- [ ] Webhook payload size limits enforced
- [ ] Webhook delivery retries have exponential backoff
- [ ] Dead letter queue monitored for failed deliveries
- [ ] Webhook event data sanitized before delivery
- [ ] Webhook logs don't contain sensitive payload data

### Deployment Security

- [ ] Blue-green switch requires approval in production
- [ ] Canary deployments have automatic rollback on high error rates
- [ ] Database migrations tested in blue-green scenario
- [ ] Secrets rotated between blue and green deployments
- [ ] Health checks validate security configurations
- [ ] Deployment logs audit all environment changes
- [ ] Rollback procedures tested regularly
- [ ] A/B test segments don't leak user data

### Dependency & Supply Chain Security

- [ ] OWASP Dependency-Check integrated in CI/CD
- [ ] Snyk or similar tool scanning dependencies
- [ ] Automated dependency updates with Dependabot/Renovate
- [ ] Package lock files committed (pnpm-lock.yaml)
- [ ] NPM audit run regularly
- [ ] Only trusted registries used
- [ ] Subresource Integrity (SRI) for CDN resources
- [ ] Software Bill of Materials (SBOM) generated

### Observability & Incident Response

- [ ] Security audit logging implemented
- [ ] Correlation IDs for request tracing (Istio trace headers)
- [ ] Distributed tracing with Jaeger configured
- [ ] Alerting configured for security events (PagerDuty/OpsGenie)
- [ ] Failed authentication attempts logged and monitored
- [ ] Anomaly detection configured
- [ ] Log retention policies defined
- [ ] Incident response playbooks created
- [ ] Security contact information published (SECURITY.md)
- [ ] Vulnerability disclosure policy published

### Testing & Validation

- [ ] OWASP ZAP automated scans in CI/CD
- [ ] Security unit tests for authentication/authorization
- [ ] Penetration testing conducted
- [ ] Threat modeling completed
- [ ] Security regression tests added
- [ ] Chaos engineering tests include security scenarios
- [ ] Load testing validates rate limiting effectiveness
- [ ] E2E tests include security-critical user flows
- [ ] Contract tests verify API security requirements
- [ ] Pact broker access properly secured and authenticated
- [ ] MSW mock handlers don't expose real credentials or tokens
- [ ] MSW disabled in production builds
- [ ] Contract tests validate authorization headers and RBAC

### Compliance & Documentation

- [ ] OWASP Top 10 risks addressed
- [ ] OWASP ASVS compliance documented
- [ ] Data classification policy defined
- [ ] Privacy policy and terms of service reviewed
- [ ] GDPR/CCPA compliance verified (if applicable)
- [ ] Security Architecture Decision Records (ADRs) written
- [ ] Threat model documentation current
- [ ] Security training provided to development team
- [ ] Security review process documented
- [ ] Regular security audits scheduled
