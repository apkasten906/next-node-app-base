import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { Given, Then } from '@cucumber/cucumber';

import { World } from '../support/world';

Given('the WebSocket hook is implemented', async function (this: World) {
  const cwd = process.cwd();
  const hookPath = path.join(cwd, 'src', 'hooks', 'useWebSocket.ts');

  assert.ok(fs.existsSync(hookPath), 'Expected src/hooks/useWebSocket.ts to exist');
  const content = fs.readFileSync(hookPath, 'utf8');
  this.setData('useWebSocketSource', content);
});

Then('it should use socket.io-client', async function (this: World) {
  const content = this.getData<string>('useWebSocketSource');
  assert.ok(content, 'useWebSocket source not loaded');

  assert.ok(
    content.includes("from 'socket.io-client'") && content.includes('io(url'),
    'Expected useWebSocket to import socket.io-client and call io(url, ...)'
  );
});

Then('it should default to NEXT_PUBLIC_WEBSOCKET_URL', async function (this: World) {
  const content = this.getData<string>('useWebSocketSource');
  assert.ok(content, 'useWebSocket source not loaded');

  assert.ok(
    content.includes("process.env['NEXT_PUBLIC_WEBSOCKET_URL']") &&
      content.includes("|| 'http://localhost:3001'"),
    'Expected default url to use NEXT_PUBLIC_WEBSOCKET_URL with localhost fallback'
  );
});

Then('it should support reconnection state transitions', async function (this: World) {
  const content = this.getData<string>('useWebSocketSource');
  assert.ok(content, 'useWebSocket source not loaded');

  // Validate reconnection lifecycle hooks.
  assert.ok(
    content.includes("socket.io.on('reconnect_attempt'") &&
      content.includes("socket.io.on('reconnect',") &&
      content.includes("socket.io.on('reconnect_failed'") &&
      content.includes('ConnectionState.RECONNECTING'),
    'Expected reconnection event handlers and RECONNECTING state updates'
  );
});
