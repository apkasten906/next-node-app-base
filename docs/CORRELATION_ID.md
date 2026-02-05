# Correlation IDs

This repo uses a correlation ID to trace a single logical request across:

- browser/client fetches
- Next.js middleware + Server Components (SSR)
- backend Express routes + structured logs

## Header

- Canonical header: `X-Correlation-ID`
- Lowercase variant: `x-correlation-id`

Values are validated using a conservative allowlist and bounded length to avoid header/log abuse.

## Backend behavior (Express)

Implemented in:

- `apps/backend/src/middleware/correlation-id.middleware.ts`
- `apps/backend/src/context/request-context.ts`

Rules:

- If an inbound `X-Correlation-ID` is present and valid, it is accepted.
- Otherwise a new correlation id is generated.
- The resolved id is:
  - attached to `req.correlationId`
  - echoed back on the response as `X-Correlation-ID`
  - stored in AsyncLocalStorage so downstream async work can access it

### CORS

The backend CORS configuration allows and exposes `X-Correlation-ID` so browsers can send and read the header.

## Logging behavior (Winston)

Implemented in:

- `apps/backend/src/services/logger.service.ts`

Rules:

- Logs automatically include `correlationId` from request context when not explicitly provided.
- `correlationId` values are normalized before being rendered:
  - empty/whitespace values are omitted
  - primitives are safely coerced
  - objects are rendered via JSON when possible, otherwise `util.inspect` fallback
  - output is trimmed/clamped to a safe maximum

## Frontend behavior (Next.js)

### Edge middleware

Implemented in:

- `apps/frontend/middleware.ts`
- `apps/frontend/lib/correlation-id-policy.ts`

Rules:

- Ensures a correlation id exists for every incoming request.
- Injects `x-correlation-id` into the forwarded request headers so Server Components / SSR can read it.
- Echoes `X-Correlation-ID` on the response so it’s visible in browser devtools.

### Browser fetch propagation

Implemented in:

- `apps/frontend/lib/correlation-id.ts`
- `apps/frontend/lib/api-client.ts`

Rules:

- Outbound requests include `X-Correlation-ID`.
- Responses are inspected; if `X-Correlation-ID` is present it is captured and stored (session-scoped).

## SSR forwarding

Some Server Components forward the incoming correlation id to backend API calls by reading `headers()` and passing `X-Correlation-ID` downstream.

## Notes

- Correlation IDs are not a security boundary; treat inbound values as untrusted.
- Validation is intentionally conservative to reduce abuse risk.
- This is compatible with future OpenTelemetry adoption; correlation id can be mapped to trace/span context if needed.
