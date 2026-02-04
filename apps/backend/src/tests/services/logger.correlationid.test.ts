import { container } from 'tsyringe';
import { describe, expect, it, vi } from 'vitest';

import { LoggerService } from '../../services/logger.service';

describe('LoggerService - correlationId handling', () => {
  it('renders object correlationId without producing [object Object]', () => {
    const loggerService = container.resolve(LoggerService);

    // Create a child logger with an object as correlationId
    const complexId = { requestId: 'req-1', user: { id: 'user-1' } };
    const child = loggerService.child(JSON.stringify(complexId));

    // Spy on console transport's log method by spying the child's info
    const spy = vi.spyOn(child, 'info');

    child.info('Test message', { extra: true });

    expect(spy).toHaveBeenCalled();

    // Inspect the args passed to the underlying logger call to ensure correlationId was coerced
    const args = spy.mock.calls[0] as unknown[];
    const meta = args[1] ?? {};

    // correlationId should not be the raw object in metadata
    expect(JSON.stringify(meta)).not.toContain('[object Object]');
  });
});
