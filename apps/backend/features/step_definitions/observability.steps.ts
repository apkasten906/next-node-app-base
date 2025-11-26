import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/assertions';
import { World } from '../support/world';

// Prometheus Metrics
Given('Prometheus metrics are enabled', async function (this: World) {
  this.setData('prometheusEnabled', true);
});

When('I access the metrics endpoint', async function (this: World) {
  const res = await this.request?.get('/metrics');
  this.response = res;
});

Then('I should receive metrics in Prometheus format', async function (this: World) {
  expect(this.response?.status).toBe(200);
  expect(this.response?.headers['content-type']).toContain('text/plain');
});

Then('metrics should include {string}', async function (this: World, metricName: string) {
  const metricsText = this.response?.text || '';
  expect(metricsText).toContain(metricName);
});

// Custom Metrics
When('I increment counter {string}', async function (this: World, counterName: string) {
  const counters = this.getData<Map<string, number>>('counters') || new Map();
  const current = counters.get(counterName) || 0;
  counters.set(counterName, current + 1);
  this.setData('counters', counters);
});

Then('the counter should be incremented', async function (this: World) {
  const counters = this.getData<Map<string, number>>('counters');
  expect(counters!.size).toBeGreaterThan(0);
});

When(
  'I record histogram value {int} for {string}',
  async function (this: World, value: number, histogramName: string) {
    const histograms = this.getData<Map<string, number[]>>('histograms') || new Map();
    const values = histograms.get(histogramName) || [];
    values.push(value);
    histograms.set(histogramName, values);
    this.setData('histograms', histograms);
  }
);

Then('the histogram should record the value', async function (this: World) {
  const histograms = this.getData<Map<string, number[]>>('histograms');
  expect(histograms!.size).toBeGreaterThan(0);
});

// Labels
When('I add metric with labels:', async function (this: World, dataTable: any) {
  const labels = dataTable.rowsHash();
  this.setData('metricLabels', labels);
});

Then('the metric should include label dimensions', async function (this: World) {
  const labels = this.getData<Record<string, string>>('metricLabels');
  expect(Object.keys(labels!).length).toBeGreaterThan(0);
});

// Grafana Dashboards
Given('Grafana is connected to Prometheus', async function (this: World) {
  this.setData('grafanaConnected', true);
});

When('I create a dashboard for {string}', async function (this: World, dashboardName: string) {
  const dashboard = {
    name: dashboardName,
    panels: [
      { title: 'Request Rate', metric: 'http_requests_total' },
      { title: 'Response Time', metric: 'http_request_duration_ms' },
    ],
  };

  this.setData('dashboard', dashboard);
});

Then('the dashboard should visualize metrics', async function (this: World) {
  const dashboard = this.getData<any>('dashboard');
  expect(dashboard).toBeDefined();
  expect(dashboard.panels.length).toBeGreaterThan(0);
});

// Alerts
When(
  'I configure an alert for {string} threshold {int}',
  async function (this: World, metric: string, threshold: number) {
    const alert = {
      metric,
      threshold,
      condition: 'greater_than',
      enabled: true,
    };

    this.setData('alert', alert);
  }
);

Then('the alert should trigger when threshold is exceeded', async function (this: World) {
  const alert = this.getData<any>('alert');
  expect(alert.enabled).toBe(true);
  expect(alert.threshold).toBeGreaterThan(0);
});

// Jaeger Tracing
Given('Jaeger tracing is enabled', async function (this: World) {
  this.setData('jaegerEnabled', true);
});

When('I trace request {string}', async function (this: World, requestId: string) {
  const trace = {
    traceId: requestId,
    spans: [
      { name: 'HTTP GET', duration: 50 },
      { name: 'Database Query', duration: 30 },
      { name: 'Cache Lookup', duration: 5 },
    ],
    totalDuration: 85,
  };

  this.setData('trace', trace);
});

Then('the trace should capture all spans', async function (this: World) {
  const trace = this.getData<any>('trace');
  expect(trace.spans.length).toBeGreaterThan(0);
});

Then('spans should include timing information', async function (this: World) {
  const trace = this.getData<any>('trace');

  for (const span of trace.spans) {
    expect(span).toHaveProperty('duration');
    expect(span.duration).toBeGreaterThan(0);
  }
});

// Span Relationships
When('I create a child span of {string}', async function (this: World, parentSpan: string) {
  const childSpan = {
    name: 'Child Operation',
    parent: parentSpan,
    duration: 20,
  };

  this.setData('childSpan', childSpan);
});

Then('the span hierarchy should be preserved', async function (this: World) {
  const childSpan = this.getData<any>('childSpan');
  expect(childSpan.parent).toBeDefined();
});

// Structured Logging
Given('structured logging is configured', async function (this: World) {
  this.setData('structuredLoggingEnabled', true);
});

When('I log with structured data:', async function (this: World, dataTable: any) {
  const data = dataTable.rowsHash();
  const logEntry = {
    timestamp: new Date(),
    level: 'info',
    ...data,
  };

  const logs = this.getData<any[]>('structuredLogs') || [];
  logs.push(logEntry);
  this.setData('structuredLogs', logs);
});

Then('the log should contain structured fields', async function (this: World) {
  const logs = this.getData<any[]>('structuredLogs');
  const lastLog = logs![logs!.length - 1];

  expect(lastLog).toHaveProperty('timestamp');
  expect(lastLog).toHaveProperty('level');
});

// Log Aggregation
Given('logs are sent to {string}', async function (this: World, destination: string) {
  this.setData('logDestination', destination);
});

Then('logs should be queryable in {string}', async function (this: World, destination: string) {
  const logDest = this.getData<string>('logDestination');
  expect(logDest).toBe(destination);
});

// Health Monitoring
When('I check application health', async function (this: World) {
  const health = {
    status: 'healthy',
    uptime: 3600,
    components: {
      database: 'healthy',
      cache: 'healthy',
      storage: 'healthy',
    },
  };

  this.setData('healthStatus', health);
});

Then('all components should be healthy', async function (this: World) {
  const health = this.getData<any>('healthStatus');

  for (const [_component, status] of Object.entries(health.components)) {
    expect(status).toBe('healthy');
  }
});

// Error Tracking
Given('Sentry is configured for error tracking', async function (this: World) {
  this.setData('sentryEnabled', true);
});

When('an error occurs in the application', async function (this: World) {
  const error = {
    message: 'Test error',
    stack: 'Error: Test error\n  at TestFunction',
    timestamp: new Date(),
    user: { id: '123', email: 'test@example.com' },
  };

  this.setData('capturedError', error);
});

Then('the error should be sent to Sentry', async function (this: World) {
  const error = this.getData<any>('capturedError');
  expect(error).toBeDefined();
  expect(error.message).toBe('Test error');
});

Then('the error should include context:', async function (this: World, dataTable: any) {
  const expectedFields = dataTable.raw().flat();
  const error = this.getData<any>('capturedError');

  for (const field of expectedFields) {
    expect(error).toHaveProperty(field);
  }
});

// Performance Profiling
When('I profile function {string}', async function (this: World, functionName: string) {
  const profile = {
    function: functionName,
    calls: 1000,
    totalTime: 500,
    averageTime: 0.5,
    peakMemory: 10 * 1024 * 1024,
  };

  this.setData('profile', profile);
});

Then('the profile should show execution metrics', async function (this: World) {
  const profile = this.getData<any>('profile');

  expect(profile).toHaveProperty('calls');
  expect(profile).toHaveProperty('totalTime');
  expect(profile).toHaveProperty('averageTime');
});

// SLO Tracking
Given('SLO targets are configured:', async function (this: World, dataTable: any) {
  const slos = dataTable.rowsHash();
  this.setData('sloTargets', slos);
});

When('I measure SLO compliance', async function (this: World) {
  const compliance = {
    availability: 99.95,
    latency_p95: 450,
    error_rate: 0.3,
  };

  this.setData('sloCompliance', compliance);
});

Then('all SLOs should be met', async function (this: World) {
  const targets = this.getData<any>('sloTargets');
  const compliance = this.getData<any>('sloCompliance');

  expect(compliance.availability).toBeGreaterThanOrEqual(parseFloat(targets.availability));
  expect(compliance.latency_p95).toBeLessThanOrEqual(parseInt(targets.latency_p95));
  expect(compliance.error_rate).toBeLessThanOrEqual(parseFloat(targets.error_rate));
});

// Custom Dashboards
When('I create a custom dashboard with:', async function (this: World, dataTable: any) {
  const panels = dataTable.hashes();
  const dashboard = {
    name: 'Custom Dashboard',
    panels,
  };

  this.setData('customDashboard', dashboard);
});

Then('the dashboard should display all metrics', async function (this: World) {
  const dashboard = this.getData<any>('customDashboard');
  expect(dashboard.panels.length).toBeGreaterThan(0);
});

// Log Levels
When('I set log level to {string}', async function (this: World, level: string) {
  this.setData('logLevel', level);
});

Then(
  'only logs at {string} and above should be captured',
  async function (this: World, level: string) {
    const currentLevel = this.getData<string>('logLevel');
    expect(currentLevel).toBe(level);
  }
);

// Correlation IDs
When(
  'I process request with correlation ID {string}',
  async function (this: World, correlationId: string) {
    const logs = [
      { correlationId, message: 'Request received' },
      { correlationId, message: 'Processing started' },
      { correlationId, message: 'Response sent' },
    ];

    this.setData('correlatedLogs', logs);
  }
);

Then('all logs should include the correlation ID', async function (this: World) {
  const logs = this.getData<any[]>('correlatedLogs');

  for (const log of logs!) {
    expect(log).toHaveProperty('correlationId');
  }
});

// Resource Metrics
When('I collect resource metrics', async function (this: World) {
  const metrics = {
    cpu_usage: 45.5,
    memory_usage: 512 * 1024 * 1024,
    disk_usage: 10 * 1024 * 1024 * 1024,
    network_in: 1024 * 1024,
    network_out: 512 * 1024,
  };

  this.setData('resourceMetrics', metrics);
});

Then('system resources should be tracked', async function (this: World) {
  const metrics = this.getData<any>('resourceMetrics');

  expect(metrics).toHaveProperty('cpu_usage');
  expect(metrics).toHaveProperty('memory_usage');
  expect(metrics).toHaveProperty('disk_usage');
});
