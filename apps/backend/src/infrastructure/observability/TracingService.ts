import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { injectable } from 'tsyringe';

import type { ITracingService } from './ITracingService';

/**
 * TracingService
 *
 * Initialises the OpenTelemetry Node SDK with OTLP HTTP export to Jaeger.
 * Tracing defaults:
 *   - enabled in runtime contexts (development / production)
 *   - disabled in non-runtime contexts (test / CI) unless explicitly enabled
 *
 * Configuration via environment variables (standard OTEL convention):
 *   OTEL_SERVICE_NAME             - Service name label (default: "backend")
 *   OTEL_SERVICE_VERSION          - Service version label
 *   OTEL_EXPORTER_OTLP_ENDPOINT   - Jaeger OTLP collector base URL
 *                                   (default: http://localhost:4318)
 *   OTEL_RESOURCE_ATTRIBUTES      - Additional resource key=value pairs
 *   TRACING_ENABLED               - Explicit override: "true" or "false"
 */
@injectable()
export class TracingService implements ITracingService {
  private readonly sdk: NodeSDK | null;
  private readonly enabled: boolean;

  constructor() {
    const explicitToggle = process.env['TRACING_ENABLED'];
    const isCi = process.env['CI'] === 'true';
    const isTest = process.env['NODE_ENV'] === 'test';

    // Default policy:
    // - runtime contexts: on
    // - non-runtime contexts (CI/test): off
    // Explicit TRACING_ENABLED always wins.
    this.enabled = explicitToggle !== undefined ? explicitToggle === 'true' : !isCi && !isTest;

    if (!this.enabled) {
      this.sdk = null;
      return;
    }

    const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4318';

    // Normalize exporter URL: allow users to provide either a base URL
    // (e.g. http://localhost:4318) or a full signal endpoint
    // (e.g. http://collector:4318/v1/traces). Avoid double-appending
    // `/v1/traces` when it is already present.
    const normalizedUrl = endpoint.endsWith('/v1/traces')
      ? endpoint
      : `${endpoint.replace(/\/+$/u, '')}/v1/traces`;

    const exporter = new OTLPTraceExporter({
      url: normalizedUrl,
    });

    // Service name / version / resource attributes are read from standard
    // OTEL env vars (OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES) by the SDK.
    // Set sensible defaults so the service is identifiable when env vars are absent.
    if (!process.env['OTEL_SERVICE_NAME']) {
      process.env['OTEL_SERVICE_NAME'] = 'backend';
    }

    this.sdk = new NodeSDK({
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation — too noisy and not actionable
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    void Promise.resolve(this.sdk.start()).catch((error: unknown) => {
      // Tracing must not crash the app during bootstrap, but startup failures
      // should be visible instead of silently disabling telemetry.
      console.error('Failed to initialize OpenTelemetry tracing', error);
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }
}
