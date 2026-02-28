/**
 * Metrics Service Interface
 *
 * Abstraction for application metrics collection and exposition.
 * Provides methods for recording custom business metrics and system metrics.
 */

export interface IMetricsService {
  /**
   * Get metrics in Prometheus format
   * @returns Promise<string> Metrics text in Prometheus exposition format
   */
  getMetrics(): Promise<string>;

  /**
   * Increment a counter metric
   * @param name Counter name
   * @param labels Optional labels
   * @param value Increment value (default: 1)
   */
  incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;

  /**
   * Set a gauge metric
   * @param name Gauge name
   * @param value Value to set
   * @param labels Optional labels
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Observe a histogram metric (for request durations, sizes, etc.)
   * @param name Histogram name
   * @param value Value to observe
   * @param labels Optional labels
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Observe a summary metric (for percentiles)
   * @param name Summary name
   * @param value Value to observe
   * @param labels Optional labels
   */
  observeSummary(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Start a timer for measuring duration
   * @param name Histogram name for duration
   * @param labels Optional labels
   * @returns Function to call when timer should end
   */
  startTimer(name: string, labels?: Record<string, string>): () => number;

  /**
   * Register default metrics (CPU, memory, event loop, etc.)
   */
  registerDefaultMetrics(): void;

  /**
   * Register a custom counter metric
   * @param name Counter name
   * @param help Help text
   * @param labelNames Array of label names
   */
  registerCounter(name: string, help: string, labelNames?: string[]): void;

  /**
   * Register a custom gauge metric
   * @param name Gauge name
   * @param help Help text
   * @param labelNames Array of label names
   */
  registerGauge(name: string, help: string, labelNames?: string[]): void;

  /**
   * Register a custom histogram metric
   * @param name Histogram name
   * @param help Help text
   * @param labelNames Array of label names
   */
  registerHistogram(name: string, help: string, labelNames?: string[]): void;

  /**
   * Register a custom summary metric
   * @param name Summary name
   * @param help Help text
   * @param labelNames Array of label names
   */
  registerSummary(name: string, help: string, labelNames?: string[]): void;

  /**
   * Reset all metric values to zero (useful for testing)
   * Preserves metric definitions and labelNames
   */
  resetMetrics(): void;
}
