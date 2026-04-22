import 'server-only';

import { type Snapshot } from '@/src/server/bdd/types';
import { serverApiFetch } from '@/src/server/http/server-api-client';

export type BddStatusSnapshotResult =
  | { kind: 'success'; snapshot: Snapshot }
  | { kind: 'forbidden' }
  | { kind: 'unauthenticated' }
  | { kind: 'error' };

export async function getBddStatusSnapshot(): Promise<BddStatusSnapshotResult> {
  const response = await serverApiFetch('/api/admin/bdd/status');

  if (response.status === 401) {
    return { kind: 'unauthenticated' };
  }

  if (response.status === 403) {
    return { kind: 'forbidden' };
  }

  if (!response.ok) {
    return { kind: 'error' };
  }

  try {
    const snapshot = (await response.json()) as Snapshot;
    return { kind: 'success', snapshot };
  } catch {
    return { kind: 'error' };
  }
}
