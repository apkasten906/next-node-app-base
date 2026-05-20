import { PassThrough } from 'node:stream';

import { trace, TraceFlags } from '@opentelemetry/api';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import winston from 'winston';

import { LoggerService } from '../../services/logger.service';

describe('LoggerService', () => {
  let loggerService: LoggerService;

  beforeEach(() => {
    // NODE_ENV is set in vitest.config.ts
    process.env.LOG_LEVEL = 'debug';
    loggerService = container.resolve(LoggerService);
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      const spy = vi.spyOn(loggerService.getLogger(), 'debug');

      loggerService.debug('Debug message', { context: 'test' });

      expect(spy).toHaveBeenCalledWith('Debug message', { context: 'test' });
    });

    it('should log info messages', () => {
      const spy = vi.spyOn(loggerService.getLogger(), 'info');

      loggerService.info('Info message', { userId: '123' });

      expect(spy).toHaveBeenCalledWith('Info message', { userId: '123' });
    });

    it('should log warning messages', () => {
      const spy = vi.spyOn(loggerService.getLogger(), 'warn');

      loggerService.warn('Warning message', { code: 'WARN_001' });

      expect(spy).toHaveBeenCalledWith('Warning message', { code: 'WARN_001' });
    });

    it('should log error messages with error object', () => {
      const spy = vi.spyOn(loggerService.getLogger(), 'error');
      const error = new Error('Test error');

      loggerService.error('Error occurred', error, { context: 'test' });

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0];
      expect(callArgs?.[0]).toBe('Error occurred');
      expect(callArgs?.[1]).toHaveProperty('error');
      expect(callArgs?.[1]).toHaveProperty('context', 'test');
    });
  });

  describe('child logger', () => {
    it('should create child logger with correlation ID', () => {
      const correlationId = 'test-correlation-id';
      const childLogger = loggerService.child(correlationId);

      expect(childLogger).toBeDefined();
    });

    it('should include correlation ID in child logger', () => {
      const correlationId = 'correlation-123';
      const childLogger = loggerService.child(correlationId);

      const spy = vi.spyOn(childLogger, 'info');
      childLogger.info('Test message');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getLogger', () => {
    it('should return Winston logger instance', () => {
      const logger = loggerService.getLogger();

      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });
  });
});

function captureNextLog(logger: winston.Logger): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const stream = new PassThrough();
    const transport = new winston.transports.Stream({ stream });
    stream.once('data', (chunk: Buffer) => {
      logger.remove(transport);
      resolve(JSON.parse(chunk.toString().trim()) as Record<string, unknown>);
    });
    logger.add(transport);
  });
}

describe('LoggerService — injectTraceContext format step', () => {
  let loggerService: LoggerService;

  beforeEach(() => {
    process.env['LOG_LEVEL'] = 'debug';
    loggerService = container.resolve(LoggerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes traceId and spanId when a sampled span is active', async () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue({
      spanContext: () => ({
        traceId: 'a'.repeat(32),
        spanId: 'b'.repeat(16),
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      }),
    });

    const capture = captureNextLog(loggerService.getLogger());
    loggerService.info('sampled span test');
    const output = await capture;

    expect(output).toHaveProperty('traceId', 'a'.repeat(32));
    expect(output).toHaveProperty('spanId', 'b'.repeat(16));
  });

  it('omits traceId and spanId when there is no active span', async () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);

    const capture = captureNextLog(loggerService.getLogger());
    loggerService.info('no span test');
    const output = await capture;

    expect(output).not.toHaveProperty('traceId');
    expect(output).not.toHaveProperty('spanId');
  });

  it('omits traceId and spanId when the active span is not sampled', async () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue({
      spanContext: () => ({
        traceId: 'a'.repeat(32),
        spanId: 'b'.repeat(16),
        traceFlags: 0,
        isRemote: false,
      }),
    });

    const capture = captureNextLog(loggerService.getLogger());
    loggerService.info('unsampled span test');
    const output = await capture;

    expect(output).not.toHaveProperty('traceId');
    expect(output).not.toHaveProperty('spanId');
  });
});
