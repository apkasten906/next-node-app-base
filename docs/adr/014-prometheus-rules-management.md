---
title: '014 - Prometheus rules management: ConfigMap-mounted files vs PrometheusRule CRD'
status: Accepted
date: 2026-03-11
authors:
  - apkasten906
---

# Context

The repository adds Prometheus configuration and manifests under `kubernetes/observability/`.

- `prometheus-config.yaml` references rule files at `/etc/prometheus/rules/*.yml`.
- `prometheus-deployment.yaml` mounts a ConfigMap named `prometheus-rules` at `/etc/prometheus/rules`.
- Alert rules were consolidated and previously considered as either a PrometheusRule CRD (Prometheus Operator) or as file-based rules stored in a ConfigMap.

Decisions must balance operational simplicity, CI/PR reviewability, and compatibility with the current manifests and environment (developer machines, CI, and cluster privileges).

# Decision

We will manage Prometheus alerting rules as plain YAML rule files stored in a repository-managed ConfigMap (`prometheus-rules`) and mount them at `/etc/prometheus/rules` for the Prometheus server to load via `rule_files`.

Status: Accepted — implement using file-based rules via `kubernetes/observability/prometheus-rules-configmap.yaml`.

# Rationale

- Matches existing `prometheus-config.yaml` and `prometheus-deployment.yaml` (no operator required).
- Simpler operational model for a small monorepo template: no extra operator lifecycle or CRD permissions required.
- Easier to review and iterate on rules in PRs (plain YAML files are visible and diffable in the repo).
- Works in clusters without the Prometheus Operator installed (more portable for developers and CI).
- Allows CI checks (promtool) to validate rules as part of PR pipelines without requiring cluster-admin privileges.

# Consequences

- Pros:
  - Lower operational complexity and fewer cluster dependencies.
  - Rules are visible and editable directly in the repo; change reviews are straightforward.
  - Works on developer machines and lightweight clusters (kind/minikube) without installing the Operator.

- Cons:
  - Lacks some Operator conveniences (automated rollouts, namespaced reconciliation, and tighter operator-driven lifecycle features).
  - If multiple Prometheus instances or namespaces need different rules, additional management is required.

# Alternatives Considered

- Prometheus Operator / `PrometheusRule` CRD:
  - Pros: richer lifecycle, namespace-scoped rule management, tighter integration with Alertmanager and Operator workflows.
  - Cons: requires installing the Prometheus Operator, CRD management, and extra cluster privileges; larger operational surface for a template repo.

- Bundle rules inside the main Prometheus ConfigMap:
  - Pros: single ConfigMap to manage Prometheus configuration and rules.
  - Cons: larger ConfigMap churn, less separation of concerns, and more reviewer friction for unrelated config changes.

# Migration Path

If the project later adopts the Prometheus Operator, migrate by:

1. Converting rule files into `PrometheusRule` CRD objects.
2. Removing the `prometheus-rules` ConfigMap and updating `prometheus-deployment.yaml` (or switching to an Operator-managed Prometheus Deployment).
3. Update CI to validate `PrometheusRule` objects (if tooling is added) and the migration plan in an ADR.

# References

- [prometheus-config.yaml](kubernetes/observability/prometheus-config.yaml#L1)
- [prometheus-deployment.yaml](kubernetes/observability/prometheus-deployment.yaml#L1)
- [prometheus-rules-configmap.yaml](kubernetes/observability/prometheus-rules-configmap.yaml#L1)
