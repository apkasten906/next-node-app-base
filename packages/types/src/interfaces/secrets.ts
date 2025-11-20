/**
 * Secrets manager interface for secure secrets storage
 */
export interface ISecretsManager {
  /**
   * Get secret value
   */
  getSecret(key: string, version?: string): Promise<string>;

  /**
   * Set secret value
   */
  setSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void>;

  /**
   * Delete secret
   */
  deleteSecret(key: string): Promise<void>;

  /**
   * List all secret keys
   */
  listSecrets(prefix?: string): Promise<SecretInfo[]>;

  /**
   * Rotate secret
   */
  rotateSecret(key: string, newValue: string): Promise<void>;

  /**
   * Get secret metadata
   */
  getSecretMetadata(key: string): Promise<SecretMetadata>;
}

export interface SecretMetadata {
  description?: string;
  tags?: Record<string, string>;
  rotationEnabled?: boolean;
  rotationPeriodDays?: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: string;
}

export interface SecretInfo {
  key: string;
  metadata: SecretMetadata;
  versions?: string[];
}

export enum SecretsProvider {
  VAULT = 'vault',
  AWS_SECRETS_MANAGER = 'aws_secrets_manager',
  AZURE_KEY_VAULT = 'azure_key_vault',
  GCP_SECRET_MANAGER = 'gcp_secret_manager',
  ENVIRONMENT = 'environment',
}
