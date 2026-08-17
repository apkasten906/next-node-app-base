import type { FeatureFlagTargetingRule, IFeatureFlagService } from '@repo/types';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it } from 'vitest';

import '../../container';
import { FeatureFlagService } from '../../services/feature-flags/feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  it('returns the caller fallback when a flag does not exist', async () => {
    await expect(service.evaluate('missing', undefined, true)).resolves.toEqual({
      key: 'missing',
      value: true,
      reason: 'flag_not_found',
    });
  });

  it('returns false for a disabled flag', async () => {
    await service.create({ key: 'checkout', enabled: false, defaultValue: true });

    await expect(service.evaluate('checkout')).resolves.toEqual({
      key: 'checkout',
      value: false,
      reason: 'disabled',
    });
  });

  it('returns the default when no targeting rule matches', async () => {
    await service.create({
      key: 'checkout',
      defaultValue: false,
      rules: [rule('plan', 'equals', 'enterprise', true)],
    });

    await expect(
      service.evaluate('checkout', { attributes: { plan: 'starter' } })
    ).resolves.toEqual({ key: 'checkout', value: false, reason: 'default' });
  });

  it('uses the first matching rule in declaration order', async () => {
    const first = rule('plan', 'in', ['pro', 'enterprise'], true);
    const second = rule('plan', 'not_equals', 'starter', false);
    await service.create({
      key: 'checkout',
      defaultValue: false,
      rules: [first, second],
    });

    await expect(service.evaluate('checkout', { attributes: { plan: 'pro' } })).resolves.toEqual({
      key: 'checkout',
      value: true,
      reason: 'targeting_match',
      matchedRule: first,
    });
  });

  it.each([
    ['equals', 'admin', 'admin', true],
    ['not_equals', 'admin', 'member', true],
    ['in', ['admin', 'owner'], 'owner', true],
    ['not_in', ['blocked', 'suspended'], 'active', true],
  ] as const)('evaluates the %s operator', async (operator, comparisonValue, actual, expected) => {
    await service.create({
      key: operator,
      defaultValue: false,
      rules: [rule('role', operator, comparisonValue, true)],
    });

    const result = await service.evaluate(operator, { attributes: { role: actual } });

    expect(result.value).toBe(expected);
    expect(result.reason).toBe('targeting_match');
  });

  it('supports userId targeting and does not match absent attributes', async () => {
    await service.create({
      key: 'preview',
      defaultValue: false,
      rules: [rule('userId', 'equals', 'user-1', true), rule('missing', 'not_equals', 'x', true)],
    });

    expect((await service.evaluate('preview', { userId: 'user-1' })).value).toBe(true);
    expect((await service.evaluate('preview')).reason).toBe('default');
  });

  it('creates, lists, updates, gets, and deletes flags', async () => {
    const created = await service.create({ key: 'nav', defaultValue: false });
    expect(created.enabled).toBe(true);
    expect(await service.list()).toHaveLength(1);

    const updated = await service.update('nav', { defaultValue: true });
    expect(updated.defaultValue).toBe(true);
    expect(await service.get('nav')).toEqual(updated);

    await service.delete('nav');
    expect(await service.get('nav')).toBeNull();
  });

  it('rejects duplicate creation and mutation of missing flags', async () => {
    await service.create({ key: 'nav', defaultValue: false });

    await expect(service.create({ key: 'nav', defaultValue: true })).rejects.toThrow(
      'Feature flag already exists: nav'
    );
    await expect(service.update('missing', { enabled: false })).rejects.toThrow(
      'Feature flag not found: missing'
    );
    await expect(service.delete('missing')).rejects.toThrow('Feature flag not found: missing');
  });

  it('returns defensive copies from storage operations', async () => {
    const comparisonValue = ['pro'];
    const created = await service.create({
      key: 'safe',
      defaultValue: false,
      rules: [rule('plan', 'in', comparisonValue, true)],
    });

    comparisonValue.push('starter');
    (created.rules[0]?.comparisonValue as string[]).push('free');

    expect((await service.get('safe'))?.rules[0]?.comparisonValue).toEqual(['pro']);
  });

  it('is registered under the interface token', () => {
    const registered = container.resolve<IFeatureFlagService>('IFeatureFlagService');

    expect(registered).toBeInstanceOf(FeatureFlagService);
    expect(container.resolve<IFeatureFlagService>('IFeatureFlagService')).toBe(registered);
  });
});

function rule(
  attribute: string,
  operator: FeatureFlagTargetingRule['operator'],
  comparisonValue: FeatureFlagTargetingRule['comparisonValue'],
  value: boolean
): FeatureFlagTargetingRule {
  return { attribute, operator, comparisonValue, value };
}
