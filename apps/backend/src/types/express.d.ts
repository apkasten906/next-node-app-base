/**
 * Express type extensions for custom properties
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * API version from header/query parameter
       */
      apiVersion?: string;

      /**
       * Authenticated user information
       */
      user?: {
        id: string;
        email?: string;
        roles?: string[];
        [key: string]: unknown;
      };
    }
  }
}
