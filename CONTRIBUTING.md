# Contributing to Next.js + Node.js Monorepo Base Template

Thank you for your interest in contributing! We welcome contributions from the community.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to <conduct@example.com>.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if relevant**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any similar features in other projects if applicable**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Set up your development environment** using Dev Containers (recommended) or local setup
3. **Make your changes** following our coding standards
4. **Add tests** for your changes
5. **Ensure all tests pass** (`pnpm test`)
6. **Update documentation** if needed
7. **Commit your changes** using conventional commits
8. **Push to your fork** and submit a pull request

## Development Setup

### Using Dev Containers (Recommended)

1. Install [VSCode](https://code.visualstudio.com/) and [Docker](https://www.docker.com/)
2. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Clone your fork: `git clone https://github.com/YOUR_USERNAME/next-node-app-base.git`
4. Open in VSCode and click "Reopen in Container"
5. Wait for the container to build and dependencies to install

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/next-node-app-base.git
cd next-node-app-base

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.development

# Start development services
docker-compose up -d

# Run migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Follow strict TypeScript configuration
- Avoid `any` types unless absolutely necessary
- Prefer interfaces over types for object shapes

### Code Style

- We use Prettier for code formatting
- We use ESLint for code linting
- Run `pnpm format` before committing
- Run `pnpm lint:fix` to fix linting issues

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI configuration changes
- `chore`: Other changes
- `security`: Security improvements

**Examples:**

```git
feat(backend): add webhook management system

Implement webhook registration, delivery queue, and retry logic
with HMAC signature verification.

Closes #123
```

```git
fix(frontend): resolve memory leak in WebSocket connection

The WebSocket connection was not being properly cleaned up on
component unmount, causing memory leaks.

Fixes #456
```

### Testing

- Write unit tests for all new features
- Write integration tests for API endpoints
- Write E2E tests for critical user flows
- Maintain test coverage above 80%
- Run tests before submitting PR: `pnpm test`

## Git hooks

This repository uses Husky to run local Git hooks that help keep the codebase healthy.

- `pre-commit`: runs `lint-staged` (Prettier + ESLint) and a quick TypeScript check for changed files.
- `commit-msg`: runs `commitlint` to enforce conventional commit messages.
- `pre-push`: runs a fast backend test gate using `scripts/run-backend-tests-ci.js --quick` which sets `TEST_EXTERNAL_SERVICES=false` and `REDIS_MOCK=true` so tests run quickly and deterministically locally.

If a hook fails locally, fix the reported issues and re-run the hook commands manually (or re-commit). CI will run the same checks and will block merges on failures.

### Documentation

- Update README.md if you change functionality
- Add JSDoc comments for public APIs
- Update relevant documentation in `docs/`
- Include examples for new features

## Project Structure

```txt
next-node-app-base/
├── apps/
│   ├── frontend/          # Next.js app
│   └── backend/           # Node.js API
├── packages/              # Shared packages
│   ├── types/
│   ├── utils/
│   ├── constants/
│   └── config/
├── kubernetes/            # K8s + Istio configs
├── docs/                  # Documentation
└── .devcontainer/         # Dev Container config
```

## Pull Request Process

1. **Update the README.md** with details of changes if applicable
2. **Update documentation** in the `docs/` directory
3. **Add tests** for new functionality
4. **Ensure CI passes** (lint, type check, tests, security scans)
5. **Request review** from maintainers
6. **Address review feedback** promptly
7. **Squash commits** if requested before merging

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
- [ ] Conventional commits used
- [ ] Breaking changes documented

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md). **Do not create a public GitHub issue.**

## Community

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussions
- **Slack**: [Join our Slack workspace](#)
- **Email**: <contribute@example.com>

## Recognition

Contributors will be recognized in:

- README.md Contributors section
- Release notes
- GitHub contributors page

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to reach out:

- Create a [GitHub Discussion](https://github.com/your-org/next-node-app-base/discussions)
- Email us at <contribute@example.com>
- Join our [Slack workspace](#)

---

Thank you for contributing! 🎉
