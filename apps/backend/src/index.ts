import './bootstrap';

import fs from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import path from 'node:path';

import compression from 'compression';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { container } from 'tsyringe';

import { setupSwagger } from './config/swagger';
import { apiVersionMiddleware } from './middleware/api-version.middleware';
import { attachUserIfPresent } from './middleware/jwt.middleware';
import authRouter from './routes/auth.routes';
import bddAdminRouter from './routes/bdd-admin.routes';
import e2eRouter from './routes/e2e.routes';
import filesRouter from './routes/files.routes';
import { usersRouter } from './routes/users-v2.routes';
import { AuditLogService } from './services/audit/audit-log.service';
import { AuthorizationService } from './services/auth/authorization.service';
import { EncryptionService } from './services/auth/encryption.service';
import { JwtService } from './services/auth/jwt.service';
import { CacheService } from './services/cache.service';
import { DatabaseService } from './services/database.service';
import { LoggerService } from './services/logger.service';
import { registerNotificationProviders } from './services/notification/notification-provider.factory';
import { createQueueMonitoringDashboard } from './services/queue/monitoring/bull-board';
import { initializeQueues } from './services/queue/queue-init';
import { QueueService } from './services/queue/queue.service';
import { EnvironmentSecretsManager } from './services/secrets/secrets-manager.service';
import { registerStorageProvider } from './services/storage/storage-provider.factory';
import { WebSocketService } from './services/websocket/websocket.service';

function readDirEntriesSafe(dir: string): fs.Dirent[] {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Express application setup with DI container
 */
export class App {
  public app: Express;
  private server?: HttpServer;
  private readonly logger: LoggerService;
  private readonly database: DatabaseService;
  private readonly cache: CacheService;
  private websocket?: WebSocketService;

  private queuesEnabled(): boolean {
    return process.env['DISABLE_QUEUES'] !== 'true';
  }

  private websocketsEnabled(): boolean {
    return process.env['DISABLE_WEBSOCKETS'] !== 'true';
  }

  constructor() {
    this.app = express();
    this.logger = container.resolve(LoggerService);
    this.database = container.resolve(DatabaseService);
    this.cache = container.resolve(CacheService);

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Trust proxy for correct IP/HTTPS detection behind reverse proxies
    this.app.set('trust proxy', 1);

    this.app.use(compression());
    this.app.use(
      cors({
        origin: process.env['CORS_ORIGIN'] ? process.env['CORS_ORIGIN'].split(',') : true,
        credentials: true,
      })
    );
    this.app.use(helmet());
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(apiVersionMiddleware());
    this.app.use(attachUserIfPresent);
  }

  private initializeRoutes(): void {
    setupSwagger(this.app);

    // Default root landing
    this.app.get('/', (_req: Request, res: Response) => {
      res.redirect(302, '/api-docs');
    });

    if (process.env['NODE_ENV'] === 'development') {
      const reportsDir = path.join(process.cwd(), 'reports');

      // Cucumber's HTML report uses inline scripts; Helmet's default CSP blocks it.
      // Keep CSP for the rest of the app, but relax it for dev-only report viewing.
      this.app.use('/reports', (_req: Request, res: Response, next: NextFunction) => {
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');
        next();
      });

      this.app.get(['/reports', '/reports/'], (_req: Request, res: Response) => {
        res.setHeader('cache-control', 'no-store');

        const entries = readDirEntriesSafe(reportsDir)
          .filter((d) => d.isFile())
          .map((d) => d.name)
          .filter((name) => !name.startsWith('.'))
          .sort((a, b) => a.localeCompare(b));

        const listItems = entries
          .map((name) => `<li><a href="/reports/${encodeURIComponent(name)}">${name}</a></li>`)
          .join('');

        res.status(200).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reports</title>
  </head>
  <body>
    <h1>Reports</h1>
    <ul>
      <li><a href="/reports/cucumber">Cucumber report</a></li>
    </ul>
    <h2>Files</h2>
    <ul>${listItems || '<li>(no files found)</li>'}</ul>
  </body>
</html>`);
      });

      this.app.use('/reports', express.static(reportsDir, { index: false }));
      this.app.get('/reports/cucumber', (_req: Request, res: Response) => {
        res.redirect(302, '/reports/cucumber-report.html');
      });
    }

    // Health check endpoint
    this.app.get('/health', async (_req: Request, res: Response) => {
      const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'ok',
      };

      res.status(200).json(health);
    });

    // Readiness check endpoint
    this.app.get('/ready', async (_req: Request, res: Response) => {
      try {
        const dbHealth = await this.database.healthCheck();
        const cacheHealth = await this.cache.healthCheck();
        const wsHealth = this.websocket ? await this.websocket.getHealth() : null;

        const ready = {
          database: dbHealth,
          cache: cacheHealth,
          websocket: wsHealth,
          status: dbHealth && cacheHealth ? 'ready' : 'not ready',
        };

        const statusCode = dbHealth && cacheHealth ? 200 : 503;
        res.status(statusCode).json(ready);
      } catch (error) {
        this.logger.error('Readiness check failed', error as Error);
        res.status(503).json({
          database: false,
          cache: false,
          websocket: null,
          status: 'not ready',
        });
      }
    });

    // API info endpoint
    this.app.get('/api', (_req: Request, res: Response) => {
      res.json({
        message: 'Next-Node-App-Base API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          ready: '/ready',
          users: '/api/users',
          documentation: '/api-docs',
          ...(process.env['NODE_ENV'] === 'development' &&
            this.queuesEnabled() && { queues: '/admin/queues' }),
        },
      });
    });

    // Register API routes
    this.app.use('/api/auth', authRouter);
    this.app.use('/api/admin/bdd', bddAdminRouter);
    this.app.use('/api/e2e', e2eRouter);
    this.app.use('/api/users', usersRouter);
    this.app.use('/api/files', filesRouter);
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    });

    // Error handler
    this.app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
      this.logger.error('Unhandled error', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env['NODE_ENV'] === 'development' ? error.message : 'An error occurred',
      });
    });
  }

  /**
   * Start server
   */
  public async start(): Promise<void> {
    const port = process.env['PORT'] || 3001;

    try {
      // Connect to database
      await this.database.connect();
      this.logger.info('Database connected');

      await this.seedDevUsersIfApplicable();

      this.initializeQueuesIfEnabled();

      // Queue monitoring dashboard (development only)
      if (process.env['NODE_ENV'] === 'development' && this.queuesEnabled()) {
        try {
          const queueService = container.resolve(QueueService);
          const queueDashboard = createQueueMonitoringDashboard(queueService);
          this.app.use('/admin/queues', queueDashboard);
          this.logger.info('Queue monitoring dashboard available at /admin/queues');
        } catch (error) {
          this.logger.warn('Failed to initialize queue dashboard', { error });
        }
      }

      // Create HTTP server
      this.server = createServer(this.app);

      await this.initializeWebSocketsIfEnabled();

      // Start server
      this.server.listen(port, () => {
        this.logger.info(`Server listening on port ${port}`);
        this.logger.info(`Environment: ${process.env['NODE_ENV']}`);
      });
    } catch (error) {
      this.logger.error('Failed to start server', error as Error);
      throw error;
    }
  }

  private async seedDevUsersIfApplicable(): Promise<void> {
    if (process.env['NODE_ENV'] === 'production') return;

    try {
      const reachable = await this.database.healthCheck();
      if (!reachable) {
        this.logger.warn('Skipping dev seeding: database not reachable');
        return;
      }

      const existsResult = await this.database.$queryRaw<
        Array<{ exists: boolean }>
      >`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') AS exists`;
      const hasUsersTable = existsResult[0]?.exists === true;

      if (hasUsersTable !== true) {
        this.logger.warn('Skipping dev seeding: users table not found');
        return;
      }

      const enc = container.resolve(EncryptionService);
      const testPassword = await enc.hash('Password123!');
      const adminPassword = await enc.hash('Admin123!');

      await this.database.user.upsert({
        where: { email: 'test@example.com' },
        update: {
          name: 'Test User',
          role: 'USER',
          passwordHash: testPassword,
        },
        create: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          passwordHash: testPassword,
        },
      });

      await this.database.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
          name: 'Admin User',
          role: 'ADMIN',
          passwordHash: adminPassword,
        },
        create: {
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          passwordHash: adminPassword,
        },
      });

      this.logger.info('Seeded development users for E2E');
    } catch (error_) {
      this.logger.warn('Dev user seeding skipped/failed', {
        error:
          error_ instanceof Error
            ? { message: error_.message, stack: error_.stack, name: error_.name }
            : String(error_),
      });
    }
  }

  private initializeQueuesIfEnabled(): void {
    if (!this.queuesEnabled()) {
      this.logger.info('Job queues disabled (DISABLE_QUEUES=true)');
      return;
    }

    try {
      initializeQueues();
      this.logger.info('Job queues initialized');
    } catch (error) {
      this.logger.error('Failed to initialize job queues', error as Error);
      // Continue without queues in development
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
    }
  }

  private async initializeWebSocketsIfEnabled(): Promise<void> {
    if (!this.websocketsEnabled()) {
      this.logger.info('WebSockets disabled (DISABLE_WEBSOCKETS=true)');
      return;
    }

    try {
      this.websocket = container.resolve(WebSocketService);
      await this.websocket.initialize(this.server!);
      this.logger.info('WebSocket server initialized');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket server', error as Error);
      // Continue without WebSocket in development
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down gracefully');

    try {
      // Shutdown WebSocket server
      if (this.websocket) {
        await this.websocket.shutdown();
      }

      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server?.close((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }

      await this.database.disconnect();
      await this.cache.disconnect();
      this.logger.info('Connections closed');
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
      throw error;
    }
  }
}

// Initialize DI container
container.registerSingleton(LoggerService);
container.registerSingleton(DatabaseService);
container.registerSingleton(CacheService);
container.registerSingleton('JwtService', JwtService);
container.registerSingleton('EncryptionService', EncryptionService);
container.registerSingleton('AuthorizationService', AuthorizationService);
container.registerSingleton('AuditLogService', AuditLogService);
container.registerSingleton('SecretsManager', EnvironmentSecretsManager);
container.registerSingleton(QueueService);
container.registerSingleton(WebSocketService);

// Register notification and storage providers based on environment
registerNotificationProviders();
registerStorageProvider();

// Only start the HTTP server when this module is executed directly.
// This prevents side effects when importing `App` in tests (Vitest/Cucumber/etc).

if (require.main === module) {
  const app = new App();
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    try {
      await app.shutdown();
      process.exit(0);
    } catch (error) {
      // Avoid relying on DI logger during teardown.
      console.error(`Shutdown failed after ${signal}`, error);
      process.exit(1);
    }
  };

  const startServer = async (): Promise<void> => {
    try {
      await app.start();
    } catch (error) {
      console.error('Server failed to start', error);
      process.exit(1);
    }
  };

  const shutdownAndExit = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    setImmediate(() => {
      void shutdown(signal);
    });
  };

  process.on('SIGTERM', () => shutdownAndExit('SIGTERM'));
  process.on('SIGINT', () => shutdownAndExit('SIGINT'));

  setImmediate(() => {
    void startServer();
  });
}
