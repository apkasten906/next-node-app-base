import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_HEADER_LOWER,
  generateCorrelationId,
  normalizeCorrelationIdCandidate,
} from './lib/correlation-id-policy';

export function middleware(req: NextRequest): NextResponse {
  const correlationId =
    normalizeCorrelationIdCandidate(req.headers.get(CORRELATION_ID_HEADER_LOWER)) ??
    generateCorrelationId();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(CORRELATION_ID_HEADER_LOWER, correlationId);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Echo it back so it can be seen in browser devtools / logs.
  res.headers.set(CORRELATION_ID_HEADER, correlationId);
  return res;
}

export const config = {
  matcher: [
    // Exclude Next.js internals and common static assets.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
