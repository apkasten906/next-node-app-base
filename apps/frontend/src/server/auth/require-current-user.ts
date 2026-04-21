import 'server-only';

import { redirect } from 'next/navigation';

import { type AuthenticatedUser } from '@/lib/api/auth-api';
import { serverApiFetch } from '@/src/server/http/server-api-client';

interface CurrentUserResponse {
  user: AuthenticatedUser;
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const response = await serverApiFetch('/api/auth/me');

  if (response.status === 401) {
    redirect('/auth/signin');
  }

  if (!response.ok) {
    throw new Error(
      `Failed to load the current user (status: ${response.status}${response.statusText ? ` ${response.statusText}` : ''})`
    );
  }

  const data = (await response.json()) as CurrentUserResponse;
  return data.user;
}
