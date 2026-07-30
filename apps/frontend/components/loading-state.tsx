import type { JSX, ReactNode } from 'react';

interface LoadingStateProps {
  isLoading: boolean;
  children: ReactNode;
  label?: string;
}

export function LoadingSpinner({ label = 'Loading' }: { label?: string }): JSX.Element {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-gray-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      <span>{label}</span>
    </div>
  );
}

export function LoadingState({ isLoading, children, label }: LoadingStateProps): JSX.Element {
  if (isLoading) {
    return <LoadingSpinner label={label} />;
  }

  return <>{children}</>;
}
