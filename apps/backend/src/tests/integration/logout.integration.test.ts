import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('Session Logout Integration', () => {
  it('clears session cookie on logout', async () => {
    const app = express();

    // Simulated login route that sets a cookie
    app.post('/auth/login', (_req, res) => {
      res.cookie('session', 'abc123', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 1000,
      });
      res.status(200).json({ ok: true });
    });

    // Logout route clears cookie
    app.post('/auth/logout', (_req, res) => {
      res.clearCookie('session', { path: '/' });
      res.status(200).json({ ok: true });
    });

    // Login first
    const login = await request(app).post('/auth/login').expect(200);
    const cookie = login.headers['set-cookie'];
    expect(cookie).toBeDefined();

    // Logout - should include a Set-Cookie header that clears the cookie
    const logout = await request(app).post('/auth/logout').expect(200);
    const logoutCookie = logout.headers['set-cookie'];
    expect(logoutCookie).toBeDefined();
    const cookieStr = Array.isArray(logoutCookie) ? logoutCookie[0] : logoutCookie;

    // Clearing cookie typically sets Max-Age=0 or Expires in the past
    expect(/Max-Age=0|Expires=/i.test(cookieStr)).toBeTruthy();
  });
});
