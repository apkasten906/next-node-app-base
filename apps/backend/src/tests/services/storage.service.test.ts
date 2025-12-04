import { Readable } from 'stream';

import {
  DownloadOptions,
  FileMetadata,
  IStorageProvider,
  ListOptions,
  UploadOptions,
} from '@repo/types';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggerService } from '../../services/logger.service';
import { StorageService } from '../../services/storage/storage.service';

// Mock storage provider
class MockStorageProvider implements IStorageProvider {
  providerName = 'mock';
  private files = new Map<string, { data: Buffer; metadata: FileMetadata }>();

  async upload(file: Buffer | Readable, options: UploadOptions): Promise<FileMetadata> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from('mock-data');
    const path = `${options.folder || ''}/${options.filename}`;

    const metadata: FileMetadata = {
      filename: options.filename,
      path,
      size: buffer.length,
      contentType: options.contentType || 'application/octet-stream',
      uploadedAt: new Date(),
      url: `https://mock-storage.com/${path}`,
    };

    this.files.set(path, { data: buffer, metadata });
    return metadata;
  }

  async uploadMultiple(
    files: Array<{ data: Buffer | Readable; options: UploadOptions }>
  ): Promise<FileMetadata[]> {
    return Promise.all(files.map((f) => this.upload(f.data, f.options)));
  }

  async download(filePath: string): Promise<Buffer> {
    const file = this.files.get(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    return file.data;
  }

  async getSignedUrl(filePath: string, options?: DownloadOptions): Promise<string> {
    const expiresIn = options?.expiresIn || 3600;
    return `https://mock-storage.com/${filePath}?expires=${expiresIn}`;
  }

  async delete(filePath: string): Promise<boolean> {
    return this.files.delete(filePath);
  }

  async deleteMultiple(paths: string[]): Promise<boolean[]> {
    return paths.map((path) => this.files.delete(path));
  }

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  async list(options?: ListOptions): Promise<FileMetadata[]> {
    const files = Array.from(this.files.values()).map((f) => f.metadata);

    if (options?.folder) {
      return files.filter((f) => f.path.startsWith(options.folder));
    }

    if (options?.prefix) {
      return files.filter((f) => f.filename.startsWith(options.prefix));
    }

    return files;
  }

  async getMetadata(filePath: string): Promise<FileMetadata> {
    const file = this.files.get(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    return file.metadata;
  }

  async copy(sourcePath: string, destinationPath: string): Promise<FileMetadata> {
    const source = this.files.get(sourcePath);
    if (!source) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const newMetadata: FileMetadata = {
      ...source.metadata,
      path: destinationPath,
      filename: destinationPath.split('/').pop() || destinationPath,
    };

    this.files.set(destinationPath, { data: source.data, metadata: newMetadata });
    return newMetadata;
  }

  async move(sourcePath: string, destinationPath: string): Promise<FileMetadata> {
    const metadata = await this.copy(sourcePath, destinationPath);
    await this.delete(sourcePath);
    return metadata;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  clear(): void {
    this.files.clear();
  }
}

describe('StorageService', () => {
  let storageService: StorageService;
  let mockProvider: MockStorageProvider;
  let loggerService: LoggerService;

  beforeEach(() => {
    // Clear container
    container.clearInstances();

    // Create mock provider
    mockProvider = new MockStorageProvider();

    // Create logger
    loggerService = container.resolve(LoggerService);

    // Register mock provider
    container.register<IStorageProvider>('IStorageProvider', { useValue: mockProvider });

    // Create storage service
    storageService = new StorageService(mockProvider, loggerService);

    // Clear any existing files
    mockProvider.clear();
  });

  describe('upload', () => {
    it('should upload a file successfully', async () => {
      const fileData = Buffer.from('test file content');
      const options: UploadOptions = {
        filename: 'test.txt',
        folder: 'uploads',
        contentType: 'text/plain',
      };

      const result = await storageService.upload(fileData, options);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test.txt');
      expect(result.path).toContain('uploads/test.txt');
      expect(result.contentType).toBe('text/plain');
      expect(result.size).toBe(fileData.length);
      expect(result.url).toBeDefined();
    });

    it('should validate MIME types when allowedMimeTypes is specified', async () => {
      const fileData = Buffer.from('test content');
      const options: UploadOptions = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      };

      await expect(storageService.upload(fileData, options)).rejects.toThrow(
        'File type application/pdf not allowed'
      );
    });

    it('should allow upload when MIME type is in allowedMimeTypes', async () => {
      const fileData = Buffer.from('test content');
      const options: UploadOptions = {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      };

      const result = await storageService.upload(fileData, options);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test.jpg');
    });

    it('should upload without validation when allowedMimeTypes is not specified', async () => {
      const fileData = Buffer.from('test content');
      const options: UploadOptions = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      };

      const result = await storageService.upload(fileData, options);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test.pdf');
    });
  });

  describe('uploadMultiple', () => {
    it('should upload multiple files successfully', async () => {
      const files = [
        {
          data: Buffer.from('file 1'),
          options: { filename: 'file1.txt', folder: 'uploads', contentType: 'text/plain' },
        },
        {
          data: Buffer.from('file 2'),
          options: { filename: 'file2.txt', folder: 'uploads', contentType: 'text/plain' },
        },
        {
          data: Buffer.from('file 3'),
          options: { filename: 'file3.txt', folder: 'uploads', contentType: 'text/plain' },
        },
      ];

      const results = await storageService.uploadMultiple(files);

      expect(results).toHaveLength(3);
      expect(results[0]?.filename).toBe('file1.txt');
      expect(results[1]?.filename).toBe('file2.txt');
      expect(results[2]?.filename).toBe('file3.txt');
    });

    it('should handle empty array', async () => {
      const results = await storageService.uploadMultiple([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('download', () => {
    it('should download an existing file', async () => {
      const fileData = Buffer.from('test content');
      await storageService.upload(fileData, { filename: 'test.txt', folder: 'downloads' });

      const downloaded = await storageService.download('downloads/test.txt');

      expect(downloaded).toEqual(fileData);
    });

    it('should throw error when file does not exist', async () => {
      await expect(storageService.download('nonexistent.txt')).rejects.toThrow(
        'File not found: nonexistent.txt'
      );
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL', async () => {
      await storageService.upload(Buffer.from('test'), {
        filename: 'test.txt',
        folder: 'uploads',
      });

      const url = await storageService.getSignedUrl('uploads/test.txt');

      expect(url).toBeDefined();
      expect(url).toContain('uploads/test.txt');
    });

    it('should respect custom expiration time', async () => {
      await storageService.upload(Buffer.from('test'), {
        filename: 'test.txt',
        folder: 'uploads',
      });

      const url = await storageService.getSignedUrl('uploads/test.txt', { expiresIn: 7200 });

      expect(url).toContain('expires=7200');
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      await storageService.upload(Buffer.from('test'), {
        filename: 'test.txt',
        folder: 'uploads',
      });

      const result = await storageService.delete('uploads/test.txt');

      expect(result).toBe(true);
      expect(await storageService.exists('uploads/test.txt')).toBe(false);
    });

    it('should return false when file does not exist', async () => {
      const result = await storageService.delete('nonexistent.txt');

      expect(result).toBe(false);
    });
  });

  describe('deleteMultiple', () => {
    it('should delete multiple files', async () => {
      await storageService.upload(Buffer.from('1'), { filename: 'file1.txt', folder: 'uploads' });
      await storageService.upload(Buffer.from('2'), { filename: 'file2.txt', folder: 'uploads' });
      await storageService.upload(Buffer.from('3'), { filename: 'file3.txt', folder: 'uploads' });

      const results = await storageService.deleteMultiple([
        'uploads/file1.txt',
        'uploads/file2.txt',
        'uploads/file3.txt',
      ]);

      expect(results).toEqual([true, true, true]);
      expect(await storageService.exists('uploads/file1.txt')).toBe(false);
      expect(await storageService.exists('uploads/file2.txt')).toBe(false);
      expect(await storageService.exists('uploads/file3.txt')).toBe(false);
    });

    it('should handle mixed success/failure', async () => {
      await storageService.upload(Buffer.from('1'), { filename: 'file1.txt', folder: 'uploads' });

      const results = await storageService.deleteMultiple([
        'uploads/file1.txt',
        'uploads/nonexistent.txt',
      ]);

      expect(results).toEqual([true, false]);
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      await storageService.upload(Buffer.from('test'), {
        filename: 'test.txt',
        folder: 'uploads',
      });

      const exists = await storageService.exists('uploads/test.txt');

      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await storageService.exists('nonexistent.txt');

      expect(exists).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await storageService.upload(Buffer.from('1'), { filename: 'file1.txt', folder: 'uploads' });
      await storageService.upload(Buffer.from('2'), { filename: 'file2.txt', folder: 'uploads' });
      await storageService.upload(Buffer.from('3'), { filename: 'doc.pdf', folder: 'documents' });
    });

    it('should list all files', async () => {
      const files = await storageService.list();

      expect(files).toHaveLength(3);
    });

    it('should list files in specific folder', async () => {
      const files = await storageService.list({ folder: 'uploads' });

      expect(files).toHaveLength(2);
      expect(files.every((f) => f.path.startsWith('uploads'))).toBe(true);
    });

    it('should list files with prefix', async () => {
      const files = await storageService.list({ prefix: 'file' });

      expect(files).toHaveLength(2);
      expect(files.every((f) => f.filename.startsWith('file'))).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('should get metadata for existing file', async () => {
      await storageService.upload(Buffer.from('test content'), {
        filename: 'test.txt',
        folder: 'uploads',
        contentType: 'text/plain',
      });

      const metadata = await storageService.getMetadata('uploads/test.txt');

      expect(metadata).toBeDefined();
      expect(metadata.filename).toBe('test.txt');
      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.size).toBe(12);
    });

    it('should throw error for non-existing file', async () => {
      await expect(storageService.getMetadata('nonexistent.txt')).rejects.toThrow('File not found');
    });
  });

  describe('copy', () => {
    it('should copy file to new location', async () => {
      await storageService.upload(Buffer.from('test'), {
        filename: 'original.txt',
        folder: 'source',
      });

      const result = await storageService.copy('source/original.txt', 'destination/copy.txt');

      expect(result).toBeDefined();
      expect(result.path).toBe('destination/copy.txt');
      expect(await storageService.exists('source/original.txt')).toBe(true);
      expect(await storageService.exists('destination/copy.txt')).toBe(true);
    });

    it('should throw error when source file does not exist', async () => {
      await expect(storageService.copy('nonexistent.txt', 'destination.txt')).rejects.toThrow(
        'Source file not found'
      );
    });
  });

  describe('move', () => {
    it('should move file to new location', async () => {
      await storageService.upload(Buffer.from('test'), {
        filename: 'original.txt',
        folder: 'source',
      });

      const result = await storageService.move('source/original.txt', 'destination/moved.txt');

      expect(result).toBeDefined();
      expect(result.path).toBe('destination/moved.txt');
      expect(await storageService.exists('source/original.txt')).toBe(false);
      expect(await storageService.exists('destination/moved.txt')).toBe(true);
    });

    it('should throw error when source file does not exist', async () => {
      await expect(storageService.move('nonexistent.txt', 'destination.txt')).rejects.toThrow(
        'Source file not found'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when provider is healthy', async () => {
      const isHealthy = await storageService.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when provider health check fails', async () => {
      vi.spyOn(mockProvider, 'healthCheck').mockRejectedValue(new Error('Provider unavailable'));

      const isHealthy = await storageService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getProviderName', () => {
    it('should return the provider name', () => {
      const name = storageService.getProviderName();

      expect(name).toBe('mock');
    });
  });
});
