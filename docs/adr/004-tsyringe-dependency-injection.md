# ADR 004: Use TSyringe for Dependency Injection

## Status

**Accepted** - November 20, 2025

Date: 2025-11-20

## Context

The backend architecture requires a dependency injection (DI) container to:

- Implement SOLID principles (especially Dependency Inversion)
- Enable easy testing with mock services
- Support service abstraction for multiple implementations
- Manage service lifecycles (singleton, transient, scoped)
- Facilitate loose coupling between components

### Requirements

- TypeScript-first design
- Decorator-based injection (clean syntax)
- Constructor injection support
- Singleton and transient lifetimes
- Small bundle size
- Minimal configuration
- Good TypeScript inference

## Decision

We will use **TSyringe** as our dependency injection container.

### Implementation

```typescript
// container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';

// Register services
container.registerSingleton(JwtService);
container.registerSingleton(EncryptionService);
container.registerSingleton(AuthorizationService);

export { container };
```

### Service Definition

```typescript
// jwt.service.ts
import { injectable } from 'tsyringe';

@injectable()
export class JwtService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly auditLog: AuditLogService
  ) {}

  async generateTokens(payload: TokenPayload): Promise<TokenResult> {
    // Implementation
  }
}
```

### Service Resolution

```typescript
// Resolve service from container
const jwtService = container.resolve(JwtService);

// Or inject into middleware/controllers
export const authenticate = async (req, res, next) => {
  const jwtService = container.resolve(JwtService);
  // Use service
};
```

## Consequences

### Positive

- ✅ **TypeScript-first**: Built specifically for TypeScript
- ✅ **Minimal boilerplate**: Clean decorator syntax
- ✅ **Excellent IntelliSense**: Full type inference
- ✅ **Small bundle**: ~3KB minified
- ✅ **Simple API**: Easy to learn and use
- ✅ **Constructor injection**: Standard DI pattern
- ✅ **Multiple lifetimes**: Singleton, transient, scoped
- ✅ **No vendor lock-in**: Easy to swap implementations

### Negative

- ⚠️ **Requires reflect-metadata**: Additional polyfill needed
- ⚠️ **Decorator metadata**: Must enable `emitDecoratorMetadata` in tsconfig
- ⚠️ **Runtime reflection**: Small performance overhead
- ⚠️ **Less features**: Compared to NestJS or InversifyJS

### Neutral

- 🔄 **Learning curve**: Team needs to understand DI concepts
- 🔄 **Testing setup**: Need to configure container for tests
- 🔄 **Service registration**: Must register all services at startup

## Alternatives Considered

### Alternative 1: InversifyJS

**Pros:**

- Most feature-rich DI container
- Strong community
- Excellent documentation
- Powerful binding configurations
- Middleware support
- Multi-injection
- Contextual bindings

**Cons:**

- Larger bundle size (~20KB)
- More complex API
- Requires more boilerplate
- Symbol-based identifiers
- Steeper learning curve
- Overkill for our needs

**Why rejected:** Too complex for our requirements. TSyringe provides everything we need with much simpler API.

### Alternative 2: NestJS DI Container

**Pros:**

- Part of full framework
- Excellent integration
- Module system
- Lifecycle hooks
- Request-scoped providers
- Circular dependency detection

**Cons:**

- Requires entire NestJS framework
- Opinionated architecture
- Heavy framework overhead
- Too much for Express-based API
- Vendor lock-in

**Why rejected:** We're using Express, not NestJS. Don't need the entire framework just for DI.

### Alternative 3: TypeDI

**Pros:**

- Simple API
- Good TypeScript support
- Container hierarchy
- Service decorators
- Active maintenance

**Cons:**

- Less popular than TSyringe
- Smaller community
- Some TypeScript issues
- Less intuitive API
- Fewer examples

**Why rejected:** TSyringe has better TypeScript support and larger community. More actively maintained by Microsoft.

### Alternative 4: Manual Factory Pattern

**Pros:**

- No dependencies
- Complete control
- No reflection overhead
- Simple to understand
- No magic

**Cons:**

- Manual service instantiation
- Hard to test
- Lots of boilerplate
- Tight coupling
- Manual lifecycle management
- No automatic dependency resolution

**Why rejected:** Defeats the purpose of DI. Too much manual work and boilerplate.

## Configuration

### TypeScript Config

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Service Patterns

#### Singleton Services (Default)

```typescript
@injectable()
export class ConfigService {
  // Shared across entire application
}

container.registerSingleton(ConfigService);
```

#### Interface-based Injection

```typescript
@injectable()
export class S3StorageProvider implements IStorageProvider {
  async upload(file: File): Promise<UploadResult> {
    // Implementation
  }
}

// Register with token
container.register<IStorageProvider>('IStorageProvider', {
  useClass: S3StorageProvider,
});

// Inject with token
@injectable()
export class FileService {
  constructor(@inject('IStorageProvider') private storage: IStorageProvider) {}
}
```

#### Factory Pattern

```typescript
container.register('Logger', {
  useFactory: () => createLogger(process.env.LOG_LEVEL),
});
```

## Testing Strategy

### Test Setup

```typescript
// test-setup.ts
import { container } from 'tsyringe';

beforeEach(() => {
  container.clearInstances();
});
```

### Mock Services

```typescript
// jwt.service.test.ts
import { container } from 'tsyringe';

describe('JwtService', () => {
  it('should generate tokens', () => {
    // Register mock
    const mockEncryption = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    container.registerInstance(EncryptionService, mockEncryption);

    const jwtService = container.resolve(JwtService);
    // Test with mocked dependency
  });
});
```

## Service Architecture

### Layered Service Design

```
Controllers (Express routes)
    ↓
Services (Business logic)
    ↓
Repositories (Data access)
    ↓
Infrastructure (External services)
```

All layers use DI for loose coupling.

### Current Services

- **JwtService**: JWT token management
- **EncryptionService**: Encryption and hashing
- **AuthorizationService**: RBAC/ABAC authorization
- **AuditLogService**: Security event logging
- **EnvironmentSecretsManager**: Secrets management

### Future Services

- **PrismaService**: Database access
- **RedisService**: Caching
- **NotificationService**: Email/SMS/Push
- **SearchService**: Full-text search
- **EventBus**: Event-driven architecture
- **PaymentService**: Payment processing
- **AnalyticsService**: User analytics

## Performance Considerations

### Overhead

- **Reflection**: ~0.1ms per resolution (negligible)
- **Container lookup**: ~0.01ms (hash map)
- **Singleton**: Instantiated once, cached

### Optimization

- Use singletons for stateless services
- Lazy loading for expensive services
- Clear container between tests

## Best Practices

1. **Use `@injectable()` decorator** on all services
2. **Register in container.ts** at startup
3. **Inject via constructor** (not property injection)
4. **Prefer interfaces** for abstraction
5. **Use singletons** for stateless services
6. **Clear container** in tests
7. **Avoid circular dependencies**

## Migration Path

If we need to migrate away from TSyringe:

1. **To InversifyJS**: Similar patterns, straightforward migration
2. **To NestJS**: Would require framework adoption
3. **To Manual DI**: Remove decorators, use factory functions
4. **Service interfaces**: Make migration easier

## Monitoring & Review

This decision will be reviewed:

- After 6 months of usage (May 2026)
- If performance issues arise
- When adding complex service hierarchies
- If testing becomes difficult

## Related

- [ADR-006: TypeScript Strict Mode](006-typescript-strict-mode.md)
- [TSyringe Documentation](https://github.com/microsoft/tsyringe)
- [Service Architecture](../../README.md#architecture)

## References

- TSyringe v4.10.0
- reflect-metadata v0.2.2
- Dependency Inversion Principle (SOLID)
- Constructor injection pattern
