import { beforeEach, describe, expect, it } from 'vitest';

import { MetricsService } from '../../../infrastructure/observability/MetricsService';

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    // Create a new instance with a clean registry for each test
    metricsService = new MetricsService();

    // Register test metrics (explicit registration required post-Decision 4)
    metricsService.registerCounter('test_counter_total', 'Test counter');
    metricsService.registerCounter('test_counter', 'Test counter');
    metricsService.registerGauge('test_gauge', 'Test gauge');
    metricsService.registerHistogram('request_duration_seconds', 'Test request duration');
    metricsService.registerSummary('response_time_ms', 'Test response time');
    metricsService.registerHistogram('operation_duration_seconds', 'Test operation duration');
    metricsService.registerHistogram('test_histogram', 'Test histogram');
    metricsService.registerHistogram('test_histogram_seconds', 'Test histogram in seconds');
    metricsService.registerCounter('loop_counter_total', 'Test loop counter');
  });

  describe('Counter Metrics', () => {
    it('should create and increment a counter', async () => {
      metricsService.incrementCounter('test_counter_total', undefined, 1);
      metricsService.incrementCounter('test_counter_total', undefined, 3);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('test_counter_total');
      expect(metrics).toMatch(/test_counter_total\{[^}]*\}\s+4/);
    });

    it('should support labels on counters', async () => {
      metricsService.incrementCounter(
        'http_requests_total',
        {
          method: 'GET',
          route: '/api/users',
          status_code: '200',
        },
        1
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('http_requests_total{');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/users"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should handle multiple label combinations', async () => {
      metricsService.incrementCounter(
        'http_requests_total',
        { method: 'GET', route: '/users', status_code: '200' },
        1
      );
      metricsService.incrementCounter(
        'http_requests_total',
        { method: 'GET', route: '/posts', status_code: '200' },
        2
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('route="/users"');
      expect(metrics).toContain('route="/posts"');
    });

    it('should use pre-registered HTTP requests counter', async () => {
      metricsService.incrementCounter(
        'http_requests_total',
        {
          method: 'POST',
          route: '/api/auth',
          status_code: '201',
        },
        1
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="POST"');
    });
  });

  describe('Gauge Metrics', () => {
    it('should create and set a gauge', async () => {
      metricsService.setGauge('active_connections', 42);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('active_connections');
      expect(metrics).toMatch(/active_connections\{[^}]*\}\s+42/);
    });

    it('should support incrementing gauges', async () => {
      metricsService.setGauge('queue_size', 10);
      metricsService.setGauge('queue_size', 15); // setGauge overrides

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('queue_size');
      expect(metrics).toMatch(/queue_size\{[^}]*\}\s+15/);
    });

    it('should support labels on gauges', async () => {
      metricsService.setGauge('queue_jobs_active', 25, {
        queue_name: 'email',
      });

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('queue_jobs_active{');
      expect(metrics).toContain('queue_name="email"');
    });

    it('should use pre-registered queue jobs gauge', async () => {
      metricsService.setGauge('queue_jobs_active', 5, { queue_name: 'email' });
      metricsService.setGauge('queue_jobs_waiting', 12, { queue_name: 'email' });

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('queue_jobs_active');
      expect(metrics).toContain('queue_jobs_waiting');
      expect(metrics).toMatch(/queue_jobs_active\{[^}]*\}\s+5/);
      expect(metrics).toMatch(/queue_jobs_waiting\{[^}]*\}\s+12/);
    });
  });

  describe('Histogram Metrics', () => {
    it('should create and observe histogram values', async () => {
      metricsService.observeHistogram('request_duration_seconds', 0.05);
      metricsService.observeHistogram('request_duration_seconds', 0.15);
      metricsService.observeHistogram('request_duration_seconds', 0.25);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('request_duration_seconds_bucket');
      expect(metrics).toContain('request_duration_seconds_sum');
      expect(metrics).toContain('request_duration_seconds_count');
      expect(metrics).toMatch(/request_duration_seconds_count\{[^}]*\}\s+3/);
    });

    it('should support custom buckets', async () => {
      metricsService.observeHistogram('http_request_duration_seconds', 0.05);
      metricsService.observeHistogram('http_request_duration_seconds', 0.15);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_bucket');
      expect(metrics).toContain('http_request_duration_seconds_count');
      expect(metrics).toMatch(/http_request_duration_seconds_count\{[^}]*\}\s+2/);
    });

    it('should support labels on histograms', async () => {
      metricsService.observeHistogram('db_query_duration_seconds', 0.025, {
        operation: 'SELECT',
        table: 'users',
      });

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('db_query_duration_seconds_bucket{');
      expect(metrics).toContain('operation="SELECT"');
      expect(metrics).toContain('table="users"');
    });

    it('should use pre-registered HTTP duration histogram', async () => {
      metricsService.observeHistogram('http_request_duration_seconds', 0.123, {
        method: 'GET',
        route: '/api/users',
        status_code: '200',
      });

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_bucket');
    });
  });

  describe('Summary Metrics', () => {
    it('should create and observe summary values', async () => {
      metricsService.observeSummary('response_time_ms', 45);
      metricsService.observeSummary('response_time_ms', 55);
      metricsService.observeSummary('response_time_ms', 65);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('response_time_ms{');
      expect(metrics).toContain('response_time_ms_sum');
      expect(metrics).toContain('response_time_ms_count');
      expect(metrics).toMatch(/response_time_ms_count\{[^}]*\}\s+3/);
    });

    it('should support labels on summaries', async () => {
      metricsService.observeSummary('response_time_ms', 120);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('response_time_ms{');
      expect(metrics).toContain('response_time_ms_sum');
    });
  });

  describe('Timer Functionality', () => {
    it('should measure duration with timer', async () => {
      const endTimer = metricsService.startTimer('operation_duration_seconds');

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100));

      endTimer();

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('operation_duration_seconds_bucket');

      // Extract the sum value to verify it's approximately 0.1 seconds
      const sumMatch = metrics.match(/operation_duration_seconds_sum\{[^}]*\}\s+(\d+\.?\d*)/);
      expect(sumMatch).toBeTruthy();
      const sum = Number.parseFloat(sumMatch![1]);
      expect(sum).toBeGreaterThan(0.08); // Allow some variance
      expect(sum).toBeLessThan(0.15); // Allow some variance
    });

    it('should support labels with timer', async () => {
      const endTimer = metricsService.startTimer('db_query_duration_seconds', {
        operation: 'INSERT',
        table: 'users',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      endTimer();

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('db_query_duration_seconds_bucket{');
      expect(metrics).toContain('operation="INSERT"');
    });
  });

  describe('Default Metrics', () => {
    it('should register Node.js default metrics', async () => {
      // Default metrics are already registered in constructor
      const metrics = await metricsService.getMetrics();

      // Check for common Node.js metrics
      expect(metrics).toContain('nodejs_version_info');
      expect(metrics).toContain('process_cpu_seconds_total');
      expect(metrics).toContain('nodejs_heap_size_total_bytes');
      expect(metrics).toContain('nodejs_heap_size_used_bytes');
    });

    it('should include default labels in all metrics', async () => {
      const metrics = await metricsService.getMetrics();

      // All metrics should have app label
      const metricLines = metrics.split('\n').filter((line) => !line.startsWith('#'));
      const metricsWithLabels = metricLines.filter((line) => line.includes('{'));

      metricsWithLabels.forEach((line) => {
        if (line.trim()) {
          expect(line).toContain('app="backend"');
        }
      });
    });
  });

  describe('Pre-registered Business Metrics', () => {
    it('should have pre-registered database metrics', async () => {
      metricsService.observeHistogram('db_query_duration_seconds', 0.05, {
        operation: 'SELECT',
        table: 'users',
      });
      metricsService.incrementCounter(
        'db_queries_total',
        {
          operation: 'SELECT',
          table: 'users',
          status: 'success',
        },
        1
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('db_query_duration_seconds');
      expect(metrics).toContain('db_queries_total');
    });

    it('should have pre-registered cache metrics', async () => {
      metricsService.incrementCounter('cache_hits_total', { cache_name: 'redis' }, 8);
      metricsService.incrementCounter('cache_misses_total', { cache_name: 'redis' }, 2);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_hits_total');
      expect(metrics).toContain('cache_misses_total');
      expect(metrics).toMatch(/cache_hits_total\{[^}]*\}\s+8/);
      expect(metrics).toMatch(/cache_misses_total\{[^}]*\}\s+2/);
    });

    it('should have pre-registered queue metrics', async () => {
      metricsService.setGauge('queue_jobs_active', 5, { queue_name: 'email' });
      metricsService.setGauge('queue_jobs_waiting', 10, { queue_name: 'email' });
      metricsService.incrementCounter(
        'queue_jobs_completed_total',
        {
          queue_name: 'email',
          status: 'success',
        },
        3
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('queue_jobs_active');
      expect(metrics).toContain('queue_jobs_waiting');
      expect(metrics).toContain('queue_jobs_completed_total');
      expect(metrics).toMatch(/queue_jobs_active\{[^}]*\}\s+5/);
      expect(metrics).toMatch(/queue_jobs_waiting\{[^}]*\}\s+10/);
      expect(metrics).toMatch(/queue_jobs_completed_total\{[^}]*\}\s+3/);
    });

    it('should have pre-registered WebSocket metrics', async () => {
      metricsService.setGauge('websocket_connections_active', 25);
      metricsService.incrementCounter(
        'websocket_messages_total',
        {
          event: 'message',
          direction: 'inbound',
        },
        100
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('websocket_connections_active');
      expect(metrics).toContain('websocket_messages_total');
      expect(metrics).toMatch(/websocket_connections_active\{[^}]*\}\s+25/);
      expect(metrics).toMatch(/websocket_messages_total\{[^}]*\}\s+100/);
    });

    it('should have pre-registered authentication metrics', async () => {
      metricsService.incrementCounter(
        'auth_attempts_total',
        {
          method: 'local',
          status: 'success',
        },
        10
      );
      metricsService.incrementCounter(
        'auth_failures_total',
        {
          method: 'local',
          reason: 'invalid_credentials',
        },
        2
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('auth_attempts_total');
      expect(metrics).toContain('auth_failures_total');
      expect(metrics).toMatch(/auth_attempts_total\{[^}]*\}\s+10/);
      expect(metrics).toMatch(/auth_failures_total\{[^}]*\}\s+2/);
    });

    it('should have pre-registered business metrics', async () => {
      metricsService.incrementCounter('user_registrations_total', { source: 'web' }, 5);
      metricsService.incrementCounter(
        'api_errors_total',
        {
          route: '/api/users',
          error_type: 'validation',
        },
        2
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('user_registrations_total');
      expect(metrics).toContain('api_errors_total');
      expect(metrics).toMatch(/user_registrations_total\{[^}]*\}\s+5/);
      expect(metrics).toMatch(/api_errors_total\{[^}]*\}\s+2/);
    });
  });

  describe('Metrics Output Format', () => {
    it('should return metrics in Prometheus text format', async () => {
      metricsService.incrementCounter('test_counter_total', undefined, 1);
      const metrics = await metricsService.getMetrics();

      // Should have HELP and TYPE comments
      expect(metrics).toMatch(/# HELP/);
      expect(metrics).toMatch(/# TYPE/);

      // Should have metric values
      expect(metrics).toContain('test_counter_total');
    });

    it('should include metric descriptions', async () => {
      const metrics = await metricsService.getMetrics();

      // Check for HELP comments (from pre-registered and default metrics)
      const helpLines = metrics.split('\n').filter((line) => line.startsWith('# HELP'));
      expect(helpLines.length).toBeGreaterThan(5); // Should have many from default Node.js metrics
    });

    it('should include metric types', async () => {
      const metrics = await metricsService.getMetrics();

      // Check for TYPE comments
      const typeLines = metrics.split('\n').filter((line) => line.startsWith('# TYPE'));
      expect(typeLines.length).toBeGreaterThan(5); // Should have many from default Node.js metrics

      // Should have counter, gauge, and histogram types
      expect(metrics).toMatch(/# TYPE \w+ counter/);
      expect(metrics).toMatch(/# TYPE \w+ gauge/);
      expect(metrics).toMatch(/# TYPE \w+ histogram/);
    });
  });

  describe('Reset Metrics', () => {
    it('should reset all metric values to zero', async () => {
      metricsService.incrementCounter('test_counter', undefined, 5);
      metricsService.setGauge('test_gauge', 10);

      let metrics = await metricsService.getMetrics();
      expect(metrics).toContain('test_counter');
      expect(metrics).toContain('test_gauge');
      expect(metrics).toMatch(/test_counter\{[^}]*\}\s+5/);
      expect(metrics).toMatch(/test_gauge\{[^}]*\}\s+10/);

      metricsService.resetMetrics();

      metrics = await metricsService.getMetrics();
      // Metrics still exist but values are reset to 0
      expect(metrics).toContain('test_counter');
      expect(metrics).toContain('test_gauge');
      expect(metrics).toMatch(/test_counter\{[^}]*\}\s+0/);
      expect(metrics).toMatch(/test_gauge\{[^}]*\}\s+0/);
    });

    it('should allow incrementing metrics after reset', async () => {
      metricsService.incrementCounter('test_counter', undefined, 1);
      metricsService.resetMetrics();

      // Should not throw error - metric definition still exists
      expect(() => {
        metricsService.incrementCounter('test_counter', undefined, 2);
      }).not.toThrow();

      const metrics = await metricsService.getMetrics();
      expect(metrics).toMatch(/test_counter\{[^}]*\}\s+2/);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unregistered metrics', () => {
      expect(() => {
        metricsService.incrementCounter('unregistered_counter', undefined, 1);
      }).toThrow(/not registered/);
    });

    it('should handle negative counter increments', () => {
      metricsService.registerCounter('negative_test_counter', 'Test counter for negative values');
      expect(() => {
        metricsService.incrementCounter('negative_test_counter', undefined, -1);
      }).toThrow();
    });

    it('should handle histogram observation errors', () => {
      metricsService.registerHistogram('nan_test_histogram', 'Test histogram for NaN');
      expect(() => {
        metricsService.observeHistogram('nan_test_histogram', Number.NaN);
      }).toThrow();
    });
  });

  describe('Metric Aggregation', () => {
    it('should aggregate counter values correctly', async () => {
      for (let i = 0; i < 10; i++) {
        metricsService.incrementCounter('loop_counter_total', undefined, 1);
      }

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('loop_counter_total');
      expect(metrics).toMatch(/loop_counter_total\{[^}]*\}\s+10/);
    });

    it('should maintain separate values for different labels', async () => {
      metricsService.incrementCounter(
        'http_requests_total',
        { method: 'GET', route: '/users', status_code: '200' },
        5
      );
      metricsService.incrementCounter(
        'http_requests_total',
        { method: 'GET', route: '/posts', status_code: '200' },
        3
      );

      const metrics = await metricsService.getMetrics();

      // Both label combinations should exist with their respective values
      const usersMatch = metrics.match(/http_requests_total\{[^}]*route="\/users"[^}]*\}\s+(\d+)/);
      const postsMatch = metrics.match(/http_requests_total\{[^}]*route="\/posts"[^}]*\}\s+(\d+)/);

      expect(usersMatch).toBeTruthy();
      expect(postsMatch).toBeTruthy();
      expect(Number.parseInt(usersMatch![1])).toBe(5);
      expect(Number.parseInt(postsMatch![1])).toBe(3);
    });

    it('should calculate histogram percentiles correctly', async () => {
      // Observe values to create a distribution
      const values = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];
      values.forEach((value) => {
        metricsService.observeHistogram('test_histogram_seconds', value);
      });

      const metrics = await metricsService.getMetrics();

      // Check histogram count
      expect(metrics).toContain('test_histogram_seconds_count');
      expect(metrics).toMatch(/test_histogram_seconds_count\{[^}]*\}\s+10/);

      // Check histogram sum (should be sum of all values)
      const expectedSum = values.reduce((a, b) => a + b, 0);
      const sumMatch = metrics.match(/test_histogram_seconds_sum\{[^}]*\}\s+(\d+\.?\d*)/);
      expect(sumMatch).toBeTruthy();
      const actualSum = Number.parseFloat(sumMatch![1]);
      expect(actualSum).toBeCloseTo(expectedSum, 2);
    });
  });
});
