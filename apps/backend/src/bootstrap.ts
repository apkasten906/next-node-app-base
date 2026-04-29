import 'dotenv/config';
import 'reflect-metadata';

import { container } from 'tsyringe';

// Import directly (not via the barrel) so that MetricsService and prom-client
// are not loaded before the OpenTelemetry SDK has been started.
import { TracingService } from './infrastructure/observability/TracingService';

// Start the OpenTelemetry SDK before any instrumented modules (express, pg,
// etc.) are imported so auto-instrumentation patches apply correctly.
// Register the pre-started instance so later DI resolutions receive the
// same singleton without re-initialising the SDK.
if (!container.isRegistered('TracingService')) {
  container.registerInstance('TracingService', new TracingService());
}
