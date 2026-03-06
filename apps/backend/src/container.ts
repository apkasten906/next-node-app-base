import 'reflect-metadata';

import { container } from 'tsyringe';

// Register authentication services
import { UserController } from './controllers/user.controller';
import { MetricsService } from './infrastructure/observability';
import { UserRepository } from './repositories/user.repository';
import { AuditLogService } from './services/audit/audit-log.service';
import { AuthorizationService } from './services/auth/authorization.service';
import { EncryptionService } from './services/auth/encryption.service';
import { JwtService } from './services/auth/jwt.service';
import { PolicyEngine } from './services/auth/policy-engine.service';
import { InMemoryPolicyStore } from './services/auth/policy-store.service';
import { EnvironmentSecretsManager } from './services/secrets/secrets-manager.service';
import { UserService } from './services/user/user.service';

// Register observability services

// Register services as singletons
container.registerSingleton(JwtService);
container.registerSingleton(EncryptionService);
container.registerSingleton(PolicyEngine);
container.registerSingleton(InMemoryPolicyStore);
container.registerSingleton(AuthorizationService);
container.registerSingleton(AuditLogService);
container.registerSingleton(EnvironmentSecretsManager);

// Register observability services
container.registerSingleton('MetricsService', MetricsService);

// Register user domain bindings
container.registerSingleton(UserRepository);
container.registerSingleton(UserService);
container.registerSingleton(UserController);

export { container } from 'tsyringe';
