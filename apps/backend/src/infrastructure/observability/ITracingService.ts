export interface ITracingService {
  /**
   * Returns true when tracing is enabled by configuration.
   * This does not guarantee that the SDK has been successfully initialized
   * or that spans are currently being exported.
   */
  isEnabled(): boolean;

  /**
   * Gracefully shuts down the OpenTelemetry SDK, flushing any buffered spans.
   * Should be called during application shutdown.
   */
  shutdown(): Promise<void>;
}
