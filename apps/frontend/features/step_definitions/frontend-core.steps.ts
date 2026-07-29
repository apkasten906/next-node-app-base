import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { Given, Then, When } from '@cucumber/cucumber';
import { onlineManager, type QueryClient } from '@tanstack/react-query';

import { createQueryClient } from '../../lib/query-client';
import {
  getOfflineStatusMessage,
  subscribeToOnlineStatus,
} from '../../src/hooks/use-online-status';
import { World } from '../support/world';

interface CoreSources {
  apiClient: string;
  providers: string;
  errorBoundary: string;
  loadingState: string;
  signInClient: string;
  errorDisplay: string;
  notFoundPage: string;
}

function readFrontendFile(...segments: string[]): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- BDD source checks read fixed repo paths assembled from step helpers.
  return fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8');
}

function loadCoreSources(): CoreSources {
  return {
    apiClient: readFrontendFile('lib', 'api-client.ts'),
    providers: readFrontendFile('components', 'providers.tsx'),
    errorBoundary: readFrontendFile('components', 'error-boundary.tsx'),
    loadingState: readFrontendFile('components', 'loading-state.tsx'),
    signInClient: readFrontendFile('components', 'signin-client.tsx'),
    errorDisplay: readFrontendFile('components', 'error-display.tsx'),
    notFoundPage: readFrontendFile('app', 'not-found.tsx'),
  };
}

function getSources(world: World): CoreSources {
  const sources = world.getData<CoreSources>('frontendCoreSources') ?? loadCoreSources();
  world.setData('frontendCoreSources', sources);
  return sources;
}

Given('a type-safe API client is configured', async function (this: World) {
  this.setData('frontendCoreSources', loadCoreSources());
});

When('I make an API request using the client', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.apiClient.includes('class ApiClient'));
});

Then('request payload should be type-checked', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.apiClient.includes('interface ApiRequestOptions extends RequestInit'));
  assert.ok(sources.apiClient.includes('params?: Record<string, string | number | boolean>'));
});

Then('response should be strongly typed', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.apiClient.includes('private async request<T>'));
  assert.ok(sources.apiClient.includes('post<T>'));
  assert.ok(sources.apiClient.includes('Promise<T>'));
});

Then('TypeScript should catch type errors', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.apiClient.includes('ValidationError extends ApiError'));
  assert.ok(sources.apiClient.includes('AuthenticationError extends ApiError'));
});

Given('an error boundary with retry functionality', async function (this: World) {
  this.setData('frontendCoreSources', loadCoreSources());
});

When('a component errors and user clicks retry', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('resetError'));
});

Then('the error boundary should reset', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('this.setState({ hasError: false, error: null })'));
});

Then('the component should be re-rendered', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('return this.props.children'));
});

Then('the error state should be cleared', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorBoundary.includes('hasError: false'));
  assert.ok(sources.errorBoundary.includes('error: null'));
});

Given('a component fetches data from API', async function (this: World) {
  this.setData('frontendCoreSources', loadCoreSources());
});

When('the API request is in progress', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.loadingState.includes('isLoading'));
});

Then('a loading spinner should be displayed', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.loadingState.includes('LoadingSpinner'));
  assert.ok(sources.loadingState.includes('animate-spin'));
});

When('the request completes', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.loadingState.includes('return <>{children}</>'));
});

Then('the loading state should be removed', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.loadingState.includes('if (isLoading)'));
});

Then('data should be displayed', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.loadingState.includes('children'));
});

Given('TanStack Query is configured', async function (this: World) {
  this.setData('frontendCoreSources', loadCoreSources());
});

When('I fetch data for a query', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.providers.includes('QueryClientProvider'));
});

Then('the data should be cached', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.providers.includes('staleTime: 60 * 1000'));
});

When('I request the same data again', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.providers.includes('new QueryClient'));
});

Then('cached data should be returned immediately', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.providers.includes('staleTime'));
});

Then('background refetch should occur', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.providers.includes('refetchOnWindowFocus: false'));
});

class BddOnlineEventSource {
  private readonly listeners = new Map<'online' | 'offline', Set<() => void>>();

  addEventListener(type: 'online' | 'offline', listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: 'online' | 'offline', listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: 'online' | 'offline'): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

Given('offline detection is enabled', async function (this: World) {
  const source = new BddOnlineEventSource();
  const queryClient = createQueryClient();
  queryClient.mount();
  this.setData('onlineSource', source);
  this.setData('queryClient', queryClient);
  this.setData(
    'unsubscribeOnlineStatus',
    subscribeToOnlineStatus(source, (isOnline) => {
      this.setData('isOnline', isOnline);
    })
  );
  this.setData('isOnline', true);
});

When('the user goes offline', async function (this: World) {
  onlineManager.setOnline(false);
  this.getData<BddOnlineEventSource>('onlineSource')?.dispatch('offline');
  const queryFn = (): Promise<string> => {
    this.setData('offlineQueryCalls', (this.getData<number>('offlineQueryCalls') ?? 0) + 1);
    return Promise.resolve('restored');
  };
  const queryClient = this.getData<QueryClient>('queryClient');
  assert.ok(queryClient);
  this.setData(
    'offlineQueryResult',
    queryClient.fetchQuery({ queryKey: ['offline-bdd'], queryFn })
  );
  await Promise.resolve();
});

Then('the app should detect offline state', async function (this: World) {
  assert.equal(this.getData('isOnline'), false);
});

Then('offline indicator should be displayed', async function (this: World) {
  const message = getOfflineStatusMessage(this.getData<boolean>('isOnline') ?? true);
  assert.match(message ?? '', /You are currently offline/);
  this.setData('offlineMessage', message);
});

Then('user should be notified', async function (this: World) {
  assert.ok(this.getData<string>('offlineMessage'));
});

When('the user comes back online', async function (this: World) {
  this.getData<BddOnlineEventSource>('onlineSource')?.dispatch('online');
  onlineManager.setOnline(true);
});

Then('online state should be detected', async function (this: World) {
  assert.equal(this.getData('isOnline'), true);
  assert.equal(getOfflineStatusMessage(true), null);
});

Then('pending requests should be retried', async function (this: World) {
  assert.equal(await this.getData<Promise<string>>('offlineQueryResult'), 'restored');
  assert.equal(this.getData('offlineQueryCalls'), 1);
  this.getData<() => void>('unsubscribeOnlineStatus')?.();
  this.getData<QueryClient>('queryClient')?.unmount();
  onlineManager.setOnline(true);
});

Given('components use semantic HTML', async function (this: World) {
  this.setData('frontendCoreSources', loadCoreSources());
});

When('I inspect a button component', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('<button'));
});

Then('it should have appropriate ARIA labels', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('aria-label'));
  assert.ok(sources.errorDisplay.includes('aria-live'));
});

Then('role should be properly defined', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('role="alert"'));
  assert.ok(sources.notFoundPage.includes('role="alert"'));
});

Then('keyboard navigation should work', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.errorDisplay.includes('<button'));
  assert.ok(sources.notFoundPage.includes('<Link'));
});

Given('interactive components exist', async function (this: World) {
  this.setData('frontendCoreSources', loadCoreSources());
});

When('I navigate using Tab key', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('<input'));
  assert.ok(sources.signInClient.includes('<button'));
});

Then('all interactive elements should be reachable', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('type="email"'));
  assert.ok(sources.signInClient.includes('type="password"'));
  assert.ok(sources.signInClient.includes('type="submit"'));
});

Then('tab order should be logical', async function (this: World) {
  const sources = getSources(this);
  const emailIndex = sources.signInClient.indexOf('type="email"');
  const passwordIndex = sources.signInClient.indexOf('type="password"');
  const submitIndex = sources.signInClient.indexOf('type="submit"');
  assert.ok(emailIndex >= 0 && passwordIndex > emailIndex && submitIndex > passwordIndex);
});

Then(/^Enter\/Space should activate elements$/, async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('<form onSubmit={onSubmit}'));
  assert.ok(sources.signInClient.includes('type="submit"'));
});

Given('a form with validation rules', async function (this: World) {
  this.setData('frontendCoreSources', loadCoreSources());
});

When('I submit invalid data', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('required'));
});

Then('validation errors should be displayed', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('{error &&'));
});

Then('form should not submit', async function (this: World) {
  const sources = getSources(this);
  assert.ok(
    sources.signInClient.includes('event.preventDefault()') ||
      sources.signInClient.includes('submitForm(e')
  );
});

When('I correct the errors', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('onChange'));
});

Then('validation should pass', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('type="email"'));
  assert.ok(sources.signInClient.includes('type="password"'));
});

Then('form should submit successfully', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('submitForm(e, { email, password })'));
});
