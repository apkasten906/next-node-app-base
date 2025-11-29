import 'reflect-metadata';
import { container } from 'tsyringe';

// Register authentication services
import { AuthorizationService } from './services/auth/authorization.service';
import { EncryptionService } from './services/auth/encryption.service';
import { JwtService } from './services/auth/jwt.service';

// Register audit service
import { AuditLogService } from './services/audit/audit-log.service';

// Register secrets manager
import { EnvironmentSecretsManager } from './services/secrets/secrets-manager.service';

// Register services as singletons
container.registerSingleton(JwtService);
container.registerSingleton(EncryptionService);
container.registerSingleton(AuthorizationService);
container.registerSingleton(AuditLogService);
container.registerSingleton(EnvironmentSecretsManager);

// Register user domain bindings
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user/user.service';

container.registerSingleton(UserRepository);
container.registerSingleton(UserService);
container.registerSingleton(UserController);

export { container };
