/**
 * Storage provider interface for file storage abstraction
 */
export interface IStorageProvider {
  /**
   * Upload file to storage
   */
  upload(file: UploadFile, path: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Download file from storage
   */
  download(path: string): Promise<DownloadResult>;

  /**
   * Delete file from storage
   */
  delete(path: string): Promise<void>;

  /**
   * Check if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get signed URL for temporary access
   */
  getSignedUrl(path: string, expiresIn: number): Promise<string>;

  /**
   * List files in directory
   */
  list(prefix: string, options?: ListOptions): Promise<StorageFile[]>;

  /**
   * Copy file to new location
   */
  copy(sourcePath: string, destinationPath: string): Promise<void>;

  /**
   * Move file to new location
   */
  move(sourcePath: string, destinationPath: string): Promise<void>;
}

export interface UploadFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
  encryption?: boolean;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  etag?: string;
}

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  size: number;
  metadata?: Record<string, string>;
}

export interface StorageFile {
  path: string;
  size: number;
  lastModified: Date;
  etag?: string;
}

export interface ListOptions {
  maxResults?: number;
  pageToken?: string;
  recursive?: boolean;
}

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  AZURE = 'azure',
  GCP = 'gcp',
}
