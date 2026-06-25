import type { IStorageProvider } from '@repo/types';
import request from 'supertest';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../index';
import type { ITracingService } from '../../infrastructure/observability';
import { CacheService } from '../../services/cache.service';
import { DatabaseService } from '../../services/database.service';
import { LoggerService } from '../../services/logger.service';

describe('Health endpoints integration', () => {
  const databaseHealthCheck = vi.fn<() => Promise<boolean>>();
  const cacheHealthCheck = vi.fn<() => Promise<boolean>>();
  const storageHealthCheck = vi.fn<() => Promise<boolean>>();

  beforeEach(() => {
    process.env['DISABLE_QUEUES'] = 'true';
    process.env['DISABLE_WEBSOCKETS'] = 'true';
    container.clearInstances();

    databaseHealthCheck.mockReset().mockResolvedValue(true);
    cacheHealthCheck.mockReset().mockResolvedValue(true);
    storageHealthCheck.mockReset().mockResolvedValue(true);

    container.registerInstance(DatabaseService, {
      healthCheck: databaseHealthCheck,
      disconnect: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseService);
    container.registerInstance(CacheService, {
      healthCheck: cacheHealthCheck,
      disconnect: vi.fn().mockResolvedValue(undefined),
    } as unknown as CacheService);
    container.registerInstance(LoggerService, {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as LoggerService);
    container.registerInstance<ITracingService>('TracingService', {
      isEnabled: () => false,
      shutdown: vi.fn().mockResolvedValue(undefined),
    });
    container.registerInstance<IStorageProvider>('IStorageProvider', {
      providerName: 'test',
      healthCheck: storageHealthCheck,
    } as unknown as IStorageProvider);
  });

  it('separates liveness from detailed dependency readiness', async () => {
    const app = new App();

    const liveness = await request(app.app).get('/health').expect(200);
    expect(liveness.body).toMatchObject({ service: 'backend', status: 'ok' });
    expect(liveness.body.timestamp).toEqual(expect.any(String));

    const readiness = await request(app.app).get('/ready').expect(200);
    expect(readiness.body).toMatchObject({
      status: 'ready',
      database: true,
      cache: true,
      checks: {
        database: { status: 'healthy' },
        cache: { status: 'healthy' },
        storage: { status: 'healthy' },
        queue: { status: 'disabled' },
        websocket: { status: 'disabled' },
      },
    });
    expect(readiness.body.checks.database.latencyMs).toEqual(expect.any(Number));
  });

  it('returns 503 and identifies an unhealthy required dependency', async () => {
    databaseHealthCheck.mockResolvedValue(false);
    const app = new App();

    const readiness = await request(app.app).get('/ready').expect(503);

    expect(readiness.body.status).toBe('not ready');
    expect(readiness.body.database).toBe(false);
    expect(readiness.body.checks.database.status).toBe('unhealthy');
    expect(readiness.body.checks.cache.status).toBe('healthy');
  });
});
