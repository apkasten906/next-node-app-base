import { describe, expect, it } from 'vitest';

import { getDefaultSeedPayload, getPersona } from '../e2e/fixtures/personas';

describe('E2E Personas - unit tests', () => {
  it('getPersona returns an object with email and password of reasonable length', () => {
    const persona = getPersona('user');
    expect(persona).toBeTruthy();
    expect(persona).toHaveProperty('email');
    expect(typeof persona.email).toBe('string');
    expect(persona.email).toContain('@');
    expect(persona).toHaveProperty('password');
    expect(typeof persona.password).toBe('string');
    expect(persona.password.length).toBeGreaterThanOrEqual(8);
  });

  it('getDefaultSeedPayload returns object with personas array containing key and email', () => {
    const payload = getDefaultSeedPayload();
    expect(payload).toHaveProperty('personas');
    expect(Array.isArray(payload.personas)).toBe(true);
    expect(payload.personas!.length).toBeGreaterThan(0);
    const first = payload.personas![0]!;
    expect(first).toHaveProperty('key');
    expect(first).toHaveProperty('email');
    expect(typeof first.email).toBe('string');
    expect(first.email).toContain('@');
  });
});
