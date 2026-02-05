import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_HEADER_LOWER,
  generateCorrelationId,
  getCorrelationIdFromHeaders,
  isValidCorrelationId,
  normalizeCorrelationIdCandidate,
} from './correlation-id-policy';

const STORAGE_KEY = CORRELATION_ID_HEADER_LOWER;

function isBrowser(): boolean {
  return globalThis.window?.sessionStorage !== undefined;
}

let inMemoryCorrelationId: string | undefined;

export function getStoredCorrelationId(): string | undefined {
  if (!isBrowser()) return undefined;

  if (typeof inMemoryCorrelationId === 'string' && isValidCorrelationId(inMemoryCorrelationId)) {
    return inMemoryCorrelationId;
  }

  try {
    const raw = globalThis.window.sessionStorage.getItem(STORAGE_KEY);
    const candidate = normalizeCorrelationIdCandidate(raw);
    if (candidate) {
      inMemoryCorrelationId = candidate;
      return candidate;
    }
  } catch {
    // Ignore storage errors (privacy mode, quota, etc.)
  }

  return undefined;
}

export function setStoredCorrelationId(value: string): void {
  if (!isBrowser()) return;

  const candidate = normalizeCorrelationIdCandidate(value);
  if (!candidate) return;

  inMemoryCorrelationId = candidate;
  try {
    globalThis.window.sessionStorage.setItem(STORAGE_KEY, candidate);
  } catch {
    // Ignore storage errors
  }
}

export function getOrCreateCorrelationId(): string {
  const existing = getStoredCorrelationId();
  if (existing) return existing;

  const created = generateCorrelationId();
  setStoredCorrelationId(created);
  return created;
}

export function injectCorrelationId(headers: Headers): string {
  const existing = getCorrelationIdFromHeaders(headers);
  if (existing) return existing;

  const cid = getOrCreateCorrelationId();
  headers.set(CORRELATION_ID_HEADER, cid);
  return cid;
}

export function captureCorrelationIdFromResponse(response: Response): void {
  const cid = getCorrelationIdFromHeaders(response.headers);
  if (cid) setStoredCorrelationId(cid);
}
