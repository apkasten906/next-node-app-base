import crypto from 'crypto';
import path from 'path';

import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

/**
 * Multer configuration for file uploads with security validations
 */

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZE = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  DEFAULT: 5 * 1024 * 1024, // 5MB
};

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  VIDEOS: ['video/mp4', 'video/mpeg', 'video/quicktime'],
  ALL: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
  ],
};

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove special characters except dot, dash, underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure filename doesn't start with dot (hidden file)
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  return sanitized;
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalname: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname);
  const basename = path.basename(originalname, ext);
  const sanitizedBasename = sanitizeFilename(basename);

  return `${timestamp}-${random}-${sanitizedBasename}${ext}`;
}

/**
 * Create a file filter function for Multer
 */
export function createFileFilter(allowedMimeTypes: string[]) {
  return (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`),
        false
      );
    }

    // Check file extension matches MIME type (basic validation)
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'video/mp4': ['.mp4'],
      'video/mpeg': ['.mpeg', '.mpg'],
      'video/quicktime': ['.mov'],
    };

    const allowedExtensions = validExtensions[file.mimetype];
    if (allowedExtensions && !allowedExtensions.includes(ext)) {
      return callback(
        new Error(`File extension ${ext} does not match MIME type ${file.mimetype}`),
        false
      );
    }

    callback(null, true);
  };
}

/**
 * Configure Multer for memory storage (files stored as Buffers)
 * This is used when uploading to cloud storage providers
 */
export function configureMulterMemory(options?: {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}): multer.Multer {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: options?.maxFileSize || MAX_FILE_SIZE.DEFAULT,
      files: 10, // Maximum 10 files per request
    },
    fileFilter: createFileFilter(options?.allowedMimeTypes || ALLOWED_MIME_TYPES.ALL),
  });
}

/**
 * Configure Multer for disk storage (local filesystem)
 * This is used for local development or when using local storage provider
 */
export function configureMulterDisk(options?: {
  destination?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}): multer.Multer {
  return multer({
    storage: multer.diskStorage({
      destination: options?.destination || 'uploads/',
      filename: (_req, file, callback) => {
        const uniqueFilename = generateUniqueFilename(file.originalname);
        callback(null, uniqueFilename);
      },
    }),
    limits: {
      fileSize: options?.maxFileSize || MAX_FILE_SIZE.DEFAULT,
      files: 10,
    },
    fileFilter: createFileFilter(options?.allowedMimeTypes || ALLOWED_MIME_TYPES.ALL),
  });
}

/**
 * Default Multer configuration (memory storage)
 */
export const upload = configureMulterMemory();

/**
 * Multer configuration for images only
 */
export const uploadImage = configureMulterMemory({
  maxFileSize: MAX_FILE_SIZE.IMAGE,
  allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGES,
});

/**
 * Multer configuration for documents only
 */
export const uploadDocument = configureMulterMemory({
  maxFileSize: MAX_FILE_SIZE.DOCUMENT,
  allowedMimeTypes: ALLOWED_MIME_TYPES.DOCUMENTS,
});

/**
 * Multer configuration for videos only
 */
export const uploadVideo = configureMulterMemory({
  maxFileSize: MAX_FILE_SIZE.VIDEO,
  allowedMimeTypes: ALLOWED_MIME_TYPES.VIDEOS,
});
