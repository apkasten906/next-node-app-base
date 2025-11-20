# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for this project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Format

Each ADR follows this structure:

- **Title**: Short noun phrase
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: The issue motivating this decision
- **Decision**: The change being proposed or has been agreed upon
- **Consequences**: What becomes easier or more difficult after this change

## Index

| ADR                                           | Title                                        | Status   | Date       |
| --------------------------------------------- | -------------------------------------------- | -------- | ---------- |
| [001](./001-node-js-25-native-typescript.md)  | Use Node.js 25 for Native TypeScript Support | Accepted | 2025-11-20 |
| [002](./002-turborepo-monorepo.md)            | Turborepo for Monorepo Management            | Accepted | 2025-11-20 |
| [003](./003-pnpm-package-manager.md)          | pnpm as Package Manager                      | Accepted | 2025-11-20 |
| [004](./004-tsyringe-dependency-injection.md) | TSyringe for Dependency Injection            | Accepted | 2025-11-20 |
| [005](./005-owasp-security-standards.md)      | OWASP Security Standards                     | Accepted | 2025-11-20 |
| [006](./006-typescript-strict-mode.md)        | TypeScript Strict Mode                       | Accepted | 2025-11-20 |
| [007](./007-passport-js-authentication.md)    | Passport.js Authentication Abstraction       | Accepted | 2025-11-20 |

## Creating a New ADR

1. Copy the template: `000-template.md`
2. Number it sequentially
3. Fill in the sections
4. Update this index
5. Commit with the decision
