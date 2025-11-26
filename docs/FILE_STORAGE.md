# File Storage Service

## Overview

The File Storage Service provides a unified abstraction layer for storing and managing files across multiple cloud storage providers. It supports local filesystem, AWS S3, Azure Blob Storage, and Google Cloud Storage with a pluggable architecture.

## Features

- **Multi-Provider Support**: Seamlessly switch between local, S3, Azure, and GCP storage
- **Unified Interface**: Single API for all storage operations
- **Security**: File type validation, size limits, filename sanitization
- **Dependency Injection**: Uses TSyringe for provider management
- **Production Ready**: Comprehensive error handling and logging

## Architecture

```
┌─────────────────────┐
│   Express Routes    │
│  (files.routes.ts)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  StorageService     │
│ (storage.service.ts)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  IStorageProvider   │
│    (interface)      │
└──────────┬──────────┘
           │
      ┌────┴────┬────────┬────────┐
      ▼         ▼        ▼        ▼
  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
  │Local │ │  S3  │ │Azure │ │ GCP  │
  └──────┘ └──────┘ └──────┘ └──────┘
```

## Configuration

### Environment Variables

#### Provider Selection

```bash
STORAGE_PROVIDER=local|s3|azure|gcp  # Default: local
```

#### Local Storage

```bash
STORAGE_PATH=/path/to/uploads        # Default: ./uploads
STORAGE_BASE_URL=http://localhost:3001/uploads
```

#### AWS S3

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

#### Azure Blob Storage

```bash
AZURE_STORAGE_ACCOUNT_NAME=your-account
AZURE_STORAGE_ACCOUNT_KEY=your-key
AZURE_STORAGE_CONTAINER=uploads      # Default: uploads
```

#### Google Cloud Storage

```bash
GCP_PROJECT_ID=your-project-id
GCP_KEY_FILE=/path/to/service-account-key.json
GCP_STORAGE_BUCKET=your-bucket-name
```

## Usage

### Upload a Single File

```typescript
import { StorageService } from './services/storage/storage.service';
import { container } from 'tsyringe';

const storageService = container.resolve(StorageService);

const fileBuffer = Buffer.from('file content');

const metadata = await storageService.upload(fileBuffer, {
  filename: 'document.pdf',
  contentType: 'application/pdf',
  folder: 'documents',
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['application/pdf'],
});

console.log(metadata.url); // File URL
```

### Upload Multiple Files

```typescript
const files = [
  {
    data: buffer1,
    options: {
      filename: 'file1.jpg',
      contentType: 'image/jpeg',
      folder: 'images',
    },
  },
  {
    data: buffer2,
    options: {
      filename: 'file2.png',
      contentType: 'image/png',
      folder: 'images',
    },
  },
];

const results = await storageService.uploadMultiple(files);
```

### Download a File

```typescript
const buffer = await storageService.download('documents/file.pdf');
```

### Get Signed URL

```typescript
const url = await storageService.getSignedUrl('documents/file.pdf', {
  expiresIn: 3600, // 1 hour
});
```

### Delete a File

```typescript
const success = await storageService.delete('documents/file.pdf');
```

### List Files

```typescript
const files = await storageService.list({
  folder: 'images',
  prefix: 'user-',
  maxResults: 100,
});
```

### Copy/Move Files

```typescript
// Copy
const metadata = await storageService.copy('source/file.pdf', 'destination/file.pdf');

// Move
const metadata = await storageService.move('source/file.pdf', 'destination/file.pdf');
```

## API Endpoints

### Upload Single File

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
folder: "documents"
```

### Upload Multiple Files

```http
POST /api/files/upload/multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: [<binary>, <binary>, ...]
folder: "documents"
```

### Upload Image

```http
POST /api/files/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

### Upload Document

```http
POST /api/files/upload/document
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

### Get File URL

```http
GET /api/files/{path}?download=false
Authorization: Bearer <token>
```

### Download File

```http
GET /api/files/{path}?download=true
Authorization: Bearer <token>
```

### Delete File

```http
DELETE /api/files/{path}
Authorization: Bearer <token>
```

### List Files

```http
GET /api/files/list?folder=documents&maxResults=50
Authorization: Bearer <token>
```

### Health Check

```http
GET /api/files/health
```

## File Validation

### Multer Configuration

The service includes pre-configured Multer instances:

```typescript
import { upload, uploadImage, uploadDocument, uploadVideo } from './config/multer';

// Generic upload (all types)
router.post('/upload', upload.single('file'), handler);

// Images only (JPEG, PNG, GIF, WebP)
router.post('/upload/image', uploadImage.single('file'), handler);

// Documents only (PDF, DOC, DOCX)
router.post('/upload/document', uploadDocument.single('file'), handler);

// Videos only (MP4, MPEG, MOV)
router.post('/upload/video', uploadVideo.single('file'), handler);
```

### File Size Limits

```typescript
MAX_FILE_SIZE = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  DEFAULT: 5 * 1024 * 1024, // 5MB
};
```

### Allowed MIME Types

```typescript
ALLOWED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  VIDEOS: ['video/mp4', 'video/mpeg', 'video/quicktime'],
};
```

### Security Features

1. **Filename Sanitization**: Removes path traversal attempts and special characters
2. **MIME Type Validation**: Validates file type against allowed types
3. **Extension Validation**: Ensures extension matches MIME type
4. **Size Limits**: Enforces maximum file sizes
5. **Authentication**: All endpoints require JWT authentication

## Type Definitions

### FileMetadata

```typescript
interface FileMetadata {
  filename: string; // Generated filename
  originalName: string; // Original filename
  mimeType: string; // MIME type
  size: number; // Size in bytes
  path: string; // Path in storage
  url: string; // Access URL
  uploadedAt: Date; // Upload timestamp
  bucket?: string; // Storage bucket (cloud only)
  key?: string; // Storage key (cloud only)
}
```

### UploadOptions

```typescript
interface UploadOptions {
  filename?: string; // Target filename
  contentType?: string; // MIME type
  folder?: string; // Target folder
  bucket?: string; // Storage bucket
  makePublic?: boolean; // Public access
  metadata?: Record<string, string>;
  maxSize?: number; // Size limit in bytes
  allowedMimeTypes?: string[]; // Allowed types
}
```

## Error Handling

```typescript
try {
  const metadata = await storageService.upload(buffer, options);
} catch (error) {
  if (error.message.includes('File size')) {
    // Handle size limit exceeded
  } else if (error.message.includes('not allowed')) {
    // Handle invalid file type
  } else {
    // Handle other errors
  }
}
```

## Health Checks

```typescript
const isHealthy = await storageService.healthCheck();
const providerName = storageService.getProviderName();

console.log(`Storage (${providerName}): ${isHealthy ? 'healthy' : 'unhealthy'}`);
```

## Best Practices

1. **Use Memory Storage for Cloud Providers**: Files are held in memory and uploaded directly to cloud storage
2. **Use Disk Storage for Local Development**: Files are written to disk for local filesystem provider
3. **Validate File Types**: Always specify allowed MIME types for security
4. **Set Size Limits**: Prevent DoS attacks by enforcing size limits
5. **Use Signed URLs**: For secure access to private files
6. **Clean Up Old Files**: Implement cleanup jobs for temporary files
7. **Monitor Storage Usage**: Track usage and costs for cloud providers

## Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { container } from 'tsyringe';

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    container.register('IStorageProvider', {
      useClass: LocalStorageProvider,
    });
    storageService = container.resolve(StorageService);
  });

  it('should upload a file', async () => {
    const buffer = Buffer.from('test content');
    const metadata = await storageService.upload(buffer, {
      filename: 'test.txt',
      contentType: 'text/plain',
      folder: 'test',
    });

    expect(metadata.filename).toBe('test.txt');
    expect(metadata.size).toBeGreaterThan(0);
  });
});
```

## Migration Guide

### From Local to S3

1. Set environment variables:

```bash
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
```

2. Create S3 bucket with appropriate permissions
3. Restart application
4. Migrate existing files using copy utility

### From S3 to Azure

1. Update environment variables:

```bash
STORAGE_PROVIDER=azure
AZURE_STORAGE_ACCOUNT_NAME=your-account
AZURE_STORAGE_ACCOUNT_KEY=your-key
AZURE_STORAGE_CONTAINER=uploads
```

2. Create Azure Storage account and container
3. Restart application
4. Migrate files using Azure Storage SDK

## Troubleshooting

### Local Storage Issues

- Ensure `STORAGE_PATH` directory exists and is writable
- Check filesystem permissions

### S3 Issues

- Verify AWS credentials are correct
- Check S3 bucket policy and CORS settings
- Ensure IAM user has necessary permissions (s3:PutObject, s3:GetObject, etc.)

### Azure Issues

- Verify storage account name and key
- Check container exists
- Ensure network access is allowed

### GCP Issues

- Verify service account key file path
- Check GCS bucket permissions
- Ensure service account has Storage Admin role

## Performance Considerations

1. **Local Storage**: Fastest for small deployments, doesn't scale horizontally
2. **S3**: Highly scalable, use S3 Transfer Acceleration for global deployments
3. **Azure**: Good integration with Azure services, consider CDN for static assets
4. **GCP**: Excellent for GCP-hosted applications, use Cloud CDN for caching

## Security Recommendations

1. Enable encryption at rest for cloud providers
2. Use IAM roles instead of access keys when possible
3. Implement Content Security Policy (CSP) headers
4. Scan uploaded files for malware
5. Rate limit upload endpoints
6. Implement file retention policies
7. Use HTTPS for all file transfers

## License

MIT
