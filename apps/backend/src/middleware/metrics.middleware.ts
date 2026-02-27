import type { NextFunction, Request, Response } from 'express';

import { container } from '../container';
import type { IMetricsService } from '../infrastructure/observability';

/**
 * Metrics Middleware
 *
 * Automatically collects HTTP request metrics including:
 * - Request duration
 * - Request count by method, route, and status code
 *
 * Uses res.on('finish') to capture metrics after routing and response completion,
 * ensuring req.route is available for accurate route templating.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const metricsService = container.resolve<IMetricsService>('MetricsService');
    const startTime = Date.now();

    // Listen for response finish event (after routing and response completion)
    res.on('finish', () => {
      try {
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const route = req.route?.path || req.path;
        const method = req.method;
        const statusCode = res.statusCode.toString();

        // Record request duration
        metricsService.observeHistogram('http_request_duration_seconds', duration, {
          method,
          route,
          status_code: statusCode,
        });

        // Record request count
        metricsService.incrementCounter('http_requests_total', {
          method,
          route,
          status_code: statusCode,
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Error recording metrics:', error);
      }
    });
  } catch (error) {
    // Log error but continue with request
    console.error('Error initializing metrics:', error);
  }

  next();
}
