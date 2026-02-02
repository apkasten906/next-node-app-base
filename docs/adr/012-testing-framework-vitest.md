# ADR 012: Use Vitest as the Primary Test Runner

Status: Accepted
Date: 2026-02-02

## Context

This repository is a TypeScript-first monorepo (pnpm workspaces + Turborepo) with:

- Backend: Node.js + Express + TypeScript + DI (TSyringe) + Prisma
- Frontend: Next.js
- E2E: Playwright
- BDD: Cucumber

The project needs a fast, developer-friendly unit/integration test runner that:

- Works well with modern TypeScript projects and Node.js runtime semantics
- Integrates cleanly into a monorepo and CI
- Provides good DX (watch mode, filtering, strong editor tooling)
- Supports mocking and test utilities in a straightforward way
- Keeps configuration complexity low

During repo evolution, some documentation referenced Jest, but the backend implementation and scripts already use Vitest. This ADR formalizes the decision, clarifies scope, and documents the rationale and trade-offs.

## Decision

We standardize on **Vitest** as the primary test runner for unit/integration tests in this repo (starting with the backend).

- Backend tests are executed with Vitest and configured via `apps/backend/vitest.config.ts`.
- Test doubles and mocking use Vitest primitives (`vi.fn()`, `vi.mock()`, etc.).
- Coverage is collected using Vitest coverage tooling (c8 provider).

This ADR does not change the role of other test layers:

- **Playwright** remains the E2E test framework.
- **Cucumber** remains the BDD framework for feature-level executable specifications.

## Consequences

### Positive

- Faster feedback loops (watch mode, test filtering, generally faster startup)
- Strong TypeScript ergonomics with fewer configuration “escape hatches”
- Simple, cohesive tooling story (Vitest runner + `vi` mocking)
- Better alignment between implementation and documentation/editor recommendations

### Negative

- Ecosystem differences vs Jest (some Jest-specific tooling/plugins/examples need translation)
- Team members familiar with Jest may need minor re-learning (e.g., `jest.fn()` → `vi.fn()`)
- If a third-party library only documents Jest patterns, we may need to adapt examples

### Neutral

- Vitest is already the de-facto runner in the backend; this ADR mainly formalizes and documents it
- Frontend unit test strategy can remain “future scope” unless/until frontend unit tests are introduced

## Alternatives Considered

### Alternative 1: Jest

**Pros:**

- Very mature ecosystem and widespread familiarity
- Large plugin/integration landscape

**Cons:**

- More configuration overhead in modern TypeScript/ESM setups
- Typically slower feedback loop for large test suites

**Why rejected:** We prefer simpler configuration and faster feedback for a TypeScript-first monorepo, and the backend is already using Vitest.

### Alternative 2: Node.js built-in test runner (`node:test`)

**Pros:**

- No external dependency
- Very close to the runtime; simple mental model

**Cons:**

- Smaller ecosystem and fewer ergonomics/features than Vitest for common workflows (mocking, rich watch UX, tooling)

**Why rejected:** DX and ecosystem are not as strong for this repo’s needs today.

### Alternative 3: Mocha + Chai (or similar)

**Pros:**

- Flexible, long-standing ecosystem

**Cons:**

- Composability often becomes configuration sprawl in TS monorepos
- Less “batteries included” compared to Vitest

**Why rejected:** Prefer a single cohesive tool with good defaults and modern TS ergonomics.

## Related

- Backend Vitest configuration: `apps/backend/vitest.config.ts`
- Backend test setup file: `apps/backend/test/setup.ts`
- ADR 001 (Node.js 25 baseline): `docs/adr/001-node-js-25-native-typescript.md`
- ADR 006 (TypeScript strict mode): `docs/adr/006-typescript-strict-mode.md`
- Planning prompt mentioning Vitest setup: `.github/prompts/plan-nextNodeAppBase.prompt.md`
