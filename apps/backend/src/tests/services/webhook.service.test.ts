import crypto from 'node:crypto';

import { container } from 'tsyringe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheService } from '../../services/cache.service';
import { LoggerService } from '../../services/logger.service';
import type { WebhookEvent } from '../../services/webhook/webhook.service';
import { WebhookService } from '../../services/webhook/webhook.service';

/**
 * Mock fetch response
 */
class MockResponse {
  constructor(
    public ok: boolean,
    public status: number
  ) {}
}

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let cacheService: CacheService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    // Reset container
    container.clearInstances();

    // Register dependencies
    container.registerSingleton(LoggerService);
    container.registerSingleton(CacheService);

    // Create service instance
    cacheService = container.resolve(CacheService);
    webhookService = container.resolve(WebhookService);

    // Store original fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Webhook Delivery', () => {
    it('should successfully deliver webhook', async () => {
      const event: WebhookEvent = {
        id: 'webhook-1',
        url: 'https://example.com/webhook',
        event: 'user.created',
        payload: { userId: '123', name: 'Test User' },
      };

      // Mock successful response
      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(true, 200));

      const result = await webhookService.send(event);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should include correct headers in webhook request', async () => {
      const event: WebhookEvent = {
        id: 'webhook-2',
        url: 'https://example.com/webhook',
        event: 'order.completed',
        payload: { orderId: '456' },
      };

      let capturedHeaders: Record<string, string> | undefined;
      globalThis.fetch = vi
        .fn()
        .mockImplementation((_url, options: { headers?: Record<string, string> }) => {
          capturedHeaders = options?.headers;
          return Promise.resolve(new MockResponse(true, 200));
        });

      await webhookService.send(event);

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders!['Content-Type']).toBe('application/json');
      expect(capturedHeaders!['User-Agent']).toBe('NextNodeApp-Webhooks/1.0');
      expect(capturedHeaders!['X-Webhook-Event']).toBe('order.completed');
      expect(capturedHeaders!['X-Webhook-ID']).toBe('webhook-2');
    });

    it('should include signature when secret is provided', async () => {
      const signingSecret = crypto.randomBytes(32).toString('hex');
      const event: WebhookEvent = {
        id: 'webhook-3',
        url: 'https://example.com/webhook',
        event: 'payment.received',
        payload: { amount: 100 },
        secret: signingSecret,
      };

      let capturedSignature: string | undefined;
      globalThis.fetch = vi
        .fn()
        .mockImplementation((_url, options: { headers?: Record<string, string> }) => {
          const headers = options?.headers;
          if (headers) {
            capturedSignature = headers['X-Webhook-Signature'];
          }
          return Promise.resolve(new MockResponse(true, 200));
        });

      await webhookService.send(event);

      expect(capturedSignature).toBeDefined();
      expect(capturedSignature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should send correct payload structure', async () => {
      const event: WebhookEvent = {
        id: 'webhook-4',
        url: 'https://example.com/webhook',
        event: 'data.updated',
        payload: { key: 'value', count: 42 },
      };

      let capturedBody: string | undefined;
      globalThis.fetch = vi.fn().mockImplementation((_url, options: { body?: string }) => {
        capturedBody = options?.body;
        return Promise.resolve(new MockResponse(true, 200));
      });

      await webhookService.send(event);

      expect(capturedBody).toBeDefined();
      const parsedBody = JSON.parse(capturedBody!);
      expect(parsedBody.id).toBe('webhook-4');
      expect(parsedBody.event).toBe('data.updated');
      expect(parsedBody.timestamp).toBeDefined();
      expect(parsedBody.data).toEqual({ key: 'value', count: 42 });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure and eventually succeed', async () => {
      const event: WebhookEvent = {
        id: 'webhook-retry-1',
        url: 'https://example.com/webhook',
        event: 'test.event',
        payload: { test: true },
        maxRetries: 3,
      };

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve(new MockResponse(false, 500));
        }
        return Promise.resolve(new MockResponse(true, 200));
      });

      // Speed up test by mocking sleep
      const sleepSpy = vi
        .spyOn(webhookService as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      const result = await webhookService.send(event);

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
      expect(sleepSpy).toHaveBeenCalledTimes(2); // Slept twice before third attempt
    });

    it('should fail after max retries exceeded', async () => {
      const event: WebhookEvent = {
        id: 'webhook-retry-2',
        url: 'https://example.com/webhook',
        event: 'test.event',
        payload: { test: true },
        maxRetries: 2,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(false, 500));

      const sleepSpy = vi
        .spyOn(webhookService as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      const result = await webhookService.send(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Max retries exceeded');
      expect(result.attempts).toBe(2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(sleepSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors with retries', async () => {
      const event: WebhookEvent = {
        id: 'webhook-error-1',
        url: 'https://example.com/webhook',
        event: 'test.event',
        payload: { test: true },
        maxRetries: 2,
      };

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const sleepSpy = vi
        .spyOn(webhookService as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      const result = await webhookService.send(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.attempts).toBe(2);
      expect(sleepSpy).toHaveBeenCalledTimes(1);
    });

    it('should use default max retries when not specified', async () => {
      const event: WebhookEvent = {
        id: 'webhook-default',
        url: 'https://example.com/webhook',
        event: 'test.event',
        payload: { test: true },
        // No maxRetries specified
      };

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(false, 500));

      // Mock sleep to speed up test
      vi.spyOn(
        webhookService as unknown as { sleep: (ms: number) => Promise<void> },
        'sleep'
      ).mockResolvedValue(undefined);

      const result = await webhookService.send(event);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // Default is 3
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      const event: WebhookEvent = {
        id: 'webhook-backoff',
        url: 'https://example.com/webhook',
        event: 'test.event',
        payload: { test: true },
        maxRetries: 3,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(false, 500));

      const sleepSpy = vi
        .spyOn(webhookService as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      await webhookService.send(event);

      expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000); // First retry: 1s
      expect(sleepSpy).toHaveBeenNthCalledWith(2, 5000); // Second retry: 5s
    });
  });

  describe('Signature Verification', () => {
    it('should generate correct HMAC signature', () => {
      const payload = '{"test":"data"}';
      const secret = crypto.randomBytes(32).toString('hex');

      const signature = (
        webhookService as unknown as { generateSignature: (p: string, s: string) => string }
      ).generateSignature(payload, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

      // Verify manually
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expected = `sha256=${hmac.digest('hex')}`;
      expect(signature).toBe(expected);
    });

    it('should verify correct signature', () => {
      const payload = '{"event":"test"}';
      const secret = crypto.randomBytes(32).toString('hex');

      const signature = (
        webhookService as unknown as { generateSignature: (p: string, s: string) => string }
      ).generateSignature(payload, secret);
      const isValid = webhookService.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const payload = '{"event":"test"}';
      const secret = crypto.randomBytes(32).toString('hex');
      const wrongSignature =
        'sha256=wrong1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      const isValid = webhookService.verifySignature(payload, wrongSignature, secret);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = '{"event":"test"}';
      const secret = crypto.randomBytes(32).toString('hex');
      const wrongSecret = crypto.randomBytes(32).toString('hex');

      const signature = (
        webhookService as unknown as { generateSignature: (p: string, s: string) => string }
      ).generateSignature(payload, secret);
      const isValid = webhookService.verifySignature(payload, signature, wrongSecret);

      expect(isValid).toBe(false);
    });

    it('should reject signature for modified payload', () => {
      const originalPayload = '{"event":"test","data":"original"}';
      const modifiedPayload = '{"event":"test","data":"modified"}';
      const secret = crypto.randomBytes(32).toString('hex');

      const signature = (
        webhookService as unknown as { generateSignature: (p: string, s: string) => string }
      ).generateSignature(originalPayload, secret);
      const isValid = webhookService.verifySignature(modifiedPayload, signature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe('Webhook Queue', () => {
    it('should queue webhook event', async () => {
      const event: WebhookEvent = {
        id: 'webhook-queue-1',
        url: 'https://example.com/webhook',
        event: 'queued.event',
        payload: { data: 'test' },
      };

      const setSpy = vi.spyOn(cacheService, 'set');

      await webhookService.queue(event);

      expect(setSpy).toHaveBeenCalledWith(`webhook:queue:${event.id}`, event, 3600);
    });

    it('should process queued webhook asynchronously', async () => {
      const event: WebhookEvent = {
        id: 'webhook-queue-2',
        url: 'https://example.com/webhook',
        event: 'async.event',
        payload: { async: true },
      };

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(true, 200));

      await webhookService.queue(event);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe('Batch Webhook Delivery', () => {
    it('should send multiple webhooks in batch', async () => {
      const events: WebhookEvent[] = [
        {
          id: 'batch-1',
          url: 'https://example.com/webhook1',
          event: 'event.one',
          payload: { num: 1 },
        },
        {
          id: 'batch-2',
          url: 'https://example.com/webhook2',
          event: 'event.two',
          payload: { num: 2 },
        },
        {
          id: 'batch-3',
          url: 'https://example.com/webhook3',
          event: 'event.three',
          payload: { num: 3 },
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(true, 200));

      const results = await webhookService.sendBatch(events);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial batch failures', async () => {
      const events: WebhookEvent[] = [
        {
          id: 'batch-fail-1',
          url: 'https://example.com/webhook1',
          event: 'event.one',
          payload: { num: 1 },
          maxRetries: 1,
        },
        {
          id: 'batch-fail-2',
          url: 'https://example.com/webhook2',
          event: 'event.two',
          payload: { num: 2 },
          maxRetries: 1,
        },
      ];

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        // First webhook succeeds, second fails
        if (callCount === 1) {
          return Promise.resolve(new MockResponse(true, 200));
        }
        return Promise.resolve(new MockResponse(false, 500));
      });

      vi.spyOn(
        webhookService as unknown as { sleep: (ms: number) => Promise<void> },
        'sleep'
      ).mockResolvedValue(undefined);

      const results = await webhookService.sendBatch(events);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should process empty batch', async () => {
      const results = await webhookService.sendBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('Different Event Types', () => {
    it('should handle user events', async () => {
      const event: WebhookEvent = {
        id: 'user-event',
        url: 'https://example.com/webhook',
        event: 'user.registered',
        payload: {
          userId: 'user-123',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(true, 200));

      const result = await webhookService.send(event);

      expect(result.success).toBe(true);
    });

    it('should handle order events', async () => {
      const event: WebhookEvent = {
        id: 'order-event',
        url: 'https://example.com/webhook',
        event: 'order.placed',
        payload: {
          orderId: 'order-456',
          total: 99.99,
          items: [
            { id: 'item-1', quantity: 2 },
            { id: 'item-2', quantity: 1 },
          ],
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(true, 200));

      const result = await webhookService.send(event);

      expect(result.success).toBe(true);
    });

    it('should handle payment events with secrets', async () => {
      const event: WebhookEvent = {
        id: 'payment-event',
        url: 'https://example.com/webhook',
        event: 'payment.completed',
        payload: {
          paymentId: 'pay-789',
          amount: 250,
          currency: 'USD',
        },
        secret: crypto.randomBytes(32).toString('hex'),
      };

      globalThis.fetch = vi.fn().mockResolvedValue(new MockResponse(true, 200));

      const result = await webhookService.send(event);

      expect(result.success).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network timeouts', async () => {
      const event: WebhookEvent = {
        id: 'timeout-event',
        url: 'https://example.com/webhook',
        event: 'test.timeout',
        payload: { test: true },
        maxRetries: 1,
      };

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Request timeout'));

      const result = await webhookService.send(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle DNS resolution failures', async () => {
      const event: WebhookEvent = {
        id: 'dns-event',
        url: 'https://nonexistent.invalid.tld/webhook',
        event: 'test.dns',
        payload: { test: true },
        maxRetries: 1,
      };

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

      const result = await webhookService.send(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DNS resolution failed');
    });

    it('should handle malformed URLs gracefully', async () => {
      const event: WebhookEvent = {
        id: 'bad-url-event',
        url: 'not-a-valid-url',
        event: 'test.url',
        payload: { test: true },
        maxRetries: 1,
      };

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Invalid URL'));

      const result = await webhookService.send(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid URL');
    });
  });
});
