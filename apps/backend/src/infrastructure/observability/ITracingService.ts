export interface ITracingService {
  /**
   * Returns true if tracing has been successfully initialised and the SDK
   * is actively exporting spans.
   */
  isEnabled(): boolean;

  /**
   * Gracefully shuts down the OpenTelemetry SDK, flushing any buffered spans.
   * Should be called during application shutdown.
   */
  shutdown(): Promise<void>;
}
