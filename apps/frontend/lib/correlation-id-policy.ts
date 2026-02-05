export const CORRELATION_ID_HEADER = 'X-Correlation-ID';
export const CORRELATION_ID_HEADER_LOWER = 'x-correlation-id';

const CORRELATION_ID_MAX_LENGTH = 128;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function isValidCorrelationId(value: string): boolean {
  return CORRELATION_ID_PATTERN.test(value);
}

export function normalizeCorrelationIdCandidate(
  raw: string | null | undefined
): string | undefined {
  const candidate = (raw ?? '').trim();
  return isValidCorrelationId(candidate) ? candidate : undefined;
}

export function generateCorrelationId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (typeof uuid === 'string' && isValidCorrelationId(uuid)) return uuid;

  const raw = `cid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return raw.slice(0, CORRELATION_ID_MAX_LENGTH);
}

export function resolveCorrelationId(raw: string | null | undefined): string {
  return normalizeCorrelationIdCandidate(raw) ?? generateCorrelationId();
}

export function getCorrelationIdFromHeaders(headers: Headers): string | undefined {
  const raw = headers.get(CORRELATION_ID_HEADER) ?? headers.get(CORRELATION_ID_HEADER_LOWER);
  return normalizeCorrelationIdCandidate(raw);
}
