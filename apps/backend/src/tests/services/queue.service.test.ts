import { QueueName } from '@repo/types';
import { container } from 'tsyringe';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { LoggerService } from '../../services/logger.service';
import { QueueService } from '../../services/queue/queue.service';

// Mock IORedis before tests
vi.mock('ioredis', () => {
  class MockRedis {
    on = vi.fn().mockReturnThis();
    quit = vi.fn().mockResolvedValue('OK');
    disconnect = vi.fn();
    ping = vi.fn().mockResolvedValue('PONG');
    status = 'ready';
  }
  return { default: MockRedis };
});

// Mock BullMQ
vi.mock('bullmq', () => {
  // Shared state for jobs
  const jobStore = new Map<string, { id: string; data: unknown }>();
  let isPausedState = false;
  let waitingCount = 5;

  return {
    Queue: class MockQueue {
      name: string;

      add = vi.fn().mockImplementation((name, data) => {
        const job = { id: `job-${Date.now()}`, data };
        jobStore.set(job.id, job);
        waitingCount++;
        return Promise.resolve(job);
      });

      addBulk = vi
        .fn()
        .mockImplementation((jobs) =>
          Promise.resolve(jobs.map((job, idx) => ({ id: `${idx + 1}`, data: job.data })))
        );

      getJob = vi.fn().mockImplementation((id) => {
        const job = jobStore.get(id);
        if (job) {
          return Promise.resolve({
            ...job,
            remove: vi.fn().mockImplementation(() => {
              jobStore.delete(id);
              waitingCount = Math.max(0, waitingCount - 1);
              return Promise.resolve();
            }),
          });
        }
        return Promise.resolve(undefined);
      });

      pause = vi.fn().mockImplementation(() => {
        isPausedState = true;
        return Promise.resolve();
      });

      resume = vi.fn().mockImplementation(() => {
        isPausedState = false;
        return Promise.resolve();
      });

      getWaitingCount = vi.fn().mockImplementation(() => Promise.resolve(waitingCount));
      getActiveCount = vi.fn().mockResolvedValue(2);
      getCompletedCount = vi.fn().mockResolvedValue(10);
      getFailedCount = vi.fn().mockResolvedValue(1);
      getDelayedCount = vi.fn().mockResolvedValue(0);
      isPaused = vi.fn().mockImplementation(() => Promise.resolve(isPausedState));

      drain = vi.fn().mockImplementation(() => {
        waitingCount = 0;
        return Promise.resolve();
      });

      clean = vi.fn().mockResolvedValue([]);

      getJobCounts = vi.fn().mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 0,
      });

      close = vi.fn().mockResolvedValue(undefined);

      constructor(name: string) {
        this.name = name;
      }
    },
    Worker: class MockWorker {
      on = vi.fn().mockReturnThis();
      close = vi.fn().mockResolvedValue(undefined);
    },
    QueueEvents: class MockQueueEvents {
      on = vi.fn().mockReturnThis();
      close = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe('QueueService', () => {
  let queueService: QueueService;

  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();

    // Setup DI container  - create new instance each time
    container.clearInstances();

    // Create service directly to avoid DI issues with mocks
    const logger = new LoggerService();
    queueService = new QueueService(logger);
  });

  afterEach(async () => {
    // Clean up
    if (queueService) {
      await queueService.close();
    }
  });

  describe('Queue Registration', () => {
    it('should register a queue with processor', () => {
      const processor = vi.fn().mockResolvedValue({ success: true });

      queueService.registerQueue({
        name: QueueName.EMAIL,
        processor,
        workerOptions: {
          concurrency: 5,
        },
      });

      const queue = queueService.getQueue(QueueName.EMAIL);
      expect(queue).toBeDefined();
      expect(queue.name).toBe(QueueName.EMAIL);
    });

    it('should throw error for non-existent queue', () => {
      expect(() => {
        queueService.getQueue('nonexistent' as QueueName);
      }).toThrow('Queue not found: nonexistent');
    });
  });

  describe('Job Management', () => {
    beforeEach(() => {
      const processor = vi.fn().mockResolvedValue({ success: true });
      queueService.registerQueue({
        name: QueueName.EMAIL,
        processor,
      });
    });

    it('should add job to queue', async () => {
      const jobData = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      const job = await queueService.addJob(QueueName.EMAIL, jobData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual(jobData);
    });

    it('should add bulk jobs to queue', async () => {
      const jobs = [
        { name: 'email', data: { to: 'test1@example.com', subject: 'Test 1', html: 'Test 1' } },
        { name: 'email', data: { to: 'test2@example.com', subject: 'Test 2', html: 'Test 2' } },
      ];

      const addedJobs = await queueService.addBulkJobs(QueueName.EMAIL, jobs);

      expect(addedJobs).toHaveLength(2);
      expect(addedJobs[0].data.to).toBe('test1@example.com');
      expect(addedJobs[1].data.to).toBe('test2@example.com');
    });

    it('should get job by ID', async () => {
      const jobData = { to: 'test@example.com', subject: 'Test', html: 'Test' };
      const addedJob = await queueService.addJob(QueueName.EMAIL, jobData);

      const retrievedJob = await queueService.getJob(QueueName.EMAIL, addedJob.id!);

      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.id).toBe(addedJob.id);
    });

    it('should remove job from queue', async () => {
      const jobData = { to: 'test@example.com', subject: 'Test', html: 'Test' };
      const addedJob = await queueService.addJob(QueueName.EMAIL, jobData);

      await queueService.removeJob(QueueName.EMAIL, addedJob.id!);

      const retrievedJob = await queueService.getJob(QueueName.EMAIL, addedJob.id!);
      expect(retrievedJob).toBeUndefined();
    });
  });

  describe('Queue Operations', () => {
    beforeEach(() => {
      const processor = vi.fn().mockResolvedValue({ success: true });
      queueService.registerQueue({
        name: QueueName.WEBHOOK,
        processor,
      });
    });

    it('should pause and resume queue', async () => {
      await queueService.pauseQueue(QueueName.WEBHOOK);
      let metrics = await queueService.getQueueMetrics(QueueName.WEBHOOK);
      expect(metrics.paused).toBe(true);

      await queueService.resumeQueue(QueueName.WEBHOOK);
      metrics = await queueService.getQueueMetrics(QueueName.WEBHOOK);
      expect(metrics.paused).toBe(false);
    });

    it('should get queue metrics', async () => {
      const metrics = await queueService.getQueueMetrics(QueueName.WEBHOOK);

      expect(metrics).toHaveProperty('waiting');
      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('completed');
      expect(metrics).toHaveProperty('failed');
      expect(metrics).toHaveProperty('delayed');
      expect(metrics).toHaveProperty('paused');
    });

    it('should drain queue', async () => {
      // Add some jobs
      await queueService.addJob(QueueName.WEBHOOK, {
        id: '1',
        url: 'http://test.com',
        event: 'test',
      });
      await queueService.addJob(QueueName.WEBHOOK, {
        id: '2',
        url: 'http://test.com',
        event: 'test',
      });

      await queueService.drainQueue(QueueName.WEBHOOK);

      const metrics = await queueService.getQueueMetrics(QueueName.WEBHOOK);
      expect(metrics.waiting).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should return true when Redis is connected', async () => {
      const isHealthy = await queueService.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });
});
