import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

// Simple in-memory rate limiter for tests
function simpleRateLimiter(maxRequests: number, windowMs: number) {
  const hits: Record<string, { count: number; reset: number }> = {};
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'test-ip';
    const now = Date.now();
    // eslint-disable-next-line security/detect-object-injection
    const entry = hits[key] || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    // eslint-disable-next-line security/detect-object-injection
    hits[key] = entry;

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));

    if (entry.count > maxRequests) {
      res.status(429).json({ error: 'Too Many Requests' });
      return;
    }

    next();
  };
}

describe('Rate Limiting Integration', () => {
  it('allows up to 5 requests then returns 429', async () => {
    const app = express();
    app.use(simpleRateLimiter(5, 60 * 1000));
    app.get('/api/auth/login', (_req, res) => res.json({ ok: true }));

    // Make 5 requests - should succeed
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).get('/api/auth/login').expect(200);
      expect(res.body.ok).toBe(true);
    }

    // 6th request should be rate-limited
    await request(app).get('/api/auth/login').expect(429);
  });
});
