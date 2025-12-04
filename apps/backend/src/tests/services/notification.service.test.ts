import type {
  EmailOptions,
  IEmailProvider,
  IPushNotificationProvider,
  ISmsProvider,
  NotificationResult,
  PushNotificationOptions,
  SmsOptions,
} from '@repo/types';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it } from 'vitest';

import { LoggerService } from '../../services/logger.service';
import { NotificationService } from '../../services/notification/notification.service';

/**
 * Mock Email Provider
 */
class MockEmailProvider implements IEmailProvider {
  private shouldFail = false;
  private sentEmails: EmailOptions[] = [];

  async send(options: EmailOptions): Promise<NotificationResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock email provider failure',
        messageId: `email-${Date.now()}`,
      };
    }

    this.sentEmails.push(options);
    return {
      success: true,
      messageId: `email-${Date.now()}`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }

  setShouldFail(value: boolean): void {
    this.shouldFail = value;
  }

  getSentEmails(): EmailOptions[] {
    return this.sentEmails;
  }

  reset(): void {
    this.shouldFail = false;
    this.sentEmails = [];
  }
}

/**
 * Mock SMS Provider
 */
class MockSmsProvider implements ISmsProvider {
  private shouldFail = false;
  private sentMessages: SmsOptions[] = [];

  async send(options: SmsOptions): Promise<NotificationResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock SMS provider failure',
        messageId: `sms-${Date.now()}`,
      };
    }

    this.sentMessages.push(options);
    return {
      success: true,
      messageId: `sms-${Date.now()}`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }

  setShouldFail(value: boolean): void {
    this.shouldFail = value;
  }

  getSentMessages(): SmsOptions[] {
    return this.sentMessages;
  }

  reset(): void {
    this.shouldFail = false;
    this.sentMessages = [];
  }
}

/**
 * Mock Push Notification Provider
 */
class MockPushNotificationProvider implements IPushNotificationProvider {
  private shouldFail = false;
  private sentNotifications: PushNotificationOptions[] = [];

  async send(options: PushNotificationOptions): Promise<NotificationResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock push provider failure',
        messageId: `push-${Date.now()}`,
      };
    }

    this.sentNotifications.push(options);
    return {
      success: true,
      messageId: `push-${Date.now()}`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }

  setShouldFail(value: boolean): void {
    this.shouldFail = value;
  }

  getSentNotifications(): PushNotificationOptions[] {
    return this.sentNotifications;
  }

  reset(): void {
    this.shouldFail = false;
    this.sentNotifications = [];
  }
}

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockEmailProvider: MockEmailProvider;
  let mockSmsProvider: MockSmsProvider;
  let mockPushProvider: MockPushNotificationProvider;

  beforeEach(() => {
    // Reset container
    container.clearInstances();

    // Create mock providers
    mockEmailProvider = new MockEmailProvider();
    mockSmsProvider = new MockSmsProvider();
    mockPushProvider = new MockPushNotificationProvider();

    // Register dependencies
    container.registerInstance('IEmailProvider', mockEmailProvider);
    container.registerInstance('ISmsProvider', mockSmsProvider);
    container.registerInstance('IPushNotificationProvider', mockPushProvider);
    container.registerSingleton(LoggerService);

    // Create service instance
    notificationService = new NotificationService(
      container.resolve(LoggerService),
      mockEmailProvider,
      mockSmsProvider,
      mockPushProvider
    );
  });

  describe('Email Notifications', () => {
    it('should send email successfully', async () => {
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      };

      const result = await notificationService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockEmailProvider.getSentEmails()).toHaveLength(1);
      expect(mockEmailProvider.getSentEmails()[0]).toEqual(emailOptions);
    });

    it('should send email to multiple recipients', async () => {
      const emailOptions: EmailOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Email',
        text: 'Multiple recipients',
      };

      const result = await notificationService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(mockEmailProvider.getSentEmails()[0].to).toEqual([
        'test1@example.com',
        'test2@example.com',
      ]);
    });

    it('should send email with cc and bcc', async () => {
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Test Email',
        text: 'With CC and BCC',
      };

      const result = await notificationService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      const sentEmail = mockEmailProvider.getSentEmails()[0];
      expect(sentEmail.cc).toBe('cc@example.com');
      expect(sentEmail.bcc).toEqual(['bcc1@example.com', 'bcc2@example.com']);
    });

    it('should send email with attachments', async () => {
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Email with Attachment',
        text: 'Please see attached',
        attachments: [
          {
            filename: 'test.txt',
            content: Buffer.from('test content'),
            contentType: 'text/plain',
          },
        ],
      };

      const result = await notificationService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(mockEmailProvider.getSentEmails()[0].attachments).toHaveLength(1);
    });

    it('should handle email send failure', async () => {
      mockEmailProvider.setShouldFail(true);

      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This will fail',
      };

      const result = await notificationService.sendEmail(emailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should send bulk emails successfully', async () => {
      const emails: EmailOptions[] = [
        { to: 'test1@example.com', subject: 'Email 1', text: 'Content 1' },
        { to: 'test2@example.com', subject: 'Email 2', text: 'Content 2' },
        { to: 'test3@example.com', subject: 'Email 3', text: 'Content 3' },
      ];

      const results = await notificationService.sendBulkEmail(emails);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(mockEmailProvider.getSentEmails()).toHaveLength(3);
    });

    it('should handle partial bulk email failures', async () => {
      const emails: EmailOptions[] = [
        { to: 'test1@example.com', subject: 'Email 1', text: 'Content 1' },
        { to: 'test2@example.com', subject: 'Email 2', text: 'Content 2' },
      ];

      // Send first email successfully
      const result1 = await notificationService.sendEmail(emails[0]);
      expect(result1.success).toBe(true);

      // Make provider fail for second email
      mockEmailProvider.setShouldFail(true);
      const result2 = await notificationService.sendEmail(emails[1]);
      expect(result2.success).toBe(false);
    });
  });

  describe('SMS Notifications', () => {
    it('should send SMS successfully', async () => {
      const smsOptions: SmsOptions = {
        to: '+1234567890',
        body: 'Test SMS message',
      };

      const result = await notificationService.sendSms(smsOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockSmsProvider.getSentMessages()).toHaveLength(1);
      expect(mockSmsProvider.getSentMessages()[0]).toEqual(smsOptions);
    });

    it('should send SMS with custom from number', async () => {
      const smsOptions: SmsOptions = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS',
      };

      const result = await notificationService.sendSms(smsOptions);

      expect(result.success).toBe(true);
      expect(mockSmsProvider.getSentMessages()[0].from).toBe('+0987654321');
    });

    it('should handle SMS send failure', async () => {
      mockSmsProvider.setShouldFail(true);

      const smsOptions: SmsOptions = {
        to: '+1234567890',
        body: 'This will fail',
      };

      const result = await notificationService.sendSms(smsOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Push Notifications', () => {
    it('should send push notification successfully', async () => {
      const pushOptions: PushNotificationOptions = {
        userId: 'user-123',
        title: 'Test Notification',
        body: 'This is a test push notification',
      };

      const result = await notificationService.sendPushNotification(pushOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockPushProvider.getSentNotifications()).toHaveLength(1);
      expect(mockPushProvider.getSentNotifications()[0]).toEqual(pushOptions);
    });

    it('should send push notification with custom data', async () => {
      const pushOptions: PushNotificationOptions = {
        userId: 'user-123',
        title: 'Order Update',
        body: 'Your order has shipped',
        data: {
          orderId: 'order-456',
          trackingNumber: 'TRACK123',
        },
      };

      const result = await notificationService.sendPushNotification(pushOptions);

      expect(result.success).toBe(true);
      const sent = mockPushProvider.getSentNotifications()[0];
      expect(sent.data).toEqual({
        orderId: 'order-456',
        trackingNumber: 'TRACK123',
      });
    });

    it('should send push notification with badge and sound', async () => {
      const pushOptions: PushNotificationOptions = {
        userId: 'user-123',
        title: 'New Message',
        body: 'You have a new message',
        badge: 5,
        sound: 'notification.mp3',
        icon: 'message-icon.png',
      };

      const result = await notificationService.sendPushNotification(pushOptions);

      expect(result.success).toBe(true);
      const sent = mockPushProvider.getSentNotifications()[0];
      expect(sent.badge).toBe(5);
      expect(sent.sound).toBe('notification.mp3');
      expect(sent.icon).toBe('message-icon.png');
    });

    it('should send push notification with image', async () => {
      const pushOptions: PushNotificationOptions = {
        userId: 'user-123',
        title: 'Product Update',
        body: 'New product available',
        imageUrl: 'https://example.com/product.jpg',
      };

      const result = await notificationService.sendPushNotification(pushOptions);

      expect(result.success).toBe(true);
      expect(mockPushProvider.getSentNotifications()[0].imageUrl).toBe(
        'https://example.com/product.jpg'
      );
    });

    it('should handle push notification send failure', async () => {
      mockPushProvider.setShouldFail(true);

      const pushOptions: PushNotificationOptions = {
        userId: 'user-123',
        title: 'Test',
        body: 'This will fail',
      };

      const result = await notificationService.sendPushNotification(pushOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return true when all providers are healthy', async () => {
      const isHealthy = await notificationService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when email provider is unhealthy', async () => {
      mockEmailProvider.setShouldFail(true);
      const isHealthy = await notificationService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should return false when SMS provider is unhealthy', async () => {
      mockSmsProvider.setShouldFail(true);
      const isHealthy = await notificationService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should return false when push provider is unhealthy', async () => {
      mockPushProvider.setShouldFail(true);
      const isHealthy = await notificationService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should return false when multiple providers are unhealthy', async () => {
      mockEmailProvider.setShouldFail(true);
      mockSmsProvider.setShouldFail(true);
      const isHealthy = await notificationService.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle email provider throwing exception', async () => {
      const throwingProvider: IEmailProvider = {
        send: async () => {
          throw new Error('Provider exception');
        },
        healthCheck: async () => true,
      };

      const service = new NotificationService(
        container.resolve(LoggerService),
        throwingProvider,
        mockSmsProvider,
        mockPushProvider
      );

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider exception');
    });

    it('should handle SMS provider throwing exception', async () => {
      const throwingProvider: ISmsProvider = {
        send: async () => {
          throw new Error('SMS provider exception');
        },
        healthCheck: async () => true,
      };

      const service = new NotificationService(
        container.resolve(LoggerService),
        mockEmailProvider,
        throwingProvider,
        mockPushProvider
      );

      const result = await service.sendSms({
        to: '+1234567890',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS provider exception');
    });

    it('should handle push provider throwing exception', async () => {
      const throwingProvider: IPushNotificationProvider = {
        send: async () => {
          throw new Error('Push provider exception');
        },
        healthCheck: async () => true,
      };

      const service = new NotificationService(
        container.resolve(LoggerService),
        mockEmailProvider,
        mockSmsProvider,
        throwingProvider
      );

      const result = await service.sendPushNotification({
        userId: 'user-123',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Push provider exception');
    });

    it('should handle health check throwing exception', async () => {
      const throwingProvider: IEmailProvider = {
        send: async (_options) => ({ success: true, messageId: '123' }),
        healthCheck: async () => {
          throw new Error('Health check failed');
        },
      };

      const service = new NotificationService(
        container.resolve(LoggerService),
        throwingProvider,
        mockSmsProvider,
        mockPushProvider
      );

      const isHealthy = await service.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });
});
