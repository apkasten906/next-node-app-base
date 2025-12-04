import { container } from 'tsyringe';
import { beforeEach, describe, expect, it } from 'vitest';

import { JwtService } from '../../services/auth/jwt.service';

describe('JwtService', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-key';
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key';
    jwtService = container.resolve(JwtService);
  });

  describe('generateAccessToken and validateAccessToken', () => {
    it('should generate and validate an access token', async () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        roles: ['USER'],
        permissions: [],
      };
      const token = jwtService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = await jwtService.validateAccessToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe('123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should throw error for invalid access token', async () => {
      await expect(jwtService.validateAccessToken('invalid-token')).rejects.toThrow(
        'Invalid or expired access token'
      );
    });

    it('should throw error for expired access token', async () => {
      // Create a token that expires immediately
      process.env['JWT_ACCESS_EXPIRY'] = '0s';
      const jwtServiceExpired = container.resolve(JwtService);

      const payload = {
        userId: '123',
        email: 'test@example.com',
        roles: ['USER'],
        permissions: [],
      };
      const token = jwtServiceExpired.generateAccessToken(payload);

      // Wait a moment for token to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(jwtServiceExpired.validateAccessToken(token)).rejects.toThrow(
        'Invalid or expired access token'
      );
    });
  });

  describe('generateRefreshToken and validateRefreshToken', () => {
    it('should generate and validate a refresh token', async () => {
      const userId = '123';
      const refreshToken = jwtService.generateRefreshToken(userId);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');

      const decoded = await jwtService.validateRefreshToken(refreshToken);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe('123');
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(jwtService.validateRefreshToken('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should not validate refresh token with access secret', async () => {
      const userId = '123';
      const refreshToken = jwtService.generateRefreshToken(userId);

      // validateAccessToken should fail for a refresh token
      await expect(jwtService.validateAccessToken(refreshToken)).rejects.toThrow();
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      // Ensure clean environment
      process.env['JWT_ACCESS_EXPIRY'] = '15m';
      process.env['JWT_REFRESH_EXPIRY'] = '7d';
      const cleanJwtService = container.resolve(JwtService);

      const payload = {
        userId: '123',
        email: 'test@example.com',
        roles: ['USER'],
        permissions: [],
      };
      const result = cleanJwtService.generateTokens(payload);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.tokenType).toBe('Bearer');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        roles: ['ADMIN'],
        permissions: [],
      };
      const token = jwtService.generateAccessToken(payload);

      const decoded = jwtService.decodeToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should return null for invalid token format', () => {
      const decoded = jwtService.decodeToken('not-a-jwt');
      expect(decoded).toBeNull();
    });
  });
});
