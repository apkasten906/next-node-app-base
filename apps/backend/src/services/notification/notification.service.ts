import {
  EmailJobData,
  EmailOptions,
  IEmailProvider,
  IPushNotificationProvider,
  ISmsProvider,
  NotificationResult,
  PushJobData,
  PushNotificationOptions,
  QueueName,
  SmsJobData,
  SmsOptions,
} from '@repo/types';
import { inject, injectable } from 'tsyringe';

import { LoggerService } from '../logger.service';
import { QueueService } from '../queue/queue.service';

/**
 * Main notification service that delegates to specific providers
 */
@injectable()
export class NotificationService {
  readonly queueService?: QueueService;

  constructor(
    @inject(LoggerService) readonly logger: LoggerService,
    @inject('IEmailProvider') readonly emailProvider: IEmailProvider,
    @inject('ISmsProvider') readonly smsProvider: ISmsProvider,
    @inject('IPushNotificationProvider')
    readonly pushProvider: IPushNotificationProvider
  ) {
    // Try to resolve QueueService for async notifications
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic import for optional dependency
      const { container } = require('tsyringe');
      this.queueService = container.resolve(QueueService);
    } catch {
      this.logger.warn('QueueService not available, notifications will be sent synchronously');
    }
  }

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
        messageId: Date.now().toString(),
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
        messageId: Date.now().toString(),
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
        messageId: Date.now().toString(),
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
          messageId: Date.now().toString(),
        };
      }
    });
  }

  /**
   * Queue email for background delivery
   */
  async queueEmail(options: EmailOptions): Promise<string> {
    if (!this.queueService) {
      throw new Error('QueueService not available');
    }

    const jobData: EmailJobData = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      from: options.from,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    const job = await this.queueService.addJob(QueueName.EMAIL, jobData);
    this.logger.info('Email queued for delivery', { jobId: job.id, to: options.to });
    return job.id!;
  }

  /**
   * Queue SMS for background delivery
   */
  async queueSms(options: SmsOptions): Promise<string> {
    if (!this.queueService) {
      throw new Error('QueueService not available');
    }

    const jobData: SmsJobData = {
      to: options.to,
      message: options.message,
      from: options.from,
    };

    const job = await this.queueService.addJob(QueueName.SMS, jobData);
    this.logger.info('SMS queued for delivery', { jobId: job.id, to: options.to });
    return job.id!;
  }

  /**
   * Queue push notification for background delivery
   */
  async queuePushNotification(options: PushNotificationOptions): Promise<string> {
    if (!this.queueService) {
      throw new Error('QueueService not available');
    }

    const jobData: PushJobData = {
      userId: options.userId,
      title: options.title,
      body: options.body,
      data: options.data,
      badge: options.badge,
      sound: options.sound,
      icon: options.icon,
      imageUrl: options.imageUrl,
    };

    const job = await this.queueService.addJob(QueueName.PUSH, jobData);
    this.logger.info('Push notification queued for delivery', {
      jobId: job.id,
      userId: options.userId,
    });
    return job.id!;
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
