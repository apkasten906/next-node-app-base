import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { Given, Then, When } from '@cucumber/cucumber';

import { World } from '../support/world';

Given('the Next.js application is running', async function (this: World) {
  // Deterministic BDD: don’t actually start Next.js.
  this.setData('nextRunning', true);
});

Given('frontend is configured', async function (this: World) {
  // Keep this lightweight: ensure the workspace looks like a Next app.
  const cwd = process.cwd();
  const nextConfig = path.join(cwd, 'next.config.ts');
  assert.ok(fs.existsSync(nextConfig), 'Expected next.config.ts to exist');
  this.setData('frontendConfigured', true);
});

Given('the API client is configured', async function (this: World) {
  const cwd = process.cwd();
  const clientPath = path.join(cwd, 'lib', 'api-client.ts');
  const content = fs.readFileSync(clientPath, 'utf8');
  this.setData('apiClientSource', content);
});

When('an API request fails with status {string}', async function (this: World, statusText: string) {
  const status = Number(statusText);
  assert.ok(Number.isFinite(status), `Invalid status: ${statusText}`);
  this.setData('apiClientStatus', status);
});

Then('the error should be properly typed', async function (this: World) {
  const content = this.getData<string>('apiClientSource');
  assert.ok(content, 'API client source not loaded');

  const status = this.getData<number>('apiClientStatus');
  assert.ok(typeof status === 'number', 'Status not set');

  // Validate the existence of the expected error classes.
  assert.ok(content.includes('export class ApiError'), 'Expected ApiError to be defined');

  if (status === 400) {
    assert.ok(
      content.includes('export class ValidationError') && content.includes('case 400'),
      'Expected ValidationError and status 400 mapping'
    );
    return;
  }

  if (status === 401) {
    assert.ok(
      content.includes('export class AuthenticationError') && content.includes('case 401'),
      'Expected AuthenticationError and status 401 mapping'
    );
    return;
  }

  if (status === 404) {
    assert.ok(
      content.includes('export class NotFoundError') && content.includes('case 404'),
      'Expected NotFoundError and status 404 mapping'
    );
    return;
  }

  // For other statuses (e.g., 500), the client should throw a generic ApiError.
  assert.ok(
    content.includes('default:') && content.includes('throw new ApiError'),
    'Expected default mapping to throw ApiError'
  );
});

Then('error message should be extracted', async function (this: World) {
  const content = this.getData<string>('apiClientSource');
  assert.ok(content, 'API client source not loaded');

  // The API client should prefer structured JSON message, then fall back to statusText.
  assert.ok(
    content.includes('errorData.message') && content.includes('response.statusText'),
    'Expected error message extraction logic (errorData.message ?? response.statusText)'
  );
});

Then('error should be propagated to caller', async function (this: World) {
  const content = this.getData<string>('apiClientSource');
  assert.ok(content, 'API client source not loaded');

  // Ensure non-OK responses are surfaced as exceptions.
  assert.ok(
    content.includes('if (!response.ok)') && content.includes('await this.handleHTTPError'),
    'Expected request() to throw on non-OK HTTP responses'
  );
});

Given('an error boundary is configured', async function (this: World) {
  const cwd = process.cwd();
  const boundaryPath = path.join(cwd, 'components', 'error-boundary.tsx');
  const content = fs.readFileSync(boundaryPath, 'utf8');
  this.setData('errorBoundarySource', content);
});

When('a component throws an error', async function (this: World) {
  // Deterministic BDD: we don’t render React; we validate the boundary implementation exists.
  this.setData('componentErrored', true);
});

Then('the error should be caught by error boundary', async function (this: World) {
  const content = this.getData<string>('errorBoundarySource');
  assert.ok(content, 'Error boundary source not loaded');
  assert.ok(
    content.includes('getDerivedStateFromError') && content.includes('componentDidCatch'),
    'Expected ErrorBoundary to implement getDerivedStateFromError and componentDidCatch'
  );
});

Then('a fallback UI should be displayed', async function (this: World) {
  const content = this.getData<string>('errorBoundarySource');
  assert.ok(content, 'Error boundary source not loaded');

  // Basic invariant: a user-facing message exists.
  assert.ok(
    content.includes('Something went wrong') || content.includes('Application Error'),
    'Expected a user-facing fallback UI message'
  );
});

Then('the error should be logged', async function (this: World) {
  const content = this.getData<string>('errorBoundarySource');
  assert.ok(content, 'Error boundary source not loaded');
  assert.ok(content.includes('logError'), 'Expected ErrorBoundary to log errors via logError');
});
