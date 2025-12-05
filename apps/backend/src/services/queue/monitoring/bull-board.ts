import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QueueName } from '@repo/types';
import { Router } from 'express';

import { QueueService } from '../queue.service';

/**
 * Create Bull Board monitoring dashboard
 * Provides a UI for monitoring and managing job queues
 */
export function createQueueMonitoringDashboard(queueService: QueueService): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Get all registered queues
  const queues = Object.values(QueueName)
    .map((queueName) => {
      try {
        const queue = queueService.getQueue(queueName);
        return new BullMQAdapter(queue);
      } catch {
        return null;
      }
    })
    .filter((adapter): adapter is BullMQAdapter => adapter !== null);

  createBullBoard({
    queues,
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
