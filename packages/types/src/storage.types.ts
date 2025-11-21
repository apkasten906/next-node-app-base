/**
 * File storage abstraction interface
 * Allows swapping storage providers (local, S3, Azure, GCP) via dependency injection
 */

export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  uploadedAt: Date;
  bucket?: string;
  key?: string;
}

export interface UploadOptions {
  filename?: string;
  folder?: string;
  bucket?: string;
  makePublic?: boolean;
  metadata?: Record<string, string>;
  contentType?: string;
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
}

export interface DownloadOptions {
  bucket?: string;
  expiresIn?: number; // in seconds, for signed URLs
}

export interface DeleteOptions {
  bucket?: string;
}

export interface ListOptions {
  folder?: string;
  bucket?: string;
  maxResults?: number;
  prefix?: string;
}

/**
 * Main storage service interface
 */
export interface IStorageService {
  /**
   * Upload a file
   */
  upload(file: Buffer | NodeJS.ReadableStream, options: UploadOptions): Promise<FileMetadata>;

  /**
   * Upload multiple files
   */
  uploadMultiple(files: Array<{ data: Buffer | NodeJS.ReadableStream; options: UploadOptions }>): Promise<FileMetadata[]>;

  /**
   * Download a file
   */
  download(path: string, options?: DownloadOptions): Promise<Buffer>;

  /**
   * Get a signed URL for direct access
   */
  getSignedUrl(path: string, options?: DownloadOptions): Promise<string>;

  /**
   * Delete a file
   */
  delete(path: string, options?: DeleteOptions): Promise<boolean>;

  /**
   * Delete multiple files
   */
  deleteMultiple(paths: string[], options?: DeleteOptions): Promise<boolean[]>;

  /**
   * Check if a file exists
   */
  exists(path: string, options?: DeleteOptions): Promise<boolean>;

  /**
   * List files
   */
  list(options?: ListOptions): Promise<FileMetadata[]>;

  /**
   * Get file metadata
   */
  getMetadata(path: string, options?: DeleteOptions): Promise<FileMetadata>;

  /**
   * Copy a file
   */
  copy(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata>;

  /**
   * Move a file
   */
  move(sourcePath: string, destinationPath: string, options?: DeleteOptions): Promise<FileMetadata>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Storage provider interface
 */
export interface IStorageProvider extends IStorageService {
  readonly providerName: string;
}

/**
 * File upload validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * File virus scan result
 */
export interface VirusScanResult {
  safe: boolean;
  threat?: string;
  scanDate: Date;
}
