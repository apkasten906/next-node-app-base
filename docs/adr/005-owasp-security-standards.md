# ADR 005: OWASP Security Standards and ESLint Plugin

## Status

**Accepted** - November 20, 2025

Date: 2025-11-20

## Context

Security must be a first-class concern from the project's inception. We need to:

- Follow industry-standard security practices
- Catch security vulnerabilities during development
- Enforce security best practices in code
- Prevent common security anti-patterns
- Maintain compliance with security standards

### Requirements

- Automated security scanning
- Integration with developer workflow
- Minimal false positives
- Good documentation
- Active maintenance
- IDE integration

## Decision

We will adopt **OWASP security standards** and enforce them using **eslint-plugin-security**.

### Implementation

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', '@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint', 'security', 'import'],
  rules: {
    // OWASP Security Rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',

    // Additional TypeScript Security
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
  },
};
```

## OWASP Top 10 Coverage

### 1. Broken Access Control

- ✅ RBAC/ABAC implementation
- ✅ Authorization middleware
- ✅ Permission-based access control
- ✅ Audit logging

### 2. Cryptographic Failures

- ✅ bcrypt for password hashing
- ✅ AES-256-GCM encryption
- ✅ JWT with secure secrets
- ✅ Secrets manager abstraction

### 3. Injection

- ✅ Prisma parameterized queries (planned)
- ✅ Zod input validation (planned)
- ✅ ESLint detection of eval/require
- ✅ No string concatenation in queries

### 4. Insecure Design

- ✅ Threat modeling documentation
- ✅ Security architecture review
- ✅ DI pattern for security abstractions
- ✅ ADR documentation process

### 5. Security Misconfiguration

- ✅ Helmet.js security headers
- ✅ Environment validation (Zod planned)
- ✅ Security-focused ESLint rules
- ✅ CORS configuration

### 6. Vulnerable Components

- ✅ OWASP Dependency-Check (planned)
- ✅ pnpm audit
- ✅ Automated updates
- ✅ Snyk scanning (planned)

### 7. Authentication Failures

- ✅ OAuth 2.0/OIDC support
- ✅ JWT with refresh tokens
- ✅ Secure session management
- ✅ MFA ready (Passport.js)

### 8. Software & Data Integrity

- ✅ Git commit signing (recommended)
- ✅ Audit logging
- ✅ Immutable audit trails
- ✅ Dependency lockfiles

### 9. Logging & Monitoring Failures

- ✅ Comprehensive audit logging
- ✅ Security event tracking
- ✅ Structured logging (planned)
- ✅ SIEM integration ready

### 10. Server-Side Request Forgery (SSRF)

- ✅ URL validation (planned)
- ✅ Allow-list approach
- ✅ Network isolation (Istio planned)
- ✅ Request validation

## Consequences

### Positive

- ✅ **Early detection**: Catch security issues during development
- ✅ **Developer education**: Learn security best practices
- ✅ **Consistent standards**: Enforced across entire codebase
- ✅ **IDE feedback**: Real-time security warnings
- ✅ **Audit trail**: Security decisions documented
- ✅ **Compliance ready**: OWASP alignment helps with certifications
- ✅ **Reduced risk**: Proactive security posture

### Negative

- ⚠️ **False positives**: Some warnings may not be real issues
- ⚠️ **Development friction**: May slow down initial development
- ⚠️ **Learning curve**: Team needs security training
- ⚠️ **Configuration overhead**: Rules need tuning

### Neutral

- 🔄 **Ongoing maintenance**: Rules need periodic review
- 🔄 **Custom rules**: May need project-specific security rules
- 🔄 **Suppression comments**: Some legitimate patterns need exemptions

## Alternatives Considered

### Alternative 1: Manual Code Reviews Only

**Pros:**

- No tooling overhead
- Flexible approach
- Human judgment
- Context-aware

**Cons:**

- Inconsistent application
- Scalability issues
- Human error
- Slow feedback
- No automation

**Why rejected:** Cannot rely solely on humans for security. Automated scanning catches issues that reviews miss.

### Alternative 2: SonarQube/SonarLint

**Pros:**

- Comprehensive analysis
- Great reporting
- Multiple languages
- Security hotspots
- Quality gates

**Cons:**

- Heavy tooling
- Server infrastructure required
- Slower feedback
- Complex setup
- Overkill for some projects

**Why rejected:** ESLint plugin provides faster feedback during development. Can add SonarQube later for deeper analysis.

### Alternative 3: Semgrep

**Pros:**

- Fast static analysis
- Custom rule writing
- Multiple languages
- Good accuracy
- Open source

**Cons:**

- Separate tool (not ESLint)
- Additional CI integration
- Less IDE integration
- Newer tool
- Smaller community

**Why rejected:** ESLint integration is better for TypeScript/JavaScript. Can add Semgrep as complementary tool later.

### Alternative 4: No Automated Security Scanning

**Pros:**

- No tooling
- Maximum flexibility
- No false positives
- Faster development

**Cons:**

- High risk
- Inconsistent security
- No safety net
- Reactive approach
- Compliance issues

**Why rejected:** Unacceptable security risk. Automated scanning is essential for modern applications.

## Security Practices Implemented

### Code Level

```typescript
// ❌ BAD: Dynamic object property access
const value = obj[userInput];

// ✅ GOOD: Validated property access
const allowedKeys = ['name', 'email'] as const;
if (allowedKeys.includes(key)) {
  const value = obj[key];
}

// ❌ BAD: eval usage
eval(userCode);

// ✅ GOOD: Safe alternatives
const fn = new Function('return ' + safeExpression);

// ❌ BAD: Timing attack vulnerability
if (password === storedPassword) {
  // Vulnerable
}

// ✅ GOOD: Constant-time comparison
if (await bcrypt.compare(password, storedHash)) {
  // Safe
}
```

### Configuration Level

```typescript
// Helmet.js security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // ...
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  })
);
```

## CI/CD Integration

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
pnpm lint
pnpm typecheck
```

### GitHub Actions

```yaml
- name: Security Lint
  run: pnpm lint

- name: Dependency Audit
  run: pnpm audit

- name: OWASP Dependency Check
  run: pnpm dependency-check
```

## Security Documentation

All security decisions must be documented:

1. **ADRs**: Architecture decisions affecting security
2. **SECURITY.md**: Vulnerability reporting process
3. **Threat Model**: System threat analysis (planned)
4. **Security Reviews**: Regular security audits

## Training & Awareness

### Required Team Knowledge

- OWASP Top 10
- Secure coding practices
- Common vulnerabilities (XSS, CSRF, SQLi)
- Authentication vs Authorization
- Encryption best practices

### Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Security.md](../../SECURITY.md)

## Monitoring & Review

This decision will be reviewed:

- **Quarterly**: Review OWASP Top 10 updates
- **Monthly**: Review security incidents and near-misses
- **Weekly**: Review eslint-plugin-security rule effectiveness
- **Daily**: Address new security warnings

## Compliance & Certifications

OWASP compliance helps with:

- **SOC 2**: Security controls
- **ISO 27001**: Information security
- **PCI DSS**: Payment security (if applicable)
- **HIPAA**: Healthcare data (if applicable)
- **GDPR**: Data protection

## Related

- [ADR-007: Passport.js Authentication Abstraction](007-passport-js-authentication.md)
- [SECURITY.md](../../SECURITY.md)
- [Security Governance](../security-governance.md)

## References

- eslint-plugin-security v3.0.1
- OWASP Top 10 2021
- OWASP ASVS (Application Security Verification Standard)
- Helmet.js v8.1.0
