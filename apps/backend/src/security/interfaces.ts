/**
 * Authentication credentials for user login
 */
export interface AuthCredentials {
  username?: string;
  email?: string;
  password: string;
  [key: string]: unknown;
}

/**
 * Authenticated user information
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
  roles?: string[];
  [key: string]: unknown;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IAuthenticationProvider {
  authenticate(credentials: AuthCredentials): Promise<AuthenticatedUser>;
  validateToken(token: string): Promise<AuthenticatedUser | null>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
}

export interface IEncryptionService {
  encrypt(data: string): Promise<string>;
  decrypt(data: string): Promise<string>;
  hash(data: string): Promise<string>;
  compareHash(data: string, hash: string): Promise<boolean>;
}

/**
 * File upload metadata
 */
export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  [key: string]: unknown;
}

/**
 * Uploaded file result
 */
export interface UploadedFile {
  url: string;
  path: string;
  size: number;
  mimetype: string;
  [key: string]: unknown;
}

/**
 * Downloaded file data
 */
export interface DownloadedFile {
  buffer: Buffer;
  contentType: string;
  size: number;
  [key: string]: unknown;
}

export interface IStorageProvider {
  upload(file: FileUpload, path: string): Promise<UploadedFile>;
  download(path: string): Promise<DownloadedFile>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}

export interface INotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
  sendPushNotification(userId: string, message: string): Promise<void>;
}

export interface ISecretsManager {
  getSecret(key: string): Promise<string>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

/**
 * Webhook registration data
 */
export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: Date;
  [key: string]: unknown;
}

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  [key: string]: unknown;
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  webhookId: string;
  statusCode: number;
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface IWebhookService {
  register(url: string, events: string[], secret: string): Promise<WebhookRegistration>;
  unregister(webhookId: string): Promise<void>;
  deliver(webhookId: string, event: WebhookEvent): Promise<WebhookDeliveryResult>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
}

export interface ICacheService {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}
