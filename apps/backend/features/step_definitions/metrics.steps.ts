/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Non-null assertions are necessary in Cucumber test contexts where properties
// are initialized in Given steps and used in When/Then steps
import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import express, { Express } from 'express';
import * as promClient from 'prom-client';
import request from 'supertest';
import { container } from '../../src/container-test';
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

const requireDefined = <T>(value: T | null | undefined, message: string): T => {
  if (value == null) {
    throw new Error(message);
  }
  return value;
};

const requireMetricsApp = (world: MetricsWorld): Express =>
  requireDefined(world.metricsApp, 'Metrics app is not initialized');

const requireMetricsService = (world: MetricsWorld): IMetricsService =>
  requireDefined(world.metricsService, 'Metrics service is not initialized');

const requireMetricsResponse = (world: MetricsWorld): request.Response =>
  requireDefined(
    world.metricsResponse,
    'Metrics response is not set (did you request the /metrics endpoint?)'
  );

const requireTimerEndFunction = (world: MetricsWorld): (() => void) =>
  requireDefined(world.timerEndFunction, 'Timer was not started');

const escapeRegex = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

Given('the metrics service is initialized', function (this: MetricsWorld) {
  // Create Express app with metrics
  this.metricsApp = express();
  this.metricsApp.use(metricsMiddleware);
  this.metricsApp.use('/metrics', metricsRouter);

  // Add test routes
  this.metricsApp.get('/api/users', (_req, res) => res.json({ users: [] }));
  this.metricsApp.post('/api/users', (_req, res) => res.status(201).json({ id: '123' }));

  // Get metrics service from DI container
  const metricsService = container.resolve<IMetricsService>('MetricsService');
  this.metricsService = metricsService;
  metricsService.resetMetrics();
  metricsService.registerDefaultMetrics();

  // Register test metrics used in BDD scenarios
  metricsService.registerCounter('test_counter_1', 'Test counter 1');
  metricsService.registerCounter('test_counter_total', 'Test counter total');
  metricsService.registerCounter('test_counter', 'Test counter');
  metricsService.registerGauge('test_gauge_1', 'Test gauge 1');
  metricsService.registerGauge('test_gauge', 'Test gauge');
  metricsService.registerHistogram('test_histogram_1', 'Test histogram 1');
  metricsService.registerHistogram('test_histogram', 'Test histogram');
  metricsService.registerSummary('test_summary', 'Test summary');
});

Given('the metrics middleware is active', function (this: MetricsWorld) {
  requireMetricsApp(this);
});

Given('default metrics are registered', function (this: MetricsWorld) {
  const metricsService = requireMetricsService(this);
  metricsService.registerDefaultMetrics();
});

Given('I have created several metrics', function (this: MetricsWorld) {
  const metricsService = requireMetricsService(this);
  metricsService.incrementCounter('test_counter_1', {}, 1);
  metricsService.setGauge('test_gauge_1', 10, {});
  metricsService.observeHistogram('test_histogram_1', 0.5, {});
});

When('I request the {string} endpoint', async function (this: MetricsWorld, endpoint: string) {
  const app = requireMetricsApp(this);
  this.metricsResponse = await request(app).get(endpoint);
});

When('I make a GET request to {string}', async function (this: MetricsWorld, path: string) {
  const app = requireMetricsApp(this);
  await request(app).get(path);
});

When(
  'I make {int} GET requests to {string}',
  async function (this: MetricsWorld, count: number, path: string) {
    const app = requireMetricsApp(this);
    for (let i = 0; i < count; i++) {
      await request(app).get(path);
    }
  }
);

When('I create a counter named {string}', function (this: MetricsWorld, name: string) {
  this.currentCounterName = name;
  const metricsService = requireMetricsService(this);
  // If the counter already exists (e.g. from pre-registered metrics), ignore.
  try {
    metricsService.registerCounter(name, `Test counter ${name}`);
  } catch {
    // ignore
  }
});

When('I increment the counter by {int}', function (this: MetricsWorld, value: number) {
  const metricsService = requireMetricsService(this);
  const counterName = this.currentCounterName || 'test_counter_total';
  metricsService.incrementCounter(counterName, undefined, value);
});

When('I create a gauge named {string}', function (this: MetricsWorld, name: string) {
  this.currentGaugeName = name;
  const metricsService = requireMetricsService(this);
  try {
    metricsService.registerGauge(name, `Test gauge ${name}`);
  } catch {
    // Metric may already exist (pre-registered business metrics), ignore.
  }
  metricsService.setGauge(name, 0, {}); // Initialize
});

When('I set the gauge to {int}', function (this: MetricsWorld, value: number) {
  const metricsService = requireMetricsService(this);
  const gaugeName = this.currentGaugeName || 'test_gauge';
  metricsService.setGauge(gaugeName, value, {});
});

When('I increment the gauge by {int}', async function (this: MetricsWorld, value: number) {
  const metricsService = requireMetricsService(this);
  const gaugeName = this.currentGaugeName || 'test_gauge';
  // For testing, we'll just add to the current value
  const currentMetrics = await metricsService.getMetrics();
  const regex = new RegExp(String.raw`${escapeRegex(gaugeName)}(?:\{[^}]*\})?\s+(\d+(?:\.\d+)?)`);
  const match = regex.exec(currentMetrics);
  const current = match?.[1] ? Number.parseInt(match[1], 10) : 0;
  metricsService.setGauge(gaugeName, current + value, {});
});

When('I decrement the gauge by {int}', async function (this: MetricsWorld, value: number) {
  const metricsService = requireMetricsService(this);
  const gaugeName = this.currentGaugeName || 'test_gauge';
  const currentMetrics = await metricsService.getMetrics();
  const regex = new RegExp(String.raw`${escapeRegex(gaugeName)}(?:\{[^}]*\})?\s+(\d+(?:\.\d+)?)`);
  const match = regex.exec(currentMetrics);
  const current = match?.[1] ? Number.parseInt(match[1], 10) : 0;
  metricsService.setGauge(gaugeName, current - value, {});
});

When(
  'I create a histogram named {string} with buckets {string}',
  function (this: MetricsWorld, name: string, bucketsStr: string) {
    this.currentHistogramName = name;
    const metricsService = requireMetricsService(this);
    let buckets: number[] | undefined;

    try {
      const parsed = JSON.parse(bucketsStr) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((v) => typeof v === 'number' && Number.isFinite(v))
      ) {
        buckets = parsed;
      }
    } catch {
      // Fall through to error below.
    }

    if (!buckets || buckets.length === 0) {
      throw new TypeError(
        `Invalid buckets string: '${bucketsStr}'. Expected JSON array of numbers.`
      );
    }

    try {
      metricsService.registerHistogram(name, `Test histogram ${name}`, [], buckets);
    } catch {
      // Metric may already exist (pre-registered business metrics), ignore.
    }
  }
);

When('I observe the following values:', function (this: MetricsWorld, dataTable: DataTable) {
  const metricsService = requireMetricsService(this);
  const histogramName = this.currentHistogramName || 'test_histogram';
  const values = dataTable.hashes().map((row) => Number.parseFloat(row['value'] || '0'));
  values.forEach((value) => {
    metricsService.observeHistogram(histogramName, value, {});
  });
});

When('I start a timer for operation {string}', function (this: MetricsWorld, operation: string) {
  const metricsService = requireMetricsService(this);
  // Map operation name to actual metric name in MetricsService
  let histogramName: string;
  if (operation === 'db_query') {
    histogramName = 'db_query_duration_seconds';
  } else {
    histogramName = `${operation}_duration_seconds`;
  }

  // Register histogram before starting timer if it doesn't exist
  try {
    metricsService.registerHistogram(histogramName, `Duration of ${operation} operation`, [
      'operation',
      'table',
    ]);
  } catch {
    // Histogram may already be registered, ignore error
  }
  this.timerEndFunction = metricsService.startTimer(histogramName, {
    operation: 'SELECT',
    table: 'users',
  });
});

When('I wait for {int} milliseconds', async function (this: MetricsWorld, ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
});

When('I end the timer', function (this: MetricsWorld) {
  const end = requireTimerEndFunction(this);
  end();
});

When(
  'I observe a database query duration of {float} seconds',
  function (this: MetricsWorld, duration: number) {
    const metricsService = requireMetricsService(this);
    metricsService.observeHistogram('db_query_duration_seconds', duration, {
      operation: 'SELECT',
      table: 'users',
    });
  }
);

When('I increment the database queries counter', function (this: MetricsWorld) {
  const metricsService = requireMetricsService(this);
  metricsService.incrementCounter(
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
    const metricsService = requireMetricsService(this);
    metricsService.incrementCounter('cache_hits_total', { cache_name: 'redis' }, count);
  }
);

When(
  'I increment the cache misses counter {int} times',
  function (this: MetricsWorld, count: number) {
    const metricsService = requireMetricsService(this);
    metricsService.incrementCounter('cache_misses_total', { cache_name: 'redis' }, count);
  }
);

When('I set active jobs to {int}', function (this: MetricsWorld, value: number) {
  const metricsService = requireMetricsService(this);
  metricsService.setGauge('queue_jobs_active', value, { queue_name: 'default' });
});

When('I set waiting jobs to {int}', function (this: MetricsWorld, value: number) {
  const metricsService = requireMetricsService(this);
  metricsService.setGauge('queue_jobs_waiting', value, { queue_name: 'default' });
});

When('I increment completed jobs by {int}', function (this: MetricsWorld, count: number) {
  const metricsService = requireMetricsService(this);
  metricsService.incrementCounter(
    'queue_jobs_completed_total',
    {
      queue_name: 'default',
      status: 'success',
    },
    count
  );
});

When('I set active WebSocket connections to {int}', function (this: MetricsWorld, value: number) {
  const metricsService = requireMetricsService(this);
  metricsService.setGauge('websocket_connections_active', value, {});
});

When(
  'I increment WebSocket messages counter by {int}',
  function (this: MetricsWorld, count: number) {
    const metricsService = requireMetricsService(this);
    metricsService.incrementCounter(
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
  const metricsService = requireMetricsService(this);
  metricsService.incrementCounter(
    'auth_attempts_total',
    {
      method: 'local',
      status: 'success',
    },
    count
  );
});

When('I increment authentication failures by {int}', function (this: MetricsWorld, count: number) {
  const metricsService = requireMetricsService(this);
  metricsService.incrementCounter(
    'auth_failures_total',
    {
      method: 'local',
      reason: 'invalid_credentials',
    },
    count
  );
});

When('I increment user registrations by {int}', function (this: MetricsWorld, count: number) {
  const metricsService = requireMetricsService(this);
  metricsService.incrementCounter('user_registrations_total', { source: 'web' }, count);
});

When('I increment API errors by {int}', function (this: MetricsWorld, count: number) {
  const metricsService = requireMetricsService(this);
  metricsService.incrementCounter(
    'api_errors_total',
    {
      route: '/api/test',
      error_type: 'validation',
    },
    count
  );
});

When('I clear all metrics', function (this: MetricsWorld) {
  if (this.metricsService && 'stopDefaultMetricsCollection' in this.metricsService) {
    (
      this.metricsService as unknown as {
        stopDefaultMetricsCollection: () => void;
      }
    ).stopDefaultMetricsCollection();
  }

  // Swap in a fresh isolated registry/service. This removes any previously-registered
  // `test_*` metrics while keeping default/business metrics available.
  const registry = new promClient.Registry();
  const metricsService = new MetricsService(registry);
  container.registerInstance('PrometheusRegistry', registry);
  container.registerInstance('MetricsService', metricsService);
  this.metricsService = metricsService;
});

Then('the metrics response status should be {int}', function (this: MetricsWorld, status: number) {
  const metricsResponse = requireMetricsResponse(this);
  expect(metricsResponse.status).toBe(status);
});

Then(
  'the metrics response content-type should be {string}',
  function (this: MetricsWorld, contentType: string) {
    const metricsResponse = requireMetricsResponse(this);
    const actual = metricsResponse.headers['content-type'] as string;
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
  const metricsResponse = requireMetricsResponse(this);
  const text = metricsResponse.text;
  expect(text).toMatch(/# HELP/);
  expect(text).toMatch(/# TYPE/);
});

Then(
  'the {string} histogram should be observed',
  async function (this: MetricsWorld, metricName: string) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    expect(metrics).toContain(`${metricName}_bucket`);
  }
);

Then(
  'the histogram should have labels:',
  async function (this: MetricsWorld, dataTable: DataTable) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
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
  async function (this: MetricsWorld, metricName: string, expectedIncrement: number) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();

    const sampleLineRegex = new RegExp(
      String.raw`^${escapeRegex(metricName)}(?:\{[^}]*\})?\s+(-?\d+(?:\.\d+)?)\s*$`
    );

    const values = metrics
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith(`${metricName} `) || line.startsWith(`${metricName}{`))
      .map((line) => {
        const match = sampleLineRegex.exec(line);
        if (!match?.[1]) {
          return undefined;
        }
        const value = Number.parseFloat(match[1]);
        return Number.isFinite(value) ? value : undefined;
      })
      .filter((value): value is number => typeof value === 'number');

    if (values.length === 0) {
      const metricNamePresentSomewhere = metrics.includes(metricName);
      const hint = metricNamePresentSomewhere
        ? `Metric name '${metricName}' was found, but no valid sample lines matched.`
        : `Metric name '${metricName}' was not found in the metrics output.`;

      throw new Error(`${hint} Expected counter to be incremented by ${expectedIncrement}.`);
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    expect(total).toBe(expectedIncrement);
  }
);

Then('the counter should have labels:', async function (this: MetricsWorld, dataTable: DataTable) {
  const metricsService = requireMetricsService(this);
  const metrics = await metricsService.getMetrics();
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
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    const counterName = this.currentCounterName || 'test_counter_total';
    const regex = new RegExp(String.raw`${escapeRegex(counterName)}(?:\{[^}]*\})?\s+(\d+)`);
    const match = regex.exec(metrics);
    if (!match?.[1]) {
      throw new Error(`Counter sample not found for '${counterName}'`);
    }
    expect(Number.parseInt(match[1], 10)).toBe(expectedValue);
  }
);

Then('the gauge value should be {int}', async function (this: MetricsWorld, expectedValue: number) {
  const gaugeName = this.currentGaugeName || 'test_gauge';
  const metricsService = requireMetricsService(this);
  const metrics = await metricsService.getMetrics();
  const regex = new RegExp(String.raw`${escapeRegex(gaugeName)}(?:\{[^}]*\})?\s+(\d+)`);
  const match = regex.exec(metrics);
  if (!match?.[1]) {
    throw new Error(`Gauge sample not found for '${gaugeName}'`);
  }
  expect(Number.parseInt(match[1], 10)).toBe(expectedValue);
});

Then(
  'the histogram should have counts in buckets:',
  async function (this: MetricsWorld, dataTable: DataTable) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    const expectedBuckets = dataTable.hashes();

    const histogramName = this.currentHistogramName || 'test_histogram_seconds';

    const bucketLineRegex = new RegExp(
      String.raw`^${escapeRegex(histogramName)}_bucket\{([^}]*)\}\s+(\d+(?:\.\d+)?)\s*$`
    );

    const bucketCounts = new Map<string, number>();

    metrics
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith(`${histogramName}_bucket{`))
      .forEach((line) => {
        const match = bucketLineRegex.exec(line);
        if (!match?.[1] || !match[2]) {
          return;
        }

        const labelsPart = match[1];
        const count = Number.parseFloat(match[2]);
        const leMatch = /\ble="([^"]+)"/.exec(labelsPart);

        if (leMatch?.[1] && Number.isFinite(count)) {
          bucketCounts.set(leMatch[1], count);
        }
      });

    const resolveBucketKey = (bucket: string): string | undefined => {
      if (bucketCounts.has(bucket)) {
        return bucket;
      }
      if (bucket === '+Inf') {
        return undefined;
      }

      const desired = Number.parseFloat(bucket);
      if (!Number.isFinite(desired)) {
        return undefined;
      }

      for (const key of bucketCounts.keys()) {
        if (key === '+Inf') {
          continue;
        }
        const keyNum = Number.parseFloat(key);
        if (Number.isFinite(keyNum) && Math.abs(keyNum - desired) < 1e-12) {
          return key;
        }
      }

      return undefined;
    };

    expectedBuckets.forEach((row) => {
      const bucket = row['bucket'];
      const expectedCount = Number.parseFloat(row['count'] || 'NaN');
      if (!bucket) {
        throw new TypeError('Bucket value missing in table');
      }
      if (!Number.isFinite(expectedCount)) {
        throw new TypeError(`Invalid expected count for bucket '${bucket}'`);
      }

      const resolvedKey = resolveBucketKey(bucket);
      if (!resolvedKey) {
        throw new Error(
          `Bucket line not found for ${histogramName} le=${bucket}. Found: ${Array.from(bucketCounts.keys()).join(', ')}`
        );
      }

      const actualCount = bucketCounts.get(resolvedKey);
      if (typeof actualCount !== 'number') {
        throw new TypeError(`Bucket count not found for ${histogramName} le=${bucket}`);
      }
      expect(actualCount).toBe(expectedCount);
    });
  }
);

Then(
  'the {string} histogram should have a value around {float}',
  async function (this: MetricsWorld, metricName: string, expectedValue: number) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    expect(metrics).toContain(`${metricName}_bucket`);

    // Extract sum for approximate verification
    const regex = new RegExp(
      String.raw`${escapeRegex(metricName)}_sum(?:\{[^}]*\})?\s+(\d+\.?\d*)`
    );
    const sumMatch = regex.exec(metrics);
    if (!sumMatch?.[1]) {
      throw new Error(`Histogram sum line not found for '${metricName}_sum'`);
    }

    const actualValue = Number.parseFloat(sumMatch[1]);
    expect(Number.isFinite(actualValue)).toBe(true);
    expect(actualValue).toBeGreaterThan(expectedValue * 0.8);
    expect(actualValue).toBeLessThan(expectedValue * 1.2);
  }
);

Then('the response should contain {string}', function (this: MetricsWorld, text: string) {
  const metricsResponse = requireMetricsResponse(this);
  expect(metricsResponse.text).toContain(text);
});

Then(
  'the {string} histogram should include {float}',
  async function (this: MetricsWorld, metricName: string, expectedValue: number) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();

    const safeMetricName = escapeRegex(metricName);
    const numberPattern = String.raw`[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?`;

    const sumLineRegex = new RegExp(
      String.raw`^${safeMetricName}_sum(?:\{[^}]*\})?\s+(${numberPattern})\s*$`,
      'gm'
    );
    const countLineRegex = new RegExp(
      String.raw`^${safeMetricName}_count(?:\{[^}]*\})?\s+(${numberPattern})\s*$`,
      'gm'
    );

    const sums = Array.from(metrics.matchAll(sumLineRegex))
      .map((m) => Number.parseFloat(m[1] ?? 'NaN'))
      .filter((v) => Number.isFinite(v));
    const counts = Array.from(metrics.matchAll(countLineRegex))
      .map((m) => Number.parseFloat(m[1] ?? 'NaN'))
      .filter((v) => Number.isFinite(v));

    expect(sums.length).toBeGreaterThan(0);
    expect(counts.length).toBeGreaterThan(0);

    const maxSum = Math.max(...sums);
    const maxCount = Math.max(...counts);

    expect(maxCount).toBeGreaterThan(0);
    expect(maxSum).toBeGreaterThanOrEqual(expectedValue);
  }
);

Then(
  'the {string} counter should be {int}',
  async function (this: MetricsWorld, metricName: string, expectedValue: number) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    const regex = new RegExp(String.raw`${escapeRegex(metricName)}(?:\{[^}]*\})?\s+(\d+)`);
    const match = regex.exec(metrics);
    if (!match?.[1]) {
      throw new Error(`Counter sample not found for '${metricName}'`);
    }
    expect(Number.parseInt(match[1], 10)).toBe(expectedValue);
  }
);

Then(
  'the cache hit ratio should be {int}%',
  async function (this: MetricsWorld, expectedRatio: number) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    const hitsRegex = /cache_hits_total\{[^}]*cache_name="redis"[^}]*\}\s+(\d+)/;
    const missesRegex = /cache_misses_total\{[^}]*cache_name="redis"[^}]*\}\s+(\d+)/;
    const hitsMatch = hitsRegex.exec(metrics);
    const missesMatch = missesRegex.exec(metrics);

    if (!hitsMatch?.[1]) {
      throw new Error('cache_hits_total sample not found for cache_name="redis"');
    }
    if (!missesMatch?.[1]) {
      throw new Error('cache_misses_total sample not found for cache_name="redis"');
    }

    const hits = Number.parseInt(hitsMatch[1], 10);
    const misses = Number.parseInt(missesMatch[1], 10);
    const total = hits + misses;
    const ratio = total === 0 ? 0 : Math.round((hits / total) * 100);

    expect(ratio).toBe(expectedRatio);
  }
);

Then(
  'the {string} gauge should be {int}',
  async function (this: MetricsWorld, metricName: string, expectedValue: number) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    const regex = new RegExp(String.raw`${escapeRegex(metricName)}(?:\{[^}]*\})?\s+(\d+)`);
    const match = regex.exec(metrics);
    if (!match?.[1]) {
      throw new Error(`Gauge sample not found for '${metricName}'`);
    }
    expect(Number.parseInt(match[1], 10)).toBe(expectedValue);
  }
);

Then(
  'the authentication success rate should be {int}%',
  async function (this: MetricsWorld, expectedRate: number) {
    const metricsService = requireMetricsService(this);
    const metrics = await metricsService.getMetrics();
    const attemptsRegex =
      /auth_attempts_total\{[^}]*method="local"[^}]*status="success"[^}]*\}\s+(\d+)/;
    const failuresRegex =
      /auth_failures_total\{[^}]*method="local"[^}]*reason="invalid_credentials"[^}]*\}\s+(\d+)/;
    const attemptsMatch = attemptsRegex.exec(metrics);
    const failuresMatch = failuresRegex.exec(metrics);

    if (!attemptsMatch?.[1]) {
      throw new Error('auth_attempts_total sample not found for method="local" status="success"');
    }
    if (!failuresMatch?.[1]) {
      throw new Error(
        'auth_failures_total sample not found for method="local" reason="invalid_credentials"'
      );
    }

    const attempts = Number.parseInt(attemptsMatch[1], 10);
    const failures = Number.parseInt(failuresMatch[1], 10);
    const successRate = attempts === 0 ? 0 : Math.round(((attempts - failures) / attempts) * 100);

    expect(successRate).toBe(expectedRate);
  }
);

Then(
  'all metrics should have the label {string} with value {string}',
  function (this: MetricsWorld, labelKey: string, labelValue: string) {
    const metricsResponse = requireMetricsResponse(this);
    const metrics = metricsResponse.text;
    const metricsWithLabels = metrics.split('\n').filter((line) => line.includes('{'));

    metricsWithLabels.forEach((line) => {
      if (line.trim() && !line.startsWith('#')) {
        expect(line).toContain(`${labelKey}="${labelValue}"`);
      }
    });
  }
);

Then('all metrics should have the label {string}', function (this: MetricsWorld, labelKey: string) {
  const metricsResponse = requireMetricsResponse(this);
  const metrics = metricsResponse.text;
  const metricsWithLabels = metrics.split('\n').filter((line) => line.includes('{'));

  metricsWithLabels.forEach((line) => {
    if (line.trim() && !line.startsWith('#')) {
      expect(line).toContain(`${labelKey}="`);
    }
  });
});

Then('the metrics registry should be empty', async function (this: MetricsWorld) {
  const metricsService = requireMetricsService(this);
  const metrics = await metricsService.getMetrics();
  // `resetMetrics()` preserves metric definitions but resets values to zero.
  // Verify any `test_` metrics present have value 0 (no non-zero leftovers).
  // The optional `{...}` group accounts for default labels (app, app_version) on each sample.
  const metricRegex = /test_[\w:]+(?:\{[^}]*\})?\s+(\d+(?:\.\d+)?)/g;
  const matches = Array.from(metrics.matchAll(metricRegex));
  matches.forEach((m) => {
    const val = Number.parseFloat(m[1] ?? '0');
    expect(val).toBe(0);
  });
});

Then(
  'requesting {string} should return only default metrics',
  async function (this: MetricsWorld, endpoint: string) {
    const app = requireMetricsApp(this);
    const response = await request(app).get(endpoint);
    expect(response.text).toContain('nodejs_version_info');
    expect(response.text).not.toContain('test_');
  }
);
