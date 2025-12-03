import compression from 'compression';
import cors from 'cors';
import 'dotenv/config';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import 'reflect-metadata';
import { container } from 'tsyringe';

import { setupSwagger } from './config/swagger';
import { apiVersionMiddleware } from './middleware/api-version.middleware';
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
import { EnvironmentSecretsManager } from './services/secrets/secrets-manager.service';
import { registerStorageProvider } from './services/storage/storage-provider.factory';

/**
 * Express application setup with DI container
 */
export class App {
  public app: Express;
  private logger: LoggerService;
  private database: DatabaseService;
  private cache: CacheService;

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

        const ready = {
          database: dbHealth,
          cache: cacheHealth,
          status: dbHealth && cacheHealth ? 'ready' : 'not ready',
        };

        const statusCode = dbHealth && cacheHealth ? 200 : 503;
        res.status(statusCode).json(ready);
      } catch (error) {
        this.logger.error('Readiness check failed', error as Error);
        res.status(503).json({
          database: false,
          cache: false,
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
        },
      });
    });

    // Register API routes
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

      // Start server
      this.app.listen(port, () => {
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

// Register notification and storage providers based on environment
registerNotificationProviders();
registerStorageProvider();

// Create and start app
const app = new App();

// Graceful shutdown handlers
process.on('SIGTERM', () => app.shutdown());
process.on('SIGINT', () => app.shutdown());

// Start server
app.start();
