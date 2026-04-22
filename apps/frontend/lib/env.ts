/**
 * Central resolution of environment-derived configuration values shared by
 * both the browser-side API client and the SSR server gateway.
 *
 * Precedence: API_URL_INTERNAL (server-side only; stripped from the client
 * bundle by Next.js) → NEXT_PUBLIC_API_URL → localhost default.
 *
 * This module is safe to import from both server and client code: on the
 * client, API_URL_INTERNAL is always undefined so it falls through to
 * NEXT_PUBLIC_API_URL.
 */
export function resolveApiBaseUrl(): string {
  return (
    process.env['API_URL_INTERNAL'] || process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'
  );
}
