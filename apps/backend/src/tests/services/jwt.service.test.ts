import { describe, it, expect, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { JwtService } from '../../services/auth/jwt.service';

describe('JwtService', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret-key';
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key';
    jwtService = container.resolve(JwtService);
  });

  describe('sign and verify', () => {
    it('should sign and verify a token', () => {
      const payload = { userId: '123', role: 'USER' };
      const token = jwtService.sign(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwtService.verify(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('123');
      expect(decoded?.role).toBe('USER');
    });

    it('should sign token with expiration', () => {
      const payload = { userId: '123' };
      const token = jwtService.sign(payload, { expiresIn: '1h' });

      expect(token).toBeDefined();

      const decoded = jwtService.verify(token);
      expect(decoded).toBeDefined();
      expect(decoded?.exp).toBeDefined();
    });

    it('should return null for invalid token', () => {
      const decoded = jwtService.verify('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for expired token', () => {
      const payload = { userId: '123' };
      const token = jwtService.sign(payload, { expiresIn: '0s' });

      // Wait a moment for token to expire
      const decoded = jwtService.verify(token);
      expect(decoded).toBeNull();
    });
  });

  describe('refresh token', () => {
    it('should generate and verify refresh token', () => {
      const payload = { userId: '123', type: 'refresh' };
      const refreshToken = jwtService.signRefresh(payload);

      expect(refreshToken).toBeDefined();

      const decoded = jwtService.verifyRefresh(refreshToken);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('123');
      expect(decoded?.type).toBe('refresh');
    });

    it('should not verify refresh token with access secret', () => {
      const payload = { userId: '123' };
      const refreshToken = jwtService.signRefresh(payload);

      const decoded = jwtService.verify(refreshToken);
      expect(decoded).toBeNull();
    });
  });

  describe('decode', () => {
    it('should decode token without verification', () => {
      const payload = { userId: '123', role: 'ADMIN' };
      const token = jwtService.sign(payload);

      const decoded = jwtService.decode(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('123');
      expect(decoded?.role).toBe('ADMIN');
    });

    it('should return null for invalid token format', () => {
      const decoded = jwtService.decode('not-a-jwt');
      expect(decoded).toBeNull();
    });
  });
});
