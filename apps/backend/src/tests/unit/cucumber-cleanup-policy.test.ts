import { describe, expect, it, vi } from 'vitest';

import { enforceCleanupErrors } from '../../../features/support/cleanup-policy';

describe('unit: Cucumber cleanup policy', () => {
  it('does nothing when teardown succeeds', () => {
    const report = vi.fn();

    expect(() => enforceCleanupErrors([], false, report)).not.toThrow();
    expect(report).not.toHaveBeenCalled();
  });

  it('fails an otherwise-passing scenario with its teardown error', () => {
    const cleanupError = new Error('database disconnect failed');

    expect(() => enforceCleanupErrors([cleanupError], false, vi.fn())).toThrow(cleanupError);
  });

  it('preserves an existing scenario failure and reports teardown errors', () => {
    const report = vi.fn();
    const cleanupError = new Error('cache disconnect failed');

    expect(() => enforceCleanupErrors([cleanupError], true, report)).not.toThrow();
    expect(report).toHaveBeenCalledWith(cleanupError);
  });

  it('aggregates multiple teardown failures for a passing scenario', () => {
    const first = new Error('application cleanup failed');
    const second = new Error('metrics cleanup failed');

    expect(() => enforceCleanupErrors([first, second], false, vi.fn())).toThrow(
      expect.objectContaining({
        name: 'AggregateError',
        message: 'Multiple scenario teardown failures',
        errors: [first, second],
      })
    );
  });
});
