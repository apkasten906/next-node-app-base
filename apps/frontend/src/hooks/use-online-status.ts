'use client';

import { useEffect, useState } from 'react';

export function getOfflineStatusMessage(isOnline: boolean): string | null {
  return isOnline
    ? null
    : 'You are currently offline. Pending requests will resume when your connection is restored.';
}

interface OnlineEventSource {
  addEventListener(type: 'online' | 'offline', listener: () => void): void;
  removeEventListener(type: 'online' | 'offline', listener: () => void): void;
}

export function subscribeToOnlineStatus(
  source: OnlineEventSource,
  onStatusChange: (isOnline: boolean) => void
): () => void {
  const handleOnline = (): void => onStatusChange(true);
  const handleOffline = (): void => onStatusChange(false);

  source.addEventListener('online', handleOnline);
  source.addEventListener('offline', handleOffline);

  return () => {
    source.removeEventListener('online', handleOnline);
    source.removeEventListener('offline', handleOffline);
  };
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => subscribeToOnlineStatus(window, setIsOnline), []);

  return isOnline;
}
