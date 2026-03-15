# ADR 016: Secure-by-default Prometheus scraping (align scrape config with NetworkPolicy)

Status: Accepted
Date: 2026-03-11
Authors: apkasten906

## Context

This repository provides a Kubernetes observability stack under `kubernetes/observability/` intended to be used as a secure-by-default template.

Prometheus needs to scrape:

- Application metrics (e.g. backend `/metrics`)
- Istio / Envoy metrics (e.g. 15090)
- Kubernetes cluster signals (e.g. node metrics)

At the same time, this repo enforces defense-in-depth via a restrictive Prometheus `NetworkPolicy` (L3/L4) and Istio policies (L7). If Prometheus scrape configuration is broader than what the `NetworkPolicy` permits, the default experience is confusing (targets show up but are unreachable) and creates pressure to “just open egress”.

We want the default template to:

- Prefer least-privilege network egress
- Avoid scraping kubelet ports directly (common hardening recommendation)
- Keep the scrape configuration and `NetworkPolicy` consistent

## Decision

Adopt a secure-by-default scraping model where Prometheus:

1. Scrapes Kubernetes node metrics via the Kubernetes API server proxy (not direct kubelet access).
2. Scrapes pods only when explicitly annotated _and_ only on an allowlisted set of ports that match the Prometheus `NetworkPolicy` egress allowlist.

This is implemented by:

- Using API server proxy for node metrics in `kubernetes/observability/prometheus-config.yaml`.
- Constraining annotated pod scraping ports via a relabel `keep` regex in `kubernetes/observability/prometheus-config.yaml`.
- Keeping the Prometheus `NetworkPolicy` egress ports allowlisted to the same set of ports in `kubernetes/observability/prometheus-network-policy.yaml`.

## Rationale

- **Secure-by-default:** a template should not silently encourage broad egress rules like “scrape any annotated pod port”.
- **Predictable behavior:** if the scrape config discovers a target, it should usually be reachable under the default `NetworkPolicy`.
- **Avoid direct kubelet scraping:** scraping kubelet ports (e.g. 10250) typically requires additional privileges and broad egress; using the API server proxy reduces exposed surface area.

## Consequences

### Positive

- Prometheus scraping works out-of-the-box under a restrictive `NetworkPolicy`.
- Reduced chance of unintentionally scraping arbitrary pod ports in the cluster.
- Avoids needing to open egress to kubelet ports by default.

### Negative

- Exporters running on non-allowlisted ports will not be scraped until the allowlist is updated.
- Teams that prefer “annotation-based scrape anything” must explicitly opt-in by widening both the scrape config and the `NetworkPolicy`.

### Neutral

- The allowlist is a template-level policy decision; teams may tune it per environment.
- Some clusters may run the API server in ways that are not selectable by `NetworkPolicy`; in those cases the secure-by-default posture still applies, but additional cluster-specific allow rules may be required.

## Alternatives Considered

### Alternative 1: Scrape any annotated pod port (and widen egress)

**Pros:**

- Maximum flexibility; works with arbitrary exporters without touching the template.

**Cons:**

- Encourages broad egress (potentially to any pod/port), which is not secure-by-default.
- Misalignment with a restrictive `NetworkPolicy` causes confusing “discovered but unreachable” targets unless egress is opened.

**Why rejected:** This repo is a base template; least privilege and predictable defaults are preferred.

### Alternative 2: Scrape nodes directly via kubelet ports (e.g. 10250)

**Pros:**

- Common in many Prometheus examples; can provide additional node/kubelet metrics.

**Cons:**

- Requires direct egress to kubelet ports and often additional RBAC / TLS considerations.
- Increases the default network surface area.

**Why rejected:** API server proxy provides a safer default for a template.

### Alternative 3: Require Prometheus Operator (ServiceMonitor/PodMonitor)

**Pros:**

- Richer lifecycle and configuration options; better ergonomics in operator-managed clusters.

**Cons:**

- Adds CRDs and operational overhead not desired for the default template.

**Why rejected:** Operator support is documented separately; default manifests should work without it.

## How to change the defaults

If you want broader scraping, update both:

- `kubernetes/observability/prometheus-config.yaml`
  - Expand or remove the pod port allowlist relabel rule in the `kubernetes-pods` job.
- `kubernetes/observability/prometheus-network-policy.yaml`
  - Expand the egress port allowlist to include the additional ports.

Keep the two in sync to avoid “discovered but unreachable” targets.

## Related

- `kubernetes/observability/prometheus-config.yaml`
- `kubernetes/observability/prometheus-network-policy.yaml`
- ADR 015: Prometheus Rules Management (ConfigMap-mounted rule files)
- `kubernetes/observability/README.md`
