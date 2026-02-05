/**
 * Express type extensions for custom properties
 */

import { TokenPayload } from '@repo/types';

declare global {
  namespace Express {
    interface Request {
      /**
       * API version from header/query parameter
       */
      apiVersion?: string;

      /**
       * Authenticated user information from JWT token
       */
      user?: TokenPayload;

      /**
       * Request correlation ID (from X-Correlation-ID or generated).
       */
      correlationId?: string;
    }
  }
}

export {};
