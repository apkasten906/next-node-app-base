import { describe, expect, it } from 'vitest';

import { EnvironmentSecretsManager } from '../../services/secrets/secrets-manager.service';

describe('Secrets Manager Integration', () => {
  it('loads secrets from environment variables', async () => {
    process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-xyz';
    const mgr = new EnvironmentSecretsManager();

    const value = await mgr.getSecret('JWT_ACCESS_SECRET');
    expect(value).toBe('test-access-secret-xyz');

    // Unknown secret should fall back to env and throw if missing
    delete process.env['SOME_RANDOM_SECRET'];
    try {
       
      await mgr.getSecret('SOME_RANDOM_SECRET');
      throw new Error('Expected getSecret to throw for missing secret');
    } catch (err: unknown) {
      expect((err as Error).message).toMatch(/Secret not found/);
    }
  });
});
