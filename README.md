# Next.js + Node.js Monorepo Base Template

A production-ready base repository for rapidly starting new web applications with a Next.js frontend, Node.js backend, comprehensive testing, and DevOps infrastructure.

## 🌟 Features

### Core Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL with read replica support
- **Cache**: Multi-level caching (In-Memory L1, Redis L2, CDN L3)
- **Service Mesh**: Istio for mTLS, traffic management, and observability

### Security & Authentication (OWASP Compliant)

- OAuth 2.0 + OpenID Connect (OIDC) via Passport.js
- NextAuth.js for frontend authentication
- RBAC/ABAC authorization
- Istio mTLS for service-to-service communication
- Comprehensive security headers (Helmet.js)
- OWASP security governance and standards

### Infrastructure & Services

- **Message Queue**: Bull/BullMQ for background jobs
- **WebSockets**: Socket.io for real-time communication
- **File Storage**: DI pattern supporting Local/S3/Azure/GCP
- **Notifications**: Email (SendGrid/SES), SMS (Twilio), Push (FCM)
- **Search**: Elasticsearch, Algolia, or MeiliSearch
- **Payments**: Stripe, PayPal integration
- **Analytics**: Mixpanel, Segment integration
- **Secrets**: HashiCorp Vault or cloud provider integration
- **Webhooks**: Complete webhook management system

### Testing & Quality

- **Unit Tests**: Vitest with coverage reporting
- **BDD Tests**: Cucumber with Gherkin syntax
- **E2E Tests**: Playwright with Page Object Model
- **Contract Tests**: Pact for consumer-driven contracts
- **API Mocking**: Mock Service Worker (MSW)
- **Security Tests**: OWASP ZAP automated scanning
- **Load Tests**: k6 for performance testing

### Observability

- **Distributed Tracing**: Istio + Jaeger
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack or Loki + Grafana
- **APM**: Datadog or New Relic integration
- **Service Mesh Visualization**: Kiali
- **Error Tracking**: Sentry

### DevOps & Deployment

- **Containers**: Docker with multi-stage builds
- **Orchestration**: Kubernetes with Istio service mesh
- **CI/CD**: GitHub Actions (lint, test, security scan, deploy)
- **Deployment Strategies**: Blue-Green, Canary, A/B testing with Istio
- **Dev Containers**: VSCode devcontainer for consistent environments
- **Local Development**: Docker Compose

### Internationalization

- Multi-language support (en, es, fr, de) with next-i18next
- RTL language support
- Localized date/time/number/currency formatting

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: use `.nvmrc`)
- pnpm 8+
- Docker & Docker Compose
- VSCode (recommended for Dev Containers)

### Option 1: Dev Container (Recommended)

1. Install [VSCode](https://code.visualstudio.com/) and [Docker](https://www.docker.com/)
2. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Clone the repository
4. Open in VSCode and click "Reopen in Container"
5. Wait for the container to build and dependencies to install
6. Start developing! 🎉

### Option 2: Local Setup

```bash
# Clone the repository
git clone <repository-url>
cd next-node-app-base

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.development
# Edit .env.development with your configuration

# Start development services (PostgreSQL, Redis, etc.)
docker-compose up -d

# Run database migrations
cd apps/backend
pnpm prisma migrate dev

# Seed the database
pnpm prisma db seed

# Start the development servers
cd ../..
pnpm dev
```

## 📁 Project Structure

```
next-node-app-base/
├── .devcontainer/          # Dev Container configuration
├── apps/
│   ├── frontend/           # Next.js application
│   └── backend/            # Node.js API
├── packages/               # Shared packages
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Common utilities
│   ├── constants/          # Shared constants
│   └── config/             # Shared configurations
├── kubernetes/             # Kubernetes + Istio manifests
├── docker/                 # Docker configurations
├── docs/                   # Documentation
└── load-tests/             # k6 load tests
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all apps in development mode
pnpm dev:frontend           # Start only frontend
pnpm dev:backend            # Start only backend

# Building
pnpm build                  # Build all apps
pnpm build:frontend         # Build frontend
pnpm build:backend          # Build backend

# Testing
pnpm test                   # Run all tests
pnpm test:unit              # Run unit tests
pnpm test:integration       # Run integration tests
pnpm test:e2e               # Run E2E tests
pnpm test:contract          # Run contract tests
pnpm test:security          # Run security tests
pnpm test:load              # Run load tests

# Code Quality
pnpm lint                   # Lint all code
pnpm lint:fix               # Fix linting issues
pnpm format                 # Format code with Prettier
pnpm typecheck              # Run TypeScript type checking

# Database
pnpm db:migrate             # Run database migrations
pnpm db:seed                # Seed database
pnpm db:studio              # Open Prisma Studio
pnpm db:reset               # Reset database
```

## 🔒 Security

This project follows OWASP security standards and best practices:

- **OWASP Top 10**: Comprehensive coverage of all major vulnerabilities
- **Security Headers**: Configured via Helmet.js and Istio
- **Authentication**: OAuth 2.0/OIDC with MFA support
- **Authorization**: RBAC/ABAC with fine-grained permissions
- **Data Protection**: Encryption at rest and in transit (TLS 1.3 + Istio mTLS)
- **Secret Management**: HashiCorp Vault or cloud provider integration
- **Dependency Scanning**: Automated with OWASP Dependency-Check and Snyk
- **Security Testing**: OWASP ZAP automated scans in CI/CD

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## 📚 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

- [Architecture Overview](docs/architecture/overview.md)
- [Security Architecture](docs/architecture/security-architecture.md)
- [Service Mesh (Istio)](docs/architecture/service-mesh.md)
- [API Documentation](docs/api/openapi.yaml)
- [HATEOAS Guide](docs/api/hateoas-guide.md)
- [Development Setup](docs/development/local-setup.md)
- [Dev Containers](docs/development/dev-containers.md)
- [Deployment Guide](docs/deployment.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🌍 Internationalization

The application supports multiple languages:

- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)

See [docs/i18n/translation-guide.md](docs/i18n/translation-guide.md) for adding new languages.

## 🚢 Deployment

### Deployment Strategies

This template supports multiple deployment strategies via Istio:

- **Blue-Green**: Zero-downtime deployments with instant rollback
- **Canary**: Gradual traffic shifting (5% → 25% → 50% → 100%)
- **A/B Testing**: User segment-based routing

See [docs/deployment/](docs/deployment/) for detailed guides.

### Environments

- **Development**: Local development with Docker Compose
- **Staging**: Kubernetes cluster with Istio (pre-production)
- **Production**: Kubernetes cluster with Istio (high availability)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow
- Pull request process
- Coding standards
- Commit message conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with amazing open-source technologies:

- [Next.js](https://nextjs.org/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [Turborepo](https://turbo.build/)
- [Istio](https://istio.io/)
- [Kubernetes](https://kubernetes.io/)
- And many more...

## 📞 Support

- 📧 Email: support@example.com
- 💬 Slack: [Join our community](#)
- 📖 Wiki: [Project Wiki](#)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/next-node-app-base/issues)

---

**⭐ If this template helps you, please give it a star!**
