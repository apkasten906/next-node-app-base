import { describe, it, expect, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { EncryptionService } from '../../services/auth/encryption.service';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = container.resolve(EncryptionService);
  });

  describe('hash and compareHash', () => {
    it('should hash a password', async () => {
      const password = 'SecurePassword123!';
      const hash = await encryptionService.hash(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await encryptionService.hash(password);

      const isValid = await encryptionService.compareHash(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await encryptionService.hash(password);

      const isValid = await encryptionService.compareHash(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await encryptionService.hash(password);
      const hash2 = await encryptionService.hash(password);

      expect(hash1).not.toBe(hash2);
      
      // Both should still verify
      expect(await encryptionService.compareHash(password, hash1)).toBe(true);
      expect(await encryptionService.compareHash(password, hash2)).toBe(true);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data', () => {
      const data = 'sensitive-data-123';
      const encrypted = encryptionService.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(data);

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(data);
    });

    it('should encrypt and decrypt complex objects', () => {
      const data = JSON.stringify({
        userId: '123',
        email: 'test@example.com',
        role: 'ADMIN',
      });

      const encrypted = encryptionService.encrypt(data);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(data);
      expect(JSON.parse(decrypted)).toEqual({
        userId: '123',
        email: 'test@example.com',
        role: 'ADMIN',
      });
    });

    it('should generate different ciphertexts for same plaintext', () => {
      const data = 'sensitive-data';
      const encrypted1 = encryptionService.encrypt(data);
      const encrypted2 = encryptionService.encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
      
      // Both should decrypt to same value
      expect(encryptionService.decrypt(encrypted1)).toBe(data);
      expect(encryptionService.decrypt(encrypted2)).toBe(data);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        encryptionService.decrypt('invalid-encrypted-data');
      }).toThrow();
    });
  });

  describe('generateRandomToken', () => {
    it('should generate random token', () => {
      const token = encryptionService.generateRandomToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens', () => {
      const token1 = encryptionService.generateRandomToken();
      const token2 = encryptionService.generateRandomToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate token of specified length', () => {
      const token = encryptionService.generateRandomToken(64);
      
      // Hex encoding: 64 bytes = 128 characters
      expect(token.length).toBe(128);
    });
  });
});
