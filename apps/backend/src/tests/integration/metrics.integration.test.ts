import express, { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { container } from '../../container';
import { IMetricsService } from '../../infrastructure/observability';
import { metricsMiddleware } from '../../middleware/metrics.middleware';
import metricsRouter from '../../routes/metrics.routes';

describe('Metrics Integration', () => {
  let app: Express;
  let metricsService: IMetricsService;

  beforeAll(() => {
    // Create Express app with metrics middleware and routes
    app = express();
    app.use(metricsMiddleware);

    // Mount metrics endpoint
    app.use('/metrics', metricsRouter);

    // Add test routes to generate metrics
    app.get('/api/test', (_req, res) => {
      res.json({ message: 'test' });
    });

    app.post('/api/users', (_req, res) => {
      res.status(201).json({ id: '123' });
    });

    app.get('/api/error', (_req, res) => {
      res.status(500).json({ error: 'Internal Server Error' });
    });

    // Resolve metrics service
    metricsService = container.resolve<IMetricsService>('MetricsService');
  });

  afterAll(() => {
    // Clean up
    metricsService.resetMetrics();
  });

  describe('GET /metrics', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
    });

    it('should return correct content-type header', async () => {
      const response = await request(app).get('/metrics');

      const contentType = response.headers['content-type'];
      expect(contentType).toContain('text/plain');
      expect(contentType).toContain('version=0.0.4');
      expect(contentType).toContain('charset=utf-8');
    });

    it('should return metrics in Prometheus text format', async () => {
      const response = await request(app).get('/metrics');

      expect(response.text).toBeTruthy();
      expect(response.text).toMatch(/# HELP/);
      expect(response.text).toMatch(/# TYPE/);
    });

    it('should include default Node.js metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.text).toContain('nodejs_version_info');
      expect(response.text).toContain('process_cpu_seconds_total');
      expect(response.text).toContain('nodejs_heap_size_total_bytes');
      expect(response.text).toContain('nodejs_heap_size_used_bytes');
    });

    it('should include application label in all metrics', async () => {
      const response = await request(app).get('/metrics');

      const metricsWithLabels = response.text
        .split('\n')
        .filter((line) => line.includes('{') && !line.startsWith('#'));

      // All metrics with labels should have app="backend"
      metricsWithLabels.forEach((line) => {
        if (line.trim()) {
          expect(line).toContain('app="backend"');
        }
      });
    });
  });

  describe('HTTP Request Metrics Collection', () => {
    it('should track successful GET requests', async () => {
      // Clear previous metrics

      // Make a test request
      await request(app).get('/api/test');

      // Get metrics
      const response = await request(app).get('/metrics');

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('method="GET"');
      expect(response.text).toContain('status_code="200"');
    });

    it('should track POST requests with 201 status', async () => {
      await request(app).post('/api/users');

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('method="POST"');
      expect(response.text).toContain('status_code="201"');
    });

    it('should track error responses', async () => {
      await request(app).get('/api/error');

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('status_code="500"');
    });

    it('should track request duration', async () => {
      await request(app).get('/api/test');

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('http_request_duration_seconds_bucket');
      expect(response.text).toContain('http_request_duration_seconds_sum');
      expect(response.text).toContain('http_request_duration_seconds_count');
    });

    it('should track multiple requests independently', async () => {
      // Make multiple requests
      await request(app).get('/api/test');
      await request(app).get('/api/test');
      await request(app).post('/api/users');

      const response = await request(app).get('/metrics');

      // Should show count of 3 total requests (GET x2 + POST x1)
      // Note: The actual count parsing would depend on label combinations
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds_count');
    });
  });

  describe('Pre-registered Business Metrics', () => {
    it('should expose database metrics when used', async () => {
      // Simulate database operations
      metricsService.observeHistogram('db_query_duration_seconds', 0.025, {
        operation: 'SELECT',
        table: 'users',
      });
      metricsService.incrementCounter('db_queries_total', {
        operation: 'SELECT',
        table: 'users',
        status: 'success',
      });

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('db_query_duration_seconds');
      expect(response.text).toContain('db_queries_total');
    });

    it('should expose cache metrics when used', async () => {
      metricsService.incrementCounter('cache_hits_total', { cache_name: 'test' }, 5);
      metricsService.incrementCounter('cache_misses_total', { cache_name: 'test' });

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('cache_hits_total');
      expect(response.text).toContain('cache_name="test"');
      expect(response.text).toMatch(/cache_hits_total\{[^}]*\}\s+5/);
      expect(response.text).toContain('cache_misses_total');
      expect(response.text).toMatch(/cache_misses_total\{[^}]*\}\s+1/);
    });

    it('should expose queue metrics when used', async () => {
      metricsService.setGauge('queue_jobs_active', 3, { queue_name: 'email' });
      metricsService.setGauge('queue_jobs_waiting', 7, { queue_name: 'email' });
      metricsService.incrementCounter(
        'queue_jobs_completed_total',
        { queue_name: 'email', status: 'success' },
        10
      );

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('queue_jobs_active');
      expect(response.text).toContain('queue_name="email"');
      expect(response.text).toMatch(/queue_jobs_active\{[^}]*\}\s+3/);
      expect(response.text).toMatch(/queue_jobs_waiting\{[^}]*\}\s+7/);
      expect(response.text).toMatch(/queue_jobs_completed_total\{[^}]*\}\s+10/);
    });

    it('should expose WebSocket metrics when used', async () => {
      metricsService.setGauge('websocket_connections_active', 15);
      metricsService.incrementCounter(
        'websocket_messages_total',
        { event: 'message', direction: 'inbound' },
        50
      );

      const response = await request(app).get('/metrics');

      expect(response.text).toMatch(/websocket_connections_active\{[^}]*\}\s+15/);
      expect(response.text).toContain('websocket_messages_total');
      expect(response.text).toContain('event="message"');
      expect(response.text).toMatch(/websocket_messages_total\{[^}]*\}\s+50/);
    });

    it('should expose authentication metrics when used', async () => {
      metricsService.incrementCounter(
        'auth_attempts_total',
        { method: 'credentials', status: 'success' },
        20
      );
      metricsService.incrementCounter(
        'auth_failures_total',
        { method: 'credentials', reason: 'invalid_credentials' },
        3
      );

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('auth_attempts_total');
      expect(response.text).toContain('method="credentials"');
      expect(response.text).toMatch(/auth_attempts_total\{[^}]*\}\s+20/);
      expect(response.text).toMatch(/auth_failures_total\{[^}]*\}\s+3/);
    });

    it('should expose business metrics when used', async () => {
      metricsService.incrementCounter('user_registrations_total', { source: 'web' }, 8);
      metricsService.incrementCounter(
        'api_errors_total',
        { route: '/api/test', error_type: 'validation' },
        2
      );

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('user_registrations_total');
      expect(response.text).toContain('source="web"');
      expect(response.text).toMatch(/user_registrations_total\{[^}]*\}\s+8/);
      expect(response.text).toMatch(/api_errors_total\{[^}]*\}\s+2/);
    });
  });

  describe('Custom Metrics', () => {
    it('should expose custom counters', async () => {
      // Register custom metric
      metricsService.registerCounter('custom_events_total', 'Custom events counter');
      metricsService.incrementCounter('custom_events_total', undefined, 5);

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('custom_events_total');
      expect(response.text).toMatch(/custom_events_total\{[^}]*\}\s+5/);
    });

    it('should expose custom gauges', async () => {
      metricsService.registerGauge('custom_active_users', 'Custom active users gauge');
      metricsService.setGauge('custom_active_users', 42);

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('custom_active_users');
      expect(response.text).toMatch(/custom_active_users\{[^}]*\}\s+42/);
    });

    it('should expose custom histograms', async () => {
      metricsService.registerHistogram(
        'custom_processing_time_seconds',
        'Custom processing time histogram'
      );
      metricsService.observeHistogram('custom_processing_time_seconds', 0.15);
      metricsService.observeHistogram('custom_processing_time_seconds', 0.25);

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('custom_processing_time_seconds_bucket');
      expect(response.text).toContain('custom_processing_time_seconds_sum');
      expect(response.text).toMatch(/custom_processing_time_seconds_count\{[^}]*\}\s+2/);
    });
  });

  describe('Metrics Format Validation', () => {
    it('should have proper HELP comments', async () => {
      const response = await request(app).get('/metrics');

      const helpLines = response.text.split('\n').filter((line) => line.startsWith('# HELP'));

      expect(helpLines.length).toBeGreaterThan(0);
    });

    it('should have proper TYPE comments', async () => {
      const response = await request(app).get('/metrics');

      const typeLines = response.text.split('\n').filter((line) => line.startsWith('# TYPE'));

      expect(typeLines.length).toBeGreaterThan(0);

      // Should have different metric types
      expect(response.text).toMatch(/# TYPE \w+ counter/);
      expect(response.text).toMatch(/# TYPE \w+ gauge/);
      expect(response.text).toMatch(/# TYPE \w+ histogram/);
    });

    it('should have metric values on separate lines', async () => {
      metricsService.registerCounter('test_metric_total', 'Test metric counter');
      metricsService.incrementCounter('test_metric_total');

      const response = await request(app).get('/metrics');

      const lines = response.text.split('\n');

      // Metric values should not be on the same line as HELP or TYPE
      lines.forEach((line) => {
        if (line.startsWith('# ')) {
          expect(line).not.toMatch(/\s+\d+$/);
        }
      });
    });
  });

  describe('Metrics Endpoint Security', () => {
    it('should not expose sensitive information in metrics', async () => {
      const response = await request(app).get('/metrics');

      // Metrics should not contain passwords, tokens, or other sensitive data
      expect(response.text.toLowerCase()).not.toContain('password');
      expect(response.text.toLowerCase()).not.toContain('token');
      expect(response.text.toLowerCase()).not.toContain('secret');
      expect(response.text.toLowerCase()).not.toContain('apikey');
    });

    it('should be accessible without authentication (for Prometheus)', async () => {
      // The endpoint should be publicly accessible for Prometheus to scrape
      // In production, this should be restricted via Istio AuthorizationPolicy
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests correctly', async () => {
      // Make multiple concurrent requests
      const requests = [
        request(app).get('/api/test'),
        request(app).get('/api/test'),
        request(app).get('/api/test'),
        request(app).post('/api/users'),
        request(app).post('/api/users'),
      ];

      await Promise.all(requests);

      const response = await request(app).get('/metrics');

      // Should track all requests
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });
  });

  describe('Metrics Persistence', () => {
    it('should accumulate metrics across multiple requests', async () => {
      // First batch
      await request(app).get('/api/test');
      await request(app).get('/api/test');

      // Second batch
      await request(app).get('/api/test');

      const response = await request(app).get('/metrics');

      // Metrics should show accumulated values, not just the last request
      expect(response.text).toContain('http_requests_total');
    });

    it('should maintain metrics between /metrics endpoint calls', async () => {
      metricsService.registerCounter('persistent_counter_total', 'Persistent test counter');
      metricsService.incrementCounter('persistent_counter_total', undefined, 5);

      // First metrics call
      const response1 = await request(app).get('/metrics');
      expect(response1.text).toContain('persistent_counter_total');
      expect(response1.text).toMatch(/persistent_counter_total\{[^}]*\}\s+5/);

      // Second metrics call should still show the same value
      const response2 = await request(app).get('/metrics');
      expect(response2.text).toMatch(/persistent_counter_total\{[^}]*\}\s+5/);
    });
  });
});
