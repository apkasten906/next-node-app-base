@observability
Feature: Observability and Monitoring
  As a DevOps engineer
  We need comprehensive observability
  So that we can monitor, debug, and optimize the application

  Background:
    Given the observability repository artifacts are available

  @ready @metrics @prometheus @impl_prometheus_metrics
  Scenario: Prometheus metrics exposition
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/MetricsService.ts"
    Then the observability artifact should contain:
      | marker                        |
      | http_requests_total           |
      | http_request_duration_seconds |
      | registerDefaultMetrics        |
    And observability artifact "apps/backend/src/routes/metrics.routes.ts" should contain:
      | marker       |
      | getMetrics() |
      | Content-Type |

  @ready @metrics @custom @impl_prometheus_metrics
  Scenario: Custom business metrics
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/MetricsService.ts"
    Then the observability artifact should contain:
      | marker                   |
      | user_registrations_total |
      | api_errors_total         |
      | incrementCounter         |

  @ready @metrics @labels @impl_prometheus_metrics
  Scenario: Metrics with labels
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/MetricsService.ts"
    Then the observability artifact should contain:
      | marker      |
      | method      |
      | route       |
      | status_code |

  @ready @grafana @impl_grafana_dashboards
  Scenario: Grafana dashboard for metrics visualization
    When I inspect the observability artifact "kubernetes/observability/grafana/grafana-dashboards.yaml"
    Then the observability artifact should contain:
      | marker                |
      | Request Rate          |
      | Error Rate (5xx)      |
      | P95 Latency           |
      | Heap Memory           |
      | CPU Usage             |

  @ready @grafana @alerts @impl_grafana_alerts
  Scenario: Grafana alerting rules
    When I inspect the observability artifact "kubernetes/observability/prometheus-rules-configmap.yaml"
    Then the observability artifact should contain:
      | marker           |
      | HighErrorRate    |
      | SlowResponseTime |
      | severity         |
      | summary          |
      | description      |
    And observability artifact "kubernetes/observability/alertmanager/alertmanager-config.yaml" should contain:
      | marker            |
      | critical-receiver |
      | warning-receiver  |
      | webhook_configs   |

  @ready @tracing @jaeger @impl_jaeger_tracing
  Scenario: Distributed tracing with Jaeger
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/TracingService.ts"
    Then the observability artifact should contain:
      | marker                       |
      | OTLPTraceExporter            |
      | getNodeAutoInstrumentations  |
      | OTEL_EXPORTER_OTLP_ENDPOINT  |
      | ATTR_SERVICE_NAME            |
    And observability artifact "kubernetes/observability/jaeger/jaeger-deployment.yaml" should contain:
      | marker       |
      | jaeger       |
      | 4318         |
      | COLLECTOR_OTLP_ENABLED |

  @ready @tracing @spans @impl_jaeger_tracing
  Scenario: Trace span creation
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/TracingService.ts"
    Then the observability artifact should contain:
      | marker                      |
      | NodeSDK                     |
      | getNodeAutoInstrumentations |
      | traceExporter               |

  @ready @tracing @context-propagation @impl_trace_context
  Scenario: Trace context propagation
    When I inspect the observability artifact "apps/backend/src/services/logger.service.ts"
    Then the observability artifact should contain:
      | marker         |
      | getActiveSpan  |
      | traceId        |
      | spanId         |
      | TraceFlags.SAMPLED |

  @ready @logging @structured @impl_winston_logging
  Scenario: Structured logging with Winston
    When I inspect the observability artifact "apps/backend/src/services/logger.service.ts"
    Then the observability artifact should contain:
      | marker        |
      | winston       |
      | timestamp     |
      | level         |
      | correlationId |
      | format.json() |

  @ready @logging @levels @impl_winston_logging
  Scenario: Log level filtering
    When I inspect the observability artifact "apps/backend/src/services/logger.service.ts"
    Then the observability artifact should contain:
      | marker                         |
      | process.env['LOG_LEVEL']       |
      | debug(message                  |
      | info(message                   |
      | warn(message                   |
      | error(message                  |

  @wip @adopter @logging @elk
  Scenario: ELK Stack log aggregation
    Given ELK is not the base repository log aggregation provider
    Then the scenario remains an adopter implementation guide

  @ready @logging @loki @impl_loki_logs
  Scenario: Loki log aggregation
    When I inspect the observability artifact "kubernetes/observability/loki/loki-config.yaml"
    Then the observability artifact should contain:
      | marker        |
      | schema: v13   |
      | retention_period |
    And observability artifact "kubernetes/observability/promtail/promtail-daemonset.yaml" should contain:
      | marker            |
      | /var/log/pods     |
      | loki              |
      | kubernetes_sd_configs |

  @ready @apm @impl_apm_tracing
  Scenario: Application Performance Monitoring
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/TracingService.ts"
    Then the observability artifact should contain:
      | marker                      |
      | NodeSDK                     |
      | getNodeAutoInstrumentations |
      | OTLPTraceExporter           |
    And observability artifact "apps/backend/src/infrastructure/observability/MetricsService.ts" should contain:
      | marker                       |
      | http_request_duration_seconds |
      | db_query_duration_seconds    |

  @ready @health-checks @impl_readiness_check
  Scenario: Comprehensive health check endpoints
    When I inspect the observability artifact "apps/backend/src/index.ts"
    Then the observability artifact should contain:
      | marker                  |
      | service: 'backend'      |
      | checkDependency         |
      | databaseCheck           |
      | cacheCheck              |
      | storageCheck            |
      | queueCheck              |
      | websocketCheck          |
      | latencyMs               |
      | status: isReady         |

  @ready @uptime-monitoring @impl_grafana_alerts
  Scenario: Uptime monitoring and alerting
    When I inspect the observability artifact "kubernetes/observability/prometheus-rules-configmap.yaml"
    Then the observability artifact should contain:
      | marker   |
      | NodeDown |
      | up{job="kubernetes-nodes"} == 0 |
      | severity: critical |
    And observability artifact "kubernetes/observability/prometheus-config.yaml" should contain:
      | marker       |
      | alertmanagers |
      | alertmanager:9093 |

  @wip @adopter @error-tracking @sentry
  Scenario: Error tracking with Sentry
    Given Sentry is not configured by the base repository
    Then the scenario remains an adopter implementation guide

  @wip @adopter @performance @profiling
  Scenario: CPU and memory profiling
    Given runtime profiling is not configured by the base repository
    Then the scenario remains an adopter implementation guide

  @ready @database-monitoring @impl_prometheus_metrics
  Scenario: Database query performance monitoring
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/MetricsService.ts"
    Then the observability artifact should contain:
      | marker                    |
      | db_query_duration_seconds |
      | db_queries_total          |
      | operation                 |
      | table                     |
    And observability artifact "kubernetes/observability/prometheus-rules-configmap.yaml" should contain:
      | marker              |
      | SlowDatabaseQueries |

  @ready @cache-monitoring @impl_prometheus_metrics
  Scenario: Redis cache monitoring
    When I inspect the observability artifact "apps/backend/src/infrastructure/observability/MetricsService.ts"
    Then the observability artifact should contain:
      | marker             |
      | cache_hits_total   |
      | cache_misses_total |
      | cache_name         |
    And observability artifact "kubernetes/observability/prometheus-rules-configmap.yaml" should contain:
      | marker            |
      | HighCacheMissRate |

  @ready @custom-dashboards @impl_grafana_dashboards
  Scenario: Custom monitoring dashboards
    When I inspect the observability artifact "kubernetes/observability/grafana/grafana-dashboards.yaml"
    Then the observability artifact should contain:
      | marker                |
      | Request Rate by Route |
      | P95 Latency by Route  |
      | CPU Usage Over Time   |

  @ready @slo @impl_slo_monitoring
  Scenario: Service Level Objectives tracking
    When I inspect the observability artifact "kubernetes/observability/prometheus-rules-configmap.yaml"
    Then the observability artifact should contain:
      | marker                         |
      | slo:http_availability:ratio_30d |
      | slo:http_latency:ratio_30d     |
      | slo:http_error_budget:remaining |
      | SLOAvailabilityBudgetBurn      |
      | SLOLatencyBudgetBurn           |
    And observability artifact "kubernetes/observability/grafana/grafana-dashboards.yaml" should contain:
      | marker                 |
      | Service Level Objectives |
      | Availability SLO Compliance |
      | Error Budget Remaining |

  @ready @correlation-id @impl_trace_log_correlation
  Scenario: Request correlation across logs and traces
    When I inspect the observability artifact "apps/backend/src/services/logger.service.ts"
    Then the observability artifact should contain:
      | marker          |
      | correlationId   |
      | injectTraceContext |
      | traceId         |
      | spanId          |
    And observability artifact "kubernetes/observability/grafana/grafana-config.yaml" should contain:
      | marker          |
      | tracesToLogsV2  |
      | derivedFields   |
      | datasourceUid: jaeger |
