import { singleton } from 'tsyringe';
import winston from 'winston';

/**
 * Structured logging service with Winston
 * Provides correlation IDs and multiple transports
 */
@singleton()
export class LoggerService {
  // Internal Winston logger instance; keep private to preserve encapsulation
  private readonly logger: winston.Logger;

  constructor() {
    const isTest = process.env['NODE_ENV'] === 'test';

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
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
    const cid = typeof correlationId === 'string' ? correlationId : JSON.stringify(correlationId);
    return this.logger.child({ correlationId: cid });
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
