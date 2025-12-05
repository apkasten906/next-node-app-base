import { WebhookJobData, JobResult } from '@repo/types';
import { Job } from 'bullmq';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';
import { WebhookService } from '../../webhook/webhook.service';

/**
 * Webhook job processor
 * Handles background webhook delivery with retry logic
 */
@injectable()
export class WebhookProcessor {
  constructor(
    private logger: LoggerService,
    private webhookService: WebhookService
  ) {}

  async process(job: Job<WebhookJobData>): Promise<JobResult> {
    const { id, url, event, payload } = job.data;

    this.logger.info('Processing webhook job', {
      jobId: job.id,
      webhookId: id,
      url,
      event,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      const result = await this.webhookService.send({
        id,
        url,
        event,
        payload: payload || {},
      });

      await job.updateProgress(100);

      if (!result.success) {
        throw new Error(result.error || 'Webhook delivery failed');
      }

      this.logger.info('Webhook job completed', {
        jobId: job.id,
        webhookId: id,
        statusCode: result.statusCode,
      });

      return {
        success: true,
        data: result,
        metadata: {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          statusCode: result.statusCode,
        },
      };
    } catch (error) {
      this.logger.error('Webhook job failed', error as Error, {
        jobId: job.id,
        webhookId: id,
        attemptsMade: job.attemptsMade,
      });

      throw error; // BullMQ will handle retry
    }
  }
}
