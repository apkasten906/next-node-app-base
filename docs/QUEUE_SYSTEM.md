# Message Queue System (BullMQ)

Complete guide for the BullMQ-based message queue system for background job processing.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Queue Architecture](#queue-architecture)
- [Job Types](#job-types)
- [Queue Configuration](#queue-configuration)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The application uses **BullMQ** for reliable background job processing with the following features:

- **Redis-backed** - Persistent job storage with Redis
- **Retry Logic** - Automatic job retries with exponential backoff
- **Priority Queues** - Job prioritization support
- **Scheduled Jobs** - Delay and cron-based scheduling
- **Job Progress** - Real-time progress tracking
- **Concurrency Control** - Configure worker concurrency and rate limiting
- **Dead Letter Queue** - Failed job handling and debugging
- **Monitoring Dashboard** - Bull Board UI for queue management

## Quick Start

### Adding Jobs to Queues

```typescript
import { container } from 'tsyringe';
import { QueueService } from './services/queue/queue.service';
import { QueueName, EmailJobData } from '@repo/types';

const queueService = container.resolve(QueueService);

// Add email job
const emailJob: EmailJobData = {
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our platform</h1>',
};

await queueService.addJob(QueueName.EMAIL, emailJob);
```

### Using Queue Methods in Services

```typescript
// NotificationService - Queue email for background delivery
await notificationService.queueEmail({
  to: 'user@example.com',
  subject: 'Account Created',
  html: '<p>Your account has been created</p>',
});

// WebhookService - Queue webhook delivery
await webhookService.queue({
  id: crypto.randomUUID(),
  url: 'https://api.example.com/webhook',
  event: 'user.created',
  payload: { userId: '123', email: 'user@example.com' },
});
```

### Monitoring Dashboard

Access the Bull Board monitoring dashboard:

**Development:** http://localhost:3001/admin/queues

**Production:** Set `ENABLE_QUEUE_DASHBOARD=true` environment variable

## Queue Architecture

### Components

1. **QueueService** - Core service for queue management
2. **Job Processors** - Functions that process jobs
3. **Workers** - Execute job processors with concurrency
4. **Queue Events** - Monitor job lifecycle events
5. **Bull Board** - Web UI for queue monitoring

### Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ addJob()
       ▼
┌─────────────┐
│QueueService │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────┐
│    Queue    │────▶│  Redis   │
└──────┬──────┘     └──────────┘
       │
       ▼
┌─────────────┐
│   Worker    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Processor  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Result    │
└─────────────┘
```

### Registered Queues

| Queue Name          | Purpose            | Concurrency | Retries | Rate Limit |
| ------------------- | ------------------ | ----------- | ------- | ---------- |
| `email`             | Email delivery     | 5           | 3       | 100/min    |
| `sms`               | SMS delivery       | 10          | 3       | 200/min    |
| `push`              | Push notifications | 20          | 3       | 500/min    |
| `webhook`           | Webhook delivery   | 10          | 5       | 100/min    |
| `file-processing`   | File operations    | 5           | 2       | No limit   |
| `data-export`       | Data exports       | 2           | 1       | No limit   |
| `report-generation` | Report creation    | 3           | 2       | No limit   |
| `cleanup`           | Cleanup tasks      | 1           | 1       | No limit   |

## Job Types

### Email Jobs

```typescript
interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

// Add email job
await queueService.addJob(QueueName.EMAIL, {
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Hello!</h1>',
});
```

### SMS Jobs

```typescript
interface SmsJobData {
  to: string;
  message: string;
  from?: string;
}

// Add SMS job
await queueService.addJob(QueueName.SMS, {
  to: '+1234567890',
  message: 'Your verification code is 123456',
});
```

### Push Notification Jobs

```typescript
interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  icon?: string;
  imageUrl?: string;
}

// Add push notification job
await queueService.addJob(QueueName.PUSH, {
  userId: 'user-123',
  title: 'New Message',
  body: 'You have a new message',
  badge: 1,
});
```

### Webhook Jobs

```typescript
interface WebhookJobData {
  id: string;
  url: string;
  event: string;
  payload?: Record<string, any>;
  headers?: Record<string, string>;
  retries?: number;
  maxRetries?: number;
}

// Add webhook job
await queueService.addJob(QueueName.WEBHOOK, {
  id: crypto.randomUUID(),
  url: 'https://api.example.com/webhook',
  event: 'order.created',
  payload: { orderId: '123', total: 99.99 },
});
```

## Queue Configuration

### Job Options

```typescript
import { JobsOptions } from 'bullmq';

const jobOptions: JobsOptions = {
  // Retry configuration
  attempts: 3,
  backoff: {
    type: 'exponential', // or 'fixed'
    delay: 2000, // Initial delay in ms
  },

  // Priority (higher number = higher priority)
  priority: 10,

  // Delay execution
  delay: 60000, // Delay 1 minute

  // Timeout
  timeout: 30000, // 30 seconds

  // Remove completed jobs
  removeOnComplete: {
    count: 100, // Keep last 100 completed jobs
    age: 24 * 3600, // Keep for 24 hours
  },

  // Remove failed jobs
  removeOnFail: {
    count: 500, // Keep last 500 failed jobs
  },

  // Repeat (cron pattern)
  repeat: {
    pattern: '0 0 * * *', // Daily at midnight
  },
};

await queueService.addJob(QueueName.EMAIL, jobData, jobOptions);
```

### Worker Options

```typescript
queueService.registerQueue({
  name: QueueName.EMAIL,
  processor: emailProcessor,
  workerOptions: {
    // Number of parallel jobs
    concurrency: 5,

    // Rate limiter
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000, // Per minute
    },

    // Job lock configuration
    lockDuration: 30000, // 30 seconds
    lockRenewTime: 15000, // Renew at 15 seconds
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 1, // Max stalled attempts
  },
});
```

### Creating Custom Processors

```typescript
import { Job } from 'bullmq';
import { JobResult } from '@repo/types';

export class CustomProcessor {
  constructor(private logger: LoggerService) {}

  async process(job: Job<CustomJobData>): Promise<JobResult> {
    const { id, data } = job;

    this.logger.info('Processing custom job', { jobId: id });

    try {
      // Update progress (0-100)
      await job.updateProgress(25);

      // Process job logic here
      const result = await this.performWork(data);

      await job.updateProgress(100);

      return {
        success: true,
        data: result,
        metadata: {
          jobId: id,
          attemptsMade: job.attemptsMade,
        },
      };
    } catch (error) {
      this.logger.error('Job processing failed', error as Error);
      throw error; // BullMQ handles retry
    }
  }

  private async performWork(data: CustomJobData): Promise<any> {
    // Implementation
  }
}
```

## Monitoring

### Bull Board Dashboard

The Bull Board dashboard provides:

- **Queue Overview** - See all queues and their status
- **Job Lists** - View waiting, active, completed, and failed jobs
- **Job Details** - Inspect job data, progress, and errors
- **Retry Jobs** - Manually retry failed jobs
- **Clean Queues** - Remove old completed/failed jobs
- **Pause/Resume** - Control queue processing

### Programmatic Monitoring

```typescript
// Get queue metrics
const metrics = await queueService.getQueueMetrics(QueueName.EMAIL);
console.log(metrics);
// {
//   waiting: 15,
//   active: 5,
//   completed: 1000,
//   failed: 10,
//   delayed: 3,
//   paused: false
// }

// Get failed jobs
const failedJobs = await queueService.getFailedJobs(QueueName.EMAIL, 0, 10);

// Get completed jobs
const completedJobs = await queueService.getCompletedJobs(QueueName.EMAIL, 0, 10);

// Retry specific job
await queueService.retryJob(QueueName.EMAIL, 'job-id-123');
```

### Queue Events

Queue events are automatically logged:

- `waiting` - Job added to queue
- `active` - Job started processing
- `progress` - Job progress updated
- `completed` - Job finished successfully
- `failed` - Job failed
- `stalled` - Job marked as stalled

## Best Practices

### 1. Idempotent Job Processors

Ensure processors can be safely retried:

```typescript
async process(job: Job<EmailJobData>): Promise<JobResult> {
  const { to, subject } = job.data;

  // Check if email was already sent (idempotency)
  const alreadySent = await this.checkIfSent(job.id!);
  if (alreadySent) {
    return { success: true, data: { skipped: true } };
  }

  // Send email
  const result = await this.emailProvider.send(job.data);

  // Mark as sent
  await this.markAsSent(job.id!);

  return { success: true, data: result };
}
```

### 2. Error Handling

Throw errors for retryable failures, return success false for permanent failures:

```typescript
async process(job: Job): Promise<JobResult> {
  try {
    const result = await this.externalAPI.call(job.data);

    if (result.statusCode === 429) {
      // Retryable error
      throw new Error('Rate limited, will retry');
    }

    if (result.statusCode === 404) {
      // Permanent error - don't retry
      return {
        success: false,
        error: 'Resource not found',
      };
    }

    return { success: true, data: result };
  } catch (error) {
    // Network errors - retryable
    throw error;
  }
}
```

### 3. Progress Tracking

Update job progress for long-running tasks:

```typescript
async process(job: Job<DataExportJobData>): Promise<JobResult> {
  const { recordCount } = job.data;

  for (let i = 0; i < recordCount; i += 100) {
    await this.processRecords(i, i + 100);

    // Update progress (0-100)
    const progress = Math.floor((i / recordCount) * 100);
    await job.updateProgress(progress);
  }

  await job.updateProgress(100);
  return { success: true };
}
```

### 4. Job Deduplication

Prevent duplicate jobs with job IDs:

```typescript
const jobId = `email-${userId}-${Date.now()}`;

await queueService.addJob(QueueName.EMAIL, emailData, {
  jobId, // Use same ID to prevent duplicates
  removeOnComplete: true,
});
```

### 5. Bulk Operations

Use bulk operations for efficiency:

```typescript
const jobs = users.map((user) => ({
  name: 'welcome-email',
  data: {
    to: user.email,
    subject: 'Welcome!',
    html: `<h1>Welcome ${user.name}!</h1>`,
  },
}));

await queueService.addBulkJobs(QueueName.EMAIL, jobs);
```

### 6. Resource Cleanup

Always close queue connections on shutdown:

```typescript
// In shutdown handler
const queueService = container.resolve(QueueService);
await queueService.close();
```

## Troubleshooting

### Issue: Jobs stuck in "active" state

**Cause:** Worker crashed or job exceeded lock duration

**Solution:**

1. Check worker logs for errors
2. Increase `lockDuration` for long-running jobs
3. Jobs will auto-recover after `stalledInterval`

```typescript
workerOptions: {
  lockDuration: 60000, // 1 minute
  stalledInterval: 30000, // Check every 30s
}
```

### Issue: Jobs failing repeatedly

**Cause:** Permanent error or misconfigured retries

**Solution:**

1. Check failed jobs in Bull Board
2. Inspect job data and error messages
3. Fix processor logic or job data
4. Manually retry after fix

```typescript
// View failed jobs
const failed = await queueService.getFailedJobs(QueueName.EMAIL, 0, 10);
console.log(failed[0].failedReason);

// Retry after fix
await queueService.retryJob(QueueName.EMAIL, failed[0].id!);
```

### Issue: Queue not processing jobs

**Cause:** Queue paused or worker not registered

**Solution:**

```typescript
// Check queue status
const metrics = await queueService.getQueueMetrics(QueueName.EMAIL);
console.log('Paused:', metrics.paused);

// Resume if paused
if (metrics.paused) {
  await queueService.resumeQueue(QueueName.EMAIL);
}

// Ensure queue is registered with processor
import { initializeQueues } from './services/queue/queue-init';
initializeQueues();
```

### Issue: Redis connection errors

**Cause:** Redis unavailable or wrong connection config

**Solution:**

1. Verify Redis is running: `redis-cli ping`
2. Check `REDIS_URL` environment variable
3. Review connection logs

```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Test connection
redis-cli -u redis://localhost:6379
```

### Issue: High memory usage

**Cause:** Too many completed jobs retained

**Solution:**
Clean old jobs regularly:

```typescript
// Clean completed jobs older than 1 day
await queueService.cleanQueue(
  QueueName.EMAIL,
  24 * 3600 * 1000, // Grace period (1 day)
  1000, // Limit
  'completed'
);

// Or configure automatic cleanup
defaultJobOptions: {
  removeOnComplete: {
    count: 100,
    age: 24 * 3600,
  },
}
```

### Issue: Jobs not respecting rate limits

**Cause:** Multiple workers or incorrect limiter config

**Solution:**

```typescript
workerOptions: {
  concurrency: 10,
  limiter: {
    max: 100, // Total jobs across all workers
    duration: 60000, // Per minute
    groupKey: 'global', // Share limit across workers
  },
}
```

## Production Deployment

### Environment Variables

```env
# Redis connection
REDIS_URL=redis://localhost:6379

# Queue dashboard (production)
ENABLE_QUEUE_DASHBOARD=true

# Worker configuration
QUEUE_CONCURRENCY_EMAIL=5
QUEUE_CONCURRENCY_WEBHOOK=10
```

### Horizontal Scaling

BullMQ supports multiple workers automatically:

1. **Same Queue, Multiple Workers** - Workers coordinate via Redis
2. **Rate Limiting** - Shared across all workers
3. **Job Distribution** - Automatic load balancing

```bash
# Start multiple instances
pm2 start app.js -i 4 # 4 instances
```

### Monitoring in Production

- **Metrics** - Export queue metrics to Prometheus
- **Alerts** - Set up alerts for failed jobs
- **Logging** - Centralize logs (ELK, Datadog, etc.)
- **Dashboard** - Secure Bull Board with authentication

## Next Steps

- [ ] Implement file processing processor
- [ ] Add data export processor
- [ ] Create report generation processor
- [ ] Set up cleanup cron jobs
- [ ] Configure production monitoring
- [ ] Implement job result webhooks
- [ ] Add job analytics and reporting
