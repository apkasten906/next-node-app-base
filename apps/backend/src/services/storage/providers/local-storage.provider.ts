import fs from 'fs/promises';
import path from 'path';
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
 * Local filesystem storage provider
 * Stores files in the local filesystem (development and testing)
 */
@injectable()
export class LocalStorageProvider implements IStorageProvider {
  readonly providerName = 'local';
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(private logger: LoggerService) {
    this.basePath = process.env['STORAGE_PATH'] || path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env['STORAGE_BASE_URL'] || 'http://localhost:3001/uploads';

    // Ensure base directory exists
    this.ensureDirectory(this.basePath).catch((error) => {
      this.logger.error('Failed to create storage directory', error);
    });
  }

  async upload(file: Buffer | NodeJS.ReadableStream, options: UploadOptions): Promise<FileMetadata> {
    try {
      const filename = options.filename || this.generateFilename(options.contentType);
      const folder = options.folder || 'default';
      const filePath = path.join(folder, filename);
      const fullPath = path.join(this.basePath, filePath);

      // Ensure folder exists
      await this.ensureDirectory(path.dirname(fullPath));

      // Validate file size
      if (options.maxSize && Buffer.isBuffer(file) && file.length > options.maxSize) {
        throw new Error(`File size ${file.length} exceeds maximum ${options.maxSize} bytes`);
      }

      // Write file
      if (Buffer.isBuffer(file)) {
        await fs.writeFile(fullPath, file);
      } else {
        // Handle stream
        const writeStream = require('fs').createWriteStream(fullPath);
        await new Promise((resolve, reject) => {
          file.pipe(writeStream);
          file.on('error', reject);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      }

      const stats = await fs.stat(fullPath);

      const metadata: FileMetadata = {
        filename,
        originalName: options.filename || filename,
        mimeType: options.contentType || 'application/octet-stream',
        size: stats.size,
        path: filePath,
        url: `${this.baseUrl}/${filePath}`,
        uploadedAt: new Date(),
      };

      this.logger.info('File uploaded to local storage', { path: filePath, size: stats.size });

      return metadata;
    } catch (error) {
      this.logger.error('Local storage upload failed', error as Error);
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
      const fullPath = path.join(this.basePath, filePath);
      const buffer = await fs.readFile(fullPath);

      this.logger.info('File downloaded from local storage', { path: filePath });

      return buffer;
    } catch (error) {
      this.logger.error('Local storage download failed', error as Error);
      throw error;
    }
  }

  async getSignedUrl(filePath: string, options?: DownloadOptions): Promise<string> {
    // For local storage, return the direct URL
    // In production, this could return a signed URL with expiration
    return `${this.baseUrl}/${filePath}`;
  }

  async delete(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.unlink(fullPath);

      this.logger.info('File deleted from local storage', { path: filePath });

      return true;
    } catch (error) {
      this.logger.error('Local storage delete failed', error as Error);
      return false;
    }
  }

  async deleteMultiple(paths: string[], options?: DeleteOptions): Promise<boolean[]> {
    return Promise.all(paths.map((p) => this.delete(p, options)));
  }

  async exists(filePath: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(options?: ListOptions): Promise<FileMetadata[]> {
    try {
      const folder = options?.folder || '';
      const fullPath = path.join(this.basePath, folder);

      const files = await this.listFilesRecursive(fullPath, folder);

      // Apply prefix filter if provided
      const filteredFiles = options?.prefix
        ? files.filter((f) => f.path.startsWith(options.prefix!))
        : files;

      // Apply max results limit
      const limitedFiles = options?.maxResults
        ? filteredFiles.slice(0, options.maxResults)
        : filteredFiles;

      return limitedFiles;
    } catch (error) {
      this.logger.error('Local storage list failed', error as Error);
      return [];
    }
  }

  async getMetadata(filePath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      const stats = await fs.stat(fullPath);

      return {
        filename: path.basename(filePath),
        originalName: path.basename(filePath),
        mimeType: 'application/octet-stream', // Would need mime-type detection
        size: stats.size,
        path: filePath,
        url: `${this.baseUrl}/${filePath}`,
        uploadedAt: stats.birthtime,
      };
    } catch (error) {
      this.logger.error('Local storage getMetadata failed', error as Error);
      throw error;
    }
  }

  async copy(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const sourceFullPath = path.join(this.basePath, sourcePath);
      const destFullPath = path.join(this.basePath, destinationPath);

      // Ensure destination directory exists
      await this.ensureDirectory(path.dirname(destFullPath));

      await fs.copyFile(sourceFullPath, destFullPath);

      this.logger.info('File copied in local storage', { from: sourcePath, to: destinationPath });

      return this.getMetadata(destinationPath);
    } catch (error) {
      this.logger.error('Local storage copy failed', error as Error);
      throw error;
    }
  }

  async move(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata> {
    try {
      const sourceFullPath = path.join(this.basePath, sourcePath);
      const destFullPath = path.join(this.basePath, destinationPath);

      // Ensure destination directory exists
      await this.ensureDirectory(path.dirname(destFullPath));

      await fs.rename(sourceFullPath, destFullPath);

      this.logger.info('File moved in local storage', { from: sourcePath, to: destinationPath });

      return this.getMetadata(destinationPath);
    } catch (error) {
      this.logger.error('Local storage move failed', error as Error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if base directory is accessible
      await fs.access(this.basePath);

      // Try to write a test file
      const testPath = path.join(this.basePath, '.healthcheck');
      await fs.writeFile(testPath, 'ok');
      await fs.unlink(testPath);

      return true;
    } catch (error) {
      this.logger.error('Local storage health check failed', error as Error);
      return false;
    }
  }

  // Helper methods

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
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

    return mimeMap[mimeType] || '';
  }

  private async listFilesRecursive(dirPath: string, relativePath: string): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursive(fullPath, relPath);
          results.push(...subFiles);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          results.push({
            filename: entry.name,
            originalName: entry.name,
            mimeType: 'application/octet-stream',
            size: stats.size,
            path: relPath.replace(/\\/g, '/'),
            url: `${this.baseUrl}/${relPath.replace(/\\/g, '/')}`,
            uploadedAt: stats.birthtime,
          });
        }
      }
    } catch (error) {
      // Directory might not exist
    }

    return results;
  }
}
