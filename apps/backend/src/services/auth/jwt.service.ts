import { TokenPayload, TokenResult } from '@repo/types';
import jwt from 'jsonwebtoken';
import { injectable } from 'tsyringe';

@injectable()
export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env['JWT_ACCESS_SECRET'] || 'access-secret-change-me';
    this.refreshTokenSecret = process.env['JWT_REFRESH_SECRET'] || 'refresh-secret-change-me';
    this.accessTokenExpiry = process.env['JWT_ACCESS_EXPIRY'] || '15m';
    this.refreshTokenExpiry = process.env['JWT_REFRESH_EXPIRY'] || '7d';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
    } as jwt.SignOptions);
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): TokenResult {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload['userId']);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.accessTokenExpiry),
      tokenType: 'Bearer',
    };
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
      return decoded;
    } catch {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<{ userId: string }> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as { userId: string };
      return decoded;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without validation (for inspection)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    // eslint-disable-next-line security/detect-object-injection -- Controlled access to time unit multipliers with validated keys from regex pattern (s/m/h/d)
    return value * (multipliers[unit] || 60);
  }
}
