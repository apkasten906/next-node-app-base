/**
 * Error logging service with structured logging
 * Supports console logging and optional Sentry integration
 */

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
    // eslint-disable-next-line no-undef
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    // eslint-disable-next-line no-undef
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  };

  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Logger]', errorData);
  }

  // TODO: Integrate with Sentry or other monitoring service
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     level,
  //     contexts: { custom: context },
  //     tags,
  //   });
  // }

  // Send to backend error logging endpoint
  try {
    if (typeof window !== 'undefined') {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
