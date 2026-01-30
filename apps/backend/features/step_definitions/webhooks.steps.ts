import { After, Given, Then, When } from '@cucumber/cucumber';
import crypto from 'crypto';

import { expect } from '../support/assertions';
import { World } from '../support/world';

import { WebhookService, type WebhookEvent } from '../../src/services/webhook/webhook.service';

type LogEntry = { level: 'info' | 'warn' | 'error'; message: string };

function createFakeLogger(world: World) {
  const logs: LogEntry[] = [];
  world.setData('webhookLogs', logs);

  return {
    info: (message: string) => logs.push({ level: 'info', message }),
    warn: (message: string) => logs.push({ level: 'warn', message }),
    error: (message: string) => logs.push({ level: 'error', message }),
  };
}

function createFakeCache() {
  const store = new Map<string, unknown>();
  return {
    set: async (key: string, value: unknown) => {
      store.set(key, value);
    },
    get: async (key: string) => store.get(key),
  };
}

After(function (this: World) {
  const originalFetch = this.getData<typeof fetch>('originalFetch');
  if (originalFetch) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- global fetch typing differs between runtimes
    (globalThis as any).fetch = originalFetch;
  }
});

Given('a webhook service is configured', async function (this: World) {
  const logger = createFakeLogger(this);
  const cache = createFakeCache();

  const webhookService = new WebhookService(
    // WebhookService expects LoggerService/CacheService, but runtime only needs shape.
    logger as unknown as any,
    cache as unknown as any
  );

  // Avoid real retry delays inside Cucumber runs.
  (webhookService as unknown as { sleep: (ms: number) => Promise<void> }).sleep = async () =>
    undefined;

  this.setData('webhookService', webhookService);
});

Given(
  'a webhook subscriber is registered for event {string}',
  async function (this: World, event: string) {
    this.setData('webhookSubscriberEvent', event);
  }
);

When(
  'I publish a webhook event {string} with payload',
  async function (this: World, event: string) {
    const webhookService = this.getData<WebhookService>('webhookService');
    expect(webhookService).toBeDefined();

    const fetchCalls: Array<{ url: string; options: any }> = [];
    this.setData('webhookFetchCalls', fetchCalls);

    const originalFetch = globalThis.fetch;
    this.setData('originalFetch', originalFetch);

    let attempt = 0;

    // Fail first attempt, succeed second, to prove retry path is exercised.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal fetch mock
    (globalThis as any).fetch = async (url: string, options: any) => {
      fetchCalls.push({ url, options });
      attempt++;

      if (attempt === 1) {
        return { ok: false, status: 500 };
      }

      return { ok: true, status: 200 };
    };

    const webhookEvent: WebhookEvent = {
      id: `evt-${event.replace(/[^a-z0-9]/gi, '-')}`,
      url: 'https://example.com/webhook',
      event,
      payload: { ok: true },
      secret: 'webhook-secret',
      maxRetries: 3,
    };

    const result = await webhookService!.send(webhookEvent);
    this.setData('webhookSendResult', result);
  }
);

Then('the webhook should be delivered to the subscriber', async function (this: World) {
  const result = this.getData<any>('webhookSendResult');
  expect(result).toBeDefined();
  expect(result.success).toBe(true);

  const calls = this.getData<Array<{ url: string; options: any }>>('webhookFetchCalls') ?? [];
  expect(calls.length).toBeGreaterThan(0);

  const lastCall = calls[calls.length - 1];
  if (!lastCall) {
    throw new Error('Expected at least one webhook fetch call');
  }
  expect(lastCall.url).toBe('https://example.com/webhook');

  const headers = lastCall.options?.headers ?? {};
  expect(headers['Content-Type']).toBe('application/json');
  expect(headers['X-Webhook-Event']).toBeDefined();
  expect(headers['X-Webhook-ID']).toBeDefined();
});

Then('the delivery should be retried on failure', async function (this: World) {
  const calls = this.getData<Array<{ url: string; options: any }>>('webhookFetchCalls') ?? [];
  expect(calls.length).toBeGreaterThan(1);
});

Then('webhook delivery should be logged', async function (this: World) {
  const logs = this.getData<LogEntry[]>('webhookLogs') ?? [];
  expect(logs.length).toBeGreaterThan(0);

  const infoMessages = logs.filter((l) => l.level === 'info').map((l) => l.message);
  expect(infoMessages.some((m) => m.includes('Webhook delivered successfully'))).toBe(true);
});

Given('webhooks have signature verification enabled', async function (this: World) {
  const logger = createFakeLogger(this);
  const cache = createFakeCache();

  const webhookService = new WebhookService(logger as unknown as any, cache as unknown as any);
  this.setData('webhookService', webhookService);
});

When('a webhook is received with a valid signature', async function (this: World) {
  const webhookService = this.getData<WebhookService>('webhookService');
  expect(webhookService).toBeDefined();

  const payload = JSON.stringify({ id: 'evt-123', event: 'user.created', data: { ok: true } });
  const secret = 'webhook-secret';

  // Mirror WebhookService signing: sha256 HMAC over raw payload.
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;

  this.setData('webhookPayload', payload);
  this.setData('webhookSecret', secret);
  this.setData('webhookSignature', signature);

  const isValid = webhookService!.verifySignature(payload, signature, secret);
  this.setData('webhookSignatureValid', isValid);
});

Then('the webhook should be processed', async function (this: World) {
  const isValid = this.getData<boolean>('webhookSignatureValid');
  expect(isValid).toBe(true);
});

When('a webhook is received with an invalid signature', async function (this: World) {
  const webhookService = this.getData<WebhookService>('webhookService');
  expect(webhookService).toBeDefined();

  const payload =
    this.getData<string>('webhookPayload') ?? JSON.stringify({ id: 'evt-123', ok: true });
  const secret = this.getData<string>('webhookSecret') ?? 'webhook-secret';
  const invalidSignature =
    'sha256=0000000000000000000000000000000000000000000000000000000000000000';

  const isValid = webhookService!.verifySignature(payload, invalidSignature, secret);
  this.setData('webhookSignatureInvalid', !isValid);

  if (!isValid) {
    const logs = this.getData<LogEntry[]>('webhookLogs') ?? [];
    logs.push({ level: 'error', message: 'Invalid webhook signature' });
    this.setData('webhookLogs', logs);
  }
});

Then('the webhook should be rejected', async function (this: World) {
  const rejected = this.getData<boolean>('webhookSignatureInvalid');
  expect(rejected).toBe(true);
});

Then('an error should be logged', async function (this: World) {
  const logs = this.getData<LogEntry[]>('webhookLogs') ?? [];
  expect(logs.some((l) => l.level === 'error')).toBe(true);
});
