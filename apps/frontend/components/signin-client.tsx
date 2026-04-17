'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { useSignIn } from '@/src/hooks/auth/use-sign-in';

export function SignInClient(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { error, isSubmitting, submitForm } = useSignIn();

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    await submitForm(e, { email, password });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    void handleSubmit(e);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Sign In</h1>
          <p className="text-gray-600">Use your account to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="text-xs text-center text-gray-500">By continuing you agree to the terms.</p>
      </div>
    </div>
  );
}
