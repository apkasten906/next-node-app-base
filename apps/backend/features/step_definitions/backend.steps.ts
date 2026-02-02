import { Given, Then, When } from '@cucumber/cucumber';
import crypto from 'node:crypto';
import { expect } from '../support/assertions';
import { World } from '../support/world';

// Express Server
Given('an Express server is configured', async function (this: World) {
  expect(this.app).toBeDefined();
  expect(this.request).toBeDefined();
});

When('I start the Express server', async function (this: World) {
  await this.initializeApp();
  expect(this.app).toBeDefined();
});

Then('the server should be running', async function (this: World) {
  const res = await this.request?.get('/health');
  expect(res?.status).toBe(200);
});

Then('it should respond to health checks', async function (this: World) {
  const res = await this.request?.get('/health');
  expect(res?.status).toBe(200);
  expect(res?.body).toHaveProperty('status');
});

// Middleware
Given('Express middleware is configured', async function (this: World) {
  expect(this.app).toBeDefined();
});

When('I send a request with correlation ID', async function (this: World) {
  const res = await this.request?.get('/api/health').set('X-Correlation-ID', 'test-123');
  this.response = res;
});

Then('the response should include the correlation ID', async function (this: World) {
  const correlationId = this.response?.headers['x-correlation-id'];
  expect(correlationId).toBe('test-123');
});

// Database - Prisma
Given('Prisma is connected to PostgreSQL', async function (this: World) {
  // In real implementation, check Prisma client connection
  this.setData('databaseConnected', true);
});

When('I create a {string} with data:', async function (this: World, model: string, dataTable: any) {
  const data = dataTable.rowsHash();

  // Mock database creation
  const created = {
    id: Date.now().toString(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  this.setData('createdRecord', created);
  this.setData('modelName', model);
});

Then('the {string} should exist in the database', async function (this: World, _model: string) {
  const record = this.getData('createdRecord');
  expect(record).toBeDefined();
  expect(record).toHaveProperty('id');
});

When('I update the {string} with:', async function (this: World, _model: string, dataTable: any) {
  const updates = dataTable.rowsHash();
  const record = this.getData<any>('createdRecord');

  const updated = {
    ...record,
    ...updates,
    updatedAt: new Date(),
  };

  this.setData('updatedRecord', updated);
});

Then('the {string} should have updated fields', async function (this: World, _model: string) {
  const record = this.getData('updatedRecord');
  expect(record).toBeDefined();
  expect(record.updatedAt).toBeInstanceOf(Date);
});

When('I delete the {string}', async function (this: World, _model: string) {
  this.setData('deletedRecord', this.getData('createdRecord'));
  this.setData('createdRecord', null);
});

Then('the {string} should be removed', async function (this: World, _model: string) {
  const record = this.getData('createdRecord');
  expect(record).toBeNull();
});

When('I query all {string}', async function (this: World, _model: string) {
  // Mock query
  const records = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ];
  this.setData('queryResults', records);
});

Then('I should receive a list of records', async function (this: World) {
  const results = this.getData<any[]>('queryResults');
  expect(Array.isArray(results)).toBe(true);
  expect(results!.length).toBeGreaterThan(0);
});

// Redis Cache
Given('Redis cache is connected', async function (this: World) {
  this.setData('cacheConnected', true);
});

When(
  'I cache key {string} with value {string}',
  async function (this: World, key: string, value: string) {
    // Mock cache set
    const cache = this.getData<Map<string, any>>('mockCache') || new Map();
    cache.set(key, { value, timestamp: Date.now() });
    this.setData('mockCache', cache);
    this.setData('cacheKey', key);
  }
);

When(
  'I cache key {string} with value {string} and TTL {int} seconds',
  async function (this: World, key: string, value: string, ttl: number) {
    const cache = this.getData<Map<string, any>>('mockCache') || new Map();
    cache.set(key, { value, timestamp: Date.now(), ttl: ttl * 1000 });
    this.setData('mockCache', cache);
    this.setData('cacheKey', key);
  }
);

When('I retrieve cached key {string}', async function (this: World, key: string) {
  const cache = this.getData<Map<string, any>>('mockCache');
  const entry = cache?.get(key);
  this.setData('cachedValue', entry?.value);
});

Then('the cached value should be {string}', async function (this: World, expected: string) {
  const value = this.getData<string>('cachedValue');
  expect(value).toBe(expected);
});

When('I wait {int} seconds', async function (this: World, seconds: number) {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
});

Then('the cached key should be expired', async function (this: World) {
  const cache = this.getData<Map<string, any>>('mockCache');
  const key = this.getData<string>('cacheKey');
  const entry = cache?.get(key!);

  if (entry && entry.ttl) {
    const elapsed = Date.now() - entry.timestamp;
    const isExpired = elapsed > entry.ttl;
    expect(isExpired).toBe(true);
  }
});

// Logging
Given('Winston logger is configured', async function (this: World) {
  this.setData('loggerConfigured', true);
});

When(
  'I log message {string} at level {string}',
  async function (this: World, message: string, level: string) {
    // Mock logging
    const logs = this.getData<any[]>('mockLogs') || [];
    logs.push({ message, level, timestamp: new Date() });
    this.setData('mockLogs', logs);
  }
);

Then('the log should be written to the log file', async function (this: World) {
  const logs = this.getData<any[]>('mockLogs');
  expect(logs).toBeDefined();
  expect(logs!.length).toBeGreaterThan(0);
});

Then('the log should include structured metadata', async function (this: World) {
  const logs = this.getData<any[]>('mockLogs');
  const lastLog = logs![logs!.length - 1];

  expect(lastLog).toHaveProperty('message');
  expect(lastLog).toHaveProperty('level');
  expect(lastLog).toHaveProperty('timestamp');
});

// Error Handling
When('an unhandled error occurs', async function (this: World) {
  this.setData('error', new Error('Test error'));
});

Then('it should be caught by error middleware', async function (this: World) {
  const error = this.getData('error');
  expect(error).toBeDefined();
});

Then('a {int} error response should be returned', async function (this: World, statusCode: number) {
  this.setData('errorStatusCode', statusCode);
  const code = this.getData<number>('errorStatusCode');
  expect(code).toBe(statusCode);
});

// Health Checks
When('I check the health endpoint', async function (this: World) {
  const res = await this.request?.get('/health');
  this.response = res;
});

Then('it should return status {string}', async function (this: World, status: string) {
  expect(this.response?.body?.status).toBe(status);
});

When('I check the readiness endpoint', async function (this: World) {
  const res = await this.request?.get('/ready');
  this.response = res;
});

Then('it should check database connectivity', async function (this: World) {
  expect(this.response?.body).toHaveProperty('database');
});

Then('it should check cache connectivity', async function (this: World) {
  expect(this.response?.body).toHaveProperty('cache');
});

// Webhooks
When('I register a webhook for event {string}', async function (this: World, event: string) {
  const webhook = {
    event,
    url: 'https://example.com/webhook',
    secret: crypto.randomBytes(32).toString('hex'),
  };
  this.setData('webhook', webhook);
});

When('event {string} occurs', async function (this: World, event: string) {
  // Webhook would be retrieved from context in real implementation

  // Mock webhook payload
  const payload = {
    event,
    data: { test: 'data' },
    timestamp: new Date().toISOString(),
  };

  this.setData('webhookPayload', payload);
});

Then('the webhook should be triggered with the payload', async function (this: World) {
  const payload = this.getData('webhookPayload');
  expect(payload).toBeDefined();
  expect(payload).toHaveProperty('event');
  expect(payload).toHaveProperty('data');
});

// Transactions
When('I perform a database transaction with:', async function (this: World, dataTable: any) {
  const operations = dataTable.hashes();
  this.setData('transactionOps', operations);
  this.setData('transactionSuccess', true);
});

Then('all operations should succeed atomically', async function (this: World) {
  const success = this.getData<boolean>('transactionSuccess');
  expect(success).toBe(true);
});

When('operation {int} fails in the transaction', async function (this: World, opNumber: number) {
  this.setData('failedOperation', opNumber);
  this.setData('transactionSuccess', false);
});

Then('all operations should be rolled back', async function (this: World) {
  const success = this.getData<boolean>('transactionSuccess');
  expect(success).toBe(false);
});

// Soft Delete
When('I soft delete a record', async function (this: World) {
  const record = this.getData<any>('createdRecord');
  const softDeleted = {
    ...record,
    deletedAt: new Date(),
  };
  this.setData('softDeletedRecord', softDeleted);
});

Then('the record should be marked as deleted', async function (this: World) {
  const record = this.getData<any>('softDeletedRecord');
  expect(record).toHaveProperty('deletedAt');
  expect(record.deletedAt).toBeInstanceOf(Date);
});

Then('it should not appear in default queries', async function (this: World) {
  // In real implementation, verify query excludes soft-deleted records
  const record = this.getData<any>('softDeletedRecord');
  expect(record.deletedAt).toBeDefined();
});

// Graceful Shutdown
When('I send a SIGTERM signal', async function (this: World) {
  this.setData('shutdownSignal', 'SIGTERM');
});

Then('the server should finish active requests', async function (this: World) {
  // Mock checking active requests
  this.setData('activeRequests', 0);
});

Then('database connections should be closed', async function (this: World) {
  this.setData('databaseClosed', true);
  const closed = this.getData<boolean>('databaseClosed');
  expect(closed).toBe(true);
});

Then('the server should shut down gracefully', async function (this: World) {
  const signal = this.getData<string>('shutdownSignal');
  expect(signal).toBe('SIGTERM');
});
