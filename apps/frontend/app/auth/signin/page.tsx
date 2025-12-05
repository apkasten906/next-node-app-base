import type { JSX } from 'react';

import { signIn } from '@/auth';
import { SignInClient } from '@/components/signin-client';

export default function SignInPage(): JSX.Element {
  async function handleGoogleSignIn(): Promise<void> {
    'use server';
    await signIn('google', { redirectTo: '/dashboard' });
  }

  async function handleGitHubSignIn(): Promise<void> {
    'use server';
    await signIn('github', { redirectTo: '/dashboard' });
  }

  return <SignInClient onGoogleSignIn={handleGoogleSignIn} onGitHubSignIn={handleGitHubSignIn} />;
}
