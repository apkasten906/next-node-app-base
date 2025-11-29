import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('Session Cookie Integration', () => {
  it('sets secure, HttpOnly, SameSite cookie on login', async () => {
    const app = express();

    // Simulated login route that sets a session cookie
    app.post('/auth/login', (_req, res) => {
      // In production this would be set after validating credentials
      res.cookie('session', 'session-value', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60, // 1 hour
      });
      res.status(200).json({ ok: true });
    });

    const res = await request(app).post('/auth/login').expect(200);

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;

    expect(cookieStr).toMatch(/session=session-value/);
    expect(cookieStr).toMatch(/HttpOnly/);
    expect(cookieStr).toMatch(/Secure/);
    expect(cookieStr).toMatch(/SameSite=Lax/i);
  });
});
