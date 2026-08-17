# ADR 022: Provider-Neutral Feature Flag Management

Status: Accepted
Date: 2026-08-17
Authors: apkasten906

## Context

Phase 11 introduces feature management to the base repository. The template needs deterministic local evaluation, an administrative CRUD boundary, and a frontend consumption pattern without coupling adopters to a hosted feature-flag provider or exposing management credentials to the browser.

The first contract must also be small enough to implement and test reliably. Multivariate flags, percentage rollouts, experimentation analytics, and provider-specific synchronization would enlarge the contract before the base boolean use case has stabilized.

## Decision

Define a provider-neutral `IFeatureFlagService` in `@repo/types` and implement the first slice with boolean flags.

- A flag has a stable string key, an enabled state, a default boolean value, optional descriptive metadata, and ordered targeting rules.
- Evaluation accepts an optional user identifier and typed attributes. Each rule declares a comparison operand and the boolean value it serves. Rules are evaluated in declared order; the first matching rule wins.
- Evaluation returns both the boolean value and a reason so callers and tests can distinguish disabled, default, targeting-match, and missing-flag outcomes.
- Callers may supply a fallback for a missing flag. Implementations must not silently treat storage or provider failures as a missing flag.
- CRUD operations remain on the service boundary. HTTP authorization, validation, persistence, caching, and audit logging belong to adapters and application services rather than the shared contract.
- Backend code is authoritative for evaluation. React hooks consume a read-only application/API boundary and never receive management credentials or import a provider SDK directly.

The initial rule operators are equality and membership checks (`equals`, `not_equals`, `in`, and `not_in`). Percentage rollouts, multivariate values, prerequisites, scheduling, and experimentation are deferred until a concrete adopter requirement proves their shared shape.

## Consequences

- **Positive:** backend, frontend gateways, and future provider adapters share one portable contract.
- **Positive:** deterministic evaluation reasons make behavior observable and straightforward to test.
- **Positive:** the initial implementation can use local persistence while leaving room for hosted-provider adapters.
- **Negative:** the first slice supports only boolean flags and deliberately omits common advanced rollout features.
- **Negative:** changing targeting semantics after adoption will require contract versioning and migration.
- **Neutral:** API DTO validation and persistence models may resemble these contracts but remain separate at trust and storage boundaries.
