import { JobProcessor, QueueName } from '@repo/types';
import { container } from 'tsyringe';

import { LoggerService } from '../logger.service';

import { EmailProcessor, PushProcessor, SmsProcessor, WebhookProcessor } from './processors';
import { QueueService } from './queue.service';

/**
 * Initialize all job queues with their processors
 */
export function initializeQueues(): void {
  const queueService = container.resolve(QueueService);
  const logger = container.resolve(LoggerService);
  const emailProcessor = container.resolve(EmailProcessor);
  const smsProcessor = container.resolve(SmsProcessor);
  const pushProcessor = container.resolve(PushProcessor);
  const webhookProcessor = container.resolve(WebhookProcessor);

  // Register email queue
  queueService.registerQueue({
    name: QueueName.EMAIL,
    processor: emailProcessor.process.bind(emailProcessor) as unknown as JobProcessor,
    workerOptions: {
      concurrency: 5,
      limiter: {
        max: 100, // Max 100 jobs
        duration: 60000, // Per minute
      },
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
    },
  });

  // Register SMS queue
  queueService.registerQueue({
    name: QueueName.SMS,
    processor: smsProcessor.process.bind(smsProcessor) as unknown as JobProcessor,
    workerOptions: {
      concurrency: 10,
      limiter: {
        max: 200, // Max 200 jobs
        duration: 60000, // Per minute
      },
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });

  // Register push notification queue
  queueService.registerQueue({
    name: QueueName.PUSH,
    processor: pushProcessor.process.bind(pushProcessor) as unknown as JobProcessor,
    workerOptions: {
      concurrency: 20,
      limiter: {
        max: 500, // Max 500 jobs
        duration: 60000, // Per minute
      },
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });

  // Register webhook queue
  queueService.registerQueue({
    name: QueueName.WEBHOOK,
    processor: webhookProcessor.process.bind(webhookProcessor) as unknown as JobProcessor,
    workerOptions: {
      concurrency: 10,
      limiter: {
        max: 100, // Max 100 jobs
        duration: 60000, // Per minute
      },
    },
    defaultJobOptions: {
      attempts: 5, // More retries for webhooks
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        count: 500,
        age: 7 * 24 * 3600, // Keep for 7 days
      },
      removeOnFail: {
        count: 1000, // Keep more failed webhook jobs for debugging
      },
    },
  });

  // Register file processing queue (processor TBD)
  queueService.registerQueue({
    name: QueueName.FILE_PROCESSING,
    processor: async (job) => {
      // Placeholder processor
      logger.debug('File processing job:', { jobId: job.id, data: job.data });
      return { success: true };
    },
    workerOptions: {
      concurrency: 5,
    },
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
    },
  });

  // Register data export queue (processor TBD)
  queueService.registerQueue({
    name: QueueName.DATA_EXPORT,
    processor: async (job) => {
      // Placeholder processor
      logger.debug('Data export job:', { jobId: job.id, data: job.data });
      return { success: true };
    },
    workerOptions: {
      concurrency: 2, // Resource-intensive, limit concurrency
    },
    defaultJobOptions: {
      attempts: 1,
      timeout: 300000, // 5 minutes timeout
    },
  });

  // Register report generation queue (processor TBD)
  queueService.registerQueue({
    name: QueueName.REPORT_GENERATION,
    processor: async (job) => {
      // Placeholder processor
      logger.debug('Report generation job:', { jobId: job.id, data: job.data });
      return { success: true };
    },
    workerOptions: {
      concurrency: 3,
    },
    defaultJobOptions: {
      attempts: 2,
      timeout: 600000, // 10 minutes timeout
    },
  });

  // Register cleanup queue (processor TBD)
  queueService.registerQueue({
    name: QueueName.CLEANUP,
    processor: async (job) => {
      // Placeholder processor
      logger.debug('Cleanup job:', { jobId: job.id, data: job.data });
      return { success: true };
    },
    workerOptions: {
      concurrency: 1, // Sequential cleanup
    },
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: {
        count: 10,
      },
    },
  });

  logger.info('✅ All job queues initialized successfully');
}
