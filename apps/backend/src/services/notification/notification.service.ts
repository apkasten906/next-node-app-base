import {
  EmailOptions,
  IEmailProvider,
  INotificationService,
  IPushNotificationProvider,
  ISmsProvider,
  NotificationResult,
  PushNotificationOptions,
  SmsOptions,
} from '@repo/types';
import { injectable } from 'tsyringe';
import { LoggerService } from '../logger.service';

/**
 * Main notification service that delegates to specific providers
 */
@injectable()
export class NotificationService implements INotificationService {
  constructor(
    private logger: LoggerService,
    private emailProvider: IEmailProvider,
    private smsProvider: ISmsProvider,
    private pushProvider: IPushNotificationProvider
  ) {}

  async sendEmail(options: EmailOptions): Promise<NotificationResult> {
    try {
      this.logger.info('Sending email', { to: options.to, subject: options.subject });
      const result = await this.emailProvider.send(options);

      if (result.success) {
        this.logger.info('Email sent successfully', { messageId: result.messageId });
      } else {
        this.logger.error('Email send failed', new Error(result.error || 'Unknown error'));
      }

      return result;
    } catch (error) {
      this.logger.error('Email send error', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async sendSms(options: SmsOptions): Promise<NotificationResult> {
    try {
      this.logger.info('Sending SMS', { to: options.to });
      const result = await this.smsProvider.send(options);

      if (result.success) {
        this.logger.info('SMS sent successfully', { messageId: result.messageId });
      } else {
        this.logger.error('SMS send failed', new Error(result.error || 'Unknown error'));
      }

      return result;
    } catch (error) {
      this.logger.error('SMS send error', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async sendPushNotification(options: PushNotificationOptions): Promise<NotificationResult> {
    try {
      this.logger.info('Sending push notification', {
        userId: options.userId,
        title: options.title,
      });
      const result = await this.pushProvider.send(options);

      if (result.success) {
        this.logger.info('Push notification sent successfully', { messageId: result.messageId });
      } else {
        this.logger.error(
          'Push notification send failed',
          new Error(result.error || 'Unknown error')
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Push notification send error', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<NotificationResult[]> {
    this.logger.info('Sending bulk emails', { count: emails.length });

    const results = await Promise.allSettled(emails.map((email) => this.sendEmail(email)));

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const [emailHealth, smsHealth, pushHealth] = await Promise.all([
        this.emailProvider.healthCheck(),
        this.smsProvider.healthCheck(),
        this.pushProvider.healthCheck(),
      ]);

      return emailHealth && smsHealth && pushHealth;
    } catch (error) {
      this.logger.error('Notification service health check failed', error as Error);
      return false;
    }
  }
}
