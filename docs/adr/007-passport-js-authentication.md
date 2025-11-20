# ADR 007: Passport.js Authentication Abstraction

## Status

**Accepted** - November 20, 2025

## Context

The application requires flexible authentication supporting multiple strategies:

- Local username/password
- OAuth 2.0 / OpenID Connect (Google, GitHub, Microsoft)
- JWT tokens for API access
- Session management
- Multi-factor authentication (future)

### Requirements

- Support multiple authentication strategies
- Pluggable architecture
- Industry-standard protocols (OAuth 2.0, OIDC)
- Session management
- Integration with dependency injection
- Testable authentication logic
- TypeScript support

## Decision

We will use **Passport.js** as our authentication abstraction layer, integrated with our TSyringe dependency injection container.

### Architecture

```typescript
// Core authentication service
@singleton()
export class AuthenticationService {
  constructor(
    @inject('JwtService') private jwtService: JwtService,
    @inject('EncryptionService') private encryptionService: EncryptionService,
    @inject('AuditLogService') private auditLogService: AuditLogService
  ) {}

  async authenticateLocal(
    username: string,
    password: string
  ): Promise<User | null> {
    const user = await this.findUserByUsername(username);
    if (!user) return null;

    const isValid = await this.encryptionService.compareHash(
      password,
      user.passwordHash
    );
    if (!isValid) return null;

    await this.auditLogService.log({
      action: 'LOGIN',
      userId: user.id,
      resource: 'auth',
      status: 'success',
    });

    return user;
  }

  async authenticateOAuth(
    provider: string,
    profile: OAuthProfile
  ): Promise<User> {
    // Find or create user from OAuth profile
    let user = await this.findUserByOAuthId(provider, profile.id);

    if (!user) {
      user = await this.createUserFromOAuth(provider, profile);
    }

    await this.auditLogService.log({
      action: 'LOGIN',
      userId: user.id,
      resource: 'auth',
      status: 'success',
      metadata: { provider },
    });

    return user;
  }

  async generateTokens(user: User): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(
      { userId: user.id, role: user.role },
      { expiresIn: '15m' }
    );

    const refreshToken = this.jwtService.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }
}
```

### Passport Strategies

#### 1. Local Strategy

```typescript
// strategies/local.strategy.ts
import { Strategy as LocalStrategy } from 'passport-local';
import { container } from 'tsyringe';

export const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email, password, done) => {
    try {
      const authService = container.resolve(AuthenticationService);
      const user = await authService.authenticateLocal(email, password);

      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);
```

#### 2. JWT Strategy

```typescript
// strategies/jwt.strategy.ts
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { container } from 'tsyringe';

export const jwtStrategy = new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    algorithms: ['HS256'],
  },
  async (payload, done) => {
    try {
      const authService = container.resolve(AuthenticationService);
      const user = await authService.findUserById(payload.userId);

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);
```

#### 3. Google OAuth Strategy

```typescript
// strategies/google.strategy.ts
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { container } from 'tsyringe';

export const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/auth/google/callback',
    scope: ['profile', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const authService = container.resolve(AuthenticationService);
      const user = await authService.authenticateOAuth('google', {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);
```

#### 4. GitHub OAuth Strategy

```typescript
// strategies/github.strategy.ts
import { Strategy as GitHubStrategy } from 'passport-github2';
import { container } from 'tsyringe';

export const githubStrategy = new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: '/auth/github/callback',
    scope: ['user:email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const authService = container.resolve(AuthenticationService);
      const user = await authService.authenticateOAuth('github', {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
        username: profile.username,
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);
```

### Passport Configuration

```typescript
// passport.config.ts
import passport from 'passport';
import { localStrategy } from './strategies/local.strategy';
import { jwtStrategy } from './strategies/jwt.strategy';
import { googleStrategy } from './strategies/google.strategy';
import { githubStrategy } from './strategies/github.strategy';

export function configurePassport() {
  passport.use('local', localStrategy);
  passport.use('jwt', jwtStrategy);
  passport.use('google', googleStrategy);
  passport.use('github', githubStrategy);

  // Serialization (for sessions)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const authService = container.resolve(AuthenticationService);
      const user = await authService.findUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
```

### Express Integration

```typescript
// server.ts
import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { configurePassport } from './passport.config';

const app = express();

// Session middleware (for OAuth flows)
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure strategies
configurePassport();

// Authentication routes
app.post('/auth/login', passport.authenticate('local'), (req, res) => {
  const authService = container.resolve(AuthenticationService);
  const tokens = await authService.generateTokens(req.user);
  res.json(tokens);
});

app.get('/auth/google', passport.authenticate('google'));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    const authService = container.resolve(AuthenticationService);
    const tokens = await authService.generateTokens(req.user);
    res.redirect(`/auth/success?token=${tokens.accessToken}`);
  }
);

app.get('/auth/github', passport.authenticate('github'));

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  async (req, res) => {
    const authService = container.resolve(AuthenticationService);
    const tokens = await authService.generateTokens(req.user);
    res.redirect(`/auth/success?token=${tokens.accessToken}`);
  }
);

// Protected route example
app.get(
  '/api/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ user: req.user });
  }
);
```

## Consequences

### Positive

- ✅ **Strategy pattern**: Pluggable authentication strategies
- ✅ **Industry standard**: Widely adopted (23k+ GitHub stars)
- ✅ **Extensive ecosystem**: 500+ strategies available
- ✅ **OAuth 2.0/OIDC**: Native support for modern protocols
- ✅ **DI integration**: Works with TSyringe container
- ✅ **Session management**: Built-in serialization/deserialization
- ✅ **Testable**: Strategies can be mocked/stubbed
- ✅ **TypeScript types**: @types/passport available
- ✅ **Middleware**: Express integration is seamless

### Negative

- ⚠️ **Callback-based**: Not async/await native (requires wrapping)
- ⚠️ **Express coupling**: Designed for Express.js
- ⚠️ **Session dependency**: OAuth flows require sessions
- ⚠️ **Learning curve**: Strategy configuration can be complex
- ⚠️ **Type safety**: Some strategies lack good TypeScript types
- ⚠️ **Maintenance**: Some strategies are unmaintained

### Neutral

- 🔄 **Middleware pattern**: Fits Express but could abstract further
- 🔄 **State management**: Sessions vs stateless JWT decision

## Alternatives Considered

### Alternative 1: Custom Authentication

**Pros:**

- Full control over implementation
- No dependencies
- Tailored to exact needs
- Modern async/await
- Perfect TypeScript types

**Cons:**

- Reinventing the wheel
- Security risks (DIY crypto)
- OAuth 2.0 complexity
- No community support
- Time-consuming to build
- Harder to audit

**Why rejected:** Authentication is security-critical. Use battle-tested libraries. Don't roll your own crypto.

### Alternative 2: Auth0 / Okta

**Pros:**

- Fully managed service
- Advanced features (MFA, SSO)
- Compliance (SOC 2, GDPR)
- No maintenance
- Professional support

**Cons:**

- External dependency
- Monthly cost (Auth0 $240/mo+)
- Vendor lock-in
- Latency (external API calls)
- Privacy concerns
- Less customization

**Why rejected:** Self-hosted solution preferred for control, cost, and data privacy.

### Alternative 3: NextAuth.js

**Pros:**

- Designed for Next.js
- Modern API (async/await)
- TypeScript-first
- OAuth providers built-in
- Session/JWT support
- Database adapters

**Cons:**

- Next.js coupling
- Not for standalone backend
- Less mature (v4 released 2021)
- Smaller ecosystem
- Session-focused design

**Why rejected:** Designed for Next.js, not standalone Express backend. We need backend-first solution.

### Alternative 4: Grant

**Pros:**

- OAuth 2.0 focused
- 200+ providers
- Framework-agnostic
- Modern codebase
- Minimal dependencies

**Cons:**

- OAuth only (no local auth)
- Less adoption (3k stars)
- Less documentation
- No session management
- Narrower scope

**Why rejected:** OAuth-only solution. We need local authentication too.

## Security Considerations

### 1. Credential Storage

```typescript
// Never store plain passwords
const passwordHash = await encryptionService.hash(password);

// Store hash and verify on login
const isValid = await encryptionService.compareHash(password, passwordHash);
```

### 2. JWT Security

```typescript
// Use strong secrets
const JWT_SECRET = crypto.randomBytes(64).toString('hex');

// Short expiration for access tokens
const accessToken = jwtService.sign(payload, { expiresIn: '15m' });

// Longer expiration for refresh tokens
const refreshToken = jwtService.sign(payload, { expiresIn: '7d' });
```

### 3. OAuth State Parameter

```typescript
// Prevent CSRF attacks
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/auth/google/callback',
      state: true, // Enable state parameter
    },
    callback
  )
);
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
});

app.post('/auth/login', authLimiter, passport.authenticate('local'));
```

## Testing Strategy

### Unit Tests

```typescript
describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;

  beforeEach(() => {
    container.clearInstances();
    mockJwtService = createMockJwtService();
    mockEncryptionService = createMockEncryptionService();

    container.registerInstance('JwtService', mockJwtService);
    container.registerInstance('EncryptionService', mockEncryptionService);

    authService = container.resolve(AuthenticationService);
  });

  it('should authenticate valid credentials', async () => {
    mockEncryptionService.compareHash.mockResolvedValue(true);

    const user = await authService.authenticateLocal(
      'test@example.com',
      'password123'
    );

    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
  });

  it('should reject invalid credentials', async () => {
    mockEncryptionService.compareHash.mockResolvedValue(false);

    const user = await authService.authenticateLocal(
      'test@example.com',
      'wrongpassword'
    );

    expect(user).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('Auth Endpoints', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('should reject invalid credentials', async () => {
    await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' })
      .expect(401);
  });

  it('should access protected route with JWT', async () => {
    const tokens = await loginUser('test@example.com', 'password123');

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**

   - TOTP (Time-based One-Time Password)
   - SMS verification
   - Email verification
   - Biometric authentication

2. **Additional OAuth Providers**

   - Microsoft Azure AD
   - LinkedIn
   - Twitter
   - Facebook

3. **Advanced Features**
   - Password reset flow
   - Email verification
   - Account lockout after failed attempts
   - Session management dashboard
   - Device tracking

## Monitoring & Review

This decision will be reviewed:

- **6 months**: Evaluate Passport.js performance and DX
- **If needed**: Consider NextAuth.js if migrating to full Next.js stack
- **Ongoing**: Monitor for security vulnerabilities in strategies

## Related

- [ADR-004: TSyringe for Dependency Injection](004-tsyringe-dependency-injection.md)
- [ADR-005: OWASP Security Standards](005-owasp-security-standards.md)
- [Passport.js Documentation](http://www.passportjs.org/)

## References

- Passport.js v0.7.0
- passport-local v1.0.0
- passport-jwt v4.0.1
- passport-google-oauth20 v2.0.0
- passport-github2 v0.1.12
- OAuth 2.0 RFC 6749
- OpenID Connect Core 1.0
