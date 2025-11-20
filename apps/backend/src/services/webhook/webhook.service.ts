import crypto from 'crypto';
import { singleton, inject } from 'tsyringe';
import { LoggerService } from '../logger.service';
import { CacheService } from '../cache.service';

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

  constructor(
    @inject(LoggerService) private logger: LoggerService,
    @inject(CacheService) private cache: CacheService
  ) {}

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
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Queue webhook for async delivery
   */
  async queue(event: WebhookEvent): Promise<void> {
    const queueKey = `webhook:queue:${event.id}`;
    await this.cache.set(queueKey, event, 3600); // 1 hour TTL

    this.logger.info('Webhook queued', {
      eventId: event.id,
      url: event.url,
      event: event.event,
    });

    // Process async (in production, use a proper queue like BullMQ)
    setImmediate(() => {
      this.send(event).catch((error) => {
        this.logger.error('Webhook queue processing error', error as Error);
      });
    });
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
