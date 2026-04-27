import 'reflect-metadata';

import * as promClient from 'prom-client';
import { container } from 'tsyringe';

// Register authentication services
import { UserController } from './controllers/user.controller';
import { MetricsService, TracingService } from './infrastructure/observability';
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

// Register services as singletons.
// isRegistered guards prevent double-registration when this module is
// transitively imported alongside container-test.ts in BDD/integration tests
// (e.g. via metrics.middleware.ts → container.ts).
if (!container.isRegistered(JwtService)) {
  container.registerSingleton(JwtService);
}
if (!container.isRegistered(EncryptionService)) {
  container.registerSingleton(EncryptionService);
}
if (!container.isRegistered(PolicyEngine)) {
  container.registerSingleton(PolicyEngine);
}
if (!container.isRegistered(InMemoryPolicyStore)) {
  container.registerSingleton(InMemoryPolicyStore);
}
if (!container.isRegistered(AuthorizationService)) {
  container.registerSingleton(AuthorizationService);
}
if (!container.isRegistered(AuditLogService)) {
  container.registerSingleton(AuditLogService);
}
if (!container.isRegistered(EnvironmentSecretsManager)) {
  container.registerSingleton(EnvironmentSecretsManager);
}

// Register observability services
if (!container.isRegistered('PrometheusRegistry')) {
  container.registerSingleton('PrometheusRegistry', promClient.Registry);
}
if (!container.isRegistered('MetricsService')) {
  container.registerSingleton('MetricsService', MetricsService);
}
if (!container.isRegistered('TracingService')) {
  container.registerSingleton('TracingService', TracingService);
}

// Tracing SDK should be initialised from a dedicated early-entry bootstrap
// (e.g., `bootstrap.ts`) to ensure auto-instrumentation starts before other
// instrumented modules are imported. Avoid eager resolution here to keep
// container imports side-effect free.

// Register user domain bindings
if (!container.isRegistered(UserRepository)) {
  container.registerSingleton(UserRepository);
}
if (!container.isRegistered(UserService)) {
  container.registerSingleton(UserService);
}
if (!container.isRegistered(UserController)) {
  container.registerSingleton(UserController);
}

export { container } from 'tsyringe';
