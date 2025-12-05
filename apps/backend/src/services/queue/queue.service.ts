import { IQueueService, QueueConfig, QueueMetrics, QueueJob, QueueJobOptions } from '@repo/types';
import { Job, JobsOptions, Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import 'reflect-metadata';
import { injectable } from 'tsyringe';

import { LoggerService } from '../logger.service';

/**
 * Queue service implementation using BullMQ
 * Provides Redis-backed job queues with retry logic, scheduling, and monitoring
 */
@injectable()
export class QueueService implements IQueueService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private connection: IORedis;

  constructor(private logger: LoggerService) {
    // Create Redis connection for BullMQ
    const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    this.connection.on('error', (error) => {
      this.logger.error('Queue Redis connection error', error);
    });

    this.connection.on('connect', () => {
      this.logger.info('Queue Redis connection established');
    });
  }

  /**
   * Register a queue with its processor
   */
  registerQueue(config: QueueConfig): void {
    const { name, processor, workerOptions, defaultJobOptions } = config;

    // Create queue if it doesn't exist
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: defaultJobOptions || {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 24 * 3600, // Keep for 24 hours
          },
          removeOnFail: {
            count: 500, // Keep last 500 failed jobs
          },
        },
      });

      this.queues.set(name, queue);
      this.logger.info(`Queue registered: ${name}`);
    }

    // Create worker if it doesn't exist
    if (!this.workers.has(name)) {
      // Adapt processor to BullMQ format (our interface uses QueueJob, BullMQ uses Job)
      const adaptedProcessor = processor as unknown as (job: Job) => Promise<unknown>;

      const worker = new Worker(name, adaptedProcessor, {
        connection: this.connection,
        concurrency: workerOptions?.concurrency || 10,
        limiter: workerOptions?.limiter,
        lockDuration: workerOptions?.lockDuration || 30000,
        lockRenewTime: workerOptions?.lockRenewTime || 15000,
        stalledInterval: workerOptions?.stalledInterval || 30000,
        maxStalledCount: workerOptions?.maxStalledCount || 1,
      });

      // Worker event handlers
      worker.on('completed', (job) => {
        this.logger.info(`Job completed: ${job.id} in queue ${name}`, {
          jobId: job.id,
          queue: name,
          duration: job.finishedOn ? job.finishedOn - job.processedOn! : undefined,
        });
      });

      worker.on('failed', (job, error) => {
        this.logger.error(`Job failed: ${job?.id} in queue ${name}`, error, {
          jobId: job?.id,
          queue: name,
          attemptsMade: job?.attemptsMade,
          data: job?.data,
        });
      });

      worker.on('error', (error) => {
        this.logger.error(`Worker error in queue ${name}`, error as Error);
      });

      worker.on('stalled', (jobId) => {
        this.logger.warn(`Job stalled: ${jobId} in queue ${name}`, {
          jobId,
          queue: name,
        });
      });

      this.workers.set(name, worker);
      this.logger.info(`Worker registered for queue: ${name}`);
    }

    // Create queue events listener
    if (!this.queueEvents.has(name)) {
      const queueEvents = new QueueEvents(name, {
        connection: this.connection,
      });

      queueEvents.on('waiting', ({ jobId }) => {
        this.logger.debug(`Job waiting: ${jobId} in queue ${name}`);
      });

      queueEvents.on('active', ({ jobId }) => {
        this.logger.debug(`Job active: ${jobId} in queue ${name}`);
      });

      queueEvents.on('progress', ({ jobId, data }) => {
        this.logger.debug(`Job progress: ${jobId} in queue ${name}`, { progress: data });
      });

      this.queueEvents.set(name, queueEvents);
    }
  }

  /**
   * Add job to queue
   */
  async addJob<T = unknown>(
    queueName: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<QueueJob<T>> {
    const queue = this.getQueue<T>(queueName);

    // Type assertion needed for BullMQ's strict typing
    const job = await queue.add(queueName as never, data as never, options as JobsOptions);

    this.logger.info(`Job added to queue: ${queueName}`, {
      jobId: job.id,
      queue: queueName,
      delay: options?.delay,
      priority: options?.priority,
    });

    return job as unknown as QueueJob<T>;
  }

  /**
   * Add bulk jobs to queue
   */
  async addBulkJobs<T = unknown>(
    queueName: string,
    jobs: Array<{ name: string; data: T; opts?: QueueJobOptions }>
  ): Promise<QueueJob<T>[]> {
    const queue = this.getQueue<T>(queueName);

    // Type assertion for BullMQ compatibility
    const addedJobs = await queue.addBulk(jobs as never);

    this.logger.info(`Bulk jobs added to queue: ${queueName}`, {
      count: jobs.length,
      queue: queueName,
    });

    return addedJobs as unknown as QueueJob<T>[];
  }

  /**
   * Get job by ID
   */
  async getJob<T = unknown>(queueName: string, jobId: string): Promise<QueueJob<T> | undefined> {
    const queue = this.getQueue<T>(queueName);
    const job = await queue.getJob(jobId);
    return job as unknown as QueueJob<T> | undefined;
  }

  /**
   * Remove job from queue
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.info(`Job removed: ${jobId} from queue ${queueName}`);
    }
  }

  /**
   * Get queue instance
   */
  getQueue<T = unknown>(queueName: string): Queue<T> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }
    return queue as Queue<T>;
  }

  /**
   * Get worker instance
   */
  getWorker<T = unknown>(queueName: string): Worker<T> | undefined {
    return this.workers.get(queueName) as Worker<T> | undefined;
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.info(`Queue paused: ${queueName}`);
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.info(`Queue resumed: ${queueName}`);
  }

  /**
   * Drain queue (remove all jobs)
   */
  async drainQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain();
    this.logger.info(`Queue drained: ${queueName}`);
  }

  /**
   * Clean queue (remove completed/failed jobs)
   */
  async cleanQueue(
    queueName: string,
    grace: number,
    limit?: number,
    type: 'completed' | 'wait' | 'active' | 'delayed' | 'failed' = 'completed'
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);
    const jobs = await queue.clean(grace, limit || 0, type);
    this.logger.info(`Queue cleaned: ${queueName}`, {
      type,
      grace,
      limit,
      removed: jobs.length,
    });
    return jobs;
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs<T = unknown>(
    queueName: string,
    start = 0,
    end = 100
  ): Promise<QueueJob<T>[]> {
    const queue = this.getQueue<T>(queueName);
    const jobs = await queue.getFailed(start, end);
    return jobs as unknown as QueueJob<T>[];
  }

  /**
   * Get completed jobs
   */
  async getCompletedJobs<T = unknown>(
    queueName: string,
    start = 0,
    end = 100
  ): Promise<QueueJob<T>[]> {
    const queue = this.getQueue<T>(queueName);
    const jobs = await queue.getCompleted(start, end);
    return jobs as unknown as QueueJob<T>[];
  }

  /**
   * Retry failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
      this.logger.info(`Job retry initiated: ${jobId} in queue ${queueName}`);
    } else {
      throw new Error(`Job not found: ${jobId} in queue ${queueName}`);
    }
  }

  /**
   * Close all queues and workers
   */
  async close(): Promise<void> {
    this.logger.info('Closing all queues and workers...');

    // Close all workers
    await Promise.all(Array.from(this.workers.values()).map((worker) => worker.close()));

    // Close all queue events
    await Promise.all(Array.from(this.queueEvents.values()).map((qe) => qe.close()));

    // Close all queues
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));

    // Close Redis connection
    await this.connection.quit();

    this.logger.info('All queues and workers closed');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.connection.ping();
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed', error as Error);
      return false;
    }
  }
}
