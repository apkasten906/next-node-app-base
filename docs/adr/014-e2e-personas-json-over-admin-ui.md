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

### Negative

### Neutral

## Tests

- Unit tests were added to validate the frontend persona registry and default seed payload. See `apps/frontend/test/personas.spec.ts` for Vitest tests that assert persona shape (email, password) and the default seed payload structure. These tests are intended to be lightweight smoke checks for the persona parsing/validation logic and should be run by CI.

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
