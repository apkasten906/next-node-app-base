import type { IStorageProvider } from '@repo/types';
import request from 'supertest';
import { container } from 'tsyringe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../index';
import type { ITracingService } from '../../infrastructure/observability';
import { CacheService } from '../../services/cache.service';
import { DatabaseService } from '../../services/database.service';
import { LoggerService } from '../../services/logger.service';
import { QueueService } from '../../services/queue/queue.service';

describe('Health endpoints integration', () => {
  const databaseHealthCheck = vi.fn<() => Promise<boolean>>();
  const cacheHealthCheck = vi.fn<() => Promise<boolean>>();
  const storageHealthCheck = vi.fn<() => Promise<boolean>>();

  function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
      resolve = resolvePromise;
    });
    return { promise, resolve };
  }

  beforeEach(() => {
    process.env['DISABLE_QUEUES'] = 'true';
    process.env['DISABLE_WEBSOCKETS'] = 'true';
    process.env['READINESS_CHECK_TIMEOUT_MS'] = '50';
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

  afterEach(() => {
    delete process.env['READINESS_CHECK_TIMEOUT_MS'];
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

  it('reports thrown dependency errors without failing the readiness handler', async () => {
    cacheHealthCheck.mockRejectedValue(new Error('cache unavailable'));
    const app = new App();

    const readiness = await request(app.app).get('/ready').expect(503);

    expect(readiness.body.status).toBe('not ready');
    expect(readiness.body.checks.cache).toMatchObject({
      status: 'unhealthy',
      details: { error: 'cache unavailable' },
    });
    expect(readiness.body.checks.database.status).toBe('healthy');
  });

  it('bounds a dependency that never settles', async () => {
    process.env['READINESS_CHECK_TIMEOUT_MS'] = '10';
    storageHealthCheck.mockImplementation(() => new Promise<boolean>(() => undefined));
    const app = new App();

    const readiness = await request(app.app).get('/ready').expect(503);

    expect(readiness.body.status).toBe('not ready');
    expect(readiness.body.checks.storage.status).toBe('unhealthy');
    expect(readiness.body.checks.storage.details.error).toBe('Health check timed out after 10ms');
    expect(readiness.body.checks.storage.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('starts all enabled dependency checks concurrently', async () => {
    delete process.env['DISABLE_QUEUES'];
    delete process.env['DISABLE_WEBSOCKETS'];
    const database = deferred<boolean>();
    const cache = deferred<boolean>();
    const storage = deferred<boolean>();
    const queue = deferred<boolean>();
    const websocket = deferred<{ status: 'healthy' }>();
    const queueHealthCheck = vi.fn(() => queue.promise);
    const websocketHealthCheck = vi.fn(() => websocket.promise);
    databaseHealthCheck.mockImplementation(() => database.promise);
    cacheHealthCheck.mockImplementation(() => cache.promise);
    storageHealthCheck.mockImplementation(() => storage.promise);
    container.registerInstance(QueueService, {
      healthCheck: queueHealthCheck,
    } as unknown as QueueService);
    const app = new App();
    (app as unknown as { websocket: { getHealth: typeof websocketHealthCheck } }).websocket = {
      getHealth: websocketHealthCheck,
    };

    const readinessPromise = request(app.app)
      .get('/ready')
      .expect(200)
      .then((response) => response);

    await vi.waitFor(() => {
      expect(databaseHealthCheck).toHaveBeenCalledOnce();
      expect(cacheHealthCheck).toHaveBeenCalledOnce();
      expect(storageHealthCheck).toHaveBeenCalledOnce();
      expect(queueHealthCheck).toHaveBeenCalledOnce();
      expect(websocketHealthCheck).toHaveBeenCalledOnce();
    });

    database.resolve(true);
    cache.resolve(true);
    storage.resolve(true);
    queue.resolve(true);
    websocket.resolve({ status: 'healthy' });
    const readiness = await readinessPromise;

    expect(readiness.body.status).toBe('ready');
    expect(readiness.body.checks.queue.status).toBe('healthy');
    expect(readiness.body.checks.websocket).toMatchObject({
      status: 'healthy',
      details: { status: 'healthy' },
    });
  });
});
