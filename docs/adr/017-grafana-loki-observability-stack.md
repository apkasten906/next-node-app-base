# ADR 017: Grafana + Loki as the observability visualisation and log aggregation layer

Status: Accepted
Date: 2026-03-20
Authors: apkasten906

## Context

The observability stack in `kubernetes/observability/` already has Prometheus for metrics collection and alerting rules (ADR-015) with a secure-by-default scraping posture (ADR-016). The next layer — visualisation and log aggregation — must be chosen to complete the stack.

Requirements for this template:

- Unified UI for both metrics dashboards and log exploration.
- Minimal operational overhead for a base template (no large JVM-based services unless justified).
- Native integration with Prometheus so existing metrics labels and alerts surface without extra mapping work.
- Structured log ingestion from Kubernetes pods using a lightweight agent.
- Cost-effective default footprint for development / staging clusters.

Two major options exist:

**Option A — Grafana + Loki + Promtail:**
Grafana is the de facto Prometheus UI, with Loki purpose-built for log aggregation (pull-based, label-indexed, not full-text indexed).

**Option B — Grafana + ELK (Elasticsearch + Logstash + Kibana):**
Mature, full-text-indexed stack with highly flexible querying. Requires running Elasticsearch (a heavy JVM process) and maintaining Kibana alongside Grafana.

## Decision

Adopt **Grafana** as the visualisation layer and **Loki + Promtail** as the log aggregation layer.

The deployment is implemented as:

- `kubernetes/observability/grafana/grafana-config.yaml` — provisioning ConfigMap (datasources + dashboard provider)
- `kubernetes/observability/grafana/grafana-dashboards.yaml` — pre-built ConfigMap dashboards (app performance, infrastructure, business KPIs)
- `kubernetes/observability/grafana/grafana-deployment.yaml` — Deployment + ClusterIP Service
- `kubernetes/observability/grafana/grafana-secret.example.yaml` — example admin credential Secret manifest; copy/customise and create the real `grafana-secret.yaml` out of band, with the real secret kept untracked
- `kubernetes/observability/grafana/grafana-network-policy.yaml` — L3/L4 NetworkPolicy restricting egress to Prometheus only

Loki + Promtail manifests are scoped to the next iteration of this phase (`kubernetes/observability/loki/`).

## Rationale

### Grafana over standalone Prometheus UI (built-in expression browser)

The Prometheus expression browser is designed for ad-hoc PromQL exploration, not operational dashboarding. Grafana provides:

- Persistent, version-controlled dashboard definitions (provisioned from ConfigMap).
- Alert rule visualisation alongside raw metrics.
- A single pane to add additional datasources (Loki, Jaeger) when those components are deployed.

### Loki over Elasticsearch

| Concern                    | Loki                                               | Elasticsearch                                            |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Resource footprint         | Low (stateless ingestion; index is just labels)    | High (JVM heap, disk-heavy inverted index)               |
| Query model                | LogQL (label-first, similar to PromQL)             | Lucene/Elasticsearch DSL                                 |
| Label consistency          | Same label set as Prometheus → trivial correlation | Different schema; explicit mapping required              |
| Operational overhead       | Single StatefulSet or object-store backend         | Cluster of nodes; shard management; ILM policies         |
| Native Grafana integration | First-class datasource (Grafana Labs product)      | Requires Kibana for full UX or manual Grafana datasource |

For a base template targeting development and staging clusters, Loki's resource footprint and Prometheus-compatible label model make it the more appropriate default.

### Pre-provisioned dashboards

Provisioning dashboards as a ConfigMap in Git (rather than importing them via the Grafana UI) means:

- Dashboards survive pod restarts without a persistent volume.
- Dashboard definitions are reviewed alongside code (version history, PR review).
- New cluster deployments are immediately operational — no manual import step.

## Consequences

### Positive

- Single UI (Grafana) for metrics, logs, and traces (once Jaeger is added as a datasource).
- Dashboard-as-code: three pre-built dashboards (app performance, infrastructure, business KPIs) provisioned automatically on startup.
- Low resource requirements: Grafana `100m`–`500m` CPU / `128Mi`–`512Mi` RAM; suitable for small clusters.
- Label correlation between Prometheus metrics and Loki logs is natural (same `app`, `namespace`, `pod` labels).

### Negative

- Grafana admin password is a placeholder secret — **must be rotated before production use** (or replaced with an external secrets operator like External Secrets Operator or Vault Agent).
- Loki is not full-text indexed; regex-heavy searches across large log volumes will be slower than Elasticsearch.
- Dashboard JSON embedded in a ConfigMap is less ergonomic to edit than the Grafana UI — changes require a `kubectl apply` or CI deployment.

### Neutral

- Grafana uses an `emptyDir` volume for plugin / session storage by default; switching to a PersistentVolumeClaim is a one-line change in the Deployment when durability is needed.
- Traces (Jaeger / Tempo) can be added as an additional datasource without disrupting existing dashboards.

## Alternatives Considered

### Alternative 1: Grafana + ELK (Elasticsearch + Logstash + Kibana)

**Pros:**

- Best-in-class full-text search across logs.
- Large ecosystem of pre-built dashboards and ingest pipelines.
- Suitable for compliance use cases requiring rich queryability and long-term retention.

**Cons:**

- Elasticsearch requires significant JVM heap (minimum 512Mi, recommended 2Gi+ per node) — too heavy for a base template cluster.
- Requires running both Kibana and Grafana, duplicating the UI layer, or abandoning Grafana in favour of Kibana.
- Elasticsearch cluster management (sharding, ILM, snapshots) adds operational complexity at odds with the "base template" goal.

**Why rejected:** Disproportionate resource cost and operational complexity for a development/staging template. Teams with compliance-driven full-text search requirements should evaluate ELK as a separate stack.

### Alternative 2: Grafana Cloud (managed SaaS)

**Pros:**

- Zero operational overhead for Prometheus, Loki, and Grafana itself.
- Always up to date.

**Cons:**

- Requires an external dependency and account.
- Not suitable for air-gapped or private cluster environments.
- Cost scales with metric/log volume.

**Why rejected:** The goal is a self-hosted, reproducible Kubernetes template. Managed SaaS is a valid production choice but outside the scope of this repository.

### Alternative 3: Victoria Metrics + Grafana (no Loki)

**Pros:**

- VictoriaMetrics is a highly efficient Prometheus-compatible storage backend.
- Dramatically lower memory footprint than Prometheus for long-term retention.

**Cons:**

- Replacing Prometheus with VictoriaMetrics is a significant change to the already-established metrics layer.
- Does not address log aggregation (would still need a separate solution).

**Why rejected:** Prometheus is already established (ADR-015). VictoriaMetrics is a valid future optimisation but not the appropriate choice at this stage, and does not solve log aggregation.
