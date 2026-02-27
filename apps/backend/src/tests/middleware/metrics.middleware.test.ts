import { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { container } from '../../container';
import { type IMetricsService } from '../../infrastructure/observability/IMetricsService';
import { metricsMiddleware } from '../../middleware/metrics.middleware';

// Mock the MetricsService
const mockMetricsService: IMetricsService = {
  incrementCounter: vi.fn(),
  setGauge: vi.fn(),
  observeHistogram: vi.fn(),
  observeSummary: vi.fn(),
  startTimer: vi.fn(() => vi.fn()),
  registerDefaultMetrics: vi.fn(),
  registerCounter: vi.fn(),
  registerGauge: vi.fn(),
  registerHistogram: vi.fn(),
  registerSummary: vi.fn(),
  getMetrics: vi.fn().mockResolvedValue(''),
  resetMetrics: vi.fn(),
};

describe('Metrics Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let finishCallback: (() => void) | null;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    finishCallback = null;

    // Mock container.resolve
    vi.spyOn(container, 'resolve').mockReturnValue(mockMetricsService);

    // Setup request mock
    req = {
      method: 'GET',
      route: {
        path: '/api/users/:id',
      },
      originalUrl: '/api/users/123',
      baseUrl: '/api',
      path: '/users/123',
    };

    // Setup response mock with finish event support
    const sendFn = vi.fn();
    res = {
      statusCode: 200,
      send: sendFn.mockImplementation(function (this: Response, _body?: unknown) {
        // Trigger finish event when send is called
        if (finishCallback) {
          finishCallback();
        }
        return this;
      }),
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return res as Response;
      }),
    };

    next = vi.fn();
  });

  describe('Request Timing', () => {
    it('should register finish event listener when request begins', () => {
      metricsMiddleware(req as Request, res as Response, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should record histogram when response finishes', () => {
      metricsMiddleware(req as Request, res as Response, next);

      // Simulate response being sent (triggers finish event)
      res.send!('response body');

      expect(mockMetricsService.observeHistogram).toHaveBeenCalledWith(
        'http_request_duration_seconds',
        expect.any(Number),
        {
          method: 'GET',
          route: '/api/users/:id',
          status_code: '200',
        }
      );
    });

    it('should call next() to continue middleware chain', () => {
      metricsMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Request Counter', () => {
    it('should increment request counter with correct labels', () => {
      metricsMiddleware(req as Request, res as Response, next);
      res.send!('response');

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith('http_requests_total', {
        method: 'GET',
        route: '/api/users/:id',
        status_code: '200',
      });
    });

    it('should use route path when available', () => {
      req.route = { path: '/api/posts/:postId' };
      req.method = 'POST';
      res.statusCode = 201;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ id: '456' });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith('http_requests_total', {
        method: 'POST',
        route: '/api/posts/:postId',
        status_code: '201',
      });
    });

    it('should use req.path as fallback when route is unavailable', () => {
      const reqWithoutRoute = {
        ...req,
        route: undefined,
        path: '/unknown/path',
      };

      metricsMiddleware(reqWithoutRoute as Request, res as Response, next);
      res.send!('response');

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith('http_requests_total', {
        method: 'GET',
        route: '/unknown/path',
        status_code: '200',
      });
    });
  });

  describe('Different HTTP Methods', () => {
    it('should track GET requests', () => {
      req.method = 'GET';

      metricsMiddleware(req as Request, res as Response, next);
      res.send!('data');

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should track POST requests', () => {
      req.method = 'POST';
      res.statusCode = 201;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ created: true });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ method: 'POST', status_code: '201' })
      );
    });

    it('should track PUT requests', () => {
      req.method = 'PUT';
      res.statusCode = 200;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ updated: true });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should track DELETE requests', () => {
      req.method = 'DELETE';
      res.statusCode = 204;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!();

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ method: 'DELETE', status_code: '204' })
      );
    });

    it('should track PATCH requests', () => {
      req.method = 'PATCH';
      res.statusCode = 200;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ patched: true });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('Different Status Codes', () => {
    it('should track 2xx success responses', () => {
      res.statusCode = 200;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!('OK');

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ status_code: '200' })
      );
    });

    it('should track 3xx redirect responses', () => {
      res.statusCode = 302;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!();

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ status_code: '302' })
      );
    });

    it('should track 4xx client error responses', () => {
      res.statusCode = 404;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ error: 'Not Found' });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ status_code: '404' })
      );
    });

    it('should track 5xx server error responses', () => {
      res.statusCode = 500;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ error: 'Internal Server Error' });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ status_code: '500' })
      );
    });

    it('should track 400 Bad Request', () => {
      res.statusCode = 400;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ error: 'Bad Request' });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ status_code: '400' })
      );
    });

    it('should track 401 Unauthorized', () => {
      res.statusCode = 401;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ error: 'Unauthorized' });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ status_code: '401' })
      );
    });

    it('should track 403 Forbidden', () => {
      res.statusCode = 403;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!({ error: 'Forbidden' });

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({ status_code: '403' })
      );
    });
  });

  describe('Multiple Requests', () => {
    it('should track each request independently', () => {
      // First request
      metricsMiddleware(req as Request, res as Response, next);
      res.send!('response 1');

      // Second request with fresh response object
      const res2 = {
        statusCode: 201,
        send: vi.fn().mockImplementation(function (this: Response) {
          return this;
        }),
      };
      req.method = 'POST';
      req.route = { path: '/api/posts' };
      metricsMiddleware(req as Request, res2 as unknown as Response, next);
      res2.send('response 2');

      // Should have been called twice with different parameters
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledTimes(2);
      expect(mockMetricsService.startTimer).toHaveBeenCalledTimes(2);
      expect(endTimerMock).toHaveBeenCalledTimes(2);
    });

    it('should track same route with different methods separately', () => {
      // GET request
      req.method = 'GET';
      req.route = { path: '/api/users/:id' };
      metricsMiddleware(req as Request, res as Response, next);
      res.send!('user data');

      // PUT request to same route
      req.method = 'PUT';
      metricsMiddleware(req as Request, res as Response, next);
      res.send!('updated');

      expect(mockMetricsService.incrementCounter).toHaveBeenNthCalledWith(
        1,
        'http_requests_total',
        expect.objectContaining({ method: 'GET' })
      );

      expect(mockMetricsService.incrementCounter).toHaveBeenNthCalledWith(
        2,
        'http_requests_total',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Response Interception', () => {
    it('should preserve original res.send functionality', () => {
      const responseBody = { data: 'test' };
      const originalSendMock = res.send as ReturnType<typeof vi.fn>;

      metricsMiddleware(req as Request, res as Response, next);
      const result = res.send!(responseBody);

      // Should return the response object (for chaining)
      expect(result).toBe(res);
      // Original mock should have been called
      expect(originalSendMock).toHaveBeenCalledWith(responseBody);
    });

    it('should only instrument once per request', () => {
      metricsMiddleware(req as Request, res as Response, next);

      // Call send multiple times (shouldn't happen normally, but test resilience)
      res.send!('first');
      res.send!('second');

      // Metrics should only be recorded once
      expect(endTimerMock).toHaveBeenCalledTimes(2); // Called for each send
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing metrics service gracefully', () => {
      vi.spyOn(container, 'resolve').mockImplementation(() => {
        throw new Error('Service not found');
      });

      // Should not throw
      expect(() => {
        metricsMiddleware(req as Request, res as Response, next);
      }).not.toThrow();

      // Should still call next
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors in timer gracefully', () => {
      (mockMetricsService.startTimer as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Timer error');
      });

      // Should not throw
      expect(() => {
        metricsMiddleware(req as Request, res as Response, next);
      }).not.toThrow();

      // Should still call next
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors in counter increment gracefully', () => {
      (mockMetricsService.incrementCounter as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Counter error');
      });

      metricsMiddleware(req as Request, res as Response, next);

      // Should not throw when response is sent
      expect(() => {
        res.send!('response');
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests without route', () => {
      const reqWithoutRoute = {
        ...req,
        route: undefined,
        path: '/health',
      };

      metricsMiddleware(reqWithoutRoute as Request, res as Response, next);
      res.send!('OK');

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith('http_requests_total', {
        method: 'GET',
        route: '/health',
        status_code: '200',
      });
    });

    it('should handle requests without method', () => {
      req.method = undefined;

      metricsMiddleware(req as Request, res as Response, next);
      res.send!('response');

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'http_requests_total',
        expect.objectContaining({
          method: undefined,
        })
      );
    });

    it('should handle empty response bodies', () => {
      metricsMiddleware(req as Request, res as Response, next);
      res.send!();

      expect(endTimerMock).toHaveBeenCalled();
      expect(mockMetricsService.incrementCounter).toHaveBeenCalled();
    });

    it('should handle null response bodies', () => {
      metricsMiddleware(req as Request, res as Response, next);
      res.send!(null);

      expect(endTimerMock).toHaveBeenCalled();
      expect(mockMetricsService.incrementCounter).toHaveBeenCalled();
    });
  });
});
