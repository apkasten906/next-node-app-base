import type { TokenPayload } from '@repo/types';
import type { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';

import { JwtService } from '../services/auth/jwt.service';

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const cookie of cookieHeader.split(';')) {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    const value = decodeURIComponent(parts.join('=')).trim();
    if (key) cookies.set(key, value);
  }

  return cookies;
}

/**
 * Best-effort JWT decode middleware.
 * - If a valid access token exists (Authorization Bearer or cookie "access_token"), attaches it to req.user
 * - Never throws; continues without user on failure
 */
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction): void {
  const jwt = container.resolve<JwtService>('JwtService');

  // Try Authorization header first
  const authHeader = req.get('authorization') || req.get('Authorization');
  const bearer =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : undefined;

  // Then cookie
  const cookies = parseCookies(req.headers['cookie'] as string | undefined);
  const cookieToken = cookies.get('access_token');

  const token = bearer || cookieToken;
  if (!token) return next();

  void (async () => {
    try {
      const payload = await jwt.validateAccessToken(token);
      // Attach to request for downstream
      (req as Request & { user?: TokenPayload }).user = payload;
    } catch {
      // Ignore invalid tokens
    } finally {
      next();
    }
  })();
}
