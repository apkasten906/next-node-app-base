# ADR 014: E2E Personas — JSON Overrides over Admin UI

Status: Accepted
Date: 2026-02-06

## Context

This repository is intended to be a forkable base template with deterministic, reliable E2E tests.

E2E tests often require a set of seeded user accounts (“personas”) to cover:

- normal user flows
- admin-only flows
- future role/permission variants

As teams fork this template and build product-specific features, they will frequently need to add or adjust personas.

We need a workflow that is:

- deterministic (CI and local runs behave the same)
- easy to customize in forks
- simple to review in PRs
- low maintenance for the template (avoid shipping a mini product)

A proposed alternative was a full admin UI backed by the database for creating/editing personas.

## Decision

We keep persona management lightweight and developer-centric:

- Personas remain a fixture concept, not a product feature.
- The template provides:
  - a canonical persona registry (defaults in code)
  - an optional JSON override file, enabled via `E2E_PERSONAS_FILE`
- Playwright global setup seeds personas by sending the current persona set to `POST /api/e2e/seed`.
- The backend seed endpoint is dev-only (non-production) and token-protected.

### JSON override format

A personas file may be either:

- an array of persona objects, or
- an object `{ "personas": [...] }`

Each persona contains:

- `key`: stable identifier used by tests
- `email`, `name`, `password`
- `role`: `USER` or `ADMIN`

An example file is provided in `apps/frontend/e2e/fixtures/personas.example.json`.

## Consequences

### Positive

- Forks can add personas without editing TypeScript by providing a JSON file.
- Personas remain deterministic and versionable (file-based, diff-friendly).
- No additional UI/auth surface area is introduced into the template.
- Keeps scope aligned with “shell template” goals.

### Negative

- There is no GUI for editing personas; changes are made in a file.
- Some teams may still want richer fixture management for complex domains (they can add it in their fork).

### Neutral

- The JSON override is intentionally minimal; it covers “seeded accounts” well but is not a general fixture system.
- If a fork later needs advanced fixture tooling, it can layer it on without breaking the template’s defaults.

## Alternatives Considered

### Alternative 1: Full admin UI + DB-backed persona CRUD

**Pros:**

- Non-developers could edit personas
- Persona management could be extended into a general fixture system

**Cons:**

- Requires schema/migrations, CRUD endpoints, UI, and additional auth/authorization
- Increases surface area and maintenance burden for the template
- Higher risk of drift and non-determinism without additional reset/versioning mechanisms

**Why rejected:** Too heavy for a forkable template; fixtures should stay deterministic and code/JSON-managed.

### Alternative 2: TypeScript-only personas (no JSON option)

**Pros:**

- Strong typing and IDE support
- Fully reviewable in git

**Cons:**

- Forks must edit TypeScript to add personas

**Why rejected:** JSON override lowers friction for forks and supports simpler customization workflows.

## Related

- apps/frontend/docs/E2E_TESTING.md
- docs/adr/012-testing-framework-vitest.md
