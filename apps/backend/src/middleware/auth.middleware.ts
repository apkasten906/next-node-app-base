import { TokenPayload } from '@repo/types';
import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';

import { AuthorizationService } from '../services/auth/authorization.service';
import { JwtService } from '../services/auth/jwt.service';

// Extend Express Request to include user

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const jwtService = container.resolve(JwtService);
    const payload = await jwtService.validateAccessToken(token);

    req.user = payload;
    next();
  } catch (_error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware factory to check for required roles
 */
export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authService = container.resolve(AuthorizationService);
    const userId = req.user['userId'];

    for (const role of roles) {
      const hasRole = await authService.hasRole(userId, role);
      if (hasRole) {
        next();
        return;
      }
    }

    res
      .status(403)
      .json({ error: 'Insufficient permissions - required roles: ' + roles.join(', ') });
  };
};

/**
 * Middleware factory to check for required permissions
 */
export const requirePermission = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authService = container.resolve(AuthorizationService);
    const userId = req.user['userId'];

    for (const permission of permissions) {
      const hasPermission = await authService.hasPermission(userId, permission);
      if (!hasPermission) {
        res
          .status(403)
          .json({ error: 'Insufficient permissions - required: ' + permissions.join(', ') });
        return;
      }
    }

    next();
  };
};

/**
 * Middleware factory to check resource access
 */
export const requireAccess = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authService = container.resolve(AuthorizationService);
    const userId = req.user['userId'];

    const canAccess = await authService.canAccess(userId, resource, action);

    if (!canAccess) {
      res.status(403).json({ error: `Access denied for ${action} on ${resource}` });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - sets user if token is valid but doesn't fail if not
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const jwtService = container.resolve(JwtService);
      const payload = await jwtService.validateAccessToken(token);
      req.user = payload;
    }
  } catch {
    // Ignore errors - authentication is optional
  }

  next();
};
