/**
 * Notification service abstraction interface
 * Allows swapping email/SMS/push notification providers via dependency injection
 */

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SmsOptions {
  to: string;
  body: string;
  from?: string;
}

export interface PushNotificationOptions {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  icon?: string;
  imageUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Main notification service interface
 */
export interface INotificationService {
  /**
   * Send an email
   */
  sendEmail(options: EmailOptions): Promise<NotificationResult>;

  /**
   * Send an SMS
   */
  sendSms(options: SmsOptions): Promise<NotificationResult>;

  /**
   * Send a push notification
   */
  sendPushNotification(options: PushNotificationOptions): Promise<NotificationResult>;

  /**
   * Send bulk emails
   */
  sendBulkEmail(emails: EmailOptions[]): Promise<NotificationResult[]>;

  /**
   * Verify service health
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Email provider interface
 */
export interface IEmailProvider {
  send(options: EmailOptions): Promise<NotificationResult>;
  healthCheck(): Promise<boolean>;
}

/**
 * SMS provider interface
 */
export interface ISmsProvider {
  send(options: SmsOptions): Promise<NotificationResult>;
  healthCheck(): Promise<boolean>;
}

/**
 * Push notification provider interface
 */
export interface IPushNotificationProvider {
  send(options: PushNotificationOptions): Promise<NotificationResult>;
  healthCheck(): Promise<boolean>;
}
