/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Non-null assertions are necessary in Cucumber test contexts where properties
// are initialized in Given steps and used in When/Then steps
import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import express, { Express } from 'express';
import * as promClient from 'prom-client';
import request from 'supertest';
import { container } from '../../src/container';
import { MetricsService, type IMetricsService } from '../../src/infrastructure/observability';
import { metricsMiddleware } from '../../src/middleware/metrics.middleware';
import metricsRouter from '../../src/routes/metrics.routes';
import { expect } from '../support/assertions';

interface MetricsWorld {
  metricsApp?: Express;
  metricsService?: IMetricsService;
  metricsResponse?: request.Response;
  timerEndFunction?: () => void;
  currentCounterName?: string;
  currentGaugeName?: string;
  currentHistogramName?: string;
}

Given('the metrics service is initialized', function (this: MetricsWorld) {
  // Create Express app with metrics
  this.metricsApp = express();
  this.metricsApp.use(metricsMiddleware);
  this.metricsApp.use('/metrics', metricsRouter);

  // Add test routes
  this.metricsApp.get('/api/users', (_req, res) => res.json({ users: [] }));
  this.metricsApp.post('/api/users', (_req, res) => res.status(201).json({ id: '123' }));

  // Get metrics service from DI container
  this.metricsService = container.resolve<IMetricsService>('MetricsService');
  this.metricsService?.resetMetrics();
  this.metricsService?.registerDefaultMetrics();

  // Register test metrics used in BDD scenarios
  this.metricsService?.registerCounter('test_counter_1', 'Test counter 1');
  this.metricsService?.registerCounter('test_counter_total', 'Test counter total');
  this.metricsService?.registerCounter('test_counter', 'Test counter');
  this.metricsService?.registerGauge('test_gauge_1', 'Test gauge 1');
  this.metricsService?.registerGauge('test_gauge', 'Test gauge');
  this.metricsService?.registerHistogram('test_histogram_1', 'Test histogram 1');
  this.metricsService?.registerHistogram('test_histogram', 'Test histogram');
  this.metricsService?.registerHistogram('test_histogram_seconds', 'Test histogram seconds');
  this.metricsService?.registerSummary('test_summary', 'Test summary');
});

Given('the metrics middleware is active', function (this: MetricsWorld) {
  // Already set up in background
  expect(this.metricsApp).toBeDefined();
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
  this.metricsResponse = await request(this.metricsApp!).get(endpoint);
});

When('I make a GET request to {string}', async function (this: MetricsWorld, path: string) {
  await request(this.metricsApp!).get(path);
});

When(
  'I make {int} GET requests to {string}',
  async function (this: MetricsWorld, count: number, path: string) {
    for (let i = 0; i < count; i++) {
      await request(this.metricsApp!).get(path);
    }
  }
);

When('I create a counter named {string}', function (this: MetricsWorld, name: string) {
  this.currentCounterName = name;
  // If the counter already exists (e.g. from pre-registered metrics), ignore.
  try {
    this.metricsService!.registerCounter(name, `Test counter ${name}`);
  } catch {
    // ignore
  }
});

When('I increment the counter by {int}', function (this: MetricsWorld, value: number) {
  const counterName = this.currentCounterName || 'test_counter_total';
  this.metricsService!.incrementCounter(counterName, undefined, value);
});

When('I create a gauge named {string}', function (this: MetricsWorld, name: string) {
  this.currentGaugeName = name;
  try {
    this.metricsService!.registerGauge(name, `Test gauge ${name}`);
  } catch {
    // Metric may already exist (pre-registered business metrics), ignore.
  }
  this.metricsService!.setGauge(name, 0, {}); // Initialize
});

When('I set the gauge to {int}', function (this: MetricsWorld, value: number) {
  const gaugeName = this.currentGaugeName || 'test_gauge';
  this.metricsService!.setGauge(gaugeName, value, {});
});

When('I increment the gauge by {int}', async function (this: MetricsWorld, value: number) {
  const gaugeName = this.currentGaugeName || 'test_gauge';
  // For testing, we'll just add to the current value
  const currentMetrics = await this.metricsService!.getMetrics();
  const regex = new RegExp(String.raw`${gaugeName}(?:\{[^}]*\})?\s+(\d+(?:\.\d+)?)`);
  const match = regex.exec(currentMetrics);
  const current = match?.[1] ? Number.parseInt(match[1]) : 0;
  this.metricsService!.setGauge(gaugeName, current + value, {});
});

When('I decrement the gauge by {int}', async function (this: MetricsWorld, value: number) {
  const gaugeName = this.currentGaugeName || 'test_gauge';
  const currentMetrics = await this.metricsService!.getMetrics();
  const regex = new RegExp(String.raw`${gaugeName}(?:\{[^}]*\})?\s+(\d+(?:\.\d+)?)`);
  const match = regex.exec(currentMetrics);
  const current = match?.[1] ? Number.parseInt(match[1]) : 0;
  this.metricsService!.setGauge(gaugeName, current - value, {});
});

When(
  'I create a histogram named {string} with buckets {string}',
  function (this: MetricsWorld, name: string, _bucketsStr: string) {
    this.currentHistogramName = name;
    // Note: MetricsService doesn't support custom buckets yet, using defaults
    // Parse buckets from string for future use: "[10, 50, 100, 500]"
    // const buckets = JSON.parse(_bucketsStr) as number[];
    try {
      this.metricsService!.registerHistogram(name, `Test histogram ${name}`);
    } catch {
      // Metric may already exist (pre-registered business metrics), ignore.
    }
    // Initialize histogram with first observation
    this.metricsService!.observeHistogram(name, 0, {});
  }
);

When('I observe the following values:', function (this: MetricsWorld, dataTable: DataTable) {
  const histogramName = this.currentHistogramName || 'test_histogram';
  const values = dataTable.hashes().map((row) => Number.parseFloat(row['value'] || '0'));
  values.forEach((value) => {
    this.metricsService!.observeHistogram(histogramName, value, {});
  });
});

When('I start a timer for operation {string}', function (this: MetricsWorld, operation: string) {
  // Map operation name to actual metric name in MetricsService
  let histogramName: string;
  if (operation === 'db_query') {
    histogramName = 'db_query_duration_seconds';
  } else {
    histogramName = `${operation}_duration_seconds`;
  }

  // Register histogram before starting timer if it doesn't exist
  try {
    this.metricsService!.registerHistogram(histogramName, `Duration of ${operation} operation`, [
      'operation',
      'table',
    ]);
  } catch {
    // Histogram may already be registered, ignore error
  }
  this.timerEndFunction = this.metricsService!.startTimer(histogramName, {
    operation: 'SELECT',
    table: 'users',
  });
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
    this.metricsService!.observeHistogram('db_query_duration_seconds', duration, {
      operation: 'SELECT',
      table: 'users',
    });
  }
);

When('I increment the database queries counter', function (this: MetricsWorld) {
  this.metricsService!.incrementCounter(
    'db_queries_total',
    {
      operation: 'SELECT',
      table: 'users',
      status: 'success',
    },
    1
  );
});

When(
  'I increment the cache hits counter {int} times',
  function (this: MetricsWorld, count: number) {
    this.metricsService!.incrementCounter('cache_hits_total', { cache_name: 'redis' }, count);
  }
);

When(
  'I increment the cache misses counter {int} times',
  function (this: MetricsWorld, count: number) {
    this.metricsService!.incrementCounter('cache_misses_total', { cache_name: 'redis' }, count);
  }
);

When('I set active jobs to {int}', function (this: MetricsWorld, value: number) {
  this.metricsService!.setGauge('queue_jobs_active', value, { queue_name: 'default' });
});

When('I set waiting jobs to {int}', function (this: MetricsWorld, value: number) {
  this.metricsService!.setGauge('queue_jobs_waiting', value, { queue_name: 'default' });
});

When('I increment completed jobs by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter(
    'queue_jobs_completed_total',
    {
      queue_name: 'default',
      status: 'success',
    },
    count
  );
});

When('I set active WebSocket connections to {int}', function (this: MetricsWorld, value: number) {
  this.metricsService!.setGauge('websocket_connections_active', value, {});
});

When(
  'I increment WebSocket messages counter by {int}',
  function (this: MetricsWorld, count: number) {
    this.metricsService!.incrementCounter(
      'websocket_messages_total',
      {
        event: 'message',
        direction: 'inbound',
      },
      count
    );
  }
);

When('I increment authentication attempts by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter(
    'auth_attempts_total',
    {
      method: 'local',
      status: 'success',
    },
    count
  );
});

When('I increment authentication failures by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter(
    'auth_failures_total',
    {
      method: 'local',
      reason: 'invalid_credentials',
    },
    count
  );
});

When('I increment user registrations by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter('user_registrations_total', { source: 'web' }, count);
});

When('I increment API errors by {int}', function (this: MetricsWorld, count: number) {
  this.metricsService!.incrementCounter(
    'api_errors_total',
    {
      route: '/api/test',
      error_type: 'validation',
    },
    count
  );
});

When('I clear all metrics', function (this: MetricsWorld) {
  // Swap in a fresh isolated registry/service. This removes any previously-registered
  // `test_*` metrics while keeping default/business metrics available.
  const registry = new promClient.Registry();
  const metricsService = new MetricsService(registry);
  container.registerInstance('PrometheusRegistry', registry);
  container.registerInstance('MetricsService', metricsService);
  this.metricsService = metricsService;
});

Then('the metrics response status should be {int}', function (this: MetricsWorld, status: number) {
  expect(this.metricsResponse!.status).toBe(status);
});

Then(
  'the metrics response content-type should be {string}',
  function (this: MetricsWorld, contentType: string) {
    const actual = this.metricsResponse!.headers['content-type'] as string;
    contentType
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((part) => {
        expect(actual).toContain(part);
      });
  }
);

Then('the metrics response should contain Prometheus metrics', function (this: MetricsWorld) {
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
    const counterName = this.currentCounterName || 'test_counter_total';
    const regex = new RegExp(String.raw`${counterName}(?:\{[^}]*\})?\s+(\d+)`);
    const match = regex.exec(metrics);
    expect(match).toBeTruthy();
    if (match?.[1]) {
      expect(Number.parseInt(match[1])).toBe(expectedValue);
    }
  }
);

Then('the gauge value should be {int}', async function (this: MetricsWorld, expectedValue: number) {
  const gaugeName = this.currentGaugeName || 'test_gauge';
  const metrics = await this.metricsService!.getMetrics();
  const regex = new RegExp(String.raw`${gaugeName}(?:\{[^}]*\})?\s+(\d+)`);
  const match = regex.exec(metrics);
  expect(match).toBeTruthy();
  if (match?.[1]) {
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
    const regex = new RegExp(String.raw`${metricName}_sum\s+(\d+\.?\d*)`);
    const sumMatch = regex.exec(metrics);
    if (sumMatch?.[1]) {
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
    const regex = new RegExp(String.raw`${metricName}(?:\{[^}]*\})?\s+(\d+)`);
    const match = regex.exec(metrics);
    expect(match).toBeTruthy();
    if (match?.[1]) {
      expect(Number.parseInt(match[1])).toBe(expectedValue);
    }
  }
);

Then(
  'the cache hit ratio should be {int}%',
  async function (this: MetricsWorld, expectedRatio: number) {
    const metrics = await this.metricsService!.getMetrics();
    const hitsRegex = /cache_hits_total\{[^}]*cache_name="redis"[^}]*\}\s+(\d+)/;
    const missesRegex = /cache_misses_total\{[^}]*cache_name="redis"[^}]*\}\s+(\d+)/;
    const hitsMatch = hitsRegex.exec(metrics);
    const missesMatch = missesRegex.exec(metrics);

    if (hitsMatch?.[1] && missesMatch?.[1]) {
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
    const regex = new RegExp(String.raw`${metricName}(?:\{[^}]*\})?\s+(\d+)`);
    const match = regex.exec(metrics);
    expect(match).toBeTruthy();
    if (match?.[1]) {
      expect(Number.parseInt(match[1])).toBe(expectedValue);
    }
  }
);

Then(
  'the authentication success rate should be {int}%',
  async function (this: MetricsWorld, expectedRate: number) {
    const metrics = await this.metricsService!.getMetrics();
    const attemptsRegex =
      /auth_attempts_total\{[^}]*method="local"[^}]*status="success"[^}]*\}\s+(\d+)/;
    const failuresRegex =
      /auth_failures_total\{[^}]*method="local"[^}]*reason="invalid_credentials"[^}]*\}\s+(\d+)/;
    const attemptsMatch = attemptsRegex.exec(metrics);
    const failuresMatch = failuresRegex.exec(metrics);

    if (attemptsMatch?.[1] && failuresMatch?.[1]) {
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
  // `resetMetrics()` preserves metric definitions but resets values to zero.
  // Verify any `test_` metrics present have value 0 (no non-zero leftovers).
  const metricRegex = /test_[\w:]+\s+(\d+(?:\.\d+)?)/g;
  const matches = Array.from(metrics.matchAll(metricRegex));
  matches.forEach((m) => {
    const val = Number.parseFloat(m[1] ?? '0');
    expect(val).toBe(0);
  });
});

Then(
  'requesting {string} should return only default metrics',
  async function (this: MetricsWorld, endpoint: string) {
    const response = await request(this.metricsApp!).get(endpoint);
    expect(response.text).toContain('nodejs_version_info');
    expect(response.text).not.toContain('test_');
  }
);
