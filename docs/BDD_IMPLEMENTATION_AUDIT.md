# BDD Implementation Audit

This repo uses Cucumber feature files as the system of record for:

1. requirements (what we intend to build)
2. implementation status (what is actually implemented and enforced)

## Status tags

- `@wip`: requirement exists but is not enforced by the default CI gate
- `@ready`: deterministic and enforced by the default CI gate
- `@manual`: validated manually
- `@skip`: temporarily disabled

## Implementation identifiers (`@impl_*`)

To make AI-agent work auditable and easy to trace, `@ready` scenarios that prove an implemented capability should also carry a stable `@impl_*` tag.

This provides:

- deterministic mapping from plan items → governed scenarios
- a stable anchor for automation (reports, dashboards, agent prompts)

## How to generate the audit report

- Status totals: `node scripts/bdd-status.js --format json`
- Implementation mapping: `node scripts/bdd-impl-audit.js --format json`

### Enforce `@impl_*` coverage for `@ready`

To prevent untraceable “ready” scenarios from slipping in, you can have the audit fail when any `@ready` scenario is missing an `@impl_*` tag:

- Report only (does not fail): `node scripts/bdd-impl-audit.js --check-ready-impl`
- Fail when missing: `node scripts/bdd-impl-audit.js --fail-on-missing-ready-impl`

## Current mapping (high-level)

These `@impl_*` tags currently exist in features:

- `@impl_monorepo_foundation` (monorepo structure)
- `@impl_code_formatting_prettier` (formatting config)
- `@impl_husky_commitlint_hooks` (Husky hooks + commitlint gate)
- `@impl_pnpm_dependency_management` (pnpm workspace deps)
- `@impl_unified_workspace_scripts` (unified scripts)

- `@impl_authz_own_audit` (owner-based authorization + audit logging)
- `@impl_secrets_management_env` (environment-based secrets management)
- `@impl_test_resilience_external_services` (tests resilient when external services disabled)

- `@impl_webhooks` (webhook publishing + signature verification)
- `@impl_notifications` (notification send + retry + health)
- `@impl_storage_filename_sanitization` (filename sanitization)

- `@impl_publish_flow` (registry-agnostic publish wiring)
- `@impl_prisma7_migration_workaround` (Prisma 7 migration workaround wired)

- `@impl_workflow_lint_actionlint` (workflow linting wired)
- `@impl_docker_multistage_build` (multi-stage Docker build)
- `@impl_verdaccio_k8s_manifests` (Verdaccio manifests)
- `@impl_docker_compose_dev` (Docker Compose dev env)

- `@impl_queue_system` (BullMQ queue system wiring)
- `@impl_websocket_support` (backend websocket wiring)

- `@impl_frontend_i18n` (frontend i18n)
- `@impl_frontend_error_handling` (frontend error handling + error boundaries)
- `@impl_frontend_websocket_hook` (frontend websocket hook wiring)

## Notes

- Not all implemented code is necessarily governed by `@ready` scenarios yet. The goal is to steadily expand `@impl_*` coverage until every implemented capability has a deterministic `@ready` scenario proving it.
- When adding new `@ready` scenarios for implemented capabilities, add a new `@impl_*` tag or reuse an existing one if it is the same capability.
