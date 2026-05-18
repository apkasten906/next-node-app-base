import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the OTLP exporter and NodeSDK before importing TracingService
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  // Use a regular function so `new OTLPTraceExporter(opts)` succeeds and the
  // constructor args (including `url`) are captured for assertion.
  OTLPTraceExporter: vi.fn().mockImplementation(function (
    this: { url?: string },
    opts?: { url?: string }
  ) {
    if (opts?.url) this.url = opts.url;
  }),
}));

const startMock = vi.fn().mockResolvedValue(undefined);
const shutdownMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@opentelemetry/sdk-node', () => ({
  // Use a regular function so `new NodeSDK()` succeeds and instances carry the
  // shared startMock / shutdownMock spies that the tests assert on.
  NodeSDK: vi.fn().mockImplementation(function NodeSDK(this: {
    start: typeof startMock;
    shutdown: typeof shutdownMock;
  }) {
    this.start = startMock;
    this.shutdown = shutdownMock;
  }),
}));

// Auto-instrumentations are not exercised in these unit tests; provide a noop
vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
}));

// Do not import the module at top-level — tests re-import it after changing env

describe('TracingService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    startMock.mockClear();
    shutdownMock.mockClear();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('is disabled in CI by default', async () => {
    process.env.CI = 'true';
    // Re-import with CI set
    const mod = await import('../../../infrastructure/observability/TracingService');
    const TS = mod.TracingService;
    const svc = new TS();
    expect(svc.isEnabled()).toBe(false);
  });

  it('is disabled in NODE_ENV=test unless TRACING_ENABLED=true', async () => {
    process.env.NODE_ENV = 'test';
    const mod1 = await import('../../../infrastructure/observability/TracingService');
    const TS = mod1.TracingService;
    const svc = new TS();
    expect(svc.isEnabled()).toBe(false);

    process.env.TRACING_ENABLED = 'true';
    // Must reset module registry so the next import re-executes TracingService
    // and picks up the updated TRACING_ENABLED env var.
    vi.resetModules();
    const mod2 = await import('../../../infrastructure/observability/TracingService');
    const TS2 = mod2.TracingService;
    const svc2 = new TS2();
    expect(svc2.isEnabled()).toBe(true);
  });

  it('normalizes OTLP endpoint when provided without /v1/traces', async () => {
    process.env.TRACING_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318/';

    // Re-import to pick up env
    const mod = await import('../../../infrastructure/observability/TracingService');
    const TS = mod.TracingService;
    const svc = new TS();

    // When enabled, NodeSDK.start should have been called
    expect(startMock).toHaveBeenCalled();

    // Assert the exporter was constructed with the correctly normalized URL
    // (trailing slash stripped, /v1/traces appended exactly once)
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://collector:4318/v1/traces' })
    );

    // Shutdown should call NodeSDK.shutdown without throwing
    await svc.shutdown();
    expect(shutdownMock).toHaveBeenCalled();
  });

  it('does not append /v1/traces twice when endpoint already contains it', async () => {
    process.env.TRACING_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318/v1/traces';

    const mod = await import('../../../infrastructure/observability/TracingService');
    const TS = mod.TracingService;
    const svc = new TS();

    expect(startMock).toHaveBeenCalled();

    // Assert the URL is passed through unchanged (no double-append)
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://collector:4318/v1/traces' })
    );

    await svc.shutdown();
    expect(shutdownMock).toHaveBeenCalled();
  });

  it('does not append /v1/traces when endpoint has trailing slash after it', async () => {
    process.env.TRACING_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318/v1/traces/';

    const mod = await import('../../../infrastructure/observability/TracingService');
    const TS = mod.TracingService;
    const svc = new TS();

    expect(startMock).toHaveBeenCalled();

    // Assert trailing slash is stripped and /v1/traces is not duplicated
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://collector:4318/v1/traces' })
    );

    await svc.shutdown();
    expect(shutdownMock).toHaveBeenCalled();
  });
});
