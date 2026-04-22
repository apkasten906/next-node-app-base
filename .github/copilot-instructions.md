# Copilot Repository Instructions

## Design Principles

All code in this repository must follow the **SOLID** principles:

- **S — Single Responsibility**: Every module, class, or function should have one reason to change. Split concerns aggressively: UI, application logic, server gateways, and data access must not bleed into each other.
- **O — Open/Closed**: Prefer extension over modification. Favour composition, strategy objects, and configuration over patching existing implementations.
- **L — Liskov Substitution**: Subtypes must be substitutable for their base types. Do not override behaviour in a way that violates the contract of the parent type or interface.
- **I — Interface Segregation**: Prefer narrow, focused interfaces over large general-purpose ones. Callers should not depend on methods they do not use.
- **D — Dependency Inversion**: Depend on abstractions, not concretions. High-level modules (application services, hooks) must not import directly from low-level modules (HTTP clients, ORM queries) — mediate through interfaces or injectable adapters.

When reviewing, generating, or modifying code, **always validate against these principles** and flag (or refuse to introduce) violations.

## Architecture Boundaries

This is a pnpm + Turborepo monorepo with strict layer boundaries:

```
UI components / pages
  └─ hooks / view-models
       └─ application services
            └─ API clients / server gateways
                 └─ HTTP / database / external services
```

- `src/server/**` modules are **server-only** — every file must carry `import 'server-only'`.
- UI files (`components/`, `app/**/page.tsx`) must **never** call `fetch` directly — use the designated API client layer.
- Shared types belong in `packages/types` or `lib/contracts`, not in route-level `app/` directories.
