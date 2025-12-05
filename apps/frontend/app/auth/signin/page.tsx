import { signIn } from '@/auth';
import { SignInClient } from '@/components/signin-client';

export default function SignInPage() {
  async function handleGoogleSignIn() {
    'use server';
    await signIn('google', { redirectTo: '/dashboard' });
  }

  async function handleGitHubSignIn() {
    'use server';
    await signIn('github', { redirectTo: '/dashboard' });
  }

  return (
    <SignInClient onGoogleSignIn={handleGoogleSignIn} onGitHubSignIn={handleGitHubSignIn} />
  );
}
