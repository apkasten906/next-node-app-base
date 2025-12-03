import {
  DeleteOptions,
  DownloadOptions,
  FileMetadata,
  IStorageProvider,
  IStorageService,
  ListOptions,
  UploadOptions,
} from '@repo/types';
import { inject, injectable } from 'tsyringe';

import { LoggerService } from '../logger.service';

/**
 * Main storage service that delegates to the configured storage provider
 * Provides a unified interface for file storage operations
 */
@injectable()
export class StorageService implements IStorageService {
  constructor(
    @inject('IStorageProvider') private provider: IStorageProvider,
    private logger: LoggerService
  ) {
    this.logger.info('Storage service initialized', { provider: this.provider.providerName });
  }

  async upload(
    file: Buffer | NodeJS.ReadableStream,
    options: UploadOptions
  ): Promise<FileMetadata> {
    this.logger.debug('Uploading file', { filename: options.filename, folder: options.folder });

    // Validate MIME type if allowed types are specified
    if (options.allowedMimeTypes && options.contentType) {
      if (!options.allowedMimeTypes.includes(options.contentType)) {
        throw new Error(
          `File type ${options.contentType} not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`
        );
      }
    }

    return this.provider.upload(file, options);
  }

  async uploadMultiple(
    files: Array<{ data: Buffer | NodeJS.ReadableStream; options: UploadOptions }>
  ): Promise<FileMetadata[]> {
    this.logger.debug('Uploading multiple files', { count: files.length });
    return this.provider.uploadMultiple(files);
  }

  async download(filePath: string, options?: DownloadOptions): Promise<Buffer> {
    this.logger.debug('Downloading file', { path: filePath });
    return this.provider.download(filePath, options);
  }

  async getSignedUrl(filePath: string, options?: DownloadOptions): Promise<string> {
    this.logger.debug('Getting signed URL', { path: filePath });
    return this.provider.getSignedUrl(filePath, options);
  }

  async delete(filePath: string, options?: DeleteOptions): Promise<boolean> {
    this.logger.debug('Deleting file', { path: filePath });
    return this.provider.delete(filePath, options);
  }

  async deleteMultiple(paths: string[], options?: DeleteOptions): Promise<boolean[]> {
    this.logger.debug('Deleting multiple files', { count: paths.length });
    return this.provider.deleteMultiple(paths, options);
  }

  async exists(filePath: string, options?: DeleteOptions): Promise<boolean> {
    return this.provider.exists(filePath, options);
  }

  async list(options?: ListOptions): Promise<FileMetadata[]> {
    this.logger.debug('Listing files', { folder: options?.folder, prefix: options?.prefix });
    return this.provider.list(options);
  }

  async getMetadata(filePath: string, options?: DeleteOptions): Promise<FileMetadata> {
    this.logger.debug('Getting file metadata', { path: filePath });
    return this.provider.getMetadata(filePath, options);
  }

  async copy(
    sourcePath: string,
    destinationPath: string,
    options?: DeleteOptions
  ): Promise<FileMetadata> {
    this.logger.debug('Copying file', { from: sourcePath, to: destinationPath });
    return this.provider.copy(sourcePath, destinationPath, options);
  }

  async move(
    sourcePath: string,
    destinationPath: string,
    options?: DeleteOptions
  ): Promise<FileMetadata> {
    this.logger.debug('Moving file', { from: sourcePath, to: destinationPath });
    return this.provider.move(sourcePath, destinationPath, options);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const isHealthy = await this.provider.healthCheck();
      this.logger.info('Storage health check', {
        provider: this.provider.providerName,
        healthy: isHealthy,
      });
      return isHealthy;
    } catch (error) {
      this.logger.error('Storage health check failed', error as Error);
      return false;
    }
  }

  getProviderName(): string {
    return this.provider.providerName;
  }
}
