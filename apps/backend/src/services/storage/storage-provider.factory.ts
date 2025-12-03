import { IStorageProvider } from '@repo/types';
import { container } from 'tsyringe';

import { LoggerService } from '../logger.service';

import { AzureBlobStorageProvider } from './providers/azure-blob-storage.provider';
import { GcpStorageProvider } from './providers/gcp-storage.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

/**
 * Factory to register storage providers based on environment configuration
 *
 * Environment Variables:
 * - STORAGE_PROVIDER: local | s3 | azure | gcp (default: local)
 *
 * Local Storage:
 * - STORAGE_PATH: Base path for local storage (default: ./uploads)
 * - STORAGE_BASE_URL: Base URL for accessing files (default: http://localhost:3001/uploads)
 *
 * AWS S3:
 * - AWS_REGION: AWS region (default: us-east-1)
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - AWS_S3_BUCKET: Default S3 bucket name
 *
 * Azure Blob Storage:
 * - AZURE_STORAGE_ACCOUNT_NAME: Azure storage account name
 * - AZURE_STORAGE_ACCOUNT_KEY: Azure storage account key
 * - AZURE_STORAGE_CONTAINER: Default container name (default: uploads)
 *
 * Google Cloud Storage:
 * - GCP_PROJECT_ID: GCP project ID
 * - GCP_KEY_FILE: Path to GCP service account key file
 * - GCP_STORAGE_BUCKET: Default GCS bucket name
 */
export function registerStorageProvider(): void {
  const logger = container.resolve(LoggerService);
  const provider = process.env['STORAGE_PROVIDER'] || 'local';

  logger.info('Registering storage provider', { provider });

  switch (provider.toLowerCase()) {
    case 's3':
    case 'aws-s3':
      container.register<IStorageProvider>('IStorageProvider', {
        useClass: S3StorageProvider,
      });
      logger.info('Registered AWS S3 storage provider');
      break;

    case 'azure':
    case 'azure-blob':
      container.register<IStorageProvider>('IStorageProvider', {
        useClass: AzureBlobStorageProvider,
      });
      logger.info('Registered Azure Blob storage provider');
      break;

    case 'gcp':
    case 'gcp-storage':
    case 'gcs':
      container.register<IStorageProvider>('IStorageProvider', {
        useClass: GcpStorageProvider,
      });
      logger.info('Registered GCP storage provider');
      break;

    case 'local':
    default:
      container.register<IStorageProvider>('IStorageProvider', {
        useClass: LocalStorageProvider,
      });
      logger.info('Registered local storage provider');
      break;
  }
}
