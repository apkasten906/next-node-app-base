# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Upgraded to Node.js 25 for native TypeScript support ([ADR-001](docs/adr/001-node-js-25-native-typescript.md))
- Updated `.nvmrc` to Node.js 25
- Updated Dev Container to use `node:25-bookworm`
- Updated package.json engines to require Node.js >=25.0.0

### Added

- Initial project structure with Turborepo monorepo
- Next.js frontend application with App Router
- Node.js backend with Express and TypeScript
- Prisma ORM with PostgreSQL support
- Dev Container configuration for consistent development environment
- Comprehensive testing setup (Vitest, Playwright, Cucumber, Pact, OWASP ZAP)
- Security features (OAuth 2.0/OIDC, RBAC/ABAC, Helmet.js)
- Istio service mesh configuration
- Multi-level caching strategy (L1, L2, L3)
- Webhook management system
- GitHub Actions CI/CD workflows
- Documentation structure
- OWASP security compliance framework

## [1.0.0] - 2025-11-20

### Added

- Initial release of Next.js + Node.js Monorepo Base Template
- Production-ready base repository for rapid application development
- Complete development, testing, and deployment infrastructure

[unreleased]: https://github.com/your-org/next-node-app-base/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/next-node-app-base/releases/tag/v1.0.0
