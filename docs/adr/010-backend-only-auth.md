# ADR 010: Backend-Only Authentication

Status: Accepted
Date: 2025-12-16

## Context

Our frontend (Next.js) previously used NextAuth with a Prisma adapter and a module-scoped `PrismaClient` instance. Under Playwright's `webServer` auto-start, SSR consistently failed with `TypeError: Cannot read properties of undefined (reading '__internal')` originating at PrismaClient initialization inside the frontend auth module. This persisted across:

- NextAuth v5 → v4 downgrade
- React 19 → 18 downgrade and cache clears
- Explicit env hardening for NEXTAUTH\_\* and DATABASE_URL

Manual frontend starts were intermittently fine, but the Playwright-launched server repeatedly failed, blocking E2E automation.

## Decision

Move all authentication to the backend (Express API) and remove NextAuth/Prisma from the frontend runtime.

- Backend exposes `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, and `/api/auth/me` using JWT with HttpOnly cookies.
- Frontend uses simple client-side fetches to the backend for login/logout with `credentials: 'include'`.
- SSR no longer imports any NextAuth/Prisma code; pages avoid module-scope Prisma access.

## Consequences

- Frontend server startup is unblocked (no Prisma on SSR path).
- Auth cookies are issued by the backend for domain `localhost` with `SameSite=Lax` and HttpOnly; CORS allows credentials for `http://localhost:3000`.
- Existing pages that referenced `auth()`/`signIn()`/`signOut()` were updated to avoid NextAuth. Follow-up can reintroduce guarded routing by querying `/api/auth/me`.
- OAuth providers are out-of-scope for now; password auth relies on `User.passwordHash`.

## Implementation Summary

- Backend:
  - Added JWT attach middleware `attachUserIfPresent` and mounted globally.
  - Added routes in `apps/backend/src/routes/auth.routes.ts` implementing login/refresh/logout/me.
  - Mounted routes at `/api/auth` in `apps/backend/src/index.ts`.
- Frontend:
  - Removed NextAuth usage from `app/page.tsx`, `app/dashboard/page.tsx`, and sign-in page.
  - Replaced `components/signin-client.tsx` with an email/password form posting to `/api/auth/login`.
  - Stubbed `app/api/auth/[...nextauth]/route.ts` and neutralized `auth.ts` to avoid Prisma imports.

## Future Work

- Add SSR auth checks using `next/headers` and forwarding cookies to `/api/auth/me`.
- Add refresh token flow on the client and API helpers.
- Optionally add OAuth on backend or switch to an IdP.
