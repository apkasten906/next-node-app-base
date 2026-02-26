import * as promClient from 'prom-client';
import { injectable } from 'tsyringe';

import type { IMetricsService } from './IMetricsService';

/**
 * Metrics Service Implementation using Prometheus Client
 *
 * Provides application and business metrics collection using prom-client.
 * Exposes metrics in Prometheus format for scraping.
 */
@injectable()
export class MetricsService implements IMetricsService {
  private readonly register: promClient.Registry;
  private readonly counters: Map<string, promClient.Counter>;
  private readonly gauges: Map<string, promClient.Gauge>;
  private readonly histograms: Map<string, promClient.Histogram>;
  private readonly summaries: Map<string, promClient.Summary>;

  constructor() {
    this.register = new promClient.Registry();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.summaries = new Map();

    // Add default labels (app name, version, etc.)
    this.register.setDefaultLabels({
      app: 'backend',
      version: process.env['npm_package_version'] || '1.0.0',
    });

    // Register default metrics by default
    this.registerDefaultMetrics();

    // Register custom business metrics
    this.registerBusinessMetrics();
  }

  /**
   * Register default Node.js metrics
   */
  registerDefaultMetrics(): void {
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'nodejs_',
    });
  }

  /**
   * Register custom business metrics
   */
  private registerBusinessMetrics(): void {
    // HTTP request metrics
    this.createHistogram('http_request_duration_seconds', 'Duration of HTTP requests in seconds', [
      'method',
      'route',
    ]);

    this.createCounter('http_requests_total', 'Total number of HTTP requests', [
      'method',
      'route',
      'status_code',
    ]);

    // Database metrics
    this.createHistogram('db_query_duration_seconds', 'Duration of database queries in seconds', [
      'operation',
      'table',
    ]);

    this.createCounter('db_queries_total', 'Total number of database queries', [
      'operation',
      'table',
      'status',
    ]);

    // Cache metrics
    this.createCounter('cache_hits_total', 'Total number of cache hits', ['cache_name']);
    this.createCounter('cache_misses_total', 'Total number of cache misses', ['cache_name']);

    // Queue metrics
    this.createGauge('queue_jobs_active', 'Number of active jobs in queue', ['queue_name']);
    this.createGauge('queue_jobs_waiting', 'Number of waiting jobs in queue', ['queue_name']);
    this.createCounter('queue_jobs_completed_total', 'Total number of completed queue jobs', [
      'queue_name',
      'status',
    ]);

    // WebSocket metrics
    this.createGauge('websocket_connections_active', 'Number of active WebSocket connections');
    this.createCounter('websocket_messages_total', 'Total number of WebSocket messages', [
      'event',
      'direction',
    ]);

    // Authentication metrics
    this.createCounter('auth_attempts_total', 'Total number of authentication attempts', [
      'method',
      'status',
    ]);
    this.createCounter('auth_failures_total', 'Total number of authentication failures', [
      'method',
      'reason',
    ]);

    // Business metrics examples
    this.createCounter('user_registrations_total', 'Total number of user registrations', [
      'source',
    ]);
    this.createCounter('api_errors_total', 'Total number of API errors', ['route', 'error_type']);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const counter = this.getOrCreateCounter(name);
    if (labels && Object.keys(labels).length > 0) {
      counter.inc(labels, value);
    } else {
      counter.inc(value);
    }
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.getOrCreateGauge(name);
    if (labels && Object.keys(labels).length > 0) {
      gauge.set(labels, value);
    } else {
      gauge.set(value);
    }
  }

  /**
   * Observe a histogram metric
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.getOrCreateHistogram(name);
    if (labels && Object.keys(labels).length > 0) {
      histogram.observe(labels, value);
    } else {
      histogram.observe(value);
    }
  }

  /**
   * Observe a summary metric
   */
  observeSummary(name: string, value: number, labels?: Record<string, string>): void {
    const summary = this.getOrCreateSummary(name);
    if (labels && Object.keys(labels).length > 0) {
      summary.observe(labels, value);
    } else {
      summary.observe(value);
    }
  }

  /**
   * Start a timer for measuring duration
   */
  startTimer(name: string, labels?: Record<string, string>): () => number {
    const histogram = this.getOrCreateHistogram(name);
    return histogram.startTimer(labels);
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics(): void {
    this.register.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
  }

  // Helper methods for creating metrics

  private createCounter(name: string, help: string, labelNames: string[] = []): promClient.Counter {
    const counter = new promClient.Counter({
      name,
      help,
      labelNames,
      registers: [this.register],
    });
    this.counters.set(name, counter);
    return counter;
  }

  private createGauge(name: string, help: string, labelNames: string[] = []): promClient.Gauge {
    const gauge = new promClient.Gauge({
      name,
      help,
      labelNames,
      registers: [this.register],
    });
    this.gauges.set(name, gauge);
    return gauge;
  }

  private createHistogram(
    name: string,
    help: string,
    labelNames: string[] = []
  ): promClient.Histogram {
    const histogram = new promClient.Histogram({
      name,
      help,
      labelNames,
      registers: [this.register],
    });
    this.histograms.set(name, histogram);
    return histogram;
  }

  private createSummary(name: string, help: string, labelNames: string[] = []): promClient.Summary {
    const summary = new promClient.Summary({
      name,
      help,
      labelNames,
      registers: [this.register],
    });
    this.summaries.set(name, summary);
    return summary;
  }

  private getOrCreateCounter(name: string): promClient.Counter {
    let counter = this.counters.get(name);
    counter ??= this.createCounter(name, `Custom counter: ${name}`);
    return counter;
  }

  private getOrCreateGauge(name: string): promClient.Gauge {
    let gauge = this.gauges.get(name);
    gauge ??= this.createGauge(name, `Custom gauge: ${name}`);
    return gauge;
  }

  private getOrCreateHistogram(name: string): promClient.Histogram {
    let histogram = this.histograms.get(name);
    histogram ??= this.createHistogram(name, `Custom histogram: ${name}`);
    return histogram;
  }

  private getOrCreateSummary(name: string): promClient.Summary {
    let summary = this.summaries.get(name);
    summary ??= this.createSummary(name, `Custom summary: ${name}`);
    return summary;
  }
}
