import Link from 'next/link';
import type { JSX } from 'react';

export default function NotFoundPage(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16 text-center">
      <div className="max-w-md" role="alert" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">404</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">Page not found</h1>
        <p className="mt-4 text-gray-600">The page you are looking for does not exist.</p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
