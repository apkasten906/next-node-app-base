import { onlineManager } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { subscribeToOnlineStatus } from './hooks/use-online-status';

import { OfflineStatus } from '@/components/offline-indicator';
import { createQueryClient } from '@/lib/query-client';

class FakeOnlineEventSource {
  private readonly listeners = new Map<'online' | 'offline', Set<() => void>>();

  addEventListener(type: 'online' | 'offline', listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: 'online' | 'offline', listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: 'online' | 'offline'): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('offline handling', () => {
  it('reports browser connectivity transitions and unsubscribes cleanly', () => {
    const source = new FakeOnlineEventSource();
    const onStatusChange = vi.fn();
    const unsubscribe = subscribeToOnlineStatus(source, onStatusChange);

    source.dispatch('offline');
    source.dispatch('online');
    expect(onStatusChange.mock.calls).toEqual([[false], [true]]);

    unsubscribe();
    source.dispatch('offline');
    expect(onStatusChange).toHaveBeenCalledTimes(2);
  });

  it('renders an accessible message only while offline', () => {
    expect(renderToStaticMarkup(<OfflineStatus isOnline />)).toBe('');

    const markup = renderToStaticMarkup(<OfflineStatus isOnline={false} />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('You are currently offline');
  });

  it('resumes a paused query when connectivity is restored', async () => {
    const queryClient = createQueryClient();
    const queryFn = vi.fn().mockResolvedValue('restored');
    queryClient.mount();
    onlineManager.setOnline(false);

    const result = queryClient.fetchQuery({ queryKey: ['offline-test'], queryFn });
    await Promise.resolve();
    expect(queryFn).not.toHaveBeenCalled();

    onlineManager.setOnline(true);
    await expect(result).resolves.toBe('restored');
    expect(queryFn).toHaveBeenCalledOnce();
    queryClient.unmount();
  });
});
