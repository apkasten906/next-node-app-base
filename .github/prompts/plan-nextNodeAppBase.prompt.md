Plan for next-node-app-base (updated)

## Overview

- Goal: Make this monorepo production-ready with reliable developer workflows and CI, hardened pre-push checks, deterministic integration tests, and a simple, configurable artifact publishing flow.

## Recent changes (delta)

- Hardened `pre-push` to run a fast backend test gate and added `scripts/run-backend-tests-ci.js` to force mocks for external services in local dev.
- Converted many high-value `@security` BDD scenarios into integration tests and wired Cucumber step-definitions to use in-memory services (AuditLogService, AuthorizationService, CacheService). Added cache-backed rate limiter tests and mock Redis support.
- Chosen artifact registry: GitHub Packages selected (see Advanced Features for placement). A registry-agnostic publish flow will allow CI and local dev to swap to an internal registry exposed via the service mesh by setting `REGISTRY_URL` and `NPM_AUTH_TOKEN`.
- **✅ COMPLETED (Dec 2024)**: Migrated to ESLint v9 flat config, fixed pre-commit hooks (lint-staged, TypeScript, commitlint working end-to-end).
- **✅ COMPLETED (Dec 2024)**: Implemented owner-based authorization (`:own` semantics), integrated audit logging into AuthorizationService, added test helpers (`clear()`, `resetForTests()`).
- **✅ COMPLETED (Dec 2024)**: Made integration tests resilient to external services - tests skip gracefully when `TEST_EXTERNAL_SERVICES=false` or dependencies unavailable. Test suite runs in ~11s without external connections.

## Completed Work (WSJF Prioritized)

### High Priority (WSJF > 4.3)

- ✅ **Option 3** (WSJF 5.67) - Audit test helpers: Added `clear()` method to AuditLogService, implemented `:own` permission semantics in AuthorizationService with audit logging, created integration test (commit `8b8d710`)
- ✅ **Option 1** (WSJF 5.00) - ESLint/lint-staged fix: Migrated to ESLint v9 flat config format, fixed Husky pre-commit and commit-msg hooks (commit `86f14b6`)
- ✅ **Options 5-7** (WSJF 4.33) - Test resilience: Added skip logic to external-service-dependent tests, extended ESLint config for test files, removed unused variables (commit `a28779f`)

### Next Priorities (WSJF ~4.0)

- ⏳ **Option 8** - Publish dry-run to GitHub Packages (WSJF 4.50)
- ⏳ **Option 2** - Registry-agnostic publish flow implementation (WSJF 4.00)
- ⏳ **Option 6** - Verdaccio in-cluster manifest (WSJF 4.00)
- ⏳ **Option 5** - Wire Cucumber steps to integration harness (WSJF 3.67)
- ⏳ **Option 4** - Full ABAC/policy engine expansion (WSJF 2.78)

## Priorities (A / B / C from original plan)

1. B (current): Convert `@security` BDD scenarios to integration tests and make tests resilient to external services (MockRedis, toggles). Continue until all critical scenarios are covered.
2. C (next): Finalize artifact registry and publishing flow (GitHub Packages default), add `scripts/publish-packages.js`, `.npmrc.template`, and GitHub Actions publish workflow. Make publish flow registry-agnostic via `REGISTRY_URL` so we can route to an internal registry through the service mesh.
3. A (later): Investigate Prisma CLI/migrations issue, propose workaround, and write ADR for migration strategy.

## Actionable steps (short-term)

- ✅ DONE: Finish converting remaining `@security` scenarios to integration tests and wire any missing Cucumber step-definitions to the integration harness. (owner: dev)
- ⏳ IN PROGRESS: Add a registry-agnostic publish script and GitHub Actions workflow that defaults to GitHub Packages but respects `REGISTRY_URL` and `NPM_AUTH_TOKEN` for an internal registry. (owner: dev)
- ✅ DONE: Create ADR documenting the artifact registry decision and how to swap registries through the service mesh. (owner: dev) — see `docs/adr/0001-artifact-registry-github-packages.md`.
- ✅ DONE: Add an optional `test-setup` (Vitest `setupFiles`) to set `REDIS_MOCK=true` and `TEST_EXTERNAL_SERVICES=false` for local/CI fast gates.

## Notes on service-mesh friendliness

- The publish flow will be registry-agnostic. To swap in an internal registry that lives inside the cluster (Verdaccio, Artifactory, Nexus), set CI `REGISTRY_URL` to a stable internal address (e.g. `http://npm-registry.svc.cluster.local:4873`) and provide `NPM_AUTH_TOKEN` in secrets. The service mesh can expose/secure that endpoint; the CI/publish scripts remain unchanged.

## Next check-in

- After ADR is added, implement the `scripts/publish-packages.js`, `.github/workflows/publish.yml`, and `.npmrc.template` files. Then update `packages/*` to be scoped where appropriate (e.g., `@apkasten906/<pkg>`).

If you want me to proceed: I can implement the publish script and workflow next, or draft a Kubernetes manifest for an internal Verdaccio registry fronted by the mesh. Which would you like?

# Plan: Full-Stack Monorepo Base Template

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

## Technology Decisions (Confirmed)

✅ **Package Manager**: pnpm
✅ **Service Mesh**: Istio for mTLS, traffic management, observability
✅ **Orchestration**: Kubernetes (production), Docker Compose (local dev)
✅ **Security Governance**: OWASP standards with DI pattern for security libraries
✅ **Authentication**: OAuth 2.0 + OpenID Connect (OIDC) via Passport.js abstraction
✅ **Infrastructure**: Redis, Bull/BullMQ (message queuing), Socket.io (WebSockets)
✅ **API Versioning**: Header-based with HATEOAS principles (Istio routing)
✅ **Internationalization**: Yes, using next-i18next
✅ **File Storage**: Local with DI pattern for cloud provider abstraction
✅ **Additional Services**: Notification, Search, Event Bus, Payment, Analytics (all with DI)
✅ **Secrets Management**: HashiCorp Vault or cloud provider native
✅ **Observability**: Istio + Jaeger (tracing), Prometheus + Grafana (metrics), ELK/Loki (logs)

## Recommended Authentication Provider

For OAuth 2.0 + OpenID Connect implementation, I recommend:

**Option A: Auth0 (Recommended for Speed)**

- Managed service, fastest to implement
- Excellent Next.js/Node.js SDKs
- Built-in RBAC and MFA
- Social login providers ready
- **Pros**: Quick setup, battle-tested, great DX
- **Cons**: Paid service (free tier available), vendor lock-in risk

**Option B: Keycloak (Recommended for Control)**

- Self-hosted, open-source
- Full OIDC/OAuth2 compliance
- Highly customizable
- No external dependencies
- **Pros**: Complete control, free, extensible
- **Cons**: Requires hosting/maintenance, steeper learning curve

**Option C: Passport.js with Custom OIDC**

- Build custom with passport-oauth2 strategy
- DI pattern for swappable providers
- Complete flexibility
- **Pros**: No vendor lock-in, full customization
- **Cons**: More implementation work, need to maintain

**Recommendation**: Start with **Passport.js abstraction layer** that can use any OIDC provider, then implement **Auth0** for quick start with ability to swap to Keycloak or custom later.

## Technology Stack Summary

| Category                   | Technology                         | Rationale                                    |
| -------------------------- | ---------------------------------- | -------------------------------------------- | ---------------------------- |
| **Monorepo**               | Turborepo                          | Best Next.js integration, simple, fast       |
| **Package Manager**        | pnpm                               | Fast, efficient, workspace support ✅        |
| **Service Mesh**           | Istio                              | mTLS, traffic management, observability ✅   |
| **Orchestration**          | Kubernetes                         | Production container orchestration ✅        |
| **DI Library**             | TSyringe                           | Clean API, TypeScript-first, lightweight     |
| **Node.js Framework**      | Express                            | Mature, flexible, great middleware ecosystem |
| **Authentication**         | OAuth 2.0 + OIDC (Passport.js)     | Industry standard, OWASP recommended ✅      |
| **Authorization**          | RBAC + ABAC                        | Flexible, scalable permissions               |
| **Validation**             | Zod                                | Type-safe, composable, great DX              |
| **ORM**                    | Prisma                             | Type-safe, migrations, great DX              |
| **Caching**                | Redis                              | Session storage, caching, job queues ✅      |
| **Message Queue**          | Bull/BullMQ                        | Async task processing, scheduled jobs ✅     |
| **Event Bus**              | Redis Pub/Sub / RabbitMQ / Kafka   | Decoupled event-driven architecture ✅       |
| **WebSockets**             | Socket.io                          | Real-time bidirectional communication ✅     |
| **Notifications**          | DI Pattern (SendGrid/Twilio/FCM)   | Email, SMS, push notifications ✅            |
| **Search**                 | DI Pattern (Elasticsearch/Algolia) | Full-text search capabilities ✅             |
| **Payments**               | DI Pattern (Stripe/PayPal)         | Payment processing abstraction ✅            |
| **Analytics**              | DI Pattern (Mixpanel/Segment)      | User analytics and tracking ✅               |
| **Database Read Replicas** | Prisma + PostgreSQL                | Horizontal read scaling ✅                   |
| **Webhook Management**     | Custom with DI Pattern             | Third-party integrations ✅                  |
| **Multi-Level Caching**    | In-Memory + Redis + CDN            | Layered performance optimization ✅          |
| **Deployment Strategies**  | Istio Traffic Management           | Blue-Green, Canary, A/B testing ✅           |
| **Testing**                | Vitest + Cucumber + Playwright     | Modern, fast, comprehensive                  |
| **Contract Testing**       | Pact                               | Consumer-driven contract testing ✅          |
| **API Mocking**            | Mock Service Worker (MSW)          | API mocking for testing and development ✅   |
| **Load Testing**           | k6                                 | Performance and stress testing ✅            |
| **Security Testing**       | OWASP ZAP                          | Automated security scanning ✅               |
| **Linting**                | ESLint + OWASP rules               | Industry standard with security focus        |
| **Git Hooks**              | Husky + lint-staged                | Enforce quality pre-commit                   |
| **Env Validation**         | Zod + dotenv                       | Type-safe environment variables              |
| **Secrets**                | Vault / AWS Secrets Manager        | Secure secrets management ✅                 |
| **API Design**             | HATEOAS + OpenAPI 3.0              | Hypermedia-driven, self-documenting ✅       |
| **API Versioning**         | Header-based + Istio Routing       | Clean URLs, HATEOAS compatible ✅            |
| **Distributed Tracing**    | Istio + Jaeger                     | Request tracing across services ✅           |
| **Metrics**                | Prometheus + Grafana               | Time-series metrics and dashboards ✅        |
| **Logging**                | ELK Stack / Loki + Grafana         | Centralized log aggregation ✅               |
| **APM**                    | Datadog / New Relic                | Application performance monitoring ✅        |
| **Container**              | Docker + Docker Compose            | Consistent dev/prod environments             |
| **CI/CD**                  | GitHub Actions                     | Native GitHub integration                    |
| **Error Tracking**         | Sentry                             | Best-in-class error monitoring               |
| **File Upload**            | Multer + DI Storage Pattern        | Secure file handling, provider-agnostic ✅   |
| **i18n**                   | next-i18next                       | Internationalization support ✅              |
| **Feature Flags**          | Custom with DI                     | Gradual rollouts, A/B testing                |
| **Dev Containers**         | VSCode devcontainer.json           | Consistent development environment ✅        |
| **Security Governance**    | OWASP Standards                    | Industry best practices ✅                   | ## OWASP Security Governance |

### Security Standards & Compliance

**OWASP Top 10 Coverage**:

1. **Broken Access Control** - RBAC/ABAC implementation, authorization middleware
2. **Cryptographic Failures** - Encryption at rest/transit, secure key management
3. **Injection** - Parameterized queries (Prisma), input validation (Zod)
4. **Insecure Design** - Threat modeling, security architecture review
5. **Security Misconfiguration** - Security headers, environment validation
6. **Vulnerable Components** - Dependency scanning, automated updates
7. **Authentication Failures** - OAuth 2.0/OIDC, MFA support, secure sessions
8. **Software & Data Integrity** - Code signing, SRI, audit logging
9. **Logging & Monitoring Failures** - Comprehensive logging, SIEM integration ready
10. **SSRF** - URL validation, allow-list approach

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
  getSecret(key: string): Promise<string>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

interface IWebhookService {
  register(url: string, events: string[], secret: string): Promise<WebhookRegistration>;
  unregister(webhookId: string): Promise<void>;
  deliver(webhookId: string, event: WebhookEvent): Promise<DeliveryResult>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
  retry(deliveryId: string): Promise<DeliveryResult>;
  getDeliveryStatus(deliveryId: string): Promise<DeliveryStatus>;
}

interface ICacheService {
  get<T>(key: string, level?: CacheLevel): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number, level?: CacheLevel): Promise<void>;
  delete(key: string, level?: CacheLevel): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// Implementations injected via TSyringe
@injectable()
class OAuth2AuthProvider implements IAuthenticationProvider {
  /* ... */
}

@injectable()
class LocalStorageProvider implements IStorageProvider {
  /* ... */
}

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
class RedisEventBus implements IEventBus {
  /* ... */
}

@injectable()
class StripePaymentService implements IPaymentService {
  /* ... */
}

@injectable()
class MixpanelAnalyticsService implements IAnalyticsService {
  /* ... */
}

@injectable()
class VaultSecretsManager implements ISecretsManager {
  /* ... */
}

@injectable()
class WebhookService implements IWebhookService {
  /* ... */
}

@injectable()
class MultiLevelCacheService implements ICacheService {
  // L1: In-memory (node-cache)
  // L2: Redis
  // L3: CDN (for static assets)
}
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
│   │   ├── destination-rules/
│   │   │   ├── frontend-dr.yaml # Circuit breakers, retries
│   │   │   └── backend-dr.yaml
│   │   ├── peer-authentication.yaml  # mTLS policy
│   │   ├── authorization-policies/
│   │   │   ├── default-deny.yaml
│   │   │   └── service-to-service.yaml
│   │   ├── telemetry.yaml       # Tracing, metrics config
│   │   ├── rate-limits/
│   │   │   └── global-rate-limit.yaml
│   │   └── deployments/         # Deployment strategies
│   │       ├── blue-green/
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

### Phase 9: Frontend Core

- Initialize Next.js with App Router
- Configure shared packages (types, utils, constants, config)
- Set up API client with HATEOAS support
- Implement NextAuth.js integration
- Add WebSocket client
- Configure Sentry error tracking
- Add error boundaries
- Implement i18n routing
- Add feature flags support
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
