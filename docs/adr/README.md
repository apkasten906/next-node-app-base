# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for this project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Format

Each ADR follows this structure:

## Conventions

- **Filename**: `NNN-short-kebab-case-title.md` where `NNN` is a **3-digit** ADR number (e.g. `008-prisma-7-migration.md`).
- **Header**: First line must be `# ADR NNN: Title` (3 digits, no zero-padding beyond 3).
- **Metadata**: Include `Status: ...` and `Date: YYYY-MM-DD` near the top.
- **Index**: This README index is treated as generated output; use `pnpm adr:index` to regenerate.

- **Title**: Short noun phrase
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: The issue motivating this decision
- **Decision**: The change being proposed or has been agreed upon
- **Consequences**: What becomes easier or more difficult after this change

## Index

<!-- adr-index:start -->

| ADR                                               | Title                                                                         | Status                           | Date       |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------- | ---------- |
| [001](./001-node-js-25-native-typescript.md)      | Use Node.js 25 for Native TypeScript Support                                  | **Accepted** - November 20, 2025 | 2025-11-20 |
| [002](./002-turborepo-monorepo.md)                | Use Turborepo for Monorepo Management                                         | **Accepted** - November 20, 2025 | 2025-11-20 |
| [003](./003-pnpm-package-manager.md)              | Use pnpm as Package Manager                                                   | **Accepted** - November 20, 2025 | 2025-11-20 |
| [004](./004-tsyringe-dependency-injection.md)     | Use TSyringe for Dependency Injection                                         | **Accepted** - November 20, 2025 | 2025-11-20 |
| [005](./005-owasp-security-standards.md)          | OWASP Security Standards and ESLint Plugin                                    | **Accepted** - November 20, 2025 | 2025-11-20 |
| [006](./006-typescript-strict-mode.md)            | TypeScript Strict Mode                                                        | **Accepted** - November 20, 2025 | 2025-11-20 |
| [007](./007-passport-js-authentication.md)        | Passport.js Authentication Abstraction                                        | **Accepted** - November 20, 2025 | 2025-11-20 |
| [008](./008-prisma-7-migration.md)                | Migration to Prisma 7 with Adapter Pattern                                    | Accepted                         | 2025-11-26 |
| [009](./009-artifact-registry-github-packages.md) | Artifact registry — GitHub Packages (default), registry-agnostic publish flow | Accepted                         | 2025-11-29 |
| [010](./010-prisma-7-cli-migration-workaround.md) | Prisma 7 CLI Migration Workaround Strategy                                    | Accepted                         | 2025-12-04 |
| [011](./011-backend-only-auth.md)                 | Backend-Only Authentication                                                   | Accepted                         | 2025-12-16 |
| [012](./012-testing-framework-vitest.md)          | Use Vitest as the Primary Test Runner                                         | Accepted                         | 2026-02-02 |

<!-- adr-index:end -->

## Creating a New ADR

1. Copy the template: `000-template.md`
2. Number it sequentially
3. Fill in the sections
4. Update this index
5. Commit with the decision
