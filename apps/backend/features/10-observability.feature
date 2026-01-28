@wip
Feature: Observability and Monitoring
  As a DevOps engineer
  We need comprehensive observability
  So that we can monitor, debug, and optimize the application

  Background:
    Given observability tools are configured
    And the application is running

  @observability @metrics @prometheus
  Scenario: Prometheus metrics exposition
    Given Prometheus metrics are configured
    When I access the metrics endpoint "/metrics"
    Then Prometheus-formatted metrics should be returned
    And metrics should include:
      | metric                    |
      | http_requests_total       |
      | http_request_duration_ms  |
      | nodejs_heap_size_used     |
      | nodejs_eventloop_lag      |

  @observability @metrics @custom
  Scenario: Custom business metrics
    Given custom metrics are defined
    When business events occur
    Then custom metrics should be incremented
    And metrics should be available at "/metrics"
    Examples:
      | event          | metric              |
      | user_signup    | users_created_total |
      | order_placed   | orders_total        |
      | payment_failed | payment_errors      |

  @observability @metrics @labels
  Scenario: Metrics with labels
    Given metrics support labels
    When I record an HTTP request
    Then the metric should include labels:
      | label     |
      | method    |
      | path      |
      | status    |
      | duration  |

  @observability @grafana
  Scenario: Grafana dashboard for metrics visualization
    Given Grafana is configured with Prometheus data source
    When I access Grafana dashboards
    Then I should see application metrics visualized
    And dashboards should show:
      | panel                  |
      | Request Rate           |
      | Error Rate             |
      | Response Time (p95)    |
      | Memory Usage           |
      | CPU Usage              |

  @observability @grafana @alerts
  Scenario: Grafana alerting rules
    Given alerting rules are configured
    When error rate exceeds threshold
    Then an alert should be triggered
    And alert should be sent to configured channels
    And alert should include relevant context

  @observability @tracing @jaeger
  Scenario: Distributed tracing with Jaeger
    Given Jaeger tracing is enabled
    When a request spans multiple services
    Then a trace should be created
    And spans should be recorded for each service
    And trace ID should propagate across services

  @observability @tracing @spans
  Scenario: Trace span creation
    Given tracing is enabled
    When a database query is executed
    Then a span should be created for the query
    And span should include:
      | attribute    |
      | operation    |
      | duration     |
      | query        |
      | status       |

  @observability @tracing @context-propagation
  Scenario: Trace context propagation
    Given a request enters the system
    When the request calls downstream services
    Then trace context should be propagated
    And all spans should belong to the same trace
    And parent-child relationships should be preserved

  @observability @logging @structured
  Scenario: Structured logging with Winston
    Given structured logging is configured
    When application logs an event
    Then log should be in JSON format
    And log should include:
      | field         |
      | timestamp     |
      | level         |
      | message       |
      | correlationId |
      | metadata      |

  @observability @logging @levels
  Scenario: Log level filtering
    Given log level is set to "info"
    When I log messages at different levels
    Then "debug" logs should be filtered out
    And "info", "warn", and "error" logs should be recorded

  @observability @logging @elk
  Scenario: ELK Stack log aggregation
    Given logs are shipped to Elasticsearch
    When I search for logs in Kibana
    Then I should find application logs
    And logs should be searchable by fields
    And logs should be filterable by time range

  @observability @logging @loki
  Scenario: Loki log aggregation (alternative to ELK)
    Given logs are shipped to Loki
    When I query logs in Grafana
    Then I should find application logs
    And logs should be queryable using LogQL
    And logs should be efficient for time-series queries

  @observability @apm
  Scenario: Application Performance Monitoring
    Given APM agent is configured
    When the application handles requests
    Then performance metrics should be collected
    And slow transactions should be flagged
    And bottlenecks should be identified

  @observability @health-checks
  Scenario: Comprehensive health check endpoints
    When I GET "/health"
    Then health status should include:
      | component     |
      | application   |
      | database      |
      | cache         |
      | storage       |
      | external-apis |

  @observability @uptime-monitoring
  Scenario: Uptime monitoring and alerting
    Given uptime monitoring is configured
    When the application is down
    Then uptime monitor should detect the outage
    And alerts should be sent to on-call team
    And incident should be created

  @observability @error-tracking @sentry
  Scenario: Error tracking with Sentry
    Given Sentry is configured
    When an unhandled error occurs
    Then the error should be sent to Sentry
    And error should include stack trace
    And error should include request context
    And team should be notified based on severity

  @observability @performance @profiling
  Scenario: CPU and memory profiling
    Given profiling is enabled
    When I trigger a profiling session
    Then CPU usage should be profiled
    And memory allocations should be tracked
    And profiling report should be generated

  @observability @database-monitoring
  Scenario: Database query performance monitoring
    Given database monitoring is enabled
    When slow queries are executed
    Then slow queries should be logged
    And query execution time should be tracked
    And query patterns should be analyzed

  @observability @cache-monitoring
  Scenario: Redis cache monitoring
    Given Redis monitoring is enabled
    Then cache hit rate should be tracked
    And cache miss rate should be tracked
    And memory usage should be monitored
    And eviction rate should be monitored

  @observability @custom-dashboards
  Scenario: Custom monitoring dashboards
    Given custom dashboards are created
    When I view the dashboard
    Then I should see key business metrics
    And I should see technical metrics
    And I should see SLA compliance metrics

  @observability @slo
  Scenario: Service Level Objectives (SLO) tracking
    Given SLOs are defined
    Then availability SLO should be tracked
    And latency SLO should be tracked
    And error rate SLO should be tracked
    And SLO compliance should be reported

  @observability @correlation-id
  Scenario: Request correlation across logs and traces
    Given correlation ID is generated for each request
    When I search for a specific request
    Then I should find all logs with the correlation ID
    And I should find the trace with the correlation ID
    And logs and traces should be linked
