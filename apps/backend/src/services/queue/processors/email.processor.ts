import { EmailJobData, JobResult } from '@repo/types';
import { Job } from 'bullmq';
import 'reflect-metadata';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Email job processor
 * Handles background email sending with retry logic
 */
@injectable()
export class EmailProcessor {
  constructor(
    private logger: LoggerService,
    private notificationService: NotificationService
  ) {}

  async process(job: Job<EmailJobData>): Promise<JobResult> {
    const { to, subject, html, text, from, replyTo, cc, bcc } = job.data;

    this.logger.info('Processing email job', {
      jobId: job.id,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
    });

    try {
      // Update job progress
      await job.updateProgress(25);

      const result = await this.notificationService.sendEmail({
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html: html || text || '',
        from,
        replyTo,
        cc,
        bcc,
      });

      await job.updateProgress(100);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      this.logger.info('Email job completed', {
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
      this.logger.error('Email job failed', error as Error, {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
      });

      throw error; // BullMQ will handle retry
    }
  }
}
