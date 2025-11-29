export interface IAuthenticationProvider {
  authenticate(credentials: any): Promise<any>;
  validateToken(token: string): Promise<any | null>;
  refreshToken(refreshToken: string): Promise<any>;
}

export interface IEncryptionService {
  encrypt(data: string): Promise<string>;
  decrypt(data: string): Promise<string>;
  hash(data: string): Promise<string>;
  compareHash(data: string, hash: string): Promise<boolean>;
}

export interface IStorageProvider {
  upload(file: any, path: string): Promise<any>;
  download(path: string): Promise<any>;
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

export interface IWebhookService {
  register(url: string, events: string[], secret: string): Promise<any>;
  unregister(webhookId: string): Promise<void>;
  deliver(webhookId: string, event: any): Promise<any>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
}

export interface ICacheService {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}
