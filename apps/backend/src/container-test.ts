/**
 * Test bootstrap for the DI container.
 *
 * Registers all non-observability singletons so BDD/integration tests have a
 * fully wired container without triggering the production `container.ts`
 * side-effects.  Observability services (PrometheusRegistry / MetricsService)
 * are intentionally omitted here; each test scenario registers its own fresh
 * instances in the Cucumber `Before` hook to prevent cross-scenario leakage.
 */
import 'reflect-metadata';

import { container } from 'tsyringe';

import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { AuditLogService } from './services/audit/audit-log.service';
import { AuthorizationService } from './services/auth/authorization.service';
import { EncryptionService } from './services/auth/encryption.service';
import { JwtService } from './services/auth/jwt.service';
import { PolicyEngine } from './services/auth/policy-engine.service';
import { InMemoryPolicyStore } from './services/auth/policy-store.service';
import { EnvironmentSecretsManager } from './services/secrets/secrets-manager.service';
import { UserService } from './services/user/user.service';

// Register non-observability singletons once for the test suite.
// Using isRegistered guards so this module is safe to import multiple times.
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
