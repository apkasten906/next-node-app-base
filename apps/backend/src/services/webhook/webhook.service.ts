import crypto from 'node:crypto';

import { QueueName, WebhookJobData } from '@repo/types';
import { inject, singleton } from 'tsyringe';

import { CacheService } from '../cache.service';
import { LoggerService } from '../logger.service';
import { QueueService } from '../queue/queue.service';

/**
 * Webhook event interface
 */
export interface WebhookEvent {
  id: string;
  url: string;
  event: string;
  payload: Record<string, unknown>;
  secret?: string;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Webhook delivery result
 */
export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
}

/**
 * Webhook service with retry logic and signature verification
 * Implements reliable webhook delivery with exponential backoff
 */
@singleton()
export class WebhookService {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // ms
  private readonly queueService?: QueueService;

  constructor(
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(CacheService) private readonly cache: CacheService
  ) {
    // Try to resolve QueueService, but don't fail if it's not available
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic import for optional dependency
      const { container } = require('tsyringe');
      this.queueService = container.resolve(QueueService);
    } catch {
      this.logger.warn('QueueService not available, webhooks will be processed synchronously');
    }
  }

  /**
   * Send webhook with retry logic
   */
  async send(event: WebhookEvent): Promise<WebhookResult> {
    const maxRetries = event.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;

      try {
        const result = await this.deliver(event);

        if (result.success) {
          this.logger.info('Webhook delivered successfully', {
            eventId: event.id,
            url: event.url,
            attempts,
          });
          return result;
        }

        // If not successful and retries remain, wait and retry
        if (attempts < maxRetries) {
          const delay = this.RETRY_DELAYS[attempts - 1] || 15000;
          this.logger.warn(`Webhook delivery failed, retrying in ${delay}ms`, {
            eventId: event.id,
            url: event.url,
            attempt: attempts,
          });
          await this.sleep(delay);
        }
      } catch (error) {
        this.logger.error(`Webhook delivery error on attempt ${attempts}`, error as Error, {
          eventId: event.id,
          url: event.url,
        });

        if (attempts >= maxRetries) {
          return {
            success: false,
            error: (error as Error).message,
            attempts,
          };
        }

        // Wait before retry
        const delay = this.RETRY_DELAYS[attempts - 1] || 15000;
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      attempts,
    };
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliver(event: WebhookEvent): Promise<WebhookResult> {
    const payload = JSON.stringify({
      id: event.id,
      event: event.event,
      timestamp: new Date().toISOString(),
      data: event.payload,
    });

    const signature = event.secret ? this.generateSignature(payload, event.secret) : undefined;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NextNodeApp-Webhooks/1.0',
      'X-Webhook-Event': event.event,
      'X-Webhook-ID': event.id,
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(event.url, {
      method: 'POST',
      headers,
      body: payload,
    });

    return {
      success: response.ok,
      statusCode: response.status,
      attempts: 1,
    };
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret);

      // Ensure buffers are same length for timing-safe comparison
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  /**
   * Queue webhook for async delivery using BullMQ
   */
  async queue(event: WebhookEvent): Promise<void> {
    // Use BullMQ if available, otherwise fallback to setImmediate
    if (this.queueService) {
      const jobData: WebhookJobData = {
        id: event.id,
        url: event.url,
        event: event.event,
        payload: event.payload,
        maxRetries: event.maxRetries || this.DEFAULT_MAX_RETRIES,
      };

      await this.queueService.addJob(QueueName.WEBHOOK, jobData);

      this.logger.info('Webhook queued with BullMQ', {
        eventId: event.id,
        url: event.url,
        event: event.event,
      });
    } else {
      // Fallback to cache-based queue
      const queueKey = `webhook:queue:${event.id}`;
      await this.cache.set(queueKey, event, 3600); // 1 hour TTL

      this.logger.info('Webhook queued (fallback mode)', {
        eventId: event.id,
        url: event.url,
        event: event.event,
      });

      // Process async
      const processQueuedWebhook = async (): Promise<void> => {
        try {
          await this.send(event);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error('Webhook queue processing error', err);
        }
      };

      setImmediate(() => {
        void processQueuedWebhook();
      });
    }
  }

  /**
   * Batch send webhooks
   */
  async sendBatch(events: WebhookEvent[]): Promise<WebhookResult[]> {
    const promises = events.map((event) => this.send(event));
    return Promise.all(promises);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
