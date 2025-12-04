import type { SecretMetadata } from '@repo/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EnvironmentSecretsManager } from '../../services/secrets/secrets-manager.service';

describe('EnvironmentSecretsManager', () => {
  let secretsManager: EnvironmentSecretsManager;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Set up test environment variables
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    process.env.REDIS_URL = 'redis://localhost:6379';

    // Create fresh instance
    secretsManager = new EnvironmentSecretsManager();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Secret Storage and Retrieval', () => {
    it('should store and retrieve a secret', async () => {
      await secretsManager.setSecret('API_KEY', 'secret-api-key-value');

      const value = await secretsManager.getSecret('API_KEY');

      expect(value).toBe('secret-api-key-value');
    });

    it('should store secret with metadata', async () => {
      const metadata: SecretMetadata = {
        description: 'Third-party API key',
        tags: { service: 'payment', environment: 'production' },
        rotationEnabled: true,
        rotationPeriodDays: 90,
      };

      await secretsManager.setSecret('PAYMENT_API_KEY', 'pay-key-123', metadata);

      const retrievedValue = await secretsManager.getSecret('PAYMENT_API_KEY');
      const retrievedMetadata = await secretsManager.getSecretMetadata('PAYMENT_API_KEY');

      expect(retrievedValue).toBe('pay-key-123');
      expect(retrievedMetadata.description).toBe('Third-party API key');
      expect(retrievedMetadata.tags).toEqual({ service: 'payment', environment: 'production' });
      expect(retrievedMetadata.rotationEnabled).toBe(true);
      expect(retrievedMetadata.rotationPeriodDays).toBe(90);
      expect(retrievedMetadata.createdAt).toBeInstanceOf(Date);
      expect(retrievedMetadata.updatedAt).toBeInstanceOf(Date);
      expect(retrievedMetadata.version).toBe('1');
    });

    it('should update existing secret and increment version', async () => {
      await secretsManager.setSecret('DB_PASSWORD', 'old-password');
      const initialMetadata = await secretsManager.getSecretMetadata('DB_PASSWORD');

      // Wait a bit to ensure updatedAt differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      await secretsManager.setSecret('DB_PASSWORD', 'new-password');
      const updatedMetadata = await secretsManager.getSecretMetadata('DB_PASSWORD');

      expect(await secretsManager.getSecret('DB_PASSWORD')).toBe('new-password');
      expect(updatedMetadata.version).toBe('2');
      expect(updatedMetadata.createdAt).toEqual(initialMetadata.createdAt);
      expect(updatedMetadata.updatedAt?.getTime()).toBeGreaterThan(
        initialMetadata.updatedAt?.getTime() || 0
      );
    });

    it('should fall back to environment variable if secret not in store', async () => {
      process.env.CUSTOM_SECRET = 'env-value';

      const value = await secretsManager.getSecret('CUSTOM_SECRET');

      expect(value).toBe('env-value');
    });

    it('should throw error if secret not found', async () => {
      await expect(secretsManager.getSecret('NON_EXISTENT_SECRET')).rejects.toThrow(
        'Secret not found: NON_EXISTENT_SECRET'
      );
    });

    it('should retrieve metadata for secret', async () => {
      const metadata: SecretMetadata = {
        description: 'Test secret',
        tags: { type: 'test' },
      };

      await secretsManager.setSecret('TEST_SECRET', 'value', metadata);
      const retrievedMetadata = await secretsManager.getSecretMetadata('TEST_SECRET');

      expect(retrievedMetadata.description).toBe('Test secret');
      expect(retrievedMetadata.tags).toEqual({ type: 'test' });
      expect(retrievedMetadata.version).toBe('1');
    });

    it('should throw error when getting metadata for non-existent secret', async () => {
      await expect(secretsManager.getSecretMetadata('NON_EXISTENT')).rejects.toThrow(
        'Secret not found: NON_EXISTENT'
      );
    });
  });

  describe('Secret Deletion', () => {
    it('should delete a secret', async () => {
      await secretsManager.setSecret('TEMP_SECRET', 'temporary-value');
      expect(await secretsManager.getSecret('TEMP_SECRET')).toBe('temporary-value');

      await secretsManager.deleteSecret('TEMP_SECRET');

      await expect(secretsManager.getSecret('TEMP_SECRET')).rejects.toThrow(
        'Secret not found: TEMP_SECRET'
      );
    });

    it('should not throw when deleting non-existent secret', async () => {
      await expect(secretsManager.deleteSecret('NON_EXISTENT')).resolves.toBeUndefined();
    });

    it('should allow recreating a deleted secret', async () => {
      await secretsManager.setSecret('RECREATE_TEST', 'first-value');
      await secretsManager.deleteSecret('RECREATE_TEST');
      await secretsManager.setSecret('RECREATE_TEST', 'second-value');

      const value = await secretsManager.getSecret('RECREATE_TEST');
      const metadata = await secretsManager.getSecretMetadata('RECREATE_TEST');

      expect(value).toBe('second-value');
      expect(metadata.version).toBe('1'); // New secret starts at version 1
    });
  });

  describe('Secret Listing', () => {
    it('should list all secrets', async () => {
      await secretsManager.setSecret('SECRET_1', 'value1', { description: 'First secret' });
      await secretsManager.setSecret('SECRET_2', 'value2', { description: 'Second secret' });
      await secretsManager.setSecret('SECRET_3', 'value3', { description: 'Third secret' });

      const secrets = await secretsManager.listSecrets();

      // Should include our 3 secrets plus the environment-loaded ones
      expect(secrets.length).toBeGreaterThanOrEqual(3);
      const secretKeys = secrets.map((s) => s.key);
      expect(secretKeys).toContain('SECRET_1');
      expect(secretKeys).toContain('SECRET_2');
      expect(secretKeys).toContain('SECRET_3');
    });

    it('should list secrets with prefix filter', async () => {
      await secretsManager.setSecret('DB_HOST', 'localhost');
      await secretsManager.setSecret('DB_PORT', '5432');
      await secretsManager.setSecret('DB_NAME', 'testdb');
      await secretsManager.setSecret('API_KEY', 'key123');

      const dbSecrets = await secretsManager.listSecrets('DB_');

      expect(dbSecrets.length).toBe(3);
      expect(dbSecrets.every((s) => s.key.startsWith('DB_'))).toBe(true);
    });

    it('should return empty array when no secrets match prefix', async () => {
      const secrets = await secretsManager.listSecrets('NONEXISTENT_PREFIX_');

      expect(secrets).toEqual([]);
    });

    it('should include metadata in listed secrets', async () => {
      await secretsManager.setSecret('METADATA_TEST', 'value', {
        description: 'Test description',
        tags: { env: 'test' },
      });

      const secrets = await secretsManager.listSecrets('METADATA_TEST');

      expect(secrets).toHaveLength(1);
      expect(secrets[0].key).toBe('METADATA_TEST');
      expect(secrets[0].metadata.description).toBe('Test description');
      expect(secrets[0].metadata.tags).toEqual({ env: 'test' });
    });
  });

  describe('Secret Rotation', () => {
    it('should rotate a secret', async () => {
      await secretsManager.setSecret('ROTATE_TEST', 'old-value');
      const oldMetadata = await secretsManager.getSecretMetadata('ROTATE_TEST');

      await secretsManager.rotateSecret('ROTATE_TEST', 'new-value');

      const newValue = await secretsManager.getSecret('ROTATE_TEST');
      const newMetadata = await secretsManager.getSecretMetadata('ROTATE_TEST');

      expect(newValue).toBe('new-value');
      expect(newMetadata.rotationEnabled).toBe(true);
      expect(newMetadata.version).toBe('2');
      expect(newMetadata.createdAt).toEqual(oldMetadata.createdAt);
    });

    it('should throw error when rotating non-existent secret', async () => {
      await expect(secretsManager.rotateSecret('NON_EXISTENT', 'new-value')).rejects.toThrow(
        'Secret not found: NON_EXISTENT'
      );
    });

    it('should preserve metadata during rotation', async () => {
      await secretsManager.setSecret('PRESERVE_TEST', 'value1', {
        description: 'Important secret',
        tags: { team: 'backend' },
        rotationPeriodDays: 30,
      });

      await secretsManager.rotateSecret('PRESERVE_TEST', 'value2');

      const metadata = await secretsManager.getSecretMetadata('PRESERVE_TEST');

      expect(metadata.description).toBe('Important secret');
      expect(metadata.tags).toEqual({ team: 'backend' });
      expect(metadata.rotationPeriodDays).toBe(30);
      expect(metadata.rotationEnabled).toBe(true);
    });

    it('should increment version on each rotation', async () => {
      await secretsManager.setSecret('VERSION_TEST', 'v1');

      await secretsManager.rotateSecret('VERSION_TEST', 'v2');
      expect((await secretsManager.getSecretMetadata('VERSION_TEST')).version).toBe('2');

      await secretsManager.rotateSecret('VERSION_TEST', 'v3');
      expect((await secretsManager.getSecretMetadata('VERSION_TEST')).version).toBe('3');

      await secretsManager.rotateSecret('VERSION_TEST', 'v4');
      expect((await secretsManager.getSecretMetadata('VERSION_TEST')).version).toBe('4');
    });
  });

  describe('Environment Initialization', () => {
    it('should load critical secrets from environment on initialization', async () => {
      // JWT_ACCESS_SECRET should be loaded from env in beforeEach
      const value = await secretsManager.getSecret('JWT_ACCESS_SECRET');

      expect(value).toBe('test-access-secret');
    });

    it('should initialize all critical secrets from environment', async () => {
      const criticalSecrets = [
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'ENCRYPTION_KEY',
        'DATABASE_URL',
        'REDIS_URL',
      ];

      for (const key of criticalSecrets) {
        const value = await secretsManager.getSecret(key);
        expect(value).toBeDefined();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('should include metadata for environment-loaded secrets', async () => {
      const metadata = await secretsManager.getSecretMetadata('JWT_ACCESS_SECRET');

      expect(metadata.description).toContain('Loaded from environment');
      expect(metadata.version).toBe('1');
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Version Management', () => {
    it('should start with version 1 for new secrets', async () => {
      await secretsManager.setSecret('NEW_SECRET', 'value');

      const metadata = await secretsManager.getSecretMetadata('NEW_SECRET');

      expect(metadata.version).toBe('1');
    });

    it('should handle version parameter in getSecret (for future compatibility)', async () => {
      await secretsManager.setSecret('VERSIONED_SECRET', 'value');

      // Version parameter is accepted but not currently used
      const value = await secretsManager.getSecret('VERSIONED_SECRET', '1');

      expect(value).toBe('value');
    });

    it('should increment versions correctly', async () => {
      await secretsManager.setSecret('INCREMENT_TEST', 'v1');

      for (let i = 2; i <= 10; i++) {
        await secretsManager.setSecret('INCREMENT_TEST', `v${i}`);
        const metadata = await secretsManager.getSecretMetadata('INCREMENT_TEST');
        expect(metadata.version).toBe(i.toString());
      }
    });
  });

  describe('Complex Metadata Scenarios', () => {
    it('should handle secrets with comprehensive metadata', async () => {
      const complexMetadata: SecretMetadata = {
        description: 'Production database credentials',
        tags: {
          environment: 'production',
          region: 'us-east-1',
          service: 'postgresql',
          criticality: 'high',
        },
        rotationEnabled: true,
        rotationPeriodDays: 30,
      };

      await secretsManager.setSecret('PROD_DB_CREDS', 'secure-password', complexMetadata);

      const metadata = await secretsManager.getSecretMetadata('PROD_DB_CREDS');

      expect(metadata.description).toBe('Production database credentials');
      expect(metadata.tags).toHaveProperty('environment', 'production');
      expect(metadata.tags).toHaveProperty('region', 'us-east-1');
      expect(metadata.tags).toHaveProperty('service', 'postgresql');
      expect(metadata.tags).toHaveProperty('criticality', 'high');
      expect(metadata.rotationEnabled).toBe(true);
      expect(metadata.rotationPeriodDays).toBe(30);
    });

    it('should allow updating metadata', async () => {
      await secretsManager.setSecret('UPDATE_META', 'value', {
        description: 'Original description',
        tags: { version: 'v1' },
      });

      await secretsManager.setSecret('UPDATE_META', 'value', {
        description: 'Updated description',
        tags: { version: 'v2', updated: 'true' },
      });

      const metadata = await secretsManager.getSecretMetadata('UPDATE_META');

      expect(metadata.description).toBe('Updated description');
      expect(metadata.tags).toEqual({ version: 'v2', updated: 'true' });
    });

    it('should handle empty metadata', async () => {
      await secretsManager.setSecret('MINIMAL_SECRET', 'value');

      const metadata = await secretsManager.getSecretMetadata('MINIMAL_SECRET');

      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.updatedAt).toBeInstanceOf(Date);
      expect(metadata.version).toBe('1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle secrets with special characters', async () => {
      const complexValue = 'p@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?/~`';
      await secretsManager.setSecret('SPECIAL_CHARS', complexValue);

      const value = await secretsManager.getSecret('SPECIAL_CHARS');

      expect(value).toBe(complexValue);
    });

    it('should handle long secret values', async () => {
      const longValue = 'a'.repeat(10000);
      await secretsManager.setSecret('LONG_SECRET', longValue);

      const value = await secretsManager.getSecret('LONG_SECRET');

      expect(value).toBe(longValue);
      expect(value.length).toBe(10000);
    });

    it('should handle secrets with empty string values', async () => {
      await secretsManager.setSecret('EMPTY_SECRET', '');

      const value = await secretsManager.getSecret('EMPTY_SECRET');

      expect(value).toBe('');
    });

    it('should handle keys with special characters', async () => {
      await secretsManager.setSecret('app.config.api-key', 'value');
      await secretsManager.setSecret('app_config_api_key', 'value2');

      expect(await secretsManager.getSecret('app.config.api-key')).toBe('value');
      expect(await secretsManager.getSecret('app_config_api_key')).toBe('value2');
    });

    it('should handle concurrent secret operations', async () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        operations.push(secretsManager.setSecret(`CONCURRENT_${i}`, `value_${i}`));
      }

      await Promise.all(operations);

      for (let i = 0; i < 10; i++) {
        const value = await secretsManager.getSecret(`CONCURRENT_${i}`);
        expect(value).toBe(`value_${i}`);
      }
    });

    it('should handle rapid updates to same secret', async () => {
      await secretsManager.setSecret('RAPID_UPDATE', 'v1');

      const updates = [];
      for (let i = 2; i <= 5; i++) {
        updates.push(secretsManager.setSecret('RAPID_UPDATE', `v${i}`));
      }

      await Promise.all(updates);

      const metadata = await secretsManager.getSecretMetadata('RAPID_UPDATE');
      // Version should be incremented, though exact value depends on execution order
      expect(parseInt(metadata.version || '0')).toBeGreaterThan(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support typical secret lifecycle', async () => {
      // 1. Create secret
      await secretsManager.setSecret('LIFECYCLE_TEST', 'initial-value', {
        description: 'Test secret lifecycle',
        rotationEnabled: true,
        rotationPeriodDays: 90,
      });

      // 2. Retrieve and verify
      expect(await secretsManager.getSecret('LIFECYCLE_TEST')).toBe('initial-value');

      // 3. Rotate secret
      await secretsManager.rotateSecret('LIFECYCLE_TEST', 'rotated-value');
      expect(await secretsManager.getSecret('LIFECYCLE_TEST')).toBe('rotated-value');

      // 4. Update metadata
      await secretsManager.setSecret('LIFECYCLE_TEST', 'rotated-value', {
        description: 'Updated description',
        rotationEnabled: true,
        rotationPeriodDays: 60,
      });

      // 5. Verify metadata update
      const metadata = await secretsManager.getSecretMetadata('LIFECYCLE_TEST');
      expect(metadata.rotationPeriodDays).toBe(60);

      // 6. Delete secret
      await secretsManager.deleteSecret('LIFECYCLE_TEST');
      await expect(secretsManager.getSecret('LIFECYCLE_TEST')).rejects.toThrow();
    });

    it('should support multi-tenant secret management', async () => {
      // Simulate secrets for multiple tenants
      const tenants = ['tenant1', 'tenant2', 'tenant3'];

      for (const tenant of tenants) {
        await secretsManager.setSecret(`${tenant}/API_KEY`, `key-${tenant}`, {
          tags: { tenant },
        });
        await secretsManager.setSecret(`${tenant}/DB_PASSWORD`, `pass-${tenant}`, {
          tags: { tenant },
        });
      }

      // List secrets for specific tenant
      const tenant1Secrets = await secretsManager.listSecrets('tenant1/');
      expect(tenant1Secrets).toHaveLength(2);
      expect(tenant1Secrets.every((s) => s.key.startsWith('tenant1/'))).toBe(true);

      // Verify isolation
      const tenant2Secrets = await secretsManager.listSecrets('tenant2/');
      expect(tenant2Secrets).toHaveLength(2);
      expect(tenant2Secrets.every((s) => s.key.startsWith('tenant2/'))).toBe(true);
    });
  });
});
