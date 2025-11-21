import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
 * AWS S3 storage provider
 * Stores files in Amazon S3
 */
@injectable()
export class S3StorageProvider implements IStorageProvider {
  readonly providerName = 'aws-s3';
  private readonly client: S3Client;
  private readonly defaultBucket: string;

  constructor(private logger: LoggerService) {
    const region = process.env['AWS_REGION'] || 'us-east-1';
    this.defaultBucket = process.env['AWS_S3_BUCKET'] || '';

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
      },
    });

    if (!this.defaultBucket) {
      this.logger.warn('AWS_S3_BUCKET not configured, S3 storage may not work correctly');
    }
  }

  async upload(file: Buffer | NodeJS.ReadableStream, options: UploadOptions): Promise<FileMetadata> {
    try {
      const filename = options.filename || this.generateFilename(options.contentType);
      const folder = options.folder || 'default';
      const key = `${folder}/${filename}`;
      const bucket = options.bucket || this.defaultBucket;

      // Validate file size if it's a Buffer
      if (options.maxSize && Buffer.isBuffer(file) && file.length > options.maxSize) {
        throw new Error(`File size ${file.length} exceeds maximum ${options.maxSize} bytes`);
      }

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
        ACL: options.makePublic ? 'public-read' : 'private',
      });

      await this.client.send(command);

      // Get the uploaded file's metadata
      const headCommand = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const headResult = await this.client.send(headCommand);

      const url = options.makePublic
        ? `https://${bucket}.s3.amazonaws.com/${key}`
        : await this.getSignedUrl(key, { bucket });

      const metadata: FileMetadata = {
        filename,
        originalName: options.filename || filename,
        mimeType: headResult.ContentType || 'application/octet-stream',
        size: headResult.ContentLength || 0,
        path: key,
        url,
        uploadedAt: headResult.LastModified || new Date(),
        bucket,
        key,
      };

      this.logger.info('File uploaded to S3', { bucket, key, size: metadata.size });

      return metadata;
    } catch (error) {
      this.logger.error('S3 upload failed', error as Error);
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
      const bucket = options?.bucket || this.defaultBucket;

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: filePath,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      this.logger.info('File downloaded from S3', { bucket, key: filePath });

      return buffer;
    } catch (error) {
      this.logger.error('S3 download failed', error as Error);
      throw error;
    }
  }

  async getSignedUrl(filePath: string, options?: DownloadOptions): Promise<string> {
    try {
      const bucket = options?.bucket || this.defaultBucket;
      const expiresIn = options?.expiresIn || 3600; // 1 hour default

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: filePath,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });

      return url;
    } catch (error) {
      this.logger.error('S3 getSignedUrl failed', error as Error);
      throw error;
    }
  }

  async delete(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const bucket = options?.bucket || this.defaultBucket;

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: filePath,
      });

      await this.client.send(command);

      this.logger.info('File deleted from S3', { bucket, key: filePath });

      return true;
    } catch (error) {
      this.logger.error('S3 delete failed', error as Error);
      return false;
    }
  }

  async deleteMultiple(paths: string[], options?: DeleteOptions): Promise<boolean[]> {
    try {
      const bucket = options?.bucket || this.defaultBucket;

      if (paths.length === 0) {
        return [];
      }

      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: paths.map((key) => ({ Key: key })),
        },
      });

      const response = await this.client.send(command);

      const deletedKeys = new Set(response.Deleted?.map((d) => d.Key) || []);
      const results = paths.map((path) => deletedKeys.has(path));

      this.logger.info('Multiple files deleted from S3', { bucket, count: deletedKeys.size });

      return results;
    } catch (error) {
      this.logger.error('S3 deleteMultiple failed', error as Error);
      return paths.map(() => false);
    }
  }

  async exists(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const bucket = options?.bucket || this.defaultBucket;

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: filePath,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async list(options?: ListOptions): Promise<FileMetadata[]> {
    try {
      const bucket = options?.bucket || this.defaultBucket;
      const folder = options?.folder || '';
      const prefix = options?.prefix || folder;

      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: options?.maxResults || 1000,
        ContinuationToken: options?.continuationToken,
      });

      const response = await this.client.send(command);

      const files: FileMetadata[] = (response.Contents || []).map((item) => ({
        filename: item.Key?.split('/').pop() || '',
        originalName: item.Key?.split('/').pop() || '',
        mimeType: 'application/octet-stream',
        size: item.Size || 0,
        path: item.Key || '',
        url: `https://${bucket}.s3.amazonaws.com/${item.Key}`,
        uploadedAt: item.LastModified || new Date(),
        bucket,
        key: item.Key || '',
      }));

      return files;
    } catch (error) {
      this.logger.error('S3 list failed', error as Error);
      return [];
    }
  }

  async getMetadata(filePath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const bucket = options?.bucket || this.defaultBucket;

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: filePath,
      });

      const response = await this.client.send(command);

      return {
        filename: filePath.split('/').pop() || '',
        originalName: filePath.split('/').pop() || '',
        mimeType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
        path: filePath,
        url: `https://${bucket}.s3.amazonaws.com/${filePath}`,
        uploadedAt: response.LastModified || new Date(),
        bucket,
        key: filePath,
      };
    } catch (error) {
      this.logger.error('S3 getMetadata failed', error as Error);
      throw error;
    }
  }

  async copy(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const bucket = options?.bucket || this.defaultBucket;

      const command = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${sourcePath}`,
        Key: destinationPath,
      });

      await this.client.send(command);

      this.logger.info('File copied in S3', { bucket, from: sourcePath, to: destinationPath });

      return this.getMetadata(destinationPath, options);
    } catch (error) {
      this.logger.error('S3 copy failed', error as Error);
      throw error;
    }
  }

  async move(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      // Copy then delete
      const metadata = await this.copy(sourcePath, destinationPath, options);
      await this.delete(sourcePath, options);

      this.logger.info('File moved in S3', { from: sourcePath, to: destinationPath });

      return metadata;
    } catch (error) {
      this.logger.error('S3 move failed', error as Error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to list objects with max 1 result
      const command = new ListObjectsV2Command({
        Bucket: this.defaultBucket,
        MaxKeys: 1,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      this.logger.error('S3 health check failed', error as Error);
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
