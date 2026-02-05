import { inspect } from 'node:util';

import { singleton } from 'tsyringe';
import winston from 'winston';

import { requestContext } from '../context/request-context';

/**
 * Structured logging service with Winston
 * Provides correlation IDs and multiple transports
 */
@singleton()
export class LoggerService {
  // Internal Winston logger instance; keep private to preserve encapsulation
  private readonly logger: winston.Logger;

  private static inspectLogValue(value: unknown, depth: number): string {
    return inspect(value, {
      depth,
      breakLength: Infinity,
      compact: true,
      maxArrayLength: 50,
    });
  }

  private static inspectCorrelationId(value: unknown): string {
    return LoggerService.inspectLogValue(value, 4);
  }

  private static trimAndClampCorrelationId(rendered: string): string | undefined {
    const trimmed = rendered.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 256) : undefined;
  }

  private static normalizeCorrelationId(correlationId: unknown): string | undefined {
    if (correlationId == null) return undefined;

    if (typeof correlationId === 'string') {
      const trimmed = correlationId.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    // JSON.stringify throws on BigInt; String() is safe for primitives.
    if (
      typeof correlationId === 'number' ||
      typeof correlationId === 'boolean' ||
      typeof correlationId === 'bigint' ||
      typeof correlationId === 'symbol'
    ) {
      return String(correlationId);
    }

    try {
      const json = JSON.stringify(correlationId);
      // JSON.stringify(undefined) and JSON.stringify(function(){}) return undefined
      const rendered = json ?? LoggerService.inspectCorrelationId(correlationId);
      return LoggerService.trimAndClampCorrelationId(rendered);
    } catch {
      // Circular refs / BigInt nested inside objects
      const rendered = LoggerService.inspectCorrelationId(correlationId);
      return LoggerService.trimAndClampCorrelationId(rendered);
    }
  }

  constructor() {
    const isTest = process.env['NODE_ENV'] === 'test';

    const injectCorrelationIdFromContext = winston.format((info) => {
      // Respect explicitly provided correlationId (e.g., child logger or meta)
      if (info['correlationId'] == null) {
        const cid = requestContext.getCorrelationId();
        if (cid) info['correlationId'] = cid;
      }
      return info;
    });

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      injectCorrelationIdFromContext(),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      injectCorrelationIdFromContext(),
      winston.format.printf((info) => {
        const record = info as Record<string, unknown>;
        const {
          timestamp: rawTimestamp,
          level: rawLevel,
          message: rawMessage,
          correlationId: _correlationId,
          ...metadata
        } = record;

        const timestamp = typeof rawTimestamp === 'string' ? rawTimestamp : '';
        const level = typeof rawLevel === 'string' ? rawLevel : '';
        const message =
          typeof rawMessage === 'string'
            ? rawMessage
            : LoggerService.inspectLogValue(rawMessage, 2);
        const cid = LoggerService.normalizeCorrelationId(record['correlationId']);

        let msg = `${timestamp} [${level}]`;
        if (cid) {
          msg += ` [${cid}]`;
        }
        msg += `: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    );

    this.logger = winston.createLogger({
      level: process.env['LOG_LEVEL'] || 'info',
      format: logFormat,
      defaultMeta: { service: 'backend' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: process.env['NODE_ENV'] === 'production' ? logFormat : consoleFormat,
        }),
        // File transports for production
        ...(process.env['NODE_ENV'] === 'production'
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: logFormat,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                format: logFormat,
              }),
            ]
          : []),
      ],
      ...(isTest
        ? {}
        : {
            exceptionHandlers: [new winston.transports.File({ filename: 'logs/exceptions.log' })],
            rejectionHandlers: [new winston.transports.File({ filename: 'logs/rejections.log' })],
          }),
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.logger.error(message, {
      ...meta,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    });
  }

  /**
   * Create child logger with correlation ID.
   * Accepts non-string values and coerces them to a stable string
   * representation to avoid console interpolation producing
   * "[object Object]" for object correlation IDs.
   */
  child(correlationId: unknown): winston.Logger {
    const cid = LoggerService.normalizeCorrelationId(correlationId);
    return cid === undefined ? this.logger.child({}) : this.logger.child({ correlationId: cid });
  }

  /**
   * Get Winston logger instance
   */
  getLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Close all transports and clean up resources
   * Call this before terminating the application or in test cleanup
   */
  close(): void {
    this.logger.close();
  }
}
