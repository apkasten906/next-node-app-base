import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Next Node App Base API',
    version: '1.0.0',
    description: 'Production-ready API with OAuth, RBAC, and HATEOAS support',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001/api',
      description: 'Development server',
    },
    {
      url: 'https://staging.example.com/api',
      description: 'Staging server',
    },
    {
      url: 'https://api.example.com/api',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authorization header using the Bearer scheme',
      },
      oauth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://auth.example.com/oauth/authorize',
            tokenUrl: 'https://auth.example.com/oauth/token',
            scopes: {
              'read:users': 'Read user information',
              'write:users': 'Modify user information',
              admin: 'Administrative access',
            },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error type',
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
          },
        },
      },
      HATEOASLink: {
        type: 'object',
        properties: {
          href: {
            type: 'string',
            description: 'Link URL',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            description: 'HTTP method',
          },
          rel: {
            type: 'string',
            description: 'Link relation',
          },
          type: {
            type: 'string',
            description: 'Content type',
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: 'Total number of items',
          },
          page: {
            type: 'integer',
            description: 'Current page number',
          },
          pageSize: {
            type: 'integer',
            description: 'Number of items per page',
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages',
          },
        },
      },
    },
    parameters: {
      PageParam: {
        in: 'query',
        name: 'page',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
        description: 'Page number',
      },
      PageSizeParam: {
        in: 'query',
        name: 'pageSize',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10,
        },
        description: 'Number of items per page',
      },
      SortParam: {
        in: 'query',
        name: 'sort',
        schema: {
          type: 'string',
        },
        description: 'Sort field (e.g., "createdAt:desc")',
      },
      ApiVersionHeader: {
        in: 'header',
        name: 'Accept',
        schema: {
          type: 'string',
          example: 'application/vnd.api+json; version=1.0',
        },
        description: 'API version header',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
  ],
};

const swaggerOptions: swaggerJSDoc.Options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Configure Swagger UI middleware
 */
export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Next Node App Base API Documentation',
      customfavIcon: '/favicon.ico',
      explorer: true,
    })
  );

  // OpenAPI spec endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
  console.log('📄 OpenAPI spec available at /api-docs.json');
}
