import 'server-only';

import { cookies, headers } from 'next/headers';

import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_HEADER_LOWER,
  normalizeCorrelationIdCandidate,
} from '@/lib/correlation-id-policy';
import { resolveApiBaseUrl } from '@/lib/env';

const API_BASE_URL = resolveApiBaseUrl();

function assertRelativeApiPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError(
      'serverApiFetch path must be a root-relative API path starting with a single "/"'
    );
  }
  return path;
}

function buildApiUrl(path: string): string {
  return new URL(assertRelativeApiPath(path), API_BASE_URL).toString();
}

export async function serverApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  const correlationId = normalizeCorrelationIdCandidate(
    headerStore.get(CORRELATION_ID_HEADER_LOWER)
  );

  const requestHeaders = new Headers(init.headers);
  if (cookieHeader && !requestHeaders.has('cookie')) {
    requestHeaders.set('cookie', cookieHeader);
  }
  if (correlationId && !requestHeaders.has(CORRELATION_ID_HEADER)) {
    requestHeaders.set(CORRELATION_ID_HEADER, correlationId);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    cache: init.cache ?? 'no-store',
    headers: requestHeaders,
  });
}
