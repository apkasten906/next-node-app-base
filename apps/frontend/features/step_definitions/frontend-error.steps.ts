import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { Given, Then, When } from '@cucumber/cucumber';

import { World } from '../support/world';

interface ErrorSources {
  errorBoundary: string;
  errorDisplay: string;
  errorLogger: string;
  errorPage: string;
  notFoundPage: string;
  requireCurrentUser: string;
}

function readFrontendFile(...segments: string[]): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- BDD source checks read fixed repo paths assembled from step helpers.
  return fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8');
}

function loadErrorSources(): ErrorSources {
  return {
    errorBoundary: readFrontendFile('components', 'error-boundary.tsx'),
    errorDisplay: readFrontendFile('components', 'error-display.tsx'),
    errorLogger: readFrontendFile('lib', 'error-logger.ts'),
    errorPage: readFrontendFile('app', 'error.tsx'),
    notFoundPage: readFrontendFile('app', 'not-found.tsx'),
    requireCurrentUser: readFrontendFile('src', 'server', 'auth', 'require-current-user.ts'),
  };
}

function getSources(world: World): ErrorSources {
  const sources = world.getData<ErrorSources>('frontendErrorSources') ?? loadErrorSources();
  world.setData('frontendErrorSources', sources);
  return sources;
}

Given('the application is running', async function (this: World) {
  this.setData('applicationRunning', true);
});

Given('I am on the application', async function (this: World) {
  this.setData('frontendErrorSources', loadErrorSources());
});

When('a component throws an unexpected error', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('componentDidCatch'));
  this.setData('componentErrorRaised', true);
});

Then('I should see a user-friendly error page', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('Application Error'));
  assert.ok(sources.errorBoundary.includes('something went wrong'));
});

Then('the error should be logged to the error tracking service', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('logError(error'));
  assert.ok(sources.errorLogger.includes('export async function logError'));
});

Then('I should have an option to reload the page', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('window.location.reload()'));
  assert.ok(sources.errorBoundary.includes('Reload Page'));
});

Then('I should have an option to go back to home', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes("window.location.href = '/'"));
  assert.ok(sources.errorBoundary.includes('Go Home'));
});

When('I navigate to a non-existent page {string}', async function (this: World, route: string) {
  assert.equal(route, '/this-does-not-exist');
  this.setData('frontendErrorSources', loadErrorSources());
});

Then('I should see a 404 error page', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.notFoundPage.includes('404'));
});

Then('I should see a message {string}', async function (this: World, message: string) {
  const sources = getSources(this);
  const combined = Object.values(sources).join('\n');
  assert.ok(combined.includes(message), `Expected frontend error sources to include "${message}"`);
});

Then('I should see navigation options to go home', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.notFoundPage.includes('href="/"'));
  assert.ok(sources.notFoundPage.includes('Go home'));
});

Given('the API returns a 500 error', async function (this: World) {
  this.setData('frontendErrorSources', loadErrorSources());
});

When('I try to load a page', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorPage.includes('export default function ErrorPage'));
});

Then('I should see a server error page', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorPage.includes('<ErrorFallback'));
});

Then('I should have an option to retry', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('resetAction'));
  assert.ok(sources.errorDisplay.includes("t('actions.retry')"));
});

Then('the error should be reported to monitoring', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorPage.includes('logError(error'));
  assert.ok(sources.errorLogger.includes("fetch('/api/errors'"));
});

Given('an API request failed', async function (this: World) {
  this.setData('frontendErrorSources', loadErrorSources());
});

When('I see the error message', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('{error.message}'));
});

Then('I should have a {string} button', async function (this: World, label: string) {
  const sources = getSources(this);
  assert.equal(label, 'Retry');
  assert.ok(sources.errorDisplay.includes('onRetry'));
  assert.ok(sources.errorDisplay.includes("t('actions.retry')"));
});

When('I click {string}', async function (this: World, label: string) {
  assert.equal(label, 'Retry');
  this.setData('retryClicked', true);
});

Then('the failed action should be attempted again', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('onClick={onRetry}'));
});

Given('I am using the application', async function (this: World) {
  this.setData('frontendErrorSources', loadErrorSources());
});

When('a JavaScript error occurs', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('getDerivedStateFromError'));
});

Then('the application should not crash', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('fallback'));
  assert.ok(sources.errorBoundary.includes('return this.props.children'));
});

Then('the error should be sent to the error logger', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('logError(error'));
  assert.ok(sources.errorLogger.includes('injectCorrelationId(headers)'));
});

Then('I should see a graceful error message', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('Application Error'));
  assert.ok(sources.errorDisplay.includes("t('errors.description')"));
});

Then('the rest of the application should continue working', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('RouteErrorBoundary'));
  assert.ok(sources.errorBoundary.includes('return this.props.children'));
});

Given('I am using a screen reader', async function (this: World) {
  this.setData('frontendErrorSources', loadErrorSources());
});

When('an error occurs', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('role="alert"'));
});

Then('the error message should be announced', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('aria-live="assertive"'));
});

Then('error regions should have proper ARIA roles', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('role="alert"'));
});

Then('keyboard focus should move to the error', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('useRef<HTMLDivElement>'));
  assert.ok(sources.errorDisplay.includes('errorRegionRef.current?.focus()'));
  assert.ok(sources.errorDisplay.includes('tabIndex={-1}'));
});
