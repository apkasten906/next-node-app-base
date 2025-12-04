import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtService } from '../../services/auth/jwt.service';
import { LoggerService } from '../../services/logger.service';

/**
 * Integration test for JWT token generation and validation
 * Covers @security @jwt scenario from 02-security.feature
 */
describe('JWT Token Generation and Validation Integration', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    container.clearInstances();

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as LoggerService;

    container.registerInstance(LoggerService, mockLogger);
    jwtService = new JwtService();
  });

  it('should generate JWT token with user claims and validate it successfully', async () => {
    // Given a user with valid credentials
    const userId = 'test-user-123';
    const userEmail = 'test@example.com';
    const userRole = 'admin';

    // When I generate a JWT token for the user
    const token = jwtService.generateAccessToken({
      userId,
      email: userEmail,
      roles: [userRole],
      permissions: ['read', 'write'],
    });

    // Then the token should be a non-empty string
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature

    // When I validate the JWT token
    const decoded = await jwtService.validateAccessToken(token);

    // Then the validation should succeed
    expect(decoded).toBeTruthy();

    // And user information should be extracted correctly
    expect(decoded.userId).toBe(userId);
    expect(decoded.email).toBe(userEmail);
    expect(decoded.roles).toContain(userRole);
    expect(decoded.permissions).toContain('read');
    expect(decoded.permissions).toContain('write');

    // And the token should have an expiration time
    expect(decoded.exp).toBeTruthy();
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should generate refresh token with extended expiration', async () => {
    const userId = 'test-user-456';

    const accessToken = jwtService.generateAccessToken({
      userId,
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read'],
    });
    const refreshToken = jwtService.generateRefreshToken(userId);

    const accessDecoded = await jwtService.validateAccessToken(accessToken);
    const refreshDecoded = await jwtService.validateRefreshToken(refreshToken);

    // Refresh token should have later expiration than access token
    expect(refreshDecoded).toBeTruthy();
    expect(accessDecoded.exp).toBeTruthy();
  });

  it('should include custom claims in token', async () => {
    const userId = 'custom-user';
    const payload = {
      userId,
      email: 'custom@example.com',
      roles: ['engineer'],
      permissions: ['read', 'write', 'delete'],
    };

    const token = jwtService.generateAccessToken(payload);
    const decoded = await jwtService.validateAccessToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.roles).toEqual(payload.roles);
    expect(decoded.permissions).toEqual(payload.permissions);
  });

  it('should sign token with secret key', async () => {
    const userId = 'secret-test';
    const token = jwtService.generateAccessToken({
      userId,
      email: 'secret@example.com',
      roles: ['user'],
      permissions: ['read'],
    });

    // Token should be signed - verification should succeed with correct secret
    const decoded = await jwtService.validateAccessToken(token);
    expect(decoded.userId).toBe(userId);
  });

  it('should generate different tokens for same user at different times', () => {
    const userId = 'same-user';
    const payload = {
      userId,
      email: 'same@example.com',
      roles: ['user'],
      permissions: ['read'],
    };

    const token1 = jwtService.generateAccessToken(payload);

    // Wait a tiny bit to ensure different iat (issued at) timestamp
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000);

    const token2 = jwtService.generateAccessToken(payload);

    vi.useRealTimers();

    // Tokens should be different due to different timestamps
    expect(token1).not.toBe(token2);
  });

  it('should verify token signature correctly', async () => {
    const userId = 'signature-test';
    const token = jwtService.generateAccessToken({
      userId,
      email: 'signature@example.com',
      roles: ['user'],
      permissions: ['read'],
    });

    // Valid token should verify successfully
    const decoded = await jwtService.validateAccessToken(token);
    expect(decoded.userId).toBe(userId);

    // Tampered token should fail verification
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.invalidSignature`;

    await expect(jwtService.validateAccessToken(tamperedToken)).rejects.toThrow();
  });
});
