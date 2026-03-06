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
      'status_code',
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
    const counter = this.getCounter(name);
    if (labels) {
      counter.inc(labels, value);
    } else {
      counter.inc(value);
    }
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.getGauge(name);
    if (labels) {
      gauge.set(labels, value);
    } else {
      gauge.set(value);
    }
  }

  /**
   * Observe a histogram metric
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.getHistogram(name);
    if (labels) {
      histogram.observe(labels, value);
    } else {
      histogram.observe(value);
    }
  }

  /**
   * Observe a summary metric
   */
  observeSummary(name: string, value: number, labels?: Record<string, string>): void {
    const summary = this.getSummary(name);
    if (labels) {
      summary.observe(labels, value);
    } else {
      summary.observe(value);
    }
  }

  /**
   * Start a timer for measuring duration
   */
  startTimer(name: string, labels?: Record<string, string>): () => number {
    const histogram = this.getHistogram(name);
    return histogram.startTimer(labels);
  }

  /**
   * Reset all metric values to zero (for testing)
   * Preserves metric definitions and labelNames
   */
  resetMetrics(): void {
    this.register.resetMetrics();
  }

  // Public methods for explicit metric registration

  /**
   * Register a custom counter metric
   */
  registerCounter(name: string, help: string, labelNames: string[] = []): void {
    this.createCounter(name, help, labelNames);
  }

  /**
   * Register a custom gauge metric
   */
  registerGauge(name: string, help: string, labelNames: string[] = []): void {
    this.createGauge(name, help, labelNames);
  }

  /**
   * Register a custom histogram metric
   */
  registerHistogram(name: string, help: string, labelNames: string[] = []): void {
    this.createHistogram(name, help, labelNames);
  }

  /**
   * Register a custom summary metric
   */
  registerSummary(name: string, help: string, labelNames: string[] = []): void {
    this.createSummary(name, help, labelNames);
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

  // Helper methods for retrieving registered metrics

  private getCounter(name: string): promClient.Counter {
    const counter = this.counters.get(name);
    if (!counter) {
      throw new Error(`Counter '${name}' not registered. Call registerCounter() first.`);
    }
    return counter;
  }

  private getGauge(name: string): promClient.Gauge {
    const gauge = this.gauges.get(name);
    if (!gauge) {
      throw new Error(`Gauge '${name}' not registered. Call registerGauge() first.`);
    }
    return gauge;
  }

  private getHistogram(name: string): promClient.Histogram {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      throw new Error(`Histogram '${name}' not registered. Call registerHistogram() first.`);
    }
    return histogram;
  }

  private getSummary(name: string): promClient.Summary {
    const summary = this.summaries.get(name);
    if (!summary) {
      throw new Error(`Summary '${name}' not registered. Call registerSummary() first.`);
    }
    return summary;
  }
}
