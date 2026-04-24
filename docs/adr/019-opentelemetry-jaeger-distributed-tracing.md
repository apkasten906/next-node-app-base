# ADR 019: OpenTelemetry SDK + Jaeger for Distributed Tracing

Status: Accepted
Date: 2026-04-24
Authors: apkasten906

## Context

The observability stack already provides:

- **Prometheus** — metrics scraping and alerting rules (ADR-015, ADR-016).
- **Grafana + Loki** — visualisation dashboards and log aggregation (ADR-017).

The missing layer is **distributed tracing**: correlating a single request as it travels through the frontend, backend, and any downstream services (database, Redis, external APIs). Without traces:

- Latency regressions are hard to attribute to a specific service call.
- Error propagation across service boundaries is opaque.
- Onboarding to a multi-service codebase is slower because there is no request-flow visualisation.

Requirements:

- Vendor-neutral instrumentation that does not lock the codebase to a proprietary agent.
- Auto-instrumentation for HTTP (Express routes, `fetch`/`http` module, Prisma, Redis) with zero per-handler changes.
- Low-effort integration into the existing Grafana UI (single pane for metrics + logs + traces).
- Configurable via environment variables so tracing is enabled in deployed environments and disabled in unit/CI test runs.
- Suitable for development and staging clusters; production upgrade path to a persistent storage backend documented.

## Decision

Adopt **OpenTelemetry SDK for Node.js** as the instrumentation layer and **Jaeger all-in-one** as the trace backend for development and staging clusters.

### Implementation

**Backend SDK** (`apps/backend/src/infrastructure/observability/`):

- `ITracingService.ts` — narrow interface: `isEnabled()` and `shutdown()`.
- `TracingService.ts` — `@injectable()` singleton that initialises `NodeSDK` with `OTLPTraceExporter` (HTTP) and `getNodeAutoInstrumentations()`. Disabled when `TRACING_ENABLED=false`.
- Registered in `container.ts` as `'TracingService'`; `shutdown()` called during app graceful shutdown to flush buffered spans.

**Key environment variables:**

| Variable                      | Default                 | Purpose                             |
| ----------------------------- | ----------------------- | ----------------------------------- |
| `TRACING_ENABLED`             | `true`                  | Set to `false` in unit tests and CI |
| `OTEL_SERVICE_NAME`           | `backend`               | Service label in Jaeger UI          |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Jaeger collector OTLP HTTP base URL |
| `OTEL_RESOURCE_ATTRIBUTES`    | —                       | Additional resource key=value pairs |

**Kubernetes manifests** (`kubernetes/observability/jaeger/`):

- `jaeger-deployment.yaml` — Jaeger all-in-one (`jaegertracing/all-in-one:1.57`) with in-memory storage, OTLP gRPC (4317) and OTLP HTTP (4318) ingestion, Query UI / HTTP API (16686), and admin / metrics endpoint (14269). Two Services: `jaeger-collector` (OTLP ingestion from backend namespace) and `jaeger` (Query API for Grafana and UI).
- `jaeger-network-policy.yaml` — least-privilege `NetworkPolicy`: backend namespace → collector ports; Grafana → Query API port; Prometheus → admin port only; no other ingress.

**Grafana datasource** (`kubernetes/observability/grafana/grafana-config.yaml`):

- Added `jaeger` datasource entry pointing to `http://jaeger:16686`. Grafana can now link traces from the Explore view using `traceId` fields in log lines, and node-graph view is enabled.

## Rationale

### OpenTelemetry over vendor-specific agents

| Concern                       | OpenTelemetry                                                                             | Vendor agent (Datadog, New Relic, Dynatrace)  |
| ----------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| Vendor lock-in                | None — switch backends by changing the exporter                                           | High — instrumentation tied to the vendor SDK |
| Auto-instrumentation coverage | Express, http, fetch, Prisma, Redis, gRPC via `@opentelemetry/auto-instrumentations-node` | Comparable but proprietary                    |
| Standards alignment           | W3C TraceContext, OTLP — interoperable with any OTLP-compatible backend                   | Proprietary wire format                       |
| Cost (dev/staging)            | Free — self-hosted Jaeger                                                                 | License cost or data ingestion fees           |
| Configuration                 | Standard `OTEL_*` env vars                                                                | Vendor-specific env vars / config files       |

### Jaeger over Zipkin

| Concern             | Jaeger                                           | Zipkin                                                |
| ------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| OTLP support        | Native since v1.35 — no translation layer needed | Requires OpenTelemetry Collector with Zipkin exporter |
| UI capabilities     | Dependency graph, critical path, comparison view | Basic trace timeline                                  |
| Storage backends    | Memory (dev), Elasticsearch, Cassandra, Badger   | Memory, Elasticsearch, Cassandra                      |
| Kubernetes operator | Available (Jaeger Operator)                      | No official operator                                  |
| Grafana datasource  | First-class built-in datasource (`type: jaeger`) | Available but less integrated                         |

### Jaeger over Grafana Tempo

Grafana Tempo is a compelling alternative given the existing Grafana investment. Tempo is preferred in large-scale deployments due to its object-storage backend (S3/GCS/Azure Blob). Jaeger was chosen here because:

- The `jaegertracing/all-in-one` image requires no external storage for development/staging.
- Jaeger's Query UI is self-contained, useful without Grafana running.
- Migration to Tempo is low-friction: swap the exporter endpoint — OpenTelemetry instrumentation is backend-agnostic.

### In-memory storage for development

The `SPAN_STORAGE_TYPE=memory` default limits the Jaeger pod to the last 10 000 spans (configurable via `MEMORY_MAX_TRACES`). This is appropriate for development and staging because:

- No persistent volume required.
- Pod restarts are acceptable in non-production environments.
- The upgrade path to a persistent backend (Elasticsearch or Badger) requires only a `SPAN_STORAGE_TYPE` env var change and a storage Secret.

### Auto-instrumentation over manual span creation

`getNodeAutoInstrumentations()` instruments Express routes, Node.js `http`/`https` modules, `fetch`, Prisma client, `ioredis`, and `bullmq` without requiring per-handler `tracer.startSpan()` calls. This provides immediate value (all request flows traced) at zero per-feature cost. Manual spans can be added later for business-level traces without disrupting the auto-instrumented baseline.

### `TRACING_ENABLED=false` guard

Tracing is disabled by default when `TRACING_ENABLED=false` to:

- Keep unit tests deterministic (no OTLP background traffic).
- Avoid DNS resolution failures in CI environments where Jaeger is not running.
- Preserve `pnpm test:unit` speed (no SDK startup overhead).

The guard is implemented in `TracingService` constructor before any OTel SDK call.

## Consequences

### Positive

- Every inbound HTTP request and outbound database / Redis / HTTP call is automatically traced and visible in the Jaeger UI.
- Grafana can correlate traces with metrics (via `traceId` field linking) and logs (via Loki + Promtail label correlation).
- Adding custom business-level spans requires only `@opentelemetry/api`: `trace.getTracer('name').startActiveSpan(...)`.
- The instrumentation is backend-agnostic — switching to Grafana Tempo or a managed OTLP endpoint (e.g., Grafana Cloud, Honeycomb) requires only an endpoint env var change.

### Negative

- `@opentelemetry/auto-instrumentations-node` adds ~119 packages to the backend dependency tree (protobufjs, grpc transitive deps). Acceptable for a platform template; production deployments that are size-sensitive can trim to only required instrumentations.
- The `NodeSDK` `start()` call must happen before any instrumented library is imported. The current setup initialises `TracingService` in the DI container, which runs during `container.ts` import — this is before Express routes are imported. If this order changes, auto-instrumentation for Express may be incomplete.
- In-memory Jaeger storage is ephemeral. Do not rely on it for compliance, SLO evidence, or post-mortem analysis.

### Neutral

- `OTEL_SERVICE_NAME` defaults to `backend` when not set. In a multi-service deployment, set this explicitly per workload.
- The `@opentelemetry/instrumentation-fs` instrumentation is disabled by default (too noisy; every `require()` and config file read appears as a span).

## Related ADRs

- [ADR-013](./013-correlation-ids.md) — Correlation IDs — `X-Correlation-ID` header propagated by the correlation-id middleware complements trace context for log–trace correlation.
- [ADR-015](./015-prometheus-rules-configmap.md) — Prometheus rules ConfigMap.
- [ADR-016](./016-secure-by-default-prometheus-scraping.md) — Secure-by-default Prometheus scraping.
- [ADR-017](./017-grafana-loki-observability-stack.md) — Grafana + Loki — Jaeger is added as a datasource alongside Prometheus.

## Upgrade path to production

1. Replace `SPAN_STORAGE_TYPE=memory` with `elasticsearch` or `badger` and supply the relevant storage env vars / Secrets.
2. Alternatively, deploy the **Jaeger Operator** and replace the all-in-one `Deployment` with a `Jaeger` custom resource.
3. For large-scale deployments, consider migrating to **Grafana Tempo** (object-storage backed) — the OTel SDK exporter endpoint is the only change required.
4. Rotate or replace with a managed OTLP endpoint (Grafana Cloud Traces, Honeycomb, Lightstep) for SaaS-managed retention and alerting.
