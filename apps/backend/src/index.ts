import 'dotenv/config';
import { createServer, type Server as HttpServer } from 'http';
import 'reflect-metadata';

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

/**
 * Express application setup with DI container
 */
export class App {
  public app: Express;
  private server?: HttpServer;
  private logger: LoggerService;
  private database: DatabaseService;
  private cache: CacheService;
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

  /**
   * Initialize middleware
   */
  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(helmet());

    // CORS
    const allowedOrigins = (process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000').split(',');
    this.app.use(
      cors({
        origin: allowedOrigins,
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => {
            this.logger.info(message.trim());
          },
        },
      })
    );

    // API versioning middleware (for /api routes)
    this.app.use(
      '/api',
      apiVersionMiddleware({
        defaultVersion: '1.0',
        supportedVersions: ['1.0'],
        header: 'accept',
      })
    );

    // Attach user from JWT if present
    this.app.use(attachUserIfPresent);

    // Correlation ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
      req.headers['x-correlation-id'] = correlationId;
      res.setHeader('x-correlation-id', correlationId);
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Swagger documentation
    setupSwagger(this.app);

    // Bull Board queue monitoring dashboard (admin only in production)
    if (
      this.queuesEnabled() &&
      (process.env['NODE_ENV'] === 'development' ||
        process.env['ENABLE_QUEUE_DASHBOARD'] === 'true')
    ) {
      try {
        const queueService = container.resolve(QueueService);
        const queueDashboard = createQueueMonitoringDashboard(queueService);
        this.app.use('/admin/queues', queueDashboard);
        this.logger.info('Queue monitoring dashboard available at /admin/queues');
      } catch (error) {
        this.logger.warn('Failed to initialize queue dashboard', { error });
      }
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
    this.app.use('/api/users', usersRouter);
    this.app.use('/api/files', filesRouter);

    // Additional API routes would be added here
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

      // Seed development/test users for E2E auth flow (only if DB is reachable and users table exists)
      if (process.env['NODE_ENV'] !== 'production') {
        try {
          const reachable = await this.database.healthCheck();
          if (!reachable) {
            this.logger.warn('Skipping dev seeding: database not reachable');
          } else {
            const existsResult = await this.database.$queryRaw<
              Array<{ exists: boolean }>
            >`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') AS exists`;
            const hasUsersTable = existsResult[0]?.exists === true;

            if (!hasUsersTable) {
              this.logger.warn('Skipping dev seeding: users table not found');
            } else {
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
            }
          }
        } catch (seedErr) {
          this.logger.warn('Dev user seeding skipped/failed', {
            error:
              seedErr instanceof Error
                ? { message: seedErr.message, stack: seedErr.stack, name: seedErr.name }
                : String(seedErr),
          });
        }
      }

      // Initialize job queues
      if (this.queuesEnabled()) {
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
      } else {
        this.logger.info('Job queues disabled (DISABLE_QUEUES=true)');
      }

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize WebSocket server
      if (this.websocketsEnabled()) {
        try {
          this.websocket = container.resolve(WebSocketService);
          await this.websocket.initialize(this.server);
          this.logger.info('WebSocket server initialized');
        } catch (error) {
          this.logger.error('Failed to initialize WebSocket server', error as Error);
          // Continue without WebSocket in development
          if (process.env['NODE_ENV'] === 'production') {
            throw error;
          }
        }
      } else {
        this.logger.info('WebSockets disabled (DISABLE_WEBSOCKETS=true)');
      }

      // Start server
      this.server.listen(port, () => {
        this.logger.info(`Server listening on port ${port}`);
        this.logger.info(`Environment: ${process.env['NODE_ENV']}`);
      });
    } catch (error) {
      this.logger.error('Failed to start server', error as Error);
      process.exit(1);
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
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
      process.exit(1);
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

// Create and start app
const app = new App();

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  void app.shutdown();
});
process.on('SIGINT', () => {
  void app.shutdown();
});

// Start server
void app.start();
