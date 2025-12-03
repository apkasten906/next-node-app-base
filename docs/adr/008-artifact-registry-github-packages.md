# ADR 0008: Artifact registry — GitHub Packages (default), registry-agnostic publish flow

Status: Accepted

Date: 2025-11-29

## Context

This monorepo contains multiple workspace packages (apps/_, packages/_). We need a reliable, secure, and easy-to-use artifact registry for publishing private packages and for CI to pull artifacts and images. The team is not running enterprise infrastructure today and prefers minimal operational burden.

We also run applications inside a service mesh and want the ability to swap the artifact registry (for example, to route traffic through an internal proxy/registry inside the mesh) without code changes.

## Decision

Adopt GitHub Packages as the default artifact registry for this repository and implement a registry-agnostic publish workflow that accepts a single `REGISTRY_URL` and token via environment variables (e.g. `NPM_AUTH_TOKEN` / `NPM_TOKEN`).

The publish pipeline and developer instructions will default to GitHub Packages (scoped packages, using `GITHUB_TOKEN`) but will allow pointing `REGISTRY_URL` to a custom internal registry (Verdaccio, Artifactory, Nexus), which can be exposed and secured via the service mesh.

## Alternatives Considered

- JFrog Artifactory: full-featured enterprise registry supporting many formats (npm, docker, helm, etc.). Pros: features, replication, enterprise support. Cons: hosting/ops cost and complexity.
- Sonatype Nexus: similar to Artifactory; pros/cons similar.
- Verdaccio (self-hosted): lightweight local registry, easy to run in-cluster. Pros: minimal ops, good for private registries. Cons: fewer enterprise features, storage and backup considerations.
- GitHub Packages: built-in to our GitHub-hosted workflow, minimal ops, good for npm packages and quick onboarding. Cons: requires scoped packages and GitHub plan considerations for storage/usage.

## Consequences

- Scoped packages: Publishing to GitHub Packages requires package names to be scoped (for example `@apkasten906/my-lib`). We will update `packages/*` to use scoped names when they are intended for publishing.
- CI changes: The CI publish workflow will write `.npmrc` with credentials (using `GITHUB_TOKEN` or `NPM_AUTH_TOKEN`) and run a registry-agnostic `pnpm publish --registry ${REGISTRY_URL}` flow.
- Service mesh friendliness: To switch to an internal registry routed through the mesh, set `REGISTRY_URL` in CI (for example to `http://npm-registry.svc.cluster.local:4873`) and set `NPM_AUTH_TOKEN` (or use a more secure mechanism). The publish flow needs no code changes.
- Security: Tokens must be stored in Secrets (GitHub Secrets for Actions) and rotated periodically.

## Rollout / Migration Plan

1. Create registry-agnostic publish script and CI workflow that defaults to GitHub Packages.
2. Add `.npmrc.template` and docs explaining local developer setup and scoping requirements.
3. Update relevant `packages/*/package.json` names to be scoped where packages are intended to be published.
4. Test publish flow on an internal tag in a fork or protected branch; verify ability to switch `REGISTRY_URL` to an internal Verdaccio instance running inside the mesh.

## Revert / Rollback Plan

If GitHub Packages or the workflow causes an issue, revert CI changes and publish scripts in the repo; alternative is to point `REGISTRY_URL` at a different (internal) registry without code changes.

## Authors

- apkasten906 (decision maker)
