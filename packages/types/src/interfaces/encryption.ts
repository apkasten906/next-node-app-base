/**
 * Encryption service interface for hashing, encryption/decryption
 */
export interface IEncryptionService {
  /**
   * Encrypt plaintext data
   */
  encrypt(data: string, key?: string): Promise<string>;

  /**
   * Decrypt encrypted data
   */
  decrypt(encryptedData: string, key?: string): Promise<string>;

  /**
   * Hash data (one-way)
   */
  hash(data: string, saltRounds?: number): Promise<string>;

  /**
   * Compare data with hash
   */
  compareHash(data: string, hash: string): Promise<boolean>;

  /**
   * Generate random token
   */
  generateToken(length?: number): Promise<string>;

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number): Promise<string>;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltRounds: number;
}
