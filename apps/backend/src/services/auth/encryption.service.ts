import { IEncryptionService } from '@repo/types';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { injectable } from 'tsyringe';

@injectable()
export class EncryptionService implements IEncryptionService {
  private readonly algorithm: string = 'aes-256-gcm';
  private readonly defaultSaltRounds: number = 10;
  private readonly encryptionKey: Buffer;

  constructor() {
    const key = process.env['ENCRYPTION_KEY'] || 'default-key-please-change-in-production';
    // Derive a 32-byte key from the provided key
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  /**
   * Encrypt plaintext data using AES-256-GCM
   */
  async encrypt(data: string, key?: string): Promise<string> {
    const encKey = key ? crypto.scryptSync(key, 'salt', 32) : this.encryptionKey;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, encKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + authTag + encrypted data (all hex encoded)
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt encrypted data
   */
  async decrypt(encryptedData: string, key?: string): Promise<string> {
    const encKey = key ? crypto.scryptSync(key, 'salt', 32) : this.encryptionKey;
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, encKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash data using bcrypt (one-way)
   */
  async hash(data: string, saltRounds?: number): Promise<string> {
    const rounds = saltRounds || this.defaultSaltRounds;
    return bcrypt.hash(data, rounds);
  }

  /**
   * Compare data with bcrypt hash
   */
  async compareHash(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash);
  }

  /**
   * Generate random token
   */
  async generateToken(length: number = 32): Promise<string> {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random string (URL-safe base64)
   */
  async generateSecureRandom(length: number): Promise<string> {
    return crypto.randomBytes(length).toString('base64url');
  }
}
