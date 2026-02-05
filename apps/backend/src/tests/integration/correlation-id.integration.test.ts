import { PassThrough } from 'node:stream';

import express from 'express';
import request from 'supertest';
import { container } from 'tsyringe';
import { afterEach, describe, expect, it } from 'vitest';
import winston from 'winston';

import { correlationIdMiddleware } from '../../middleware/correlation-id.middleware';
import { LoggerService } from '../../services/logger.service';

describe('Correlation ID middleware + logger context injection', () => {
  const loggerService = container.resolve(LoggerService);

  const transportsToCleanup: winston.transport[] = [];
  afterEach(() => {
    for (const t of transportsToCleanup.splice(0)) {
      loggerService.getLogger().remove(t);
    }
  });

  function captureInfoLogs(): { lines: string[]; add: () => void; remove: () => void } {
    const pass = new PassThrough();
    const lines: string[] = [];
    pass.on('data', (chunk) => lines.push(String(chunk)));

    const transport = new winston.transports.Stream({
      stream: pass as unknown as NodeJS.WritableStream,
      level: 'info',
      format: winston.format.json(),
    });

    transportsToCleanup.push(transport);

    return {
      lines,
      add: () => loggerService.getLogger().add(transport),
      remove: () => loggerService.getLogger().remove(transport),
    };
  }

  it('echoes inbound X-Correlation-ID and injects it into logs without child logger', async () => {
    const app = express();
    app.use(correlationIdMiddleware);
    app.get('/ping', (_req, res) => {
      loggerService.info('ping');
      res.status(200).json({ ok: true });
    });

    const capture = captureInfoLogs();
    capture.add();

    const res = await request(app).get('/ping').set('X-Correlation-ID', 'test-123');

    capture.remove();

    expect(res.headers['x-correlation-id']).toBe('test-123');

    const payloads = capture.lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    const pingLog = payloads.find((p) => p['message'] === 'ping');
    expect(pingLog).toBeDefined();
    expect(pingLog?.['correlationId']).toBe('test-123');
  });

  it('generates X-Correlation-ID when missing and injects same value into logs', async () => {
    const app = express();
    app.use(correlationIdMiddleware);
    app.get('/ping', (_req, res) => {
      loggerService.info('ping');
      res.status(200).json({ ok: true });
    });

    const capture = captureInfoLogs();
    capture.add();

    const res = await request(app).get('/ping');

    capture.remove();

    const cid = res.headers['x-correlation-id'];
    expect(typeof cid).toBe('string');
    expect((cid as string).length).toBeGreaterThan(0);

    const payloads = capture.lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    const pingLog = payloads.find((p) => p['message'] === 'ping');
    expect(pingLog).toBeDefined();
    expect(pingLog?.['correlationId']).toBe(cid);
  });
});
