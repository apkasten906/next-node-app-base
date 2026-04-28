import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
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
    // (e.g. http://collector:4318/v1/traces or http://collector:4318/v1/traces/).
    // Avoid double-appending `/v1/traces` when it is already present, including
    // when the user supplied a trailing slash after the signal path.
    const normalizedUrl = /\/v1\/traces\/?$/u.test(endpoint)
      ? endpoint.replace(/\/+$/u, '')
      : `${endpoint.replace(/\/+$/u, '')}/v1/traces`;

    const exporter = new OTLPTraceExporter({
      url: normalizedUrl,
    });

    // Service name is supplied via Resource so the default 'backend' does not
    // require mutating process.env. The OTEL_SERVICE_NAME env var, when set,
    // is read by the SDK's own env-detector and will override this default.
    const serviceName = process.env['OTEL_SERVICE_NAME'] ?? 'backend';
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    });

    this.sdk = new NodeSDK({
      resource,
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation — too noisy and not actionable
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    // NodeSDK.start() is synchronous; wrap in try/catch so a startup failure
    // does not crash the application. The error is written to stderr so it
    // remains visible without silently disabling telemetry.
    try {
      this.sdk.start();
    } catch (error: unknown) {
      process.stderr.write(
        `[TracingService] Failed to initialize OpenTelemetry tracing: ${String(error)}\n`
      );
    }
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
