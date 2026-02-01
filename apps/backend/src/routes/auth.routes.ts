import type { TokenResult } from '@repo/types';
import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';

import { EncryptionService } from '../services/auth/encryption.service';
import { JwtService } from '../services/auth/jwt.service';
import { DatabaseService } from '../services/database.service';

const router: import('express').Router = Router();

function devFallbackEnabled(): boolean {
  if (process.env['AUTH_ENABLE_DEV_FALLBACK'] === 'true') return true;
  if (process.env['AUTH_ENABLE_DEV_FALLBACK'] === 'false') return false;

  // Default behavior: enabled in development, disabled otherwise
  return process.env['NODE_ENV'] === 'development';
}

function setAuthCookies(res: Response, tokens: TokenResult): void {
  const isProd = process.env['NODE_ENV'] === 'production';
  const cookieBase = {
    httpOnly: true,
    secure: isProd, // on localhost dev, allow non-secure
    sameSite: 'lax' as const,
    path: '/',
  };

  // Access token (short lived)
  res.cookie('access_token', tokens.accessToken, {
    ...cookieBase,
    maxAge: tokens.expiresIn * 1000,
  });

  // Refresh token (longer lived)
  res.cookie('refresh_token', tokens.refreshToken, {
    ...cookieBase,
    // 7d default in JwtService, approximate
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers['cookie'];
  if (!header || typeof header !== 'string') return undefined;
  const parts = header.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=');
    if (k === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const db = container.resolve(DatabaseService);
    const enc = container.resolve<EncryptionService>('EncryptionService');
    const jwt = container.resolve<JwtService>('JwtService');
    try {
      const user = await db.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const ok = await enc.compareHash(password, user.passwordHash);
      if (!ok) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const roles = [user.role];
      const permissions: string[] = []; // can be populated later
      const tokens = jwt.generateTokens({ userId: user.id, email: user.email, roles, permissions });

      setAuthCookies(res, tokens);
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        },
        authenticated: true,
        tokenType: tokens.tokenType,
      });
    } catch (dbErr) {
      // Fallback for dev/test when DB is unavailable
      if (!devFallbackEnabled()) {
        throw dbErr;
      }

      const fallbackUsers = new Map<
        string,
        { id: string; name: string; role: 'USER' | 'ADMIN'; password: string }
      >([
        [
          'test@example.com',
          {
            id: 'test-user-1',
            name: 'Test User',
            role: 'USER',
            password: 'Password123!',
          },
        ],
        [
          'admin@example.com',
          {
            id: 'admin-user-1',
            name: 'Admin User',
            role: 'ADMIN',
            password: 'Admin123!',
          },
        ],
      ]);

      const fu = fallbackUsers.get(email);
      if (!fu || fu.password !== password) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const roles = [fu.role];
      const permissions: string[] = [];
      const tokens = jwt.generateTokens({ userId: fu.id, email, roles, permissions });
      setAuthCookies(res, tokens);
      res.status(200).json({
        user: { id: fu.id, email, name: fu.name, image: null, role: fu.role },
        authenticated: true,
        tokenType: tokens.tokenType,
      });
    }
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const jwt = container.resolve<JwtService>('JwtService');
    const db = container.resolve(DatabaseService);

    const refresh = getCookie(req, 'refresh_token');

    if (!refresh) {
      res.status(401).json({ error: 'Missing refresh token' });
      return;
    }

    const { userId } = await jwt.validateRefreshToken(refresh);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const roles = [user.role];
    const permissions: string[] = [];
    const tokens = jwt.generateTokens({ userId, email: user.email, roles, permissions });
    setAuthCookies(res, tokens);
    res.status(200).json({ success: true });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookies(res);
  res.status(200).json({ success: true });
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // In dev fallback, return info from JWT without DB
    if (devFallbackEnabled()) {
      const { email, roles } = req.user!;
      res
        .status(200)
        .json({ user: { id: userId, email, name: null, image: null, role: roles?.[0] ?? 'USER' } });
      return;
    }

    const db = container.resolve(DatabaseService);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, image: true, role: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
