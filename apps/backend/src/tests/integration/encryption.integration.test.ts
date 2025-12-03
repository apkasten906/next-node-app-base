import { describe, expect, it } from 'vitest';
import { container } from '../../container';
import { EncryptionService } from '../../services/auth/encryption.service';

describe('EncryptionService Integration', () => {
  it('encrypts and decrypts data correctly', async () => {
    const enc = container.resolve(EncryptionService);
    const original = 'sensitive data';
    const encrypted = await enc.encrypt(original);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(original);

    const decrypted = await enc.decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('hashes and compares values using bcrypt', async () => {
    const enc = container.resolve(EncryptionService);
    const plain = 'My$ecretP@ss';
    const hash = await enc.hash(plain);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);

    const ok = await enc.compareHash(plain, hash);
    expect(ok).toBe(true);
  });
});
