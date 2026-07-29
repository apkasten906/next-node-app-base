'use client';

import type { JSX } from 'react';

import { getOfflineStatusMessage, useOnlineStatus } from '@/src/hooks/use-online-status';

export function OfflineIndicator(): JSX.Element | null {
  const isOnline = useOnlineStatus();

  return <OfflineStatus isOnline={isOnline} />;
}

export function OfflineStatus({ isOnline }: { isOnline: boolean }): JSX.Element | null {
  const message = getOfflineStatusMessage(isOnline);
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-900"
    >
      {message}
    </div>
  );
}
