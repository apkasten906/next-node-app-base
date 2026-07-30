'use client';

import { useEffect, type JSX } from 'react';

import { ErrorFallback } from '@/components/error-display';
import { logError } from '@/lib/error-logger';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    void logError(error, {
      context: {
        boundary: 'app-error',
        digest: error.digest,
      },
    });
  }, [error]);

  return <ErrorFallback error={error} resetAction={reset} />;
}
