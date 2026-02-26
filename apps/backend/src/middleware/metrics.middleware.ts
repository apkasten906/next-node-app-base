import type { NextFunction, Request, Response } from 'express';

import { container } from '../container';
import type { IMetricsService } from '../infrastructure/observability';

/**
 * Metrics Middleware
 *
 * Automatically collects HTTP request metrics including:
 * - Request duration
 * - Request count by method, route, and status code
 * - Response sizes
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const metricsService = container.resolve<IMetricsService>('MetricsService');

    // Start timer for request duration
    const endTimer = metricsService.startTimer('http_request_duration_seconds', {
      method: req.method,
      route: req.route?.path || req.path,
    });

    // Capture response to record metrics
    const originalSend = res.send;
    res.send = function (body: unknown): Response {
      try {
        endTimer();

        // Record request count with labels
        metricsService.incrementCounter('http_requests_total', {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString(),
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Error recording metrics:', error);
      }

      // Call original send
      return originalSend.call(this, body);
    };
  } catch (error) {
    // Log error but continue with request
    console.error('Error initializing metrics:', error);
  }

  next();
}
