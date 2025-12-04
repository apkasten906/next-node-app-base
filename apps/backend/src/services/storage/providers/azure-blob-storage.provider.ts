import crypto from 'crypto';

import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import {
  DeleteOptions,
  DownloadOptions,
  FileMetadata,
  IStorageProvider,
  ListOptions,
  UploadOptions,
} from '@repo/types';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';

/**
 * Azure Blob Storage provider
 * Stores files in Azure Blob Storage
 */
@injectable()
export class AzureBlobStorageProvider implements IStorageProvider {
  readonly providerName = 'azure-blob';
  private readonly blobServiceClient: BlobServiceClient;
  private readonly defaultContainer: string;

  constructor(private logger: LoggerService) {
    const accountName = process.env['AZURE_STORAGE_ACCOUNT_NAME'] || '';
    const accountKey = process.env['AZURE_STORAGE_ACCOUNT_KEY'] || '';
    this.defaultContainer = process.env['AZURE_STORAGE_CONTAINER'] || 'uploads';

    if (!accountName || !accountKey) {
      this.logger.warn('Azure Storage credentials not configured');
      // Create a dummy client to avoid errors
      this.blobServiceClient = {} as BlobServiceClient;
    } else {
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
      );
    }
  }

  async upload(
    file: Buffer | NodeJS.ReadableStream,
    options: UploadOptions
  ): Promise<FileMetadata> {
    try {
      const filename = options.filename || this.generateFilename(options.contentType);
      const folder = options.folder || 'default';
      const blobName = `${folder}/${filename}`;
      const containerName = options.bucket || this.defaultContainer;

      // Validate file size if it's a Buffer
      if (options.maxSize && Buffer.isBuffer(file) && file.length > options.maxSize) {
        throw new Error(`File size ${file.length} exceeds maximum ${options.maxSize} bytes`);
      }

      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      await this.ensureContainerExists(containerClient);

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      if (Buffer.isBuffer(file)) {
        await blockBlobClient.upload(file, file.length, {
          blobHTTPHeaders: {
            blobContentType: options.contentType || 'application/octet-stream',
          },
          metadata: options.metadata,
        });
      } else {
        // @ts-expect-error - Stream type mismatch between web and node streams
        await blockBlobClient.uploadStream(file, undefined, undefined, {
          blobHTTPHeaders: {
            blobContentType: options.contentType || 'application/octet-stream',
          },
          metadata: options.metadata,
        });
      }

      // Get properties to get the actual size
      const properties = await blockBlobClient.getProperties();

      const url = blockBlobClient.url;

      const metadata: FileMetadata = {
        filename,
        originalName: options.filename || filename,
        mimeType: properties.contentType || 'application/octet-stream',
        size: properties.contentLength || 0,
        path: blobName,
        url,
        uploadedAt: properties.lastModified || new Date(),
        bucket: containerName,
        key: blobName,
      };

      this.logger.info('File uploaded to Azure Blob Storage', {
        container: containerName,
        blob: blobName,
        size: metadata.size,
      });

      return metadata;
    } catch (error) {
      this.logger.error('Azure Blob upload failed', error as Error);
      throw error;
    }
  }

  async uploadMultiple(
    files: Array<{ data: Buffer | NodeJS.ReadableStream; options: UploadOptions }>
  ): Promise<FileMetadata[]> {
    return Promise.all(files.map((f) => this.upload(f.data, f.options)));
  }

  async download(filePath: string, options?: DownloadOptions): Promise<Buffer> {
    try {
      const containerName = options?.bucket || this.defaultContainer;
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filePath);

      const downloadResponse = await blockBlobClient.download();

      if (!downloadResponse.readableStreamBody) {
        throw new Error('No stream body in Azure response');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);

      this.logger.info('File downloaded from Azure Blob Storage', {
        container: containerName,
        blob: filePath,
      });

      return buffer;
    } catch (_error) {
      this.logger.error('Azure Blob download failed', _error as Error);
      throw _error;
    }
  }

  async getSignedUrl(filePath: string, options?: DownloadOptions): Promise<string> {
    try {
      const containerName = options?.bucket || this.defaultContainer;
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filePath);

      const expiresIn = options?.expiresIn || 3600; // 1 hour default
      const expiryDate = new Date(Date.now() + expiresIn * 1000);

      // Generate SAS token
      const sasToken = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse('r'), // read only
        expiresOn: expiryDate,
      });

      return sasToken;
    } catch (error) {
      this.logger.error('Azure Blob getSignedUrl failed', error as Error);
      throw error;
    }
  }

  async delete(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const containerName = options?.bucket || this.defaultContainer;
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filePath);

      await blockBlobClient.delete();

      this.logger.info('File deleted from Azure Blob Storage', {
        container: containerName,
        blob: filePath,
      });

      return true;
    } catch (_error) {
      this.logger.error('Azure Blob delete failed', _error as Error);
      return false;
    }
  }

  async deleteMultiple(paths: string[], options?: DeleteOptions): Promise<boolean[]> {
    return Promise.all(paths.map((p) => this.delete(p, options)));
  }

  async exists(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const containerName = options?.bucket || this.defaultContainer;
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filePath);

      return await blockBlobClient.exists();
    } catch {
      return false;
    }
  }

  async list(options?: ListOptions): Promise<FileMetadata[]> {
    try {
      const containerName = options?.bucket || this.defaultContainer;
      const folder = options?.folder || '';
      const prefix = options?.prefix || folder;

      const containerClient = this.blobServiceClient.getContainerClient(containerName);

      const files: FileMetadata[] = [];
      let count = 0;
      const maxResults = options?.maxResults || 1000;

      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        if (count >= maxResults) break;

        files.push({
          filename: blob.name.split('/').pop() || '',
          originalName: blob.name.split('/').pop() || '',
          mimeType: blob.properties.contentType || 'application/octet-stream',
          size: blob.properties.contentLength || 0,
          path: blob.name,
          url: `${containerClient.url}/${blob.name}`,
          uploadedAt: blob.properties.lastModified || new Date(),
          bucket: containerName,
          key: blob.name,
        });

        count++;
      }

      return files;
    } catch (error) {
      this.logger.error('Azure Blob list failed', error as Error);
      return [];
    }
  }

  async getMetadata(filePath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const containerName = options?.bucket || this.defaultContainer;
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filePath);

      const properties = await blockBlobClient.getProperties();

      return {
        filename: filePath.split('/').pop() || '',
        originalName: filePath.split('/').pop() || '',
        mimeType: properties.contentType || 'application/octet-stream',
        size: properties.contentLength || 0,
        path: filePath,
        url: blockBlobClient.url,
        uploadedAt: properties.lastModified || new Date(),
        bucket: containerName,
        key: filePath,
      };
    } catch (error) {
      this.logger.error('Azure Blob getMetadata failed', error as Error);
      throw error;
    }
  }

  async copy(
    sourcePath: string,
    destinationPath: string,
    options?: DeleteOptions
  ): Promise<FileMetadata> {
    try {
      const containerName = options?.bucket || this.defaultContainer;
      const containerClient = this.blobServiceClient.getContainerClient(containerName);

      const sourceBlob = containerClient.getBlockBlobClient(sourcePath);
      const destBlob = containerClient.getBlockBlobClient(destinationPath);

      await destBlob.beginCopyFromURL(sourceBlob.url);

      this.logger.info('File copied in Azure Blob Storage', {
        container: containerName,
        from: sourcePath,
        to: destinationPath,
      });

      return this.getMetadata(destinationPath, options);
    } catch (error) {
      this.logger.error('Azure Blob copy failed', error as Error);
      throw error;
    }
  }

  async move(
    sourcePath: string,
    destinationPath: string,
    options?: DeleteOptions
  ): Promise<FileMetadata> {
    try {
      const metadata = await this.copy(sourcePath, destinationPath, options);
      await this.delete(sourcePath, options);

      this.logger.info('File moved in Azure Blob Storage', {
        from: sourcePath,
        to: destinationPath,
      });

      return metadata;
    } catch (error) {
      this.logger.error('Azure Blob move failed', error as Error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.defaultContainer);
      await containerClient.exists();
      return true;
    } catch (error) {
      this.logger.error('Azure Blob health check failed', error as Error);
      return false;
    }
  }

  // Helper methods

  private async ensureContainerExists(containerClient: ContainerClient): Promise<void> {
    try {
      const exists = await containerClient.exists();
      if (!exists) {
        await containerClient.create();
      }
    } catch {
      // Container might already exist
    }
  }

  private generateFilename(mimeType?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = mimeType ? this.getExtensionFromMimeType(mimeType) : '';

    return `${timestamp}-${random}${ext}`;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/json': '.json',
      'video/mp4': '.mp4',
      'audio/mpeg': '.mp3',
    };

    // eslint-disable-next-line security/detect-object-injection -- Controlled mime type mapping from predefined set
    return mimeMap[mimeType] || '';
  }
}
