import 'server-only';

import { cookies, headers } from 'next/headers';

import { CORRELATION_ID_HEADER, CORRELATION_ID_HEADER_LOWER } from '@/lib/correlation-id-policy';
import { resolveApiBaseUrl } from '@/lib/env';

const API_BASE_URL = resolveApiBaseUrl();

function buildApiUrl(path: string): string {
  return new URL(path, API_BASE_URL).toString();
}

function normalizeCorrelationId(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    return null;
  }
  return /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : null;
}

export async function serverApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  const correlationId = normalizeCorrelationId(headerStore.get(CORRELATION_ID_HEADER_LOWER));

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
