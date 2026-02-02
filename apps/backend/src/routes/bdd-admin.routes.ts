import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';

import { LoggerService } from '../services/logger.service';
import { computeBddGovernanceSnapshot } from '../utils/bdd-governance';

const router: import('express').Router = Router();

const logger = container.resolve(LoggerService);

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const roles = req.user.roles || [];
  if (!roles.includes('ADMIN')) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
}

/**
 * GET /api/admin/bdd/status
 * Returns a repo-parsed governance snapshot (status tags + impl tags).
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!requireAdmin(req, res)) return;

    res.setHeader('cache-control', 'no-store');
    const snapshot = computeBddGovernanceSnapshot();
    res.status(200).json(snapshot);
  } catch (err) {
    // Log server-side, but avoid leaking filesystem paths/details to clients.
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to compute BDD governance snapshot', error);
    res.status(500).json({ error: 'Failed to compute BDD governance snapshot' });
  }
});

export default router;
