import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../index';
import { authenticate } from '../../middleware/auth.middleware';
import { JwtService } from '../../services/auth/jwt.service';
import { CacheService } from '../../services/cache.service';
import { DatabaseService } from '../../services/database.service';
import { LoggerService } from '../../services/logger.service';

describe('Security Integration Tests', () => {
  beforeEach(() => {
    // Clear DI container and register lightweight mocks to avoid real connections
    container.clearInstances();

    const mockDb = {
      healthCheck: vi.fn().mockResolvedValue(true),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseService;

    const mockCache = {
      healthCheck: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    } as unknown as LoggerService;

    container.registerInstance(DatabaseService, mockDb);
    container.registerInstance(CacheService, mockCache);
    container.registerInstance(LoggerService, mockLogger);
  });

  it('includes security headers (helmet) on API responses', async () => {
    const app = new App();

    const res = await request(app.app).get('/api').expect(200);

    // Common Helmet-set headers
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBeDefined();
  });

  it('rejects expired JWT tokens with 403', async () => {
    const app = express();

    // Register JwtService in container so middleware can resolve it
    container.registerInstance(JwtService, new JwtService());

    // Protected route using the real middleware
    app.get('/protected', authenticate, (_req, res) => res.json({ ok: true }));

    // Create an already-expired token (exp in the past)
    const secret = process.env['JWT_ACCESS_SECRET'] || 'access-secret-change-me';
    const token = jwt.sign({ userId: 'test', exp: Math.floor(Date.now() / 1000) - 10 }, secret);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error).toMatch(/Invalid or expired/i);
  });
});
