/**
 * Central resolution of environment-derived configuration values shared by
 * both the browser-side API client and the SSR server gateway.
 *
 * Precedence: API_URL_INTERNAL (server-only) → NEXT_PUBLIC_API_URL → default
 */
export function resolveApiBaseUrl(): string {
  return (
    process.env['API_URL_INTERNAL'] || process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'
  );
}
