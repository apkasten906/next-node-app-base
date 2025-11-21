import { Storage, Bucket, File } from '@google-cloud/storage';
import { injectable } from 'tsyringe';
import {
  IStorageProvider,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  DeleteOptions,
  ListOptions,
} from '@repo/types';
import { LoggerService } from '../logger.service';
import crypto from 'crypto';

/**
 * Google Cloud Storage provider
 * Stores files in Google Cloud Storage
 */
@injectable()
export class GcpStorageProvider implements IStorageProvider {
  readonly providerName = 'gcp-storage';
  private readonly storage: Storage;
  private readonly defaultBucket: string;

  constructor(private logger: LoggerService) {
    const projectId = process.env['GCP_PROJECT_ID'];
    const keyFilename = process.env['GCP_KEY_FILE'];
    this.defaultBucket = process.env['GCP_STORAGE_BUCKET'] || '';

    if (!projectId || !keyFilename) {
      this.logger.warn('GCP credentials not configured');
      this.storage = {} as Storage;
    } else {
      this.storage = new Storage({
        projectId,
        keyFilename,
      });
    }

    if (!this.defaultBucket) {
      this.logger.warn('GCP_STORAGE_BUCKET not configured');
    }
  }

  async upload(file: Buffer | NodeJS.ReadableStream, options: UploadOptions): Promise<FileMetadata> {
    try {
      const filename = options.filename || this.generateFilename(options.contentType);
      const folder = options.folder || 'default';
      const blobName = `${folder}/${filename}`;
      const bucketName = options.bucket || this.defaultBucket;

      // Validate file size if it's a Buffer
      if (options.maxSize && Buffer.isBuffer(file) && file.length > options.maxSize) {
        throw new Error(`File size ${file.length} exceeds maximum ${options.maxSize} bytes`);
      }

      const bucket = this.storage.bucket(bucketName);
      const blob = bucket.file(blobName);

      const uploadOptions = {
        metadata: {
          contentType: options.contentType || 'application/octet-stream',
          metadata: options.metadata,
        },
        public: options.makePublic || false,
      };

      if (Buffer.isBuffer(file)) {
        await blob.save(file, uploadOptions);
      } else {
        // Handle stream
        await new Promise<void>((resolve, reject) => {
          file
            .pipe(
              blob.createWriteStream({
                metadata: uploadOptions.metadata,
                public: uploadOptions.public,
              })
            )
            .on('error', reject)
            .on('finish', resolve);
        });
      }

      // Get metadata
      const [metadata] = await blob.getMetadata();

      const url = options.makePublic
        ? `https://storage.googleapis.com/${bucketName}/${blobName}`
        : await this.getSignedUrl(blobName, { bucket: bucketName });

      const fileMetadata: FileMetadata = {
        filename,
        originalName: options.filename || filename,
        mimeType: metadata.contentType || 'application/octet-stream',
        size: parseInt(metadata.size || '0', 10),
        path: blobName,
        url,
        uploadedAt: new Date(metadata.timeCreated || Date.now()),
        bucket: bucketName,
        key: blobName,
      };

      this.logger.info('File uploaded to GCP Storage', {
        bucket: bucketName,
        blob: blobName,
        size: fileMetadata.size,
      });

      return fileMetadata;
    } catch (error) {
      this.logger.error('GCP Storage upload failed', error as Error);
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
      const bucketName = options?.bucket || this.defaultBucket;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      const [buffer] = await file.download();

      this.logger.info('File downloaded from GCP Storage', {
        bucket: bucketName,
        file: filePath,
      });

      return buffer;
    } catch (error) {
      this.logger.error('GCP Storage download failed', error as Error);
      throw error;
    }
  }

  async getSignedUrl(filePath: string, options?: DownloadOptions): Promise<string> {
    try {
      const bucketName = options?.bucket || this.defaultBucket;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      const expiresIn = options?.expiresIn || 3600; // 1 hour default
      const expiryDate = Date.now() + expiresIn * 1000;

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: expiryDate,
      });

      return url;
    } catch (error) {
      this.logger.error('GCP Storage getSignedUrl failed', error as Error);
      throw error;
    }
  }

  async delete(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const bucketName = options?.bucket || this.defaultBucket;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      await file.delete();

      this.logger.info('File deleted from GCP Storage', {
        bucket: bucketName,
        file: filePath,
      });

      return true;
    } catch (error) {
      this.logger.error('GCP Storage delete failed', error as Error);
      return false;
    }
  }

  async deleteMultiple(paths: string[], options?: DeleteOptions): Promise<boolean[]> {
    return Promise.all(paths.map((p) => this.delete(p, options)));
  }

  async exists(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const bucketName = options?.bucket || this.defaultBucket;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async list(options?: ListOptions): Promise<FileMetadata[]> {
    try {
      const bucketName = options?.bucket || this.defaultBucket;
      const folder = options?.folder || '';
      const prefix = options?.prefix || folder;

      const bucket = this.storage.bucket(bucketName);

      const [files] = await bucket.getFiles({
        prefix,
        maxResults: options?.maxResults || 1000,
      });

      const fileMetadata: FileMetadata[] = await Promise.all(
        files.map(async (file) => {
          const [metadata] = await file.getMetadata();

          return {
            filename: file.name.split('/').pop() || '',
            originalName: file.name.split('/').pop() || '',
            mimeType: metadata.contentType || 'application/octet-stream',
            size: parseInt(metadata.size || '0', 10),
            path: file.name,
            url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
            uploadedAt: new Date(metadata.timeCreated || Date.now()),
            bucket: bucketName,
            key: file.name,
          };
        })
      );

      return fileMetadata;
    } catch (error) {
      this.logger.error('GCP Storage list failed', error as Error);
      return [];
    }
  }

  async getMetadata(filePath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const bucketName = options?.bucket || this.defaultBucket;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      const [metadata] = await file.getMetadata();

      return {
        filename: filePath.split('/').pop() || '',
        originalName: filePath.split('/').pop() || '',
        mimeType: metadata.contentType || 'application/octet-stream',
        size: parseInt(metadata.size || '0', 10),
        path: filePath,
        url: `https://storage.googleapis.com/${bucketName}/${filePath}`,
        uploadedAt: new Date(metadata.timeCreated || Date.now()),
        bucket: bucketName,
        key: filePath,
      };
    } catch (error) {
      this.logger.error('GCP Storage getMetadata failed', error as Error);
      throw error;
    }
  }

  async copy(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const bucketName = options?.bucket || this.defaultBucket;
      const bucket = this.storage.bucket(bucketName);
      const sourceFile = bucket.file(sourcePath);
      const destFile = bucket.file(destinationPath);

      await sourceFile.copy(destFile);

      this.logger.info('File copied in GCP Storage', {
        bucket: bucketName,
        from: sourcePath,
        to: destinationPath,
      });

      return this.getMetadata(destinationPath, options);
    } catch (error) {
      this.logger.error('GCP Storage copy failed', error as Error);
      throw error;
    }
  }

  async move(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const bucketName = options?.bucket || this.defaultBucket;
      const bucket = this.storage.bucket(bucketName);
      const sourceFile = bucket.file(sourcePath);
      const destFile = bucket.file(destinationPath);

      await sourceFile.move(destFile);

      this.logger.info('File moved in GCP Storage', {
        bucket: bucketName,
        from: sourcePath,
        to: destinationPath,
      });

      return this.getMetadata(destinationPath, options);
    } catch (error) {
      this.logger.error('GCP Storage move failed', error as Error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.defaultBucket);
      await bucket.exists();
      return true;
    } catch (error) {
      this.logger.error('GCP Storage health check failed', error as Error);
      return false;
    }
  }

  // Helper methods

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

    return mimeMap[mimeType] || '';
  }
}
