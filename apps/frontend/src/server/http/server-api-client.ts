import { cookies, headers } from 'next/headers';

const API_BASE_URL =
  process.env['API_URL_INTERNAL'] || process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

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
