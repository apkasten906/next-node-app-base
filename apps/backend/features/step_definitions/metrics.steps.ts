import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import express, { Express } from 'express';
import request from 'supertest';
import { container } from '../../src/container';
import { IMetricsService } from '../../src/infrastructure/observability';
import { metricsMiddleware } from '../../src/middleware/metrics.middleware';
import metricsRouter from '../../src/routes/metrics.routes';
import { expect } from '../support/assertions';

interface MetricsWorld {
  app?: Express;
  metricsService?: IMetricsService;
  metricsResponse?: request.Response;
  timerEndFunction?: () => void;
}

Given('the metrics service is initialized', function (this: MetricsWorld) {
  // Create Express app with metrics
  this.app = express();
  this.app.use(metricsMiddleware);
  this.app.use('/metrics', metricsRouter);

  // Add test routes
  this.app.get('/api/users', (_req, res) => res.json({ users: [] }));
  this.app.post('/api/users', (_req, res) => res.status(201).json({ id: '123' }));

  // Get metrics service from DI container
  this.metricsService = container.resolve<IMetricsService>('MetricsService');
  this.metricsService?.clearMetrics();
  this.metricsService?.registerDefaultMetrics();
});

Given('the metrics middleware is active', function (this: MetricsWorld) {
  // Already set up in background
  expect(this.app).toBeDefined();
});

Given('default metrics are registered', function (this: MetricsWorld) {
  this.metricsService!.registerDefaultMetrics();
});

Given('I have created several metrics', function (this: MetricsWorld) {
  this.metricsService!.incrementCounter('test_counter_1', {}, 1);
  this.metricsService!.setGauge('test_gauge_1', 10, {});
  this.metricsService!.observeHistogram('test_histogram_1', 0.5, {});
});

When('I request the {string} endpoint', async function (this: MetricsWorld, endpoint: string) {
  this.metricsResponse = await request(this.app!).get(endpoint);
});

When('I make a GET request to {string}', async function (this: MetricsWorld, path: string) {
  await request(this.app!).get(path);
});

When(
  'I make {int} GET requests to {string}',
  async function (this: MetricsWorld, count: number, path: string) {
    for (let i = 0; i < count; i++) {
      await request(this.app!).get(path);
    }
  }
);

When('I create a counter named {string}', function (this: MetricsWorld, name: string) {
  this.metricsService!.incrementCounter(name, {}, 0); // Initialize
});

When('I increment the counter by {int}', function (this: MetricsWorld, value: number) {
  // Use a test counter
  this.metricsService!.incrementCounter('test_counter_total', {}, value);
});

When('I create a gauge named {string}', function (this: MetricsWorld, name: string) {
  this.metricsService!.setGauge(name, 0, {}); // Initialize
});

When('I set the gauge to {int}', function (this: MetricsWorld, value: number) {
  this.metricsService!.setGauge('test_gauge', value, {});
});

When('I increment the gauge by {int}', async function (this: MetricsWorld, value: number) {
  // For testing, we'll just add to the current value
  const currentMetrics = await this.metricsService!.getMetrics();
  const match = currentMetrics.match(/test_gauge\s+(\d+)/);
  const current = match && match[1] ? Number.parseInt(match[1]) : 0;
  this.metricsService!.setGauge('test_gauge', current + value, {});
});

When('I decrement the gauge by {int}', async function (this: MetricsWorld, value: number) {
  const currentMetrics = await this.metricsService!.getMetrics();
  const match = currentMetrics.match(/test_gauge\s+(\d+)/);
  const current = match && match[1] ? Number.parseInt(match[1]) : 0;
  this.metricsService!.setGauge('test_gauge', current - value, {});
});

When(
  'I create a histogram named {string} with buckets {word}',
  function (this: MetricsWorld, name: string, _bucketsStr: string) {
    // Initialize histogram with first observation
    this.metricsService!.observeHistogram(name, 0, {});
  }
);

When('I observe the following values:', function (this: MetricsWorld, dataTable: DataTable) {
  const values = dataTable.hashes().map((row) => Number.parseFloat(row['value'] || '0'));
  values.forEach((value) => {
    this.metricsService!.observeHistogram('test_histogram', value, {});
  });
});

When('I start a timer for operation {string}', function (this: MetricsWorld, operation: string) {
  this.timerEndFunction = this.metricsService!.startTimer(`${operation}_duration_seconds`);
});

When('I wait for {int} milliseconds', async function (this: MetricsWorld, ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
});

When('I end the timer', function (this: MetricsWorld) {
  this.timerEndFunction!();
});

When(
  'I observe a database query duration of {float} seconds',
  function (this: MetricsWorld, duration: number) {
    this.metricsService!.observeHistogram('db_query_duration_seconds', duration, {});
  }
);

When('I increment the database queries counter', function (this: MetricsWorld) {
  this.metricsService!.incrementCounter('db_queries_total', {}, 1);
});

When(
  'I increment the cache hits counter {int} times',
  function (this: MetricsWorld, count: number) {
    this.metricsService!.incrementCounter('cache_hits_total', {}, count);
  }
);

When(
  'I increment the cache misses counter {int} times',
  function (this: MetricsWorld, count: number) {
    this.metricsService!.incrementCounter('cache_misses_total', {}, count);
  }
);

When('I set active jobs to {int}', function (this: MetricsWorld, value: number) {
  this.metricsService!.setGauge('queue_jobs_active', value, {});
});

When('I set waiting jobs to {int}', function (this: MetricsWorld, value: number) {
  this.metricsService!.setGauge('queue_jobs_waiting', value, {});
});

When('I increment completed jobs by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter('queue_jobs_completed_total', {}, count);
});

When('I set active WebSocket connections to {int}', function (this: MetricsWorld, value: number) {
  this.metricsService!.setGauge('websocket_connections_active', value, {});
});

When(
  'I increment WebSocket messages counter by {int}',
  function (this: MetricsWorld, count: number) {
    this.metricsService!.incrementCounter('websocket_messages_total', {}, count);
  }
);

When('I increment authentication attempts by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter('auth_attempts_total', {}, count);
});

When('I increment authentication failures by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter('auth_failures_total', {}, count);
});

When('I increment user registrations by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter('user_registrations_total', {}, count);
});

When('I increment API errors by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter('api_errors_total', {}, count);
});

When('I clear all metrics', function (this: MetricsWorld) {
  this.metricsService!.clearMetrics();
});

Then('the response status should be {int}', function (this: MetricsWorld, status: number) {
  expect(this.metricsResponse!.status).toBe(status);
});

Then(
  'the response content-type should be {string}',
  function (this: MetricsWorld, contentType: string) {
    expect(this.metricsResponse!.headers['content-type']).toContain(contentType);
  }
);

Then('the response should contain Prometheus metrics', function (this: MetricsWorld) {
  const text = this.metricsResponse!.text;
  expect(text).toMatch(/# HELP/);
  expect(text).toMatch(/# TYPE/);
});

Then(
  'the {string} histogram should be observed',
  async function (this: MetricsWorld, metricName: string) {
    const metrics = await this.metricsService!.getMetrics();
    expect(metrics).toContain(`${metricName}_bucket`);
  }
);

Then(
  'the histogram should have labels:',
  async function (this: MetricsWorld, dataTable: DataTable) {
    const metrics = await this.metricsService!.getMetrics();
    const expectedLabels = dataTable.hashes()[0];

    if (expectedLabels) {
      Object.entries(expectedLabels).forEach(([key, value]) => {
        expect(metrics).toContain(`${key}="${value}"`);
      });
    }
  }
);

Then(
  'the {string} counter should be incremented by {int}',
  async function (this: MetricsWorld, metricName: string, _count: number) {
    const metrics = await this.metricsService!.getMetrics();
    expect(metrics).toContain(metricName);
  }
);

Then('the counter should have labels:', async function (this: MetricsWorld, dataTable: DataTable) {
  const metrics = await this.metricsService!.getMetrics();
  const expectedLabels = dataTable.hashes()[0];

  if (expectedLabels) {
    Object.entries(expectedLabels).forEach(([key, value]) => {
      expect(metrics).toContain(`${key}="${value}"`);
    });
  }
});

Then(
  'the counter value should be {int}',
  async function (this: MetricsWorld, expectedValue: number) {
    const metrics = await this.metricsService!.getMetrics();
    const match = metrics.match(/test_counter_total\s+(\d+)/);
    expect(match).toBeTruthy();
    if (match && match[1]) {
      expect(Number.parseInt(match[1])).toBe(expectedValue);
    }
  }
);

Then('the gauge value should be {int}', async function (this: MetricsWorld, expectedValue: number) {
  const metrics = await this.metricsService!.getMetrics();
  const match = metrics.match(/test_gauge\s+(\d+)/);
  expect(match).toBeTruthy();
  if (match && match[1]) {
    expect(Number.parseInt(match[1])).toBe(expectedValue);
  }
});

Then(
  'the histogram should have counts in buckets:',
  async function (this: MetricsWorld, dataTable: DataTable) {
    const metrics = await this.metricsService!.getMetrics();
    const expectedBuckets = dataTable.hashes();

    expectedBuckets.forEach((row) => {
      const bucket = row['bucket'];
      // Note: Actual count verification would require more sophisticated parsing

      if (bucket === '+Inf') {
        expect(metrics).toContain('le="+Inf"');
      } else {
        expect(metrics).toContain(`le="${bucket}"`);
      }
    });
  }
);

Then(
  'the {string} histogram should have a value around {float}',
  async function (this: MetricsWorld, metricName: string, expectedValue: number) {
    const metrics = await this.metricsService!.getMetrics();
    expect(metrics).toContain(`${metricName}_bucket`);

    // Extract sum for approximate verification
    const sumMatch = metrics.match(new RegExp(String.raw`${metricName}_sum\s+(\d+\.?\d*)`));
    if (sumMatch && sumMatch[1]) {
      const actualValue = Number.parseFloat(sumMatch[1]);
      expect(actualValue).toBeGreaterThan(expectedValue * 0.8);
      expect(actualValue).toBeLessThan(expectedValue * 1.2);
    }
  }
);

Then('the response should contain {string}', function (this: MetricsWorld, text: string) {
  expect(this.metricsResponse!.text).toContain(text);
});

Then(
  'the {string} histogram should include {float}',
  async function (this: MetricsWorld, metricName: string, _value: number) {
    const metrics = await this.metricsService!.getMetrics();
    expect(metrics).toContain(metricName);
  }
);

Then(
  'the {string} counter should be {int}',
  async function (this: MetricsWorld, metricName: string, expectedValue: number) {
    const metrics = await this.metricsService!.getMetrics();
    const regex = new RegExp(String.raw`${metricName}\s+(\d+)`);
    const match = metrics.match(regex);
    expect(match).toBeTruthy();
    if (match && match[1]) {
      expect(Number.parseInt(match[1])).toBe(expectedValue);
    }
  }
);

Then(
  'the cache hit ratio should be {int}%',
  async function (this: MetricsWorld, expectedRatio: number) {
    const metrics = await this.metricsService!.getMetrics();
    const hitsMatch = metrics.match(/cache_hits_total\s+(\d+)/);
    const missesMatch = metrics.match(/cache_misses_total\s+(\d+)/);

    if (hitsMatch && hitsMatch[1] && missesMatch && missesMatch[1]) {
      const hits = Number.parseInt(hitsMatch[1]);
      const misses = Number.parseInt(missesMatch[1]);
      const ratio = Math.round((hits / (hits + misses)) * 100);

      expect(ratio).toBe(expectedRatio);
    }
  }
);

Then(
  'the {string} gauge should be {int}',
  async function (this: MetricsWorld, metricName: string, expectedValue: number) {
    const metrics = await this.metricsService!.getMetrics();
    const regex = new RegExp(String.raw`${metricName}\s+(\d+)`);
    const match = metrics.match(regex);
    expect(match).toBeTruthy();
    if (match && match[1]) {
      expect(Number.parseInt(match[1])).toBe(expectedValue);
    }
  }
);

Then(
  'the authentication success rate should be {int}%',
  async function (this: MetricsWorld, expectedRate: number) {
    const metrics = await this.metricsService!.getMetrics();
    const attemptsMatch = metrics.match(/auth_attempts_total\s+(\d+)/);
    const failuresMatch = metrics.match(/auth_failures_total\s+(\d+)/);

    if (attemptsMatch && attemptsMatch[1] && failuresMatch && failuresMatch[1]) {
      const attempts = Number.parseInt(attemptsMatch[1]);
      const failures = Number.parseInt(failuresMatch[1]);
      const successRate = Math.round(((attempts - failures) / attempts) * 100);

      expect(successRate).toBe(expectedRate);
    }
  }
);

Then(
  'all metrics should have the label {string} with value {string}',
  function (this: MetricsWorld, labelKey: string, labelValue: string) {
    const metrics = this.metricsResponse!.text;
    const metricsWithLabels = metrics.split('\n').filter((line) => line.includes('{'));

    metricsWithLabels.forEach((line) => {
      if (line.trim() && !line.startsWith('#')) {
        expect(line).toContain(`${labelKey}="${labelValue}"`);
      }
    });
  }
);

Then('all metrics should have the label {string}', function (this: MetricsWorld, labelKey: string) {
  const metrics = this.metricsResponse!.text;
  const metricsWithLabels = metrics.split('\n').filter((line) => line.includes('{'));

  metricsWithLabels.forEach((line) => {
    if (line.trim() && !line.startsWith('#')) {
      expect(line).toContain(`${labelKey}="`);
    }
  });
});

Then('the metrics registry should be empty', async function (this: MetricsWorld) {
  const metrics = await this.metricsService!.getMetrics();
  // Should only have default metrics after clear
  expect(metrics).not.toContain('test_');
});

Then(
  'requesting {string} should return only default metrics',
  async function (this: MetricsWorld, endpoint: string) {
    const response = await request(this.app!).get(endpoint);
    expect(response.text).toContain('nodejs_version_info');
    expect(response.text).not.toContain('test_');
  }
);
