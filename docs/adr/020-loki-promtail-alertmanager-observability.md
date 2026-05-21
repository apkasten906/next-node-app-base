# ADR 020: Loki + Promtail for Centralized Log Aggregation and Alertmanager for Alert Routing

Status: Accepted
Date: 2026-05-20
Authors: apkasten906

## Context

The observability stack now provides:

- **Prometheus** — metrics scraping and alerting rules (ADR-015, ADR-016).
- **Grafana** — visualization dashboards (ADR-017).
- **Jaeger** — distributed tracing via OpenTelemetry (ADR-019).

Two gaps remain to complete the Phase 10 observability slice:

1. **Centralized log aggregation**: container logs are currently only accessible via `kubectl logs`, which requires cluster access and does not support cross-service correlation or retention. There is no way to correlate a log line with the trace that produced it.
2. **Alert routing**: Prometheus already evaluates alerting rules but the `alertmanagers` stanza in `prometheus-config.yaml` was commented out, meaning fired alerts are silently dropped. No notification path exists for on-call engineers.

Completing these two gaps closes the observability triad (metrics, logs, traces) and makes the Grafana `tracesToLogsV2` integration viable.

## Decision

### Log aggregation: Loki + Promtail

Adopt **Grafana Loki** as the log storage and query backend and **Promtail** as the log collection agent.

- Loki stores logs indexed by label set rather than by full-text, keeping storage costs low compared to Elasticsearch-class solutions.
- Promtail runs as a DaemonSet and tails `/var/log/pods/**/*.log` on every node. It labels log streams with `namespace`, `pod`, `container`, and `app` derived from Kubernetes metadata, enabling label-based correlation with Prometheus metrics.
- Grafana already ships a first-class Loki datasource plugin; no additional components are required.

### Alert routing: Alertmanager

Adopt **Prometheus Alertmanager** as the alert routing backend.

- Prometheus `alerting` stanza in `prometheus-config.yaml` is activated to forward fired alerts to `alertmanager:9093`.
- Alertmanager routes alerts by severity label: `critical` → `critical-receiver`, `warning` → `warning-receiver`, default → `null` (silenced).
- Receivers are configured as webhooks in the `alertmanager-config` ConfigMap. Credentials (webhook URLs) are injected at deploy time from `alertmanager-secret`.
- Inhibition rules suppress `warning` alerts when a `critical` alert for the same `{alertname, cluster, service}` tuple is already firing.

### Grafana trace-to-logs wiring

With Loki provisioned, the Jaeger datasource in `grafana-config.yaml` is updated with `tracesToLogsV2`:

- Spans link to Loki log lines via `app`, `namespace`, and `pod` labels.
- A `derivedFields` rule on the Loki datasource extracts `traceId` from structured JSON logs and links directly to the corresponding Jaeger trace.
- `LoggerService` injects `traceId` and `spanId` fields into every Winston log record via a dedicated format step that reads the active OpenTelemetry span context (`@opentelemetry/api`). The fields are omitted when no sampled span is active, so non-traced requests are unaffected.

## Implementation

### New files

| File                                                                     | Purpose                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `kubernetes/observability/loki/loki-config.yaml`                         | Loki single-binary ConfigMap (TSDB schema v13, filesystem storage, 31-day retention) |
| `kubernetes/observability/loki/loki-deployment.yaml`                     | Loki Deployment + ClusterIP Service + 10 Gi PVC                                      |
| `kubernetes/observability/loki/loki-network-policy.yaml`                 | Least-privilege NetworkPolicy: Promtail push, Grafana query, Prometheus scrape only  |
| `kubernetes/observability/promtail/promtail-daemonset.yaml`              | ServiceAccount, ClusterRole/Binding, ConfigMap, DaemonSet                            |
| `kubernetes/observability/promtail/promtail-network-policy.yaml`         | Egress to Loki + Kubernetes API; ingress from Prometheus only                        |
| `kubernetes/observability/alertmanager/alertmanager-config.yaml`         | Route tree + webhook receivers ConfigMap                                             |
| `kubernetes/observability/alertmanager/alertmanager-secret.example.yaml` | Webhook URL secret template (do not commit populated values)                         |
| `kubernetes/observability/alertmanager/alertmanager-deployment.yaml`     | Alertmanager Deployment + ClusterIP Service + 2 Gi PVC                               |
| `kubernetes/observability/alertmanager/alertmanager-network-policy.yaml` | Ingress from Prometheus only; egress to HTTPS webhooks                               |

### Modified files

| File                                                           | Change                                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `kubernetes/observability/grafana/grafana-config.yaml`         | Added Loki datasource; added `tracesToLogsV2` + `derivedFields` to Jaeger datasource            |
| `kubernetes/observability/grafana/grafana-network-policy.yaml` | Added egress rule for Loki port 3100                                                            |
| `kubernetes/observability/prometheus-config.yaml`              | Activated `alerting.alertmanagers` stanza; added ports 9080, 9093, 3100 to pod scrape allowlist |
| `kubernetes/observability/prometheus-network-policy.yaml`      | Added egress rules for Alertmanager (9093), Loki (3100), Promtail (9080) scraping               |

### Key ports

| Component         | Port | Protocol |
| ----------------- | ---- | -------- |
| Loki HTTP API     | 3100 | HTTP     |
| Promtail metrics  | 9080 | HTTP     |
| Alertmanager HTTP | 9093 | HTTP     |

### Environment: Kubernetes deployment order

```sh
1. kubectl apply -f kubernetes/observability/loki/
2. kubectl apply -f kubernetes/observability/promtail/
3. kubectl apply -f kubernetes/observability/alertmanager/alertmanager-config.yaml
4. kubectl apply -f kubernetes/observability/alertmanager/alertmanager-secret.yaml  # populated copy
5. kubectl apply -f kubernetes/observability/alertmanager/alertmanager-deployment.yaml
6. kubectl apply -f kubernetes/observability/alertmanager/alertmanager-network-policy.yaml
7. kubectl apply -f kubernetes/observability/grafana/grafana-config.yaml  # updated datasources
8. kubectl apply -f kubernetes/observability/grafana/grafana-network-policy.yaml
9. kubectl apply -f kubernetes/observability/prometheus-config.yaml  # activates alertmanager route
10. kubectl apply -f kubernetes/observability/prometheus-network-policy.yaml
11. kubectl rollout restart deployment/grafana deployment/prometheus -n observability
```

## Rationale

### Loki over Elasticsearch / OpenSearch

Loki indexes only labels, not full log content. This makes ingest and storage dramatically cheaper for a platform template where log volume is unpredictable. LogQL supports full-text search over the log body at query time; indexed labels are sufficient for the correlation use cases (by pod, namespace, app, traceId).

### Promtail over Fluentd / Fluentbit

Promtail is purpose-built for Loki and ships with a Kubernetes service-discovery configuration that mirrors Prometheus's `kubernetes-pods` job. The resulting label set is identical to what Prometheus uses, which is essential for seamless Explore correlation in Grafana. Fluentd/Fluentbit are appropriate when a multi-backend fan-out is needed; that is not a current requirement.

### Single-replica Alertmanager over HA mesh

A two-node mesh adds operational complexity (gossip protocol, PVC replicas) for marginal benefit in a development/staging cluster. The `--cluster.listen-address=` flag disables the mesh. When multi-replica HA is needed, remove the flag and add a headless Service for peer discovery.

### Webhook receivers over integrated Slack/PagerDuty

Receiver type is deployment-specific. Webhooks are the most portable default — they work with any HTTP endpoint including Slack incoming webhooks, PagerDuty Events API v2, and custom notification bridges. The `alertmanager-config.yaml` ConfigMap documents where to substitute receiver-specific stanzas.

## Consequences

- **Positive**: the observability triad is complete; Grafana Explore supports unified metrics + logs + traces correlation from a single query.
- **Positive**: fired Prometheus alerts now reach an operator inbox instead of being silently dropped. Alertmanager uses `--config.expand-env=true` (v0.25+) to expand `${VAR}` placeholders in `alertmanager.yml` from container environment variables at start-up.
- **Positive**: `tracesToLogsV2` in Grafana is now wired, enabling one-click navigation from a Jaeger trace span to the corresponding Loki log stream.
- **Positive**: `derivedFields` in the Loki datasource is functional end-to-end: `LoggerService` now emits `traceId` and `spanId` on every log record produced within a sampled OTEL span, so log lines link directly back to Jaeger traces.
- **Negative**: two additional PVCs (Loki 10 Gi, Alertmanager 2 Gi) are required in the cluster.
- **Negative**: Promtail runs as root to read host log files. This is the expected and documented trade-off for log collection via hostPath; the blast radius is contained by a dedicated ServiceAccount with a minimal ClusterRole.
- **Neutral**: Loki uses in-cluster filesystem storage. Log data is lost if the PVC is deleted. For production, migrate to object storage (GCS/S3) and enable the ruler component for alerting on log patterns.
