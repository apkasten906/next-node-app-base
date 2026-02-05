import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '../context/request-context';

const HEADER = 'X-Correlation-ID';

function isValidCorrelationId(value: string): boolean {
  // Keep it conservative to prevent header/log abuse.
  // Allows typical UUIDs and common request id formats.
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}

/**
 * Correlation ID middleware.
 * - Accepts client-provided X-Correlation-ID when valid
 * - Otherwise generates one
 * - Echoes it back on the response and attaches it to req.correlationId
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const raw = req.get(HEADER) ?? req.get(HEADER.toLowerCase());
  const candidate = typeof raw === 'string' ? raw.trim() : '';
  const correlationId = isValidCorrelationId(candidate) ? candidate : randomUUID();

  req.correlationId = correlationId;
  res.setHeader(HEADER, correlationId);

  // Ensure correlationId is available to all downstream async work.
  requestContext.run({ correlationId }, () => next());
}
