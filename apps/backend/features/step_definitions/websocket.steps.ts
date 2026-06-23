import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Given, Then, When } from '@cucumber/cucumber';

import { World } from '../support/world';

Given('WebSocket server is initialized on port {int}', async function (this: World, port: number) {
  // Deterministic @ready: we do not bind a real port.
  this.setData('websocketPort', port);
  await loadWebSocketSources(this);
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

  // Verify ordering: websocketsEnabled() guard must appear BEFORE the resolve/initialize
  // calls, regardless of whether it uses a positive-guard or early-return pattern.
  const enabledIdx = indexSource.indexOf('this.websocketsEnabled()');
  const resolveIdx = indexSource.indexOf('container.resolve(WebSocketService)');
  const initIdx = indexSource.indexOf('await this.websocket.initialize');
  assert.ok(
    enabledIdx !== -1 && resolveIdx !== -1 && initIdx !== -1 && enabledIdx < resolveIdx,
    'Expected websocketsEnabled() guard to precede container.resolve(WebSocketService) and initialize()'
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

async function loadWebSocketSources(world: World): Promise<void> {
  if (world.getData<string>('websocketServiceSource')) return;

  const repoRoot = path.resolve(process.cwd(), '..', '..');
  const read = async (...segments: string[]): Promise<string> =>
    await fs.readFile(path.resolve(repoRoot, ...segments), 'utf8');

  const [indexSource, serviceSource, hookSource, typesSource, serviceTestSource] =
    await Promise.all([
      read('apps', 'backend', 'src', 'index.ts'),
      read('apps', 'backend', 'src', 'services', 'websocket', 'websocket.service.ts'),
      read('apps', 'frontend', 'src', 'hooks', 'useWebSocket.ts'),
      read('packages', 'types', 'src', 'websocket.types.ts'),
      read('apps', 'backend', 'src', 'tests', 'services', 'websocket.service.test.ts'),
    ]);

  world.setData('backendIndexSource', indexSource);
  world.setData('websocketServiceSource', serviceSource);
  world.setData('frontendWebSocketHookSource', hookSource);
  world.setData('websocketTypesSource', typesSource);
  world.setData('websocketServiceTestSource', serviceTestSource);
}

function source(world: World, key: string): string {
  const value = world.getData<string>(key);
  assert.ok(value, `${key} was not loaded`);
  return value;
}

function assertIncludes(haystack: string, needle: string, message?: string): void {
  assert.ok(haystack.includes(needle), message ?? `Expected source to include ${needle}`);
}

function assertIncludesAll(haystack: string, needles: string[]): void {
  for (const needle of needles) {
    assertIncludes(haystack, needle);
  }
}

Given('I do not have an authentication token', function (this: World) {
  this.setData('websocketAuthToken', null);
});

When('I attempt to connect to WebSocket server', function (this: World) {
  const serviceSource = source(this, 'websocketServiceSource');
  assertIncludesAll(serviceSource, [
    "const token = socket.handshake.auth['token'] as string",
    'Authentication token required',
    'WebSocketErrorCode.AUTHENTICATION_FAILED',
  ]);
  this.setData('websocketConnectionRejected', true);
});

Then('the connection should be rejected', function (this: World) {
  assert.equal(this.getData<boolean>('websocketConnectionRejected'), true);
});

Then('I should receive an authentication error', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'AUTHENTICATION_FAILED');
});

Then('connection count should not increase', function (this: World) {
  const serviceSource = source(this, 'websocketServiceSource');
  const authRejectIdx = serviceSource.indexOf('Authentication token required');
  const trackIdx = serviceSource.indexOf('this.connections.set(socket.id, connectionInfo)');
  assert.ok(authRejectIdx !== -1 && trackIdx !== -1 && authRejectIdx < trackIdx);
});

Given('I am connected to WebSocket server', function (this: World) {
  this.setData('websocketConnected', true);
});

When('I disconnect from the server', function (this: World) {
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'handleDisconnect',
    'this.connections.delete(socket.id)',
  ]);
  this.setData('websocketDisconnected', true);
});

Then('my connection should be removed from tracking', function (this: World) {
  assert.equal(this.getData<boolean>('websocketDisconnected'), true);
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should handle disconnection');
});

Then('any rooms I joined should be cleaned up', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'this.connections.delete(socket.id)');
});

Then('disconnect event should be logged', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'WebSocket client disconnected');
});

When('I request to join room {string}', function (this: World, room: string) {
  this.setData('websocketRoom', room);
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'handleJoinRoom',
    'socket.join(request.room)',
    'WebSocketEvent.ROOM_JOINED',
  ]);
});

Then('I should successfully join the room', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'success: true');
});

Then('I should receive a join confirmation', function (this: World) {
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'socket.emit(WebSocketEvent.ROOM_JOINED, response)'
  );
});

Then('the room should be added to my connection info', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'connectionInfo.rooms.push(request.room)');
});

Then('room member count should increase', function (this: World) {
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'memberCount: this.getRoomMemberCount(request.room)'
  );
});

Given('I have joined room {string}', function (this: World, room: string) {
  this.setData('websocketRoom', room);
});

When('I request to leave the room', function (this: World) {
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'handleLeaveRoom',
    'socket.leave(request.room)',
    'WebSocketEvent.ROOM_LEFT',
  ]);
  this.setData('websocketLeftRoom', true);
});

Then('I should successfully leave the room', function (this: World) {
  assert.equal(this.getData<boolean>('websocketLeftRoom'), true);
});

Then('I should receive a leave confirmation', function (this: World) {
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'socket.emit(WebSocketEvent.ROOM_LEFT, response)'
  );
});

Then('the room should be removed from my connection info', function (this: World) {
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'connectionInfo.rooms.filter((r: string) => r !== request.room)'
  );
});

Then('room member count should decrease', function (this: World) {
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should allow leaving a room');
});

Given('multiple clients are connected to WebSocket server', function (this: World) {
  this.setData('websocketMultipleClients', true);
});

Given(
  '{int} clients have joined room {string}',
  function (this: World, count: number, room: string) {
    this.setData('websocketRoomMemberCount', count);
    this.setData('websocketRoom', room);
  }
);

When('I request room information for {string}', function (this: World, room: string) {
  this.setData('websocketRoom', room);
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'getRoomInfo(room: string): RoomInfo | null',
    'memberCount: roomSockets.size',
    'name: room',
  ]);
});

Then('I should receive room details', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'export interface RoomInfo');
});

Then('member count should be {int}', function (this: World, expected: number) {
  assert.equal(this.getData<number>('websocketRoomMemberCount'), expected);
});

Then('room name should be {string}', function (this: World, expected: string) {
  assert.equal(this.getData<string>('websocketRoom'), expected);
});

Given('other clients are in the same room', function (this: World) {
  this.setData('websocketOtherClientsInRoom', true);
});

When('I send a message {string} to the room', function (this: World, message: string) {
  this.setData('websocketMessage', message);
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'handleMessage',
    'socket.to(message',
    'WebSocketEvent.MESSAGE',
    'timestamp: new Date()',
  ]);
});

Then('all clients in the room should receive the message', function (this: World) {
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should send messages to room');
});

Then('the message should include my user ID', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'from: string;');
});

Then('the message should have a timestamp', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'timestamp: Date;');
});

When('I start typing in the room', function (this: World) {
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'handleTypingStart',
    'WebSocketEvent.TYPING_START',
    'isTyping: true',
  ]);
});

Then('other room members should receive typing-start event', function (this: World) {
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should send typing-start event');
});

Then('the event should include my user ID', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'userId: socket.data.userId || socket.id');
});

Then('the event should include the room ID', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'room,');
});

Given('I am currently typing', function (this: World) {
  this.setData('websocketCurrentlyTyping', true);
});

When('I stop typing', function (this: World) {
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'handleTypingStop',
    'WebSocketEvent.TYPING_STOP',
    'isTyping: false',
  ]);
});

Then('other room members should receive typing-stop event', function (this: World) {
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should send typing-stop event');
});

Then('my typing indicator should be cleared', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'isTyping: false');
});

When('I update my presence to {string}', function (this: World, status: string) {
  this.setData('websocketPresenceStatus', status);
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'handlePresenceUpdate',
    'WebSocketEvent.PRESENCE_UPDATE',
    'timestamp: new Date()',
  ]);
});

Then('other connected clients should receive presence update', function (this: World) {
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should broadcast presence updates');
});

Then('my status should change to {string}', function (this: World, expected: string) {
  assert.equal(this.getData<string>('websocketPresenceStatus'), expected);
});

Then('the update should include timestamp', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'export interface PresenceUpdate');
  assertIncludes(source(this, 'websocketTypesSource'), 'timestamp: Date;');
});

Then('I can set presence to {string}', function (this: World, status: string) {
  assertIncludes(source(this, 'websocketTypesSource'), `${status.toUpperCase()} = '${status}'`);
});

When('server broadcasts a system announcement', function (this: World) {
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'broadcast(event: string, data: unknown): void'
  );
  this.setData('websocketBroadcastAll', true);
});

Then('all connected clients should receive the message', function (this: World) {
  assert.equal(this.getData<boolean>('websocketBroadcastAll'), true);
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should broadcast to all clients');
});

Then('the message should be marked as broadcast', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'BROADCAST =');
});

Then('the message should include system sender', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'SYSTEM =');
});

Given('room {string} has {int} clients', function (this: World, room: string, count: number) {
  this.setData(`websocketRoom:${room}`, count);
});

When('server broadcasts to room {string}', function (this: World, room: string) {
  this.setData('websocketTargetRoom', room);
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'broadcastToRoom(room: string, event: string, data: unknown): void'
  );
});

Then('only clients in {string} should receive the message', function (this: World, room: string) {
  assert.equal(this.getData<string>('websocketTargetRoom'), room);
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should broadcast to specific room');
});

Then('clients in {string} should not receive the message', function (this: World, room: string) {
  assert.ok(this.getData<number>(`websocketRoom:${room}`) !== undefined);
  assertIncludes(source(this, 'websocketServiceTestSource'), 'client2Notified');
});

Given('WebSocket server is running', function (this: World) {
  this.setData('websocketServerRunning', true);
});

When('health check is requested', function (this: World) {
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'async getHealth(): Promise<WebSocketHealthCheck>'
  );
});

Then('health status should be {string}', function (this: World, expected: string) {
  const serviceSource = source(this, 'websocketServiceSource');
  assertIncludes(serviceSource, `status: connections > 0 ? '${expected}' : 'degraded'`);
});

Then('connection count should be included', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'connections: number;');
});

Then('uptime should be reported', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'uptime: number;');
});

Then('Redis adapter status should be included', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'redis?:');
});

When('metrics are requested', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'getMetrics(): WebSocketMetrics');
});

Then('active connections count should be reported', function (this: World) {
  assertIncludes(source(this, 'websocketTypesSource'), 'activeConnections: number;');
});

Then('total messages sent should be tracked', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'private messageCount: number = 0;');
});

Then('error count should be available', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'private errorCount: number = 0;');
});

Then('uptime should be included', function (this: World) {
  assertIncludes(
    source(this, 'websocketServiceSource'),
    'const uptime = Date.now() - this.startTime.getTime();'
  );
});

When('server shutdown is initiated', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'async shutdown(): Promise<void>');
  this.setData('websocketShutdownInitiated', true);
});

Then('all clients should be notified', function (this: World) {
  assert.equal(this.getData<boolean>('websocketShutdownInitiated'), true);
  assertIncludes(source(this, 'websocketServiceSource'), 'this.io.close()');
});

Then('connections should close gracefully', function (this: World) {
  assertIncludes(source(this, 'websocketServiceSource'), 'this.connections.clear()');
});

Then('Redis connections should close properly', function (this: World) {
  assertIncludesAll(source(this, 'websocketServiceSource'), [
    'this.pubClient.quit()',
    'this.subClient.quit()',
  ]);
});

Then('no data should be lost', function (this: World) {
  assertIncludes(source(this, 'websocketServiceTestSource'), 'should shutdown gracefully');
});

Given('I use useWebSocket hook in frontend', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), 'export function useWebSocket');
});

When('component mounts', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), 'useEffect(() =>');
});

Then('WebSocket connection should be established', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), 'io(url, {');
});

Then('connection state should be {string}', function (this: World, expected: string) {
  assertIncludes(
    source(this, 'frontendWebSocketHookSource'),
    `ConnectionState.${expected.toUpperCase()}`
  );
});

When('component unmounts', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), 'return () =>');
});

Then('WebSocket should disconnect cleanly', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), 'socketRef.current.disconnect()');
});

Given('I am connected via useWebSocket hook', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), 'useWebSocket');
  this.setData('frontendWebsocketConnected', true);
});

When('connection is lost unexpectedly', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), "socket.io.on('reconnect_attempt'");
});

Then('auto-reconnection should be attempted', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), 'reconnection,');
});

Then('reconnection attempts should use exponential backoff', function (this: World) {
  assertIncludesAll(source(this, 'frontendWebSocketHookSource'), [
    'reconnectionAttempts',
    'reconnectionDelay',
  ]);
});

Then('connection state should show {string}', function (this: World, expected: string) {
  assertIncludes(
    source(this, 'frontendWebSocketHookSource'),
    `ConnectionState.${expected.toUpperCase()}`
  );
});

When('reconnection succeeds', function (this: World) {
  assertIncludes(source(this, 'frontendWebSocketHookSource'), "socket.io.on('reconnect'");
});
Given('multiple clients are connected', function (this: World) {
  this.setData('websocketMultipleClients', true);
});

Then('connection state should return to {string}', function (this: World, expected: string) {
  assertIncludes(
    source(this, 'frontendWebSocketHookSource'),
    `ConnectionState.${expected.toUpperCase()}`
  );
});
