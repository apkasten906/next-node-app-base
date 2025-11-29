import express from 'express';
import request from 'supertest';
import { describe, it } from 'vitest';
import { CacheService } from '../../services/cache.service';
import { LoggerService } from '../../services/logger.service';

describe('Cache-backed Rate Limiter Integration', () => {
  it('uses CacheService to enforce rate limits', async () => {
    // Ensure tests use in-memory mock Redis to avoid external dependencies
    process.env.REDIS_MOCK = 'true';
    const mockLogger = {
      info: () => {},
      error: () => {},
      warn: () => {},
    } as unknown as LoggerService;
    const cache = new CacheService(mockLogger);
    await cache.flush();

    const app = express();

    const rateLimiter = async (req: any, res: any, next: any) => {
      const key = `rl:${req.ip || 'test-ip'}`;
      const existing = (await cache.get<number>(key)) || 0;
      const count = existing + 1;
      await cache.set(key, count, 60);
      if (count > 3) {
        res.status(429).json({ error: 'Too Many Requests' });
        return;
      }
      next();
    };

    app.get('/api/limited', rateLimiter, (_req, res) => res.json({ ok: true }));

    const agent = request(app);
    await agent.get('/api/limited').expect(200);
    // inspect cache after first request
    await agent.get('/api/limited').expect(200);
    await agent.get('/api/limited').expect(200);
    // inspect cache before final check
    await agent.get('/api/limited').expect(429);
  });
});
