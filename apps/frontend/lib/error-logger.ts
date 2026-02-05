/**
 * Error logging service with structured logging
 * Supports console logging and optional Sentry integration
 */

import { injectCorrelationId } from './correlation-id';

interface ErrorContext {
  [key: string]: unknown;
}

interface LogErrorOptions {
  context?: ErrorContext;
  level?: 'error' | 'warning' | 'info';
  tags?: Record<string, string>;
}

/**
 * Log error to monitoring service
 */
export async function logError(error: Error, options: LogErrorOptions = {}): Promise<void> {
  const { context = {}, level = 'error', tags = {} } = options;

  const errorData = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    level,
    context,
    tags,
    userAgent: globalThis.window?.navigator.userAgent ?? 'server',
    url: globalThis.window?.location.href ?? 'server',
  };

  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Logger]', errorData);
  }

  // Optional: Integrate with Sentry or other monitoring service
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     level,
  //     contexts: { custom: context },
  //     tags,
  //   });
  // }

  // Send to backend error logging endpoint
  try {
    if (globalThis.window) {
      const headers = new Headers({
        'Content-Type': 'application/json',
      });
      injectCorrelationId(headers);

      await fetch('/api/errors', {
        method: 'POST',
        headers,
        body: JSON.stringify(errorData),
      }).catch((err) => {
        // Silently fail - don't create error loops
        console.warn('Failed to send error to backend:', err);
      });
    }
  } catch {
    // Silently fail
  }
}

/**
 * Log warning
 */
export async function logWarning(message: string, context?: ErrorContext): Promise<void> {
  await logError(new Error(message), { level: 'warning', context });
}

/**
 * Log info
 */
export async function logInfo(message: string, context?: ErrorContext): Promise<void> {
  await logError(new Error(message), { level: 'info', context });
}
