import { container } from 'tsyringe';
import { describe, expect, it } from 'vitest';
import winston from 'winston';

import { LoggerService } from '../../services/logger.service';

describe('LoggerService - correlationId handling', () => {
  it('renders object correlationId without producing [object Object]', () => {
    const loggerService = container.resolve(LoggerService);

    // Create a complex object correlation id and make a child logger
    const complexId = { requestId: 'req-1', user: { id: 'user-1' } };

    // Use the underlying Winston logger to create a child with an object correlationId
    const root = loggerService.getLogger();
    const child = root.child({ correlationId: complexId });

    // Create a lightweight stream transport to capture the formatted output
    const formatted: string[] = [];
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, correlationId, ...metadata }) => {
        let msg = `${timestamp} [${level}]`;
        if (correlationId) {
          msg += ` [${correlationId}]`;
        }
        msg += `: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    );

    const stream = { write: (chunk: unknown) => formatted.push(String(chunk)) };
    const transport = new winston.transports.Stream({
      stream: stream as unknown as NodeJS.WritableStream,
      level: 'info',
      format: consoleFormat,
    });

    // Attach transport to child (transports are inherited; adding to child ensures test isolation)
    child.add(transport);

    // Emit a log
    child.info('Test message', { extra: true });

    // Remove transport and close
    child.remove(transport);

    // We should have captured formatted output and it should NOT render correlationId as [object Object]
    expect(formatted.length).toBeGreaterThan(0);
    const out = formatted.join('\n');
    expect(out).not.toContain('[object Object]');
    // And it should include the requestId field from the complex id when stringified
    expect(out).toContain('req-1');
  });
});
