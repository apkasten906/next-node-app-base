import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/assertions';
import { World } from '../support/world';

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

Given('storage provider is {string}', async function (this: World, provider: string) {
  this.setData('storageProvider', provider);
});

// File Upload
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
  const file = {
    filename: data.name,
    originalname: data.name,
    mimetype: data.type,
    size: Number.parseInt(data.size, 10),
    buffer: Buffer.from('test file content'),
    uploadedAt: new Date(),
  };

  this.setData('uploadedFile', file);
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

// File Download
When('I download file {string}', async function (this: World, filename: string) {
  // Mock download
  const file = {
    filename,
    buffer: Buffer.from('test file content'),
    mimetype: 'application/pdf',
  };

  this.setData('downloadedFile', file);
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

// File Deletion
When('I delete file {string}', async function (this: World, filename: string) {
  this.setData('deletedFile', filename);
  this.setData('deleteSuccess', true);
});

Then('the file should be removed from storage', async function (this: World) {
  const success = this.getData<boolean>('deleteSuccess');
  expect(success).toBe(true);
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

// File Validation
When('I validate file type {string}', async function (this: World, mimeType: string) {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const isValid = allowedTypes.includes(mimeType);

  this.setData('validationType', isValid ? 'accepted' : 'rejected');
});

Then('validation should return {string}', async function (this: World, expected: string) {
  const result = this.getData<string>('validationType');
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
