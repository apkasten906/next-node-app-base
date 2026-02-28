# Observability Stack

This directory contains Kubernetes manifests for the observability stack including Prometheus, Grafana, Jaeger, and centralized logging.

## Components

### Prometheus

Prometheus is the metrics collection and alerting system that scrapes metrics from:

- Backend application (`/metrics` endpoint)
- Kubernetes cluster (nodes, pods, services)
- Istio service mesh (control plane and data plane)
- Envoy sidecar proxies

### Grafana

Grafana provides visualization dashboards for:

- Application performance metrics
- Infrastructure metrics
- Service mesh metrics
- Business KPIs

### Jaeger

Jaeger provides distributed tracing for:

- Request flows across microservices
- Performance bottleneck identification
- Error tracking and debugging

### Centralized Logging

Choose between:

- **ELK Stack**: Elasticsearch, Logstash, Kibana (full-featured, resource-intensive)
- **Loki + Grafana**: Cost-effective, Grafana-native (recommended for development)

## Deployment

### Prerequisites

1. Kubernetes cluster with Istio installed
2. `kubectl` configured to access the cluster
3. Sufficient cluster resources (4 CPU, 8GB RAM minimum)

### Deploy Prometheus

```bash
# Create observability namespace
kubectl apply -f namespace.yaml

# Deploy Prometheus RBAC
kubectl apply -f prometheus-rbac.yaml

# Deploy Prometheus ConfigMap
kubectl apply -f prometheus-config.yaml

# Deploy Prometheus alert rules
kubectl apply -f prometheus-rules.yaml

# Deploy Prometheus
kubectl apply -f prometheus-deployment.yaml

# Verify deployment
kubectl get pods -n observability
kubectl logs -n observability -l app=prometheus
```

### Access Prometheus UI

```bash
# Port forward to access Prometheus UI
kubectl port-forward -n observability svc/prometheus 9090:9090

# Open http://localhost:9090 in browser
```

## Metrics Exposed by Backend

The backend application exposes the following metrics at `/metrics`:

### HTTP Metrics

- `http_request_duration_seconds` - Histogram of HTTP request durations
- `http_requests_total` - Counter of total HTTP requests by method, route, and status code

### Database Metrics

- `db_query_duration_seconds` - Histogram of database query durations
- `db_queries_total` - Counter of database queries by operation, table, and status

### Cache Metrics

- `cache_hits_total` - Counter of cache hits by cache name
- `cache_misses_total` - Counter of cache misses by cache name

### Queue Metrics

- `queue_jobs_active` - Gauge of active jobs in queue
- `queue_jobs_waiting` - Gauge of waiting jobs in queue
- `queue_jobs_completed_total` - Counter of completed jobs by status

### WebSocket Metrics

- `websocket_connections_active` - Gauge of active WebSocket connections
- `websocket_messages_total` - Counter of WebSocket messages by event and direction

### Authentication Metrics

- `auth_attempts_total` - Counter of authentication attempts by method and status
- `auth_failures_total` - Counter of authentication failures by method and reason

### Business Metrics

- `user_registrations_total` - Counter of user registrations by source
- `api_errors_total` - Counter of API errors by route and error type

### Node.js Metrics (Default)

- `nodejs_heap_size_used_bytes` - Heap memory used
- `nodejs_heap_size_total_bytes` - Total heap memory
- `nodejs_process_cpu_seconds_total` - CPU time
- `nodejs_eventloop_lag_seconds` - Event loop lag
- And more...

## Alert Rules

Prometheus is configured with the following alert rules:

### Application Alerts

- **HighErrorRate**: Triggers when error rate exceeds 5% for 5 minutes
- **SlowResponseTime**: Triggers when 95th percentile response time exceeds 1 second
- **SlowDatabaseQueries**: Triggers when 95th percentile query time exceeds 500ms
- **HighCacheMissRate**: Triggers when cache miss rate exceeds 50% for 15 minutes
- **QueueJobsBackingUp**: Triggers when waiting jobs exceed 1000 for 10 minutes

### Infrastructure Alerts

- **HighCPUUsage**: Triggers when CPU usage exceeds 80% for 10 minutes
- **HighMemoryUsage**: Triggers when memory usage exceeds 90% for 5 minutes
- **PodRestarts**: Triggers when pod restarts occur
- **NodeDown**: Triggers when Kubernetes node is down for 5 minutes

### Security Alerts

- **HighAuthFailureRate**: Triggers when auth failure rate exceeds 30% for 5 minutes
- **PotentialBruteForceAttack**: Triggers when failed auth attempts exceed 10/second for 2 minutes

## Querying Metrics

### Example PromQL Queries

**HTTP request rate by route:**

```promql
sum(rate(http_requests_total[5m])) by (route)
```

**95th percentile response time:**

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

**Error rate percentage:**

```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

**Cache hit ratio:**

```promql
sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) * 100
```

**Active WebSocket connections:**

```promql
websocket_connections_active
```

## Integration with Backend

The backend automatically:

1. Registers default Node.js metrics
2. Registers custom application metrics
3. Collects HTTP request metrics via middleware
4. Exposes `/metrics` endpoint in Prometheus format

To instrument additional code:

```typescript
import { container } from './container';
import { IMetricsService } from './infrastructure/observability';

const metricsService = container.resolve<IMetricsService>('MetricsService');

// Increment a counter
metricsService.incrementCounter('my_counter', { label: 'value' });

// Set a gauge
metricsService.setGauge('my_gauge', 42, { label: 'value' });

// Observe a histogram
metricsService.observeHistogram('my_histogram', 1.5, { label: 'value' });

// Time an operation
const endTimer = metricsService.startTimer('operation_duration', { operation: 'my_operation' });
// ... do work ...
endTimer();
```

## Next Steps

1. Deploy Grafana with dashboards (see `grafana/`)
2. Configure Alertmanager for alert routing (see `alertmanager/`)
3. Deploy Jaeger for distributed tracing (see `jaeger/`)
4. Set up centralized logging (see `logging/`)
5. Integrate with PagerDuty/OpsGenie for incident management

## Security Considerations

### Overview

The Prometheus deployment implements multiple layers of security controls to protect against unauthorized access and configuration changes:

1. **Istio AuthorizationPolicy**: Fine-grained access control at the service mesh layer
2. **NetworkPolicy**: Defense-in-depth network isolation at L3/L4
3. **Disabled Admin API**: High-risk admin endpoints disabled by default
4. **Lifecycle Endpoint Protection**: Config reload endpoints restricted to authorized principals
5. **Service Account Isolation**: Separate ServiceAccounts for operational vs. administrative access

### Security Controls Deployed

#### 1. Istio AuthorizationPolicy (`prometheus-authz-policy.yaml`)

**Deny All Admin API Access** (`prometheus-admin-api-deny`):

- Blocks all access to `/api/v1/admin/*` and `/api/v2/admin/*` endpoints
- Prevents unauthorized TSDB operations (snapshots, series deletion, etc.)
- Applied even if `--web.enable-admin-api` flag is enabled

**Restrict Lifecycle Endpoints** (`prometheus-lifecycle-allow`):

- Allows `/-/reload` and `/-/quit` only from `prometheus-admin` ServiceAccount
- Permits read-only query and UI endpoints from observability namespace
- Allows Grafana ServiceAccount to query metrics
- Blocks all other access by default

**Allowed Endpoints** (from observability namespace):

- `/api/v1/query*` - PromQL queries
- `/api/v1/series*` - Series data
- `/api/v1/labels*` - Label queries
- `/api/v1/metadata*` - Metadata queries
- `/api/v1/targets*` - Scrape target status
- `/api/v1/rules*` - Alert rules
- `/api/v1/alerts*` - Active alerts
- `/api/v1/status/*` - Status info
- `/graph*` - Web UI
- `/metrics*` - Prometheus own metrics
- `/-/healthy`, `/-/ready` - Health checks

#### 2. NetworkPolicy (`prometheus-network-policy.yaml`)

**Ingress Rules**:

- Allows connections from Grafana pods in observability namespace
- Allows connections from other monitoring tools in observability namespace
- Allows Istio control plane access for sidecar injection
- Permits access to Prometheus UI (port 9090) and Istio Envoy metrics (port 15090)

**Egress Rules**:

- Allows Prometheus to scrape metrics from pods in all namespaces
- Permits DNS resolution (kube-dns)
- Allows Kubernetes API access for service discovery

#### 3. Disabled Admin API

The `--web.enable-admin-api` flag is **disabled by default** in the base deployment:

```yaml
# SECURITY: --web.enable-admin-api is DISABLED by default
# Admin API allows runtime TSDB operations (snapshot, delete series)
# If needed in dev/staging, enable via Kustomize overlay
# - '--web.enable-admin-api'
```

**Blast Radius if Enabled**:

- `/api/v1/admin/tsdb/snapshot` - Create TSDB snapshot
- `/api/v1/admin/tsdb/delete_series` - Delete time series data
- `/api/v1/admin/tsdb/clean_tombstones` - Remove tombstones

**Recommendation**: Only enable in **development** environments via Kustomize overlays. In production, use Prometheus Operator or external backup solutions instead of the admin API.

#### 4. Lifecycle Endpoint Protection

The `--web.enable-lifecycle` flag is **enabled** but **protected**:

```yaml
# Access restricted via Istio AuthorizationPolicy
# Only prometheus-admin ServiceAccount can access
- '--web.enable-lifecycle'
```

**Protected Endpoints**:

- `/-/reload` - Reload configuration from disk (useful for ConfigMap updates)
- `/-/quit` - Graceful shutdown

**Use Case**: Enables automated configuration reloads without requiring pod restarts. A controller or operator running with the `prometheus-admin` ServiceAccount can trigger reloads.

#### 5. ServiceAccount Isolation

**prometheus ServiceAccount**:

- Used for Prometheus pod workload identity
- Has ClusterRole permissions for service discovery and metric scraping
- Cannot access lifecycle or admin endpoints

**prometheus-admin ServiceAccount**:

- Used for administrative operations (config reloads)
- Referenced in Istio AuthorizationPolicy for lifecycle endpoint access
- Should only be assigned to trusted automation (CI/CD, operators)
- Not used by Prometheus pod itself

### Applying Security Policies

Deploy all security controls:

```bash
# Deploy RBAC (includes prometheus and prometheus-admin ServiceAccounts)
kubectl apply -f prometheus-rbac.yaml

# Deploy Istio AuthorizationPolicy
kubectl apply -f prometheus-authz-policy.yaml

# Deploy NetworkPolicy
kubectl apply -f prometheus-network-policy.yaml

# Deploy Prometheus (with secure defaults)
kubectl apply -f prometheus-deployment.yaml
```

### Verifying Security Controls

#### Test Admin API Access (Should Fail)

```bash
# Port forward to Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090

# Attempt to create snapshot (should be blocked)
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot
# Expected: 403 Forbidden or RBAC: access denied
```

#### Test Lifecycle Endpoint (Should Fail Without Admin SA)

```bash
# Attempt config reload without proper ServiceAccount
curl -X POST http://localhost:9090/-/reload
# Expected: 403 Forbidden or RBAC: access denied
```

#### Test Query Endpoint (Should Succeed from Observability Namespace)

```bash
# Query should work from within the cluster
kubectl run -it --rm curl --image=curlimages/curl:latest -n observability -- \
  curl -s http://prometheus.observability.svc.cluster.local:9090/api/v1/query?query=up
```

### Environment-Specific Configuration

#### Development/Staging

If you need admin API access in non-production environments, create a Kustomize overlay:

```yaml
# kubernetes/observability/overlays/development/prometheus-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: observability
spec:
  template:
    spec:
      containers:
        - name: prometheus
          args:
            # Add admin API flag for development only
            - '--web.enable-admin-api'
```

**WARNING**: Never enable `--web.enable-admin-api` in production without additional authentication layers (OAuth proxy, mutual TLS client certificates, etc.).

#### Production

In production, consider:

1. **Prometheus Operator**: Use Prometheus Operator for declarative configuration management instead of lifecycle endpoints
2. **External Snapshots**: Use VolumeSnapshot CRD or backup operators instead of admin API snapshots
3. **Immutable Infrastructure**: Treat Prometheus as cattle, not pets - replace pods instead of reloading configs
4. **Alert on Violations**: Set up alerts for unauthorized access attempts to admin/lifecycle endpoints

### Metrics Endpoint Protection

The backend application exposes `/metrics` endpoint. To restrict access to Prometheus only:

```yaml
# Create AuthorizationPolicy for backend metrics endpoint
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: backend-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - /metrics
      from:
        - source:
            principals:
              - cluster.local/ns/observability/sa/prometheus
```

### Sensitive Data in Metrics

1. **Avoid PII**: Never include user IDs, email addresses, or personal information in metric labels
2. **Sanitize Errors**: Ensure error messages in metrics don't leak sensitive data
3. **Review Labels**: Audit all metric labels to ensure no sensitive data exposure
4. **Use Aggregation**: Aggregate sensitive dimensions before exposing metrics

### Audit Logging

Monitor for suspicious access patterns:

- Failed authorization attempts to admin/lifecycle endpoints
- Unusual query patterns from unexpected namespaces
- Changes to Prometheus configuration
- ServiceAccount token usage for `prometheus-admin`

### Incident Response

If admin API compromise is suspected:

1. **Immediate**: Scale Prometheus to 0 replicas to stop serving
2. **Investigate**: Check audit logs for unauthorized access
3. **Rotate Secrets**: Rotate all ServiceAccount tokens
4. **Redeploy**: Deploy fresh Prometheus pod with clean config
5. **Review**: Audit AuthorizationPolicy and NetworkPolicy rules
6. **Snapshot**: Take TSDB snapshot before cleanup if forensics needed

### Compliance Notes

1. **Data Retention**: Default retention is 30 days. Adjust based on compliance and storage requirements.

2. **Resource Limits**: Prometheus can consume significant resources. Monitor and adjust resource limits based on usage.

3. **Access Logs**: Istio access logs capture all requests to Prometheus endpoints (queryable in centralized logging)

4. **Change Management**: All Prometheus configuration changes should go through GitOps workflow (no manual `/-/reload` calls)

## Troubleshooting

### Metrics not appearing in Prometheus

1. Check that the backend pod has the correct annotations:

   ```yaml
   annotations:
     prometheus.io/scrape: 'true'
     prometheus.io/port: '3000'
     prometheus.io/path: '/metrics'
   ```

2. Verify the `/metrics` endpoint is accessible:

   ```bash
   kubectl port-forward -n default pod/<backend-pod> 3000:3000
   curl http://localhost:3000/metrics
   ```

3. Check Prometheus targets:
   - Navigate to <http://localhost:9090/targets>
   - Look for the `backend-app` job
   - Check for errors

### High cardinality warnings

If you see high cardinality warnings, review your metric labels. Avoid labels with:

- User IDs
- Request IDs
- Timestamps
- High-cardinality values

Use label aggregation or recording rules to reduce cardinality.

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Istio Prometheus Integration](https://istio.io/latest/docs/ops/integrations/prometheus/)
- [Node.js Prometheus Client](https://github.com/siimon/prom-client)
