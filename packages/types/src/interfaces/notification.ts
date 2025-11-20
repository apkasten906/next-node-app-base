/**
 * Notification service interface for email, SMS, and push notifications
 */
export interface INotificationService {
  /**
   * Send email notification
   */
  sendEmail(params: EmailParams): Promise<NotificationResult>;

  /**
   * Send SMS notification
   */
  sendSMS(params: SMSParams): Promise<NotificationResult>;

  /**
   * Send push notification
   */
  sendPushNotification(params: PushParams): Promise<NotificationResult>;

  /**
   * Send bulk notifications
   */
  sendBulk(notifications: BulkNotification[]): Promise<BulkNotificationResult>;

  /**
   * Get notification status
   */
  getStatus(notificationId: string): Promise<NotificationStatus>;
}

export interface EmailParams {
  to: string | string[];
  from?: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SMSParams {
  to: string;
  message: string;
  from?: string;
}

export interface PushParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

export interface BulkNotification {
  type: 'email' | 'sms' | 'push';
  params: EmailParams | SMSParams | PushParams;
}

export interface NotificationResult {
  success: boolean;
  notificationId: string;
  error?: string;
}

export interface BulkNotificationResult {
  total: number;
  successful: number;
  failed: number;
  results: NotificationResult[];
}

export interface NotificationStatus {
  id: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
}

export enum NotificationProvider {
  SENDGRID = 'sendgrid',
  SES = 'ses',
  TWILIO = 'twilio',
  FCM = 'fcm',
  APNS = 'apns',
}
