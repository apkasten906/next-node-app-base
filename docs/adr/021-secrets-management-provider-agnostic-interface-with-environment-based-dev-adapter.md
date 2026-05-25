# ADR 021: Secrets management — provider-agnostic interface with environment-based dev adapter

Status: Accepted
Date: 2026-05-22
Authors: apkasten906

## Context

Applications built on this platform require access to runtime secrets (JWT signing keys, database credentials, API tokens, encryption keys, etc.). The following constraints shape the decision:

1. **This is a platform template, not a deployed product.** The platform has no opinion about which cloud or on-premises infrastructure a consumer will use; imposing a specific secrets backend (e.g. HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) would force infra choices on downstream applications.
2. **DI-first architecture.** The platform uses TSyringe throughout; any service dependency can be swapped at the container-registration site without touching business logic.
3. **Developer experience matters.** Contributors need to run locally without provisioning an external secrets service. `process.env` is universally available and sufficient for local development and CI.
4. **Security standards.** ADR-005 (OWASP security standards) requires that secrets are never hard-coded or committed to source control. The implementation must make this easy to enforce at the point of use.

## Decision

Define a stable `ISecretsManager` interface in `@repo/types` and ship exactly one concrete implementation in the platform itself: `EnvironmentSecretsManager`.

### Interface (`packages/types/src/interfaces/secrets.ts`)

The interface exposes `getSecret`, `setSecret`, `deleteSecret`, `listSecrets`, `rotateSecret`, and `getSecretMetadata`. It is intentionally minimal: it covers the operations common to every major secrets backend without leaking provider-specific concepts (paths, namespaces, engines, ARNs).

### Platform adapter: `EnvironmentSecretsManager`

- Reads secrets from `process.env` on first access and caches them in a private `Map`.
- Supports `setSecret` and `rotateSecret` for in-process mutation (useful in tests).
- Is registered as the `ISecretsManager` binding in the DI container for local development and CI environments.
- Every method carries a comment noting the production replacement pattern.

### Consumer responsibility

Applications that derive from this platform **must** replace `EnvironmentSecretsManager` with a production adapter appropriate to their infrastructure. They do this by registering a different implementation against `ISecretsManager` in their DI container bootstrap — no changes to any service that depends on `ISecretsManager` are required.

Suggested production adapters (not provided by this platform):

| Infrastructure      | Adapter approach                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kubernetes          | Mount a Kubernetes Secret as environment variables or a file; optionally use the External Secrets Operator to sync from an external store into Kubernetes Secrets. |
| HashiCorp Vault     | Vault Agent Injector (sidecar) writes secrets to a tmpfs file; adapter reads from file. Or use the Vault Node.js SDK directly.                                     |
| AWS Secrets Manager | `@aws-sdk/client-secrets-manager`; adapter calls `GetSecretValueCommand`.                                                                                          |
| Azure Key Vault     | `@azure/keyvault-secrets`; adapter calls `client.getSecret()`.                                                                                                     |
| GCP Secret Manager  | `@google-cloud/secret-manager`; adapter calls `accessSecretVersion`.                                                                                               |

## Consequences

### Positive

- Consumer applications can adopt any secrets backend without forking platform code.
- Local development and CI require zero external infrastructure.
- All services that depend on secrets are written against a stable, testable interface; they can be unit-tested with a mock or in-memory implementation.
- Explicitly documents the boundary between "platform default" and "production responsibility", preventing the stub from being mistaken for a production-ready implementation.

### Negative

- The platform does not ship a ready-to-use production adapter; consumer teams must implement or integrate one. This is a deliberate trade-off, not a gap.
- `EnvironmentSecretsManager` exposes a `setSecret` mutation path in-process; secrets written this way are ephemeral and will not survive a restart. Applications must not rely on this for persistence.

### Neutral

- Secret rotation (`rotateSecret`) is defined in the interface but has no automated policy engine in the platform. Consumers that need automated rotation must implement it at the adapter layer or use their provider's built-in rotation support.
- The interface uses string values throughout. Structured secrets (e.g. JSON blobs) must be serialised/deserialised by the caller.

## Alternatives Considered

### Alternative 1: Ship a Vault adapter as the default

**Pros:** Production-ready for teams already running Vault.

**Cons:** Introduces a hard dependency on HashiCorp Vault (and its Node.js SDK) into the platform; teams on AWS or Azure would carry dead weight. Contradicts the platform's infrastructure-neutrality goal.

**Why rejected:** Premature coupling to a specific infrastructure choice.

### Alternative 2: Use `dotenv` / secret file loading as the production path

**Pros:** Trivial to implement; no SDK dependencies.

**Cons:** `.env` files in production are an anti-pattern; they are difficult to audit, easy to leak via image layers or logs, and do not support rotation or versioning.

**Why rejected:** Does not meet OWASP ADR-005 standards for production secret handling.

### Alternative 3: Integrate External Secrets Operator manifests into the platform's Kubernetes stack

**Pros:** Closes the Kubernetes production gap for the most common deployment target.

**Cons:** ESO requires a source-of-truth external store (Vault, AWS SM, etc.) — choosing it still forces an infra choice. Also couples the platform Kubernetes manifests to a specific CRD set.

**Why rejected:** The ESO manifest set would be the right addition in a _derived application's_ Kubernetes layer, not in the platform template itself. The platform documents ESO as a recommended pattern rather than mandating it.

- Trade-off 2

## Alternatives Considered

### Alternative 1: [Name]

**Pros:**

- Pro 1
- Pro 2

**Cons:**

- Con 1
- Con 2

**Why rejected:** Reason

### Alternative 2: [Name]

**Pros:**

- Pro 1
- Pro 2

**Cons:**

- Con 1
- Con 2

**Why rejected:** Reason

## Related

- Links to related ADRs
- Links to relevant documentation
- Links to related issues/PRs
