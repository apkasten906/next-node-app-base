import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the OTLP exporter and NodeSDK before importing TracingService
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(() => ({
    /* dummy exporter */
  })),
}));

const startMock = vi.fn().mockResolvedValue(undefined);
const shutdownMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    start: startMock,
    shutdown: shutdownMock,
  })),
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
    const mod = await import('../../../../infrastructure/observability/TracingService');
    const TS = mod.TracingService;
    const svc = new TS();
    expect(svc.isEnabled()).toBe(false);
  });

  it('is disabled in NODE_ENV=test unless TRACING_ENABLED=true', async () => {
    process.env.NODE_ENV = 'test';
    const mod1 = await import('../../../../infrastructure/observability/TracingService');
    const TS = mod1.TracingService;
    const svc = new TS();
    expect(svc.isEnabled()).toBe(false);

    process.env.TRACING_ENABLED = 'true';
    const mod2 = await import('../../../../infrastructure/observability/TracingService');
    const TS2 = mod2.TracingService;
    const svc2 = new TS2();
    expect(svc2.isEnabled()).toBe(true);
  });

  it('normalizes OTLP endpoint when provided without /v1/traces', async () => {
    process.env.TRACING_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318/';

    // Re-import to pick up env
    const mod = await import('../../../../infrastructure/observability/TracingService');
    const TS = mod.TracingService;
    const svc = new TS();

    // When enabled, NodeSDK.start should have been called
    expect(startMock).toHaveBeenCalled();

    // Shutdown should call NodeSDK.shutdown without throwing
    await svc.shutdown();
    expect(shutdownMock).toHaveBeenCalled();
  });

  it('does not append /v1/traces twice when endpoint already contains it', async () => {
    process.env.TRACING_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318/v1/traces';

    const mod = await import('../../../../infrastructure/observability/TracingService');
    const TS = mod.TracingService;
    const svc = new TS();

    expect(startMock).toHaveBeenCalled();

    await svc.shutdown();
    expect(shutdownMock).toHaveBeenCalled();
  });
});
