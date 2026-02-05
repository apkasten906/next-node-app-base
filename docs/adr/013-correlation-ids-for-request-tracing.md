# ADR 013: Correlation IDs for Request Tracing

Status: Accepted
Date: 2026-02-05

## Context

This repository is a full-stack monorepo:

- Frontend: Next.js (App Router)
- Backend: Express API
- Tests: Playwright E2E, Vitest unit/integration

We need a consistent, low-friction way to trace a single logical request across:

- browser-initiated calls (client-side fetch)
- Next.js middleware + Server Components (SSR)
- backend API handlers and structured logs

Without a standard correlation-id approach, troubleshooting becomes difficult:

- logs can’t be reliably tied back to a user action or HTTP request
- developers create ad-hoc “request id” logic with inconsistent header names
- request-scoped identifiers are easily dropped in SSR or between services

We also want to avoid common footguns and quality issues:

- accepting arbitrary header values can lead to header/log abuse
- serializing unknown values (e.g., `JSON.stringify(undefined)`) can yield unexpected `undefined`
- interpolating unknown values can lead to unstable output like `[object Object]`

## Decision

We standardize on a request correlation id propagated end-to-end using a conservative, validated header.

### Header

- Canonical header: `X-Correlation-ID`
- Lowercase variant: `x-correlation-id` (commonly observed in Node/Next request header access)

The correlation id value is validated using a conservative allowlist and bounded length.

### Backend (Express)

We add an Express middleware that:

- reads inbound `X-Correlation-ID` when present and valid
- otherwise generates a new correlation id
- attaches it to `req.correlationId`
- echoes it back on every response as `X-Correlation-ID`

Additionally, the middleware runs downstream work inside an AsyncLocalStorage context so correlationId is available to all async work without requiring explicit parameter passing.

### Backend logging (Winston)

We configure the logging layer so that, when a log entry does not explicitly specify a correlation id, the logger injects the correlation id from AsyncLocalStorage request context.

Correlation id values are normalized before being placed in log output:

- empty/whitespace values are omitted
- primitives are coerced safely
- objects are rendered using JSON when possible, and `util.inspect` as a fallback
- the rendered string is trimmed/clamped to a safe maximum

### Frontend (Next.js)

We add a Next.js middleware that:

- ensures each incoming request has a correlation id
- injects `x-correlation-id` into the forwarded request headers (so Server Components / SSR can read it)
- echoes `X-Correlation-ID` on the response

For browser-side requests, we provide helper utilities used by the API client and other fetches:

- inject the header on outbound requests
- capture the response header and store it (session-scoped)

## Consequences

### Positive

- Consistent request tracing across browser ↔ SSR ↔ backend
- Low boilerplate: backend logs get correlation id without “child logger everywhere”
- Safer handling of untrusted inputs through validation and normalization
- Better debugging: correlation id is echoed on responses for easy inspection

### Negative

- AsyncLocalStorage adds a runtime mechanism that must be used carefully (e.g., ensure middleware runs early)
- Validation is intentionally conservative; some externally-provided formats may be rejected and replaced
- This is not full distributed tracing (no spans, no baggage); correlation id is a lightweight step

### Neutral

- The approach is compatible with future adoption of OpenTelemetry; correlation id can be bridged/mapped
- Some internal code may still choose to pass correlation id explicitly in special cases

## Alternatives Considered

### Alternative 1: No correlation id / ad-hoc request IDs

**Pros:**

- No extra middleware or shared utilities

**Cons:**

- Hard to debug production issues and cross-layer failures
- Inconsistent naming/format across teams and features

**Why rejected:** Tracing and observability are core quality concerns for this template.

### Alternative 2: Accept any inbound correlation id value

**Pros:**

- Maximum compatibility with upstream callers

**Cons:**

- Increased risk of header/log abuse (very long values, special characters)

**Why rejected:** We prefer a conservative allowlist and bounded length for safety.

### Alternative 3: Use W3C Trace Context (`traceparent`) / OpenTelemetry end-to-end

**Pros:**

- Full distributed tracing and standard interoperability

**Cons:**

- Higher integration complexity and operational overhead for a base template

**Why rejected:** Out of scope for the current quality gates; correlation id provides immediate value with lower cost.

### Alternative 4: Require explicit child loggers everywhere

**Pros:**

- No AsyncLocalStorage dependency

**Cons:**

- Boilerplate and easy to forget; correlation id frequently gets dropped

**Why rejected:** We want correlation id presence by default without pervasive callsite changes.

## Related

- Backend middleware: `apps/backend/src/middleware/correlation-id.middleware.ts`
- Backend request context: `apps/backend/src/context/request-context.ts`
- Backend logger injection/normalization: `apps/backend/src/services/logger.service.ts`
- Frontend middleware: `apps/frontend/middleware.ts`
- Frontend policy/helpers: `apps/frontend/lib/correlation-id-policy.ts`, `apps/frontend/lib/correlation-id.ts`
- Correlation ID guide: `docs/CORRELATION_ID.md`
