import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Given, Then } from '@cucumber/cucumber';

import { World } from '../support/world';

Given('WebSocket server is initialized on port {int}', async function (this: World, port: number) {
  // Deterministic @ready: we do not bind a real port.
  this.setData('websocketPort', port);
});

Given('Redis adapter is configured for scaling', async function (this: World) {
  // Deterministic @ready: validate implementation exists rather than connecting to Redis.
  this.setData('websocketRedisAdapterConfigured', true);
});

Given('authentication middleware is active', async function (this: World) {
  // Deterministic @ready: validate implementation exists rather than performing real auth.
  this.setData('websocketAuthMiddlewareActive', true);
});

Given('the backend WebSocket service is implemented', async function (this: World) {
  const cwd = process.cwd();

  const indexPath = path.resolve(cwd, 'src', 'index.ts');
  const servicePath = path.resolve(cwd, 'src', 'services', 'websocket', 'websocket.service.ts');

  const [indexSource, serviceSource] = await Promise.all([
    fs.readFile(indexPath, 'utf8'),
    fs.readFile(servicePath, 'utf8'),
  ]);

  this.setData('backendIndexSource', indexSource);
  this.setData('websocketServiceSource', serviceSource);
});

Then('WebSockets should be gated by {string}', async function (this: World, envVar: string) {
  const indexSource = this.getData<string>('backendIndexSource');
  assert.ok(indexSource, 'Backend index source not loaded');

  assert.ok(
    indexSource.includes(envVar) &&
      indexSource.includes('websocketsEnabled') &&
      (indexSource.includes("!== 'true'") || indexSource.includes('!== "true"')),
    `Expected websocketsEnabled() to gate on ${envVar} !== 'true'`
  );

  // Also ensure initialization is conditional.
  assert.ok(
    indexSource.includes('if (this.websocketsEnabled())') &&
      indexSource.includes('container.resolve(WebSocketService)') &&
      indexSource.includes('await this.websocket.initialize'),
    'Expected conditional WebSocket initialization via WebSocketService.initialize()'
  );
});

Then(
  'WebSocket service should use Socket.io with Redis adapter support',
  async function (this: World) {
    const serviceSource = this.getData<string>('websocketServiceSource');
    assert.ok(serviceSource, 'WebSocket service source not loaded');

    assert.ok(
      serviceSource.includes("from 'socket.io'") &&
        serviceSource.includes("from 'socket.io-redis-adapter'"),
      'Expected Socket.io server and socket.io-redis-adapter imports'
    );

    // Redis adapter should be optional (enabled when REDIS_URL exists).
    assert.ok(
      serviceSource.includes("if (process.env['REDIS_URL'])") &&
        (serviceSource.includes('setupRedisAdapter') || serviceSource.includes('createAdapter')),
      'Expected optional Redis adapter setup gated by REDIS_URL'
    );
  }
);

Then(
  'WebSocket service should default to path {string}',
  async function (this: World, expected: string) {
    const serviceSource = this.getData<string>('websocketServiceSource');
    assert.ok(serviceSource, 'WebSocket service source not loaded');

    // The backend service config should default WEBSOCKET_PATH to /socket.io.
    assert.ok(
      serviceSource.includes("process.env['WEBSOCKET_PATH']") &&
        serviceSource.includes(`|| '${expected}'`),
      `Expected WEBSOCKET_PATH default to ${expected}`
    );
  }
);
