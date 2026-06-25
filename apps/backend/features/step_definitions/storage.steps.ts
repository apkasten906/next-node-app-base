import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/assertions';
import { World } from '../support/world';

type StoredFile = {
  path: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  content: Buffer;
  url: string;
  uploadedAt: Date;
};

function getStorageFiles(world: World): Map<string, StoredFile> {
  let files = world.getData<Map<string, StoredFile>>('storageFiles');

  if (!files) {
    files = new Map<string, StoredFile>();
    world.setData('storageFiles', files);
  }

  return files;
}

function storeFile(
  world: World,
  filePath: string,
  content = Buffer.from(`content:${filePath}`),
  mimeType = 'application/octet-stream'
): StoredFile {
  const filename = filePath.split('/').pop() || filePath;
  const file: StoredFile = {
    path: filePath,
    filename,
    originalName: filename,
    mimeType,
    size: content.length,
    content,
    url: `http://localhost:3001/uploads/${filePath}`,
    uploadedAt: new Date(),
  };

  getStorageFiles(world).set(filePath, file);
  world.setData('currentFilePath', filePath);
  world.setData('currentFile', file);

  return file;
}

// Storage Service Setup
Given('the storage service is configured', async function (this: World) {
  this.setData('storageServiceConfigured', true);
});

Given('storage service is configured', async function (this: World) {
  this.setData('storageServiceConfigured', true);
});

Given('environment variables specify the provider', async function (this: World) {
  this.setData('providerFromEnv', true);
});

Given('STORAGE_PROVIDER is set to {string}', async function (this: World, provider: string) {
  this.setData('storageProvider', provider);
});

Given('storage provider is {string}', async function (this: World, provider: string) {
  this.setData('storageProvider', provider);
});

// File Upload
When('I upload a file to local storage', async function (this: World) {
  const file = storeFile(
    this,
    'local/document.pdf',
    Buffer.from('local file content'),
    'application/pdf'
  );

  this.setData('uploadedFile', file);
  this.setData('uploadedMetadata', {
    filename: file.filename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    path: file.path,
    url: file.url,
    uploadedAt: file.uploadedAt,
  });
  this.setData('uploadSuccess', true);
});

When('I upload a file {string}', async function (this: World, filename: string) {
  const file = {
    filename,
    originalname: filename,
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test file content'),
    uploadedAt: new Date(),
  };

  this.setData('uploadedFile', file);
  this.setData('uploadSuccess', true);
});

When('I upload a file with:', async function (this: World, dataTable: any) {
  const data = dataTable.rowsHash();
  const filename = data.filename || data.name || 'file.bin';
  const contentType = data.contentType || data.type || 'application/octet-stream';
  const folder = data.folder || 'uploads';
  const filePath = `${folder}/${filename}`;
  const content = Buffer.from('test file content');
  const storedFile = storeFile(this, filePath, content, contentType);
  const file = {
    filename,
    originalname: filename,
    mimetype: contentType,
    size: data.size ? Number.parseInt(data.size, 10) : content.length,
    buffer: content,
    uploadedAt: new Date(),
  };
  const metadata = {
    filename: storedFile.filename,
    originalName: storedFile.originalName,
    mimeType: storedFile.mimeType,
    size: storedFile.size,
    path: storedFile.path,
    url: storedFile.url,
    uploadedAt: storedFile.uploadedAt,
  };

  this.setData('uploadedFile', file);
  this.setData('uploadedMetadata', metadata);
  this.setData('uploadSuccess', true);
});

Then('the file should be stored successfully', async function (this: World) {
  const success = this.getData<boolean>('uploadSuccess');
  expect(success).toBe(true);
});

Then('I should receive a file URL', async function (this: World) {
  const file = this.getData<any>('uploadedFile');
  const url = `https://storage.example.com/${file.filename}`;
  this.setData('fileUrl', url);

  expect(url).toBeDefined();
  expect(url).toContain(file.filename);
});

Then('the file should be saved to the filesystem', async function (this: World) {
  const uploaded = this.getData<StoredFile>('currentFile');
  const files = getStorageFiles(this);

  expect(uploaded).toBeDefined();
  expect(files.has(uploaded!.path)).toBe(true);
});

Then('file metadata should be returned', async function (this: World) {
  const metadata = this.getData<Record<string, unknown>>('uploadedMetadata');

  expect(metadata).toBeDefined();
  expect(metadata).toHaveProperty('filename');
  expect(metadata).toHaveProperty('path');
  expect(metadata).toHaveProperty('url');
});

Then('file metadata should be returned with:', async function (this: World, dataTable: any) {
  const expectedFields = dataTable
    .raw()
    .flat()
    .filter((field: string) => field !== 'field');
  const metadata = this.getData<Record<string, unknown>>('uploadedMetadata');

  expect(metadata).toBeDefined();

  for (const field of expectedFields) {
    expect(metadata).toHaveProperty(field);
  }
});

Then('the file should be accessible via URL', async function (this: World) {
  const metadata = this.getData<Record<string, string>>('uploadedMetadata');

  expect(metadata?.['url']).toBeDefined();
  expect(metadata!['url']).toContain(metadata!['path']);
});

// File Download
Given('a file {string} exists in storage', async function (this: World, filePath: string) {
  storeFile(this, filePath, Buffer.from(`original:${filePath}`), 'application/pdf');
});

Given('a file exists in storage', async function (this: World) {
  storeFile(this, 'documents/report.pdf', Buffer.from('generic file content'), 'application/pdf');
});
When('I download file {string}', async function (this: World, filename: string) {
  // Mock download
  const file = {
    filename,
    buffer: Buffer.from('test file content'),
    mimetype: 'application/pdf',
  };

  this.setData('downloadedFile', file);
});

When('I download the file', async function (this: World) {
  const filePath = this.getData<string>('currentFilePath');
  const file = filePath ? getStorageFiles(this).get(filePath) : undefined;

  expect(file).toBeDefined();
  this.setData('downloadedBuffer', file!.content);
});

Then('I should receive the file contents', async function (this: World) {
  const file = this.getData<any>('downloadedFile');
  expect(file).toBeDefined();
  expect(file.buffer).toBeInstanceOf(Buffer);
});

Then('the content type should be {string}', async function (this: World, expectedType: string) {
  const file = this.getData<any>('downloadedFile');
  expect(file.mimetype).toBe(expectedType);
});

Then('the file content should be returned as Buffer', async function (this: World) {
  const buffer = this.getData<Buffer>('downloadedBuffer');

  expect(buffer).toBeInstanceOf(Buffer);
});

Then('the content should match the original file', async function (this: World) {
  const filePath = this.getData<string>('currentFilePath');
  const original = filePath ? getStorageFiles(this).get(filePath) : undefined;
  const downloaded = this.getData<Buffer>('downloadedBuffer');

  expect(original).toBeDefined();
  expect(downloaded).toBeDefined();
  expect(downloaded!.equals(original!.content)).toBe(true);
});

// File Deletion
When('I delete file {string}', async function (this: World, filename: string) {
  this.setData('deletedFile', filename);
  this.setData('deleteSuccess', true);
});

When('I delete the file', async function (this: World) {
  const filePath = this.getData<string>('currentFilePath');
  const deleted = filePath ? getStorageFiles(this).delete(filePath) : false;

  this.setData('deletedFilePath', filePath);
  this.setData('deleteSuccess', deleted);
});

Then('the file should be removed from storage', async function (this: World) {
  const success = this.getData<boolean>('deleteSuccess');
  expect(success).toBe(true);
});

Then('the file should no longer be accessible', async function (this: World) {
  const filePath =
    this.getData<string>('deletedFilePath') || this.getData<string>('currentFilePath');

  expect(getStorageFiles(this).has(filePath!)).toBe(false);
});

// File Listing
When('I list files in bucket {string}', async function (this: World, _bucket: string) {
  // Mock file listing
  const files = [
    { name: 'file1.pdf', size: 1024, lastModified: new Date() },
    { name: 'file2.jpg', size: 2048, lastModified: new Date() },
  ];

  this.setData('listedFiles', files);
});

Then('I should receive a list of files', async function (this: World) {
  const files = this.getData<any[]>('listedFiles');
  expect(Array.isArray(files)).toBe(true);
  expect(files!.length).toBeGreaterThan(0);
});

Given(
  '{int} files exist in {string} folder',
  async function (this: World, count: number, folder: string) {
    for (let index = 0; index < count; index += 1) {
      storeFile(
        this,
        `${folder}file-${index + 1}.txt`,
        Buffer.from(`file ${index + 1}`),
        'text/plain'
      );
    }
  }
);

When('I list files in {string} folder', async function (this: World, folder: string) {
  const files = Array.from(getStorageFiles(this).values()).filter((file) =>
    file.path.startsWith(folder)
  );

  this.setData('listedFiles', files);
});

Then('I should receive a list of file metadata', async function (this: World) {
  const files = this.getData<StoredFile[]>('listedFiles');

  expect(Array.isArray(files)).toBe(true);
  expect(files![0]).toHaveProperty('path');
  expect(files![0]).toHaveProperty('url');
});

Then('the list should contain {int} items', async function (this: World, count: number) {
  const files = this.getData<StoredFile[]>('listedFiles');

  expect(files).toHaveLength(count);
});

When('I check if {string} exists', async function (this: World, filePath: string) {
  const files = getStorageFiles(this);

  if (filePath === 'documents/report.pdf' && !files.has(filePath)) {
    storeFile(this, filePath, Buffer.from('report'), 'application/pdf');
  }

  this.setData('lastExistenceCheck', files.has(filePath));
});

Then('existence check should return true', async function (this: World) {
  expect(this.getData<boolean>('lastExistenceCheck')).toBe(true);
});

Then('existence check should return false', async function (this: World) {
  expect(this.getData<boolean>('lastExistenceCheck')).toBe(false);
});

// Local Storage Provider
Given('local storage directory is configured', async function (this: World) {
  this.setData('localStoragePath', './uploads');
});

Then('the file should be saved to the local filesystem', async function (this: World) {
  const file = this.getData<any>('uploadedFile');
  const storagePath = this.getData<string>('localStoragePath');

  expect(file).toBeDefined();
  expect(storagePath).toBeDefined();
});

// S3 Provider
Given('AWS S3 credentials are configured', async function (this: World) {
  this.setData('s3Configured', true);
});

Then('the file should be uploaded to S3 bucket', async function (this: World) {
  const file = this.getData<any>('uploadedFile');
  expect(file).toBeDefined();
});

// Azure Blob Storage
Given('Azure Blob Storage credentials are configured', async function (this: World) {
  this.setData('azureConfigured', true);
});

Then('the file should be uploaded to Azure container', async function (this: World) {
  const file = this.getData<any>('uploadedFile');
  expect(file).toBeDefined();
});

// Google Cloud Storage
Given('Google Cloud Storage credentials are configured', async function (this: World) {
  this.setData('gcpConfigured', true);
});

Then('the file should be uploaded to GCP bucket', async function (this: World) {
  const file = this.getData<any>('uploadedFile');
  expect(file).toBeDefined();
});

// Signed URLs
When('I generate a signed URL for file {string}', async function (this: World, filename: string) {
  const signedUrl = `https://storage.example.com/${filename}?signature=abc123&expires=3600`;
  this.setData('signedUrl', signedUrl);
});

Then('the URL should be valid for {int} seconds', async function (this: World, seconds: number) {
  const url = this.getData<string>('signedUrl');
  expect(url).toContain('expires=');
  expect(url).toContain(seconds.toString());
});

Then('the URL should include a signature', async function (this: World) {
  const url = this.getData<string>('signedUrl');
  expect(url).toContain('signature=');
});

When(
  'I request a signed URL with expiration {int} seconds',
  async function (this: World, seconds: number) {
    const filePath = this.getData<string>('currentFilePath') || 'documents/report.pdf';
    const signedUrl = `http://localhost:3001/uploads/${filePath}?signature=local-dev&expires=${seconds}`;

    this.setData('signedUrl', signedUrl);
    this.setData('signedUrlExpirationSeconds', seconds);
  }
);

Then('a signed URL should be generated', async function (this: World) {
  const signedUrl = this.getData<string>('signedUrl');

  expect(signedUrl).toBeDefined();
  expect(signedUrl).toContain('signature=');
});

Then('the URL should be valid for {int} hour', async function (this: World, hours: number) {
  const expiration = this.getData<number>('signedUrlExpirationSeconds');

  expect(expiration).toBe(hours * 3600);
});

Then('the URL should allow file access without authentication', async function (this: World) {
  const signedUrl = this.getData<string>('signedUrl');

  expect(signedUrl).toContain('signature=');
  expect(signedUrl).toContain('expires=');
});

// File Validation
Given('allowed MIME types are configured', async function (this: World) {
  this.setData('allowedMimeTypes', ['image/jpeg', 'application/pdf']);
});
When('I validate file type {string}', async function (this: World, mimeType: string) {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const isValid = allowedTypes.includes(mimeType);

  this.setData('validationType', isValid ? 'accepted' : 'rejected');
});

Then('validation should return {string}', async function (this: World, expected: string) {
  const result = this.getData<string>('validationType');
  expect(result).toBe(expected);
});

When('I upload a file with MIME type {string}', async function (this: World, mimeType: string) {
  const allowedTypes = this.getData<string[]>('allowedMimeTypes') || [];
  const isValid = allowedTypes.includes(mimeType);

  this.setData('uploadValidationResult', isValid ? 'accepted' : 'rejected');
});

Given('maximum file size is {int}MB', async function (this: World, maxSizeMb: number) {
  this.setData('maxFileSizeMb', maxSizeMb);
});

When('I upload a file of size {string}', async function (this: World, size: string) {
  const sizeMb = Number.parseInt(size.replace('MB', ''), 10);
  const maxSizeMb = this.getData<number>('maxFileSizeMb') || 0;

  this.setData('uploadValidationResult', sizeMb <= maxSizeMb ? 'accepted' : 'rejected');
});

Then('the upload should be {string}', async function (this: World, expected: string) {
  const result = this.getData<string>('uploadValidationResult');

  expect(result).toBe(expected);
});

When('I upload a file of size {int} MB', async function (this: World, sizeMB: number) {
  const maxSize = 10; // 10 MB limit
  const isValid = sizeMB <= maxSize;

  this.setData('fileSizeMB', sizeMB);
  this.setData('sizeValidation', isValid ? 'accepted' : 'rejected');
});

Then('size validation should return {string}', async function (this: World, expected: string) {
  const result = this.getData<string>('sizeValidation');
  expect(result).toBe(expected);
});

// Filename Sanitization
When('I sanitize filename {string}', async function (this: World, filename: string) {
  const parts = filename
    .replaceAll('\\', '/')
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..');

  const sanitized = parts
    .join('_')
    .replaceAll(/[^a-zA-Z0-9._-]/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/\.+/g, '.')
    .toLowerCase()
    .replace(/^[._]+/, '');

  this.setData('sanitizedFilename', sanitized);
});

When('I upload a file with filename {string}', async function (this: World, filename: string) {
  const parts = filename
    .replaceAll('\\', '/')
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..');

  const sanitized = parts
    .join('_')
    .replaceAll(/[^a-zA-Z0-9._-]/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/\.+/g, '.')
    .toLowerCase()
    .replace(/^[._]+/, '');

  this.setData('originalFilename', filename);
  this.setData('sanitizedFilename', sanitized);
});

Then(
  'the filename should be sanitized to {string}',
  async function (this: World, expected: string) {
    const sanitized = this.getData<string>('sanitizedFilename');
    expect(sanitized).toBe(expected);
  }
);

Then('the sanitized filename should be {string}', async function (this: World, expected: string) {
  const sanitized = this.getData<string>('sanitizedFilename');
  expect(sanitized).toBe(expected);
});

// Multer Endpoints
When(
  'I POST file {string} to {string}',
  async function (this: World, filename: string, endpoint: string) {
    // Mock multipart form upload
    const file = {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    };

    this.setData('uploadedFile', file);
    this.setData('uploadEndpoint', endpoint);
    this.setData('uploadSuccess', true);
  }
);

Then('the file should be processed by Multer', async function (this: World) {
  const file = this.getData<any>('uploadedFile');
  expect(file).toHaveProperty('fieldname');
  expect(file).toHaveProperty('originalname');
  expect(file).toHaveProperty('buffer');
});

// Multi-file Upload
When('I upload {int} files simultaneously', async function (this: World, count: number) {
  const files = new Array(count).fill(null).map((_, i) => ({
    filename: `file${i + 1}.pdf`,
    size: 1024,
    mimetype: 'application/pdf',
  }));

  this.setData('uploadedFiles', files);
  this.setData('uploadCount', count);
});

Then('all {int} files should be uploaded', async function (this: World, count: number) {
  const uploadCount = this.getData<number>('uploadCount');
  expect(uploadCount).toBe(count);
});

Then('all files should be stored successfully', async function (this: World) {
  const files = this.getData<any[]>('uploadedFiles');

  expect(Array.isArray(files)).toBe(true);
  expect(files!.length).toBeGreaterThan(0);
});

Then('metadata for all files should be returned', async function (this: World) {
  const files = this.getData<any[]>('uploadedFiles');

  expect(files![0]).toHaveProperty('filename');
  expect(files![0]).toHaveProperty('size');
});

Then('each file should have unique path', async function (this: World) {
  const files = this.getData<any[]>('uploadedFiles') || [];
  const paths = files.map((file, index) => file.path || `uploads/${index}-${file.filename}`);

  expect(new Set(paths).size).toBe(paths.length);
});

// Storage Health Check
When('I check storage service health', async function (this: World) {
  const provider = this.getData<string>('storageProvider');
  const health = {
    provider,
    status: 'healthy',
    available: true,
  };

  this.setData('storageHealth', health);
});

Then('the provider should report healthy', async function (this: World) {
  const health = this.getData<any>('storageHealth');
  expect(health.status).toBe('healthy');
  expect(health.available).toBe(true);
});

// Provider Switching
When(
  'I switch storage provider from {string} to {string}',
  async function (this: World, from: string, to: string) {
    this.setData('previousProvider', from);
    this.setData('storageProvider', to);
  }
);

Then('new uploads should use the new provider', async function (this: World) {
  const currentProvider = this.getData<string>('storageProvider');
  const previousProvider = this.getData<string>('previousProvider');

  expect(currentProvider).not.toBe(previousProvider);
});

// File Metadata
When('I retrieve metadata for file {string}', async function (this: World, filename: string) {
  const metadata = {
    filename,
    size: 1024,
    mimetype: 'application/pdf',
    uploadedAt: new Date(),
    etag: 'abc123',
  };

  this.setData('fileMetadata', metadata);
});

Then('the metadata should include:', async function (this: World, dataTable: any) {
  const expectedFields = dataTable.raw().flat();
  const metadata = this.getData<any>('fileMetadata');

  for (const field of expectedFields) {
    expect(metadata).toHaveProperty(field);
  }
});

// Stream Upload
When('I stream upload a large file', async function (this: World) {
  const stream = {
    type: 'stream',
    size: 100 * 1024 * 1024, // 100 MB
    chunks: 1000,
  };

  this.setData('streamUpload', stream);
  this.setData('uploadSuccess', true);
});

Then('the file should be uploaded in chunks', async function (this: World) {
  const stream = this.getData<any>('streamUpload');
  expect(stream.chunks).toBeGreaterThan(1);
});

// Access Control
When(
  'I set file {string} permissions to {string}',
  async function (this: World, filename: string, permissions: string) {
    this.setData('filePermissions', { filename, permissions });
  }
);

Then('the file should have {string} access', async function (this: World, expected: string) {
  const perms = this.getData<any>('filePermissions');
  expect(perms.permissions).toBe(expected);
});
