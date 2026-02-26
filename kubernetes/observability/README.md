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

1. **Metrics Endpoint Protection**: The `/metrics` endpoint should NOT be publicly accessible in production. Use Istio AuthorizationPolicy to restrict access to Prometheus only.

2. **Sensitive Data**: Ensure metrics do not contain sensitive data (passwords, tokens, PII). The MetricsService automatically excludes sensitive data.

3. **Resource Limits**: Prometheus can consume significant resources. Monitor and adjust resource limits based on usage.

4. **Data Retention**: Default retention is 30 days. Adjust based on compliance and storage requirements.

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
