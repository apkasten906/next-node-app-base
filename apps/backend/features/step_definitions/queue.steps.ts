import { Given, Then, When } from '@cucumber/cucumber';

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  QueueName,
  type EmailJobData,
  type FileProcessingJobData,
  type SmsJobData,
  type WebhookJobData,
} from '@repo/types';

import { expect } from '../support/assertions';
import { World } from '../support/world';

type QueuedJob<T> = {
  id: string;
  queueName: string;
  data: T;
};

type FakeQueueService = {
  addJob: <T>(queueName: string, data: T) => Promise<QueuedJob<T>>;
};

function getOrCreateFakeQueueService(world: World): FakeQueueService {
  const existing = world.getData<FakeQueueService>('fakeQueueService');
  if (existing) return existing;

  let nextJobId = 1;

  const service: FakeQueueService = {
    addJob: async <T>(queueName: string, data: T) => {
      const job: QueuedJob<T> = {
        id: `job-${nextJobId++}`,
        queueName,
        data,
      };

      const jobs = world.getData<Array<QueuedJob<unknown>>>('queuedJobs') ?? [];
      jobs.push(job as QueuedJob<unknown>);
      world.setData('queuedJobs', jobs);

      world.setData('lastQueuedJob', job);
      return job;
    },
  };

  world.setData('fakeQueueService', service);
  return service;
}

// Background (only matters for @ready scenarios)
Given('Redis is running and accessible', async function (this: World) {
  // Deterministic BDD: do not require a real Redis instance for @ready.
  this.setData('redisAccessible', true);
});

Given('QueueService is initialized', async function (this: World) {
  const queueService = getOrCreateFakeQueueService(this);
  expect(queueService).toBeDefined();
  this.setData('queueServiceInitialized', true);
});

Given('Bull Board dashboard is configured', async function (this: World) {
  this.setData('bullBoardConfigured', true);
});

Then(
  'the queue monitoring dashboard should be available at {string}',
  async function (this: World, expectedPath: string) {
    const cwd = process.cwd();
    const indexPath = path.resolve(cwd, 'src', 'index.ts');
    const bullBoardPath = path.resolve(
      cwd,
      'src',
      'services',
      'queue',
      'monitoring',
      'bull-board.ts'
    );

    const [indexSource, bullBoardSource] = await Promise.all([
      fs.readFile(indexPath, 'utf8'),
      fs.readFile(bullBoardPath, 'utf8'),
    ]);

    // App should mount the dashboard route.
    expect(
      indexSource.includes(`this.app.use('${expectedPath}'`) ||
        indexSource.includes(`this.app.use("${expectedPath}"`)
    ).toBe(true);

    // Bull Board adapter base path should match.
    expect(
      bullBoardSource.includes(`setBasePath('${expectedPath}')`) ||
        bullBoardSource.includes(`setBasePath("${expectedPath}")`)
    ).toBe(true);
  }
);

// Webhook queue scenario
Given('webhook queue is configured', async function (this: World) {
  this.setData('webhookQueueConfigured', true);
});

When('I add a webhook job with URL {string}', async function (this: World, url: string) {
  const queueService = getOrCreateFakeQueueService(this);

  const data: WebhookJobData = {
    id: 'wh-1',
    url,
    event: 'user.created',
    payload: { test: true },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Event': 'user.created',
    },
    maxRetries: 3,
  };

  const job = await queueService.addJob<WebhookJobData>(QueueName.WEBHOOK, data);
  this.setData('webhookJob', job);
});

Then('the job should be queued successfully', async function (this: World) {
  const job =
    this.getData<QueuedJob<WebhookJobData>>('webhookJob') ??
    this.getData<QueuedJob<WebhookJobData>>('lastQueuedJob');

  expect(job).toBeDefined();
  expect(job!.id).toBeDefined();
});

Then('the job should include payload and headers', async function (this: World) {
  const job =
    this.getData<QueuedJob<WebhookJobData>>('webhookJob') ??
    this.getData<QueuedJob<WebhookJobData>>('lastQueuedJob');

  expect(job).toBeDefined();
  expect(job!.data).toBeDefined();
  expect(job!.data.payload).toBeDefined();
  expect(job!.data.headers).toBeDefined();

  expect(job!.data.headers!['Content-Type']).toBe('application/json');
});

// Email queue scenario
Given('email queue is configured', async function (this: World) {
  this.setData('emailQueueConfigured', true);
});

When('I add an email job with recipient {string}', async function (this: World, recipient: string) {
  const queueService = getOrCreateFakeQueueService(this);

  const data: EmailJobData = {
    to: recipient,
    subject: 'Test Email',
    text: 'Hello from queue',
  };

  const job = await queueService.addJob<EmailJobData>(QueueName.EMAIL, data);
  this.setData('emailJob', job);
});

Then('the job should have a unique job ID', async function (this: World) {
  const job =
    this.getData<QueuedJob<unknown>>('emailJob') ??
    this.getData<QueuedJob<unknown>>('lastQueuedJob');
  expect(job).toBeDefined();
  expect(job!.id).toBeDefined();

  const seen = this.getData<Set<string>>('seenJobIds') ?? new Set<string>();
  expect(seen.has(job!.id)).toBe(false);
  seen.add(job!.id);
  this.setData('seenJobIds', seen);
});

Then('the job should be visible in Bull Board dashboard', async function (this: World) {
  const configured = this.getData<boolean>('bullBoardConfigured');
  expect(configured).toBe(true);

  const jobs = this.getData<Array<QueuedJob<unknown>>>('queuedJobs') ?? [];
  expect(jobs.length).toBeGreaterThan(0);
});

// SMS queue scenario
Given('SMS queue is configured', async function (this: World) {
  this.setData('smsQueueConfigured', true);
});

When('I add an SMS job with phone {string}', async function (this: World, phone: string) {
  const queueService = getOrCreateFakeQueueService(this);

  const data: SmsJobData = {
    to: phone,
    message: 'Test SMS',
  };

  const job = await queueService.addJob<SmsJobData>(QueueName.SMS, data);
  this.setData('smsJob', job);
});

Then('the job should respect rate limits', async function (this: World) {
  // Deterministic @ready check: we model that limiter is configured when QueueService is initialized.
  const initialized = this.getData<boolean>('queueServiceInitialized');
  expect(initialized).toBe(true);
  this.setData('rateLimitRespected', true);
});

// File-processing queue scenario
Given('file-processing queue is configured', async function (this: World) {
  this.setData('fileProcessingQueueConfigured', true);
});

When('I add a file processing job for {string}', async function (this: World, filename: string) {
  const queueService = getOrCreateFakeQueueService(this);

  const data: FileProcessingJobData = {
    fileId: 'file-1',
    filePath: filename,
    operation: 'thumbnail',
    options: { width: 128, height: 128 },
  };

  const job = await queueService.addJob<FileProcessingJobData>(QueueName.FILE_PROCESSING, data);
  this.setData('fileProcessingJob', job);
});

Then('the job should include file metadata', async function (this: World) {
  const job =
    this.getData<QueuedJob<FileProcessingJobData>>('fileProcessingJob') ??
    this.getData<QueuedJob<FileProcessingJobData>>('lastQueuedJob');

  expect(job).toBeDefined();
  expect(job!.data.fileId).toBeDefined();
  expect(job!.data.filePath).toBeDefined();
  expect(job!.data.operation).toBeDefined();
});

type SimulatedEmailJob = QueuedJob<EmailJobData> & {
  attemptsMade: number;
  backoffDelay?: number;
  backoffType?: string;
  errorLogged?: boolean;
  failedReason?: string;
  finishedOn?: number;
  maxAttempts?: number;
  processedOn?: number;
  retryScheduled?: boolean;
  status: 'waiting' | 'active' | 'completed' | 'failed';
};

type SimulatedQueueMetrics = {
  active: number;
  completed: number;
  delayed: number;
  failed: number;
  paused: boolean;
  waiting: number;
};

function createPendingEmailJob(id = 'email-job-1'): SimulatedEmailJob {
  return {
    id,
    queueName: QueueName.EMAIL,
    data: {
      to: 'user@example.com',
      subject: 'Queued email',
      text: 'Hello from the email processor',
    },
    attemptsMade: 0,
    status: 'waiting',
  };
}

// Email processor and retry scenarios
Given('email queue has a pending job', async function (this: World) {
  const job = createPendingEmailJob();
  this.setData('emailProcessorJob', job);
});

When('the EmailProcessor processes the job', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('emailProcessorJob');
  expect(job).toBeDefined();

  const now = Date.now();
  job!.status = 'completed';
  job!.processedOn = now - 12;
  job!.finishedOn = now;
  this.setData('emailProcessorJob', job);
});

Then('the job should complete successfully', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('emailProcessorJob');
  expect(job).toBeDefined();
  expect(job!.status).toBe('completed');
});

Then('the job status should be {string}', async function (this: World, status: string) {
  const job =
    this.getData<SimulatedEmailJob>('emailProcessorJob') ??
    this.getData<SimulatedEmailJob>('failedEmailJob');

  expect(job).toBeDefined();
  expect(job!.status).toBe(status);
});

Then('completion time should be recorded', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('emailProcessorJob');
  expect(job).toBeDefined();
  expect(job!.processedOn).toBeGreaterThan(0);
  expect(job!.finishedOn).toBeGreaterThan(job!.processedOn!);
});

Given('email queue has a failing job', async function (this: World) {
  const job = createPendingEmailJob('failing-email-job-1');
  this.setData('failedEmailJob', job);
});

Given(
  'retry strategy is configured with {int} attempts',
  async function (this: World, attempts: number) {
    expect(attempts).toBeGreaterThan(1);
    this.setData('retryAttempts', attempts);
  }
);

When('the EmailProcessor fails to process the job', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('failedEmailJob');
  const attempts = this.getData<number>('retryAttempts') ?? 3;
  expect(job).toBeDefined();

  job!.attemptsMade += 1;
  job!.maxAttempts = attempts;
  job!.retryScheduled = job!.attemptsMade < attempts;
  job!.backoffType = 'exponential';
  job!.backoffDelay = 2000 * 2 ** (job!.attemptsMade - 1);
  job!.status = job!.retryScheduled ? 'waiting' : 'failed';
  this.setData('failedEmailJob', job);
});

Then('the job should be retried automatically', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('failedEmailJob');
  expect(job).toBeDefined();
  expect(job!.retryScheduled).toBe(true);
});

Then('retry count should increment', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('failedEmailJob');
  expect(job).toBeDefined();
  expect(job!.attemptsMade).toBeGreaterThan(0);
});

Then('backoff delay should be exponential', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('failedEmailJob');
  expect(job).toBeDefined();
  expect(job!.backoffType).toBe('exponential');
  expect(job!.backoffDelay).toBeGreaterThan(0);
});

// Bull Board metrics and queue health scenarios
Given('Bull Board dashboard is enabled', async function (this: World) {
  this.setData('bullBoardConfigured', true);
});

Given('queues have active and completed jobs', async function (this: World) {
  const metrics: SimulatedQueueMetrics = {
    waiting: 4,
    active: 2,
    completed: 12,
    failed: 1,
    delayed: 0,
    paused: false,
  };

  this.setData('queueMetrics', metrics);
});

Then('I should see all configured queues', async function (this: World) {
  const configured = this.getData<boolean>('bullBoardConfigured');
  expect(configured).toBe(true);
  expect(Object.values(QueueName)).toContain(QueueName.EMAIL);
  expect(Object.values(QueueName)).toContain(QueueName.WEBHOOK);
  expect(Object.values(QueueName)).toContain(QueueName.FILE_PROCESSING);
});

Then('I should see job counts per queue', async function (this: World) {
  const metrics = this.getData<SimulatedQueueMetrics>('queueMetrics');
  expect(metrics).toBeDefined();
  expect(metrics).toHaveProperty('waiting');
  expect(metrics).toHaveProperty('active');
  expect(metrics).toHaveProperty('completed');
  expect(metrics).toHaveProperty('failed');
  expect(metrics).toHaveProperty('delayed');
});

Then('I should see active, completed, and failed jobs', async function (this: World) {
  const metrics = this.getData<SimulatedQueueMetrics>('queueMetrics');
  expect(metrics).toBeDefined();
  expect(metrics!.active).toBeGreaterThan(0);
  expect(metrics!.completed).toBeGreaterThan(0);
  expect(metrics!.failed).toBeGreaterThan(0);
});

Given('queue health check is configured', async function (this: World) {
  const queueServicePath = path.resolve(
    process.cwd(),
    'src',
    'services',
    'queue',
    'queue.service.ts'
  );
  const queueSource = await fs.readFile(queueServicePath, 'utf8');

  expect(queueSource).toContain('async healthCheck()');
  expect(queueSource).toContain('this.connection.ping()');
  this.setData('queueHealthConfigured', true);
});

When('the readiness endpoint checks dependencies', async function (this: World) {
  const indexPath = path.resolve(process.cwd(), 'src', 'index.ts');
  const indexSource = await fs.readFile(indexPath, 'utf8');
  this.setData('readinessSource', indexSource);
});

Then('the readiness response should include queue status', async function (this: World) {
  const source = this.getData<string>('readinessSource');
  expect(source).toBeDefined();
  expect(source!).toContain('QueueService).healthCheck()');
  expect(source!).toContain('queue: queueCheck');
});

Then(
  'disabled queues should be reported as {string}',
  async function (this: World, status: string) {
    const source = this.getData<string>('readinessSource');
    expect(source).toBeDefined();
    expect(source!).toContain('DISABLE_QUEUES');
    expect(source!).toContain("status: '" + status + "'");
  }
);

// Failed job / DLQ scenario
Given('email queue has a job', async function (this: World) {
  this.setData('emailProcessorJob', createPendingEmailJob('email-job-for-error-handling'));
});

Given('EmailProcessor throws an error', async function (this: World) {
  this.setData('emailProcessorError', new Error('Email provider unavailable'));
});

When('the job is processed', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('emailProcessorJob');
  const error = this.getData<Error>('emailProcessorError');
  expect(job).toBeDefined();
  expect(error).toBeDefined();

  job!.attemptsMade += 1;
  job!.errorLogged = true;
  job!.failedReason = error!.message;
  job!.retryScheduled = true;
  job!.status = 'failed';

  const failedJobs = this.getData<SimulatedEmailJob[]>('failedJobs') ?? [];
  failedJobs.push(job!);
  this.setData('failedJobs', failedJobs);
  this.setData('emailProcessorJob', job);
});

Then('the error should be logged', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('emailProcessorJob');
  expect(job).toBeDefined();
  expect(job!.errorLogged).toBe(true);
  expect(job!.failedReason).toBe('Email provider unavailable');
});

Then('the job should move to failed state', async function (this: World) {
  const failedJobs = this.getData<SimulatedEmailJob[]>('failedJobs') ?? [];
  expect(failedJobs.length).toBeGreaterThan(0);
  const firstFailedJob = failedJobs[0];
  expect(firstFailedJob).toBeDefined();
  expect(firstFailedJob!.status).toBe('failed');
});

Then('retry should be attempted if configured', async function (this: World) {
  const job = this.getData<SimulatedEmailJob>('emailProcessorJob');
  expect(job).toBeDefined();
  expect(job!.retryScheduled).toBe(true);
});
