'use client';

import type { JSX } from 'react';

import { useOnlineStatus } from '@/src/hooks/use-online-status';

export function OfflineIndicator(): JSX.Element | null {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-900"
    >
      You are currently offline. Some actions will retry when your connection is restored.
    </div>
  );
}
