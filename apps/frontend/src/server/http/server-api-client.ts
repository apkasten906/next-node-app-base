import { cookies, headers } from 'next/headers';

import { resolveApiBaseUrl } from '@/lib/env';

const API_BASE_URL = resolveApiBaseUrl();

function buildApiUrl(path: string): string {
  return new URL(path, API_BASE_URL).toString();
}

export async function serverApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  const incomingCorrelationId = headerStore.get('x-correlation-id');

  const requestHeaders = new Headers(init.headers);
  if (cookieHeader && !requestHeaders.has('cookie')) {
    requestHeaders.set('cookie', cookieHeader);
  }
  if (incomingCorrelationId && !requestHeaders.has('X-Correlation-ID')) {
    requestHeaders.set('X-Correlation-ID', incomingCorrelationId);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    cache: init.cache ?? 'no-store',
    headers: requestHeaders,
  });
}
