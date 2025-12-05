/**
 * Job options for queue operations
 */
export interface QueueJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number | { type: string; delay: number };
  lifo?: boolean;
  timeout?: number;
  removeOnComplete?: boolean | number | { count?: number; age?: number };
  removeOnFail?: boolean | number | { count?: number };
  jobId?: string;
}

/**
 * Generic job interface (abstraction over BullMQ Job)
 */
export interface QueueJob<T = unknown> {
  id: string | undefined;
  name: string;
  data: T;
  opts: QueueJobOptions;
  progress: number | object;
  returnvalue: unknown;
  attemptsMade: number;
  finishedOn?: number;
  processedOn?: number;
  timestamp: number;
}

/**
 * Queue service interface for background job processing
 */
export interface IQueueService {
  /**
   * Add job to queue
   */
  addJob<T = unknown>(queueName: string, data: T, options?: QueueJobOptions): Promise<QueueJob<T>>;

  /**
   * Add bulk jobs to queue
   */
  addBulkJobs<T = unknown>(
    queueName: string,
    jobs: Array<{ name: string; data: T; opts?: QueueJobOptions }>
  ): Promise<QueueJob<T>[]>;

  /**
   * Get job by ID
   */
  getJob<T = unknown>(queueName: string, jobId: string): Promise<QueueJob<T> | undefined>;

  /**
   * Remove job from queue
   */
  removeJob(queueName: string, jobId: string): Promise<void>;

  /**
   * Get queue instance (returns BullMQ Queue in implementation)
   */
  getQueue(queueName: string): unknown;

  /**
   * Get worker instance (returns BullMQ Worker in implementation)
   */
  getWorker(queueName: string): unknown | undefined;

  /**
   * Pause queue
   */
  pauseQueue(queueName: string): Promise<void>;

  /**
   * Resume queue
   */
  resumeQueue(queueName: string): Promise<void>;

  /**
   * Drain queue (remove all jobs)
   */
  drainQueue(queueName: string): Promise<void>;

  /**
   * Clean queue (remove completed/failed jobs)
   */
  cleanQueue(
    queueName: string,
    grace: number,
    limit?: number,
    type?: 'completed' | 'wait' | 'active' | 'delayed' | 'failed'
  ): Promise<string[]>;

  /**
   * Get queue metrics
   */
  getQueueMetrics(queueName: string): Promise<QueueMetrics>;

  /**
   * Get failed jobs
   */
  getFailedJobs<T = unknown>(
    queueName: string,
    start?: number,
    end?: number
  ): Promise<QueueJob<T>[]>;

  /**
   * Get completed jobs
   */
  getCompletedJobs<T = unknown>(
    queueName: string,
    start?: number,
    end?: number
  ): Promise<QueueJob<T>[]>;

  /**
   * Retry failed job
   */
  retryJob(queueName: string, jobId: string): Promise<void>;

  /**
   * Close all queues and workers
   */
  close(): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Job processor function type
 */
export type JobProcessor<T = unknown> = (job: QueueJob<T>) => Promise<unknown>;

/**
 * Queue configuration
 */
export interface QueueConfig {
  /**
   * Queue name
   */
  name: string;

  /**
   * Job processor
   */
  processor: JobProcessor;

  /**
   * Worker options
   */
  workerOptions?: {
    concurrency?: number;
    limiter?: {
      max: number;
      duration: number;
    };
    lockDuration?: number;
    lockRenewTime?: number;
    stalledInterval?: number;
    maxStalledCount?: number;
  };

  /**
   * Default job options
   */
  defaultJobOptions?: QueueJobOptions;
}

/**
 * Queue metrics
 */
export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Standard queue names
 */
export enum QueueName {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  FILE_PROCESSING = 'file-processing',
  DATA_EXPORT = 'data-export',
  REPORT_GENERATION = 'report-generation',
  CLEANUP = 'cleanup',
}

/**
 * Email job data
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * SMS job data
 */
export interface SmsJobData {
  to: string;
  message: string;
  from?: string;
}

/**
 * Push notification job data
 */
export interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: string;
  icon?: string;
  imageUrl?: string;
}

/**
 * Webhook job data
 */
export interface WebhookJobData {
  id: string;
  url: string;
  event: string;
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
  retries?: number;
  maxRetries?: number;
}

/**
 * File processing job data
 */
export interface FileProcessingJobData {
  fileId: string;
  filePath: string;
  operation: 'resize' | 'compress' | 'convert' | 'thumbnail' | 'watermark';
  options?: Record<string, unknown>;
}

/**
 * Data export job data
 */
export interface DataExportJobData {
  userId: string;
  exportType: 'csv' | 'json' | 'excel' | 'pdf';
  filters?: Record<string, unknown>;
  destination?: string;
}

/**
 * Report generation job data
 */
export interface ReportGenerationJobData {
  reportId: string;
  reportType: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
  format: 'pdf' | 'excel' | 'html';
}

/**
 * Cleanup job data
 */
export interface CleanupJobData {
  resourceType: 'files' | 'logs' | 'cache' | 'sessions' | 'temp';
  olderThan: Date;
  pattern?: string;
}

/**
 * Job result interface
 */
export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}
