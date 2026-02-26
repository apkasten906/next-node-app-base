import { IRouter, Router, type Request, type Response } from 'express';

import { container } from '../container';
import type { IMetricsService } from '../infrastructure/observability';

const router: IRouter = Router();

/**
 * GET /metrics
 *
 * Expose Prometheus metrics endpoint.
 * This endpoint should NOT be exposed publicly in production.
 * Use Istio VirtualService to restrict access to Prometheus scraper only.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const metricsService = container.resolve<IMetricsService>('MetricsService');
    const metrics = await metricsService.getMetrics();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).send('Error fetching metrics');
  }
});

export default router;
