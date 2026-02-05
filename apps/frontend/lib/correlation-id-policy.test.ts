import { describe, expect, it } from 'vitest';

import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_HEADER_LOWER,
  generateCorrelationId,
  getCorrelationIdFromHeaders,
  isValidCorrelationId,
  normalizeCorrelationIdCandidate,
  resolveCorrelationId,
} from './correlation-id-policy';

describe('unit: correlation-id-policy', () => {
  it('validates correlation ids using the conservative pattern', () => {
    expect(isValidCorrelationId('test-123')).toBe(true);
    expect(isValidCorrelationId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);

    expect(isValidCorrelationId('')).toBe(false);
    expect(isValidCorrelationId(' ')).toBe(false);
    expect(isValidCorrelationId('bad value')).toBe(false);
    expect(isValidCorrelationId('x'.repeat(129))).toBe(false);
  });

  it('normalizes header candidates by trimming and returning undefined when invalid', () => {
    expect(normalizeCorrelationIdCandidate('  test-123  ')).toBe('test-123');
    expect(normalizeCorrelationIdCandidate('   ')).toBeUndefined();
    expect(normalizeCorrelationIdCandidate(null)).toBeUndefined();
    expect(normalizeCorrelationIdCandidate('bad value')).toBeUndefined();
  });

  it('generates a valid correlation id', () => {
    const cid = generateCorrelationId();
    expect(typeof cid).toBe('string');
    expect(cid.length).toBeGreaterThan(0);
    expect(cid.length).toBeLessThanOrEqual(128);
    expect(isValidCorrelationId(cid)).toBe(true);
  });

  it('resolves correlation id: returns inbound valid value, else generates', () => {
    expect(resolveCorrelationId('  test-123  ')).toBe('test-123');

    const generated = resolveCorrelationId('bad value');
    expect(isValidCorrelationId(generated)).toBe(true);
  });

  it('reads correlation id from headers in either canonical or lowercase form', () => {
    const h1 = new Headers();
    h1.set(CORRELATION_ID_HEADER, 'test-123');
    expect(getCorrelationIdFromHeaders(h1)).toBe('test-123');

    const h2 = new Headers();
    h2.set(CORRELATION_ID_HEADER_LOWER, 'test-456');
    expect(getCorrelationIdFromHeaders(h2)).toBe('test-456');

    const h3 = new Headers();
    h3.set(CORRELATION_ID_HEADER, 'bad value');
    expect(getCorrelationIdFromHeaders(h3)).toBeUndefined();
  });
});
