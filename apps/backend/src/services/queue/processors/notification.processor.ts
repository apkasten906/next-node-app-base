import { SmsJobData, PushJobData, JobResult } from '@repo/types';
import { Job } from 'bullmq';
import 'reflect-metadata';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * SMS job processor
 * Handles background SMS sending with retry logic
 */
@injectable()
export class SmsProcessor {
  constructor(
    private logger: LoggerService,
    private notificationService: NotificationService
  ) {}

  async process(job: Job<SmsJobData>): Promise<JobResult> {
    const { to, message, from } = job.data;

    this.logger.info('Processing SMS job', {
      jobId: job.id,
      to,
    });

    try {
      await job.updateProgress(25);

      const result = await this.notificationService.sendSms({
        to,
        body: message,
        message,
        from,
      });

      await job.updateProgress(100);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      this.logger.info('SMS job completed', {
        jobId: job.id,
        messageId: result.messageId,
      });

      return {
        success: true,
        data: result,
        metadata: {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
        },
      };
    } catch (error) {
      this.logger.error('SMS job failed', error as Error, {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
      });

      throw error;
    }
  }
}

/**
 * Push notification job processor
 * Handles background push notification sending with retry logic
 */
@injectable()
export class PushProcessor {
  constructor(
    private logger: LoggerService,
    private notificationService: NotificationService
  ) {}

  async process(job: Job<PushJobData>): Promise<JobResult> {
    const { userId, title, body, data, badge, sound, icon, imageUrl } = job.data;

    this.logger.info('Processing push notification job', {
      jobId: job.id,
      userId,
      title,
    });

    try {
      await job.updateProgress(25);

      const result = await this.notificationService.sendPushNotification({
        userId,
        title,
        body,
        data,
        badge,
        sound,
        icon,
        imageUrl,
      });

      await job.updateProgress(100);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send push notification');
      }

      this.logger.info('Push notification job completed', {
        jobId: job.id,
        messageId: result.messageId,
      });

      return {
        success: true,
        data: result,
        metadata: {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
        },
      };
    } catch (error) {
      this.logger.error('Push notification job failed', error as Error, {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
      });

      throw error;
    }
  }
}
