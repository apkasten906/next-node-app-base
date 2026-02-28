@ready @observability
Feature: Prometheus Metrics Collection
  As a DevOps engineer
  I want to collect application metrics in Prometheus format
  So that I can monitor application performance and health

  Background:
    Given the metrics service is initialized

  Scenario: Expose metrics endpoint in Prometheus format
    When I request the "/metrics" endpoint
    Then the response status should be 200
    And the response content-type should be "text/plain; version=0.0.4; charset=utf-8"
    And the response should contain Prometheus metrics

  Scenario: Track HTTP request duration
    Given the metrics middleware is active
    When I make a GET request to "/api/users"
    Then the "http_request_duration_seconds" histogram should be observed
    And the histogram should have labels:
      | method | route      | status_code |
      | GET    | /api/users | 200         |

  Scenario: Track HTTP request count
    Given the metrics middleware is active
    When I make 5 GET requests to "/api/users"
    Then the "http_requests_total" counter should be incremented by 5
    And the counter should have labels:
      | method | route      | status_code |
      | GET    | /api/users | 200         |

  Scenario: Create and increment custom counter
    When I create a counter named "user_registrations_total"
    And I increment the counter by 1
    Then the counter value should be 1
    When I increment the counter by 3
    Then the counter value should be 4

  Scenario: Create and set gauge metric
    When I create a gauge named "active_connections"
    And I set the gauge to 42
    Then the gauge value should be 42
    When I increment the gauge by 8
    Then the gauge value should be 50
    When I decrement the gauge by 5
    Then the gauge value should be 45

  Scenario: Observe histogram values
    When I create a histogram named "request_duration_ms" with buckets [10, 50, 100, 500]
    And I observe the following values:
      | value |
      | 5     |
      | 25    |
      | 75    |
      | 150   |
      | 600   |
    Then the histogram should have counts in buckets:
      | bucket | count |
      | 10     | 1     |
      | 50     | 2     |
      | 100    | 3     |
      | 500    | 4     |
      | +Inf   | 5     |

  Scenario: Use timer to track operation duration
    When I start a timer for operation "database_query"
    And I wait for 100 milliseconds
    And I end the timer
    Then the "database_query_duration_seconds" histogram should have a value around 0.1

  Scenario: Collect default Node.js metrics
    Given default metrics are registered
    When I request the "/metrics" endpoint
    Then the response should contain "nodejs_version_info"
    And the response should contain "process_cpu_seconds_total"
    And the response should contain "nodejs_heap_size_total_bytes"

  Scenario: Track database query metrics
    When I observe a database query duration of 0.05 seconds
    And I increment the database queries counter
    Then the "db_query_duration_seconds" histogram should include 0.05
    And the "db_queries_total" counter should be 1

  Scenario: Track cache hit/miss metrics
    When I increment the cache hits counter 8 times
    And I increment the cache misses counter 2 times
    Then the "cache_hits_total" counter should be 8
    And the "cache_misses_total" counter should be 2
    And the cache hit ratio should be 80%

  Scenario: Track queue job metrics
    When I set active jobs to 5
    And I set waiting jobs to 12
    And I increment completed jobs by 3
    Then the "queue_jobs_active" gauge should be 5
    And the "queue_jobs_waiting" gauge should be 12
    And the "queue_jobs_completed_total" counter should be 3

  Scenario: Track WebSocket connection metrics
    When I set active WebSocket connections to 25
    And I increment WebSocket messages counter by 100
    Then the "websocket_connections_active" gauge should be 25
    And the "websocket_messages_total" counter should be 100

  Scenario: Track authentication metrics
    When I increment authentication attempts by 10
    And I increment authentication failures by 2
    Then the "auth_attempts_total" counter should be 10
    And the "auth_failures_total" counter should be 2
    And the authentication success rate should be 80%

  Scenario: Track business metrics
    When I increment user registrations by 5
    And I increment API errors by 2
    Then the "user_registrations_total" counter should be 5
    And the "api_errors_total" counter should be 2

  Scenario: Metrics include application labels
    When I request the "/metrics" endpoint
    Then all metrics should have the label "app" with value "backend"
    And all metrics should have the label "version"

  Scenario: Clear metrics for testing
    Given I have created several metrics
    When I clear all metrics
    Then the metrics registry should be empty
    And requesting "/metrics" should return only default metrics
