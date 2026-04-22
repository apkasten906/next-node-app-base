'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { LoginCredentials } from '@/lib/api/auth-api';
import { authApplicationService, type SignInResult } from '@/src/application/auth/sign-in';

export type SignInFormValues = LoginCredentials;

export interface UseSignInResult {
  error: string | null;
  isSubmitting: boolean;
  submit: (values: SignInFormValues) => Promise<SignInResult | null>;
  submitForm: (event: FormEvent<HTMLFormElement>, values: SignInFormValues) => Promise<void>;
}

export function useSignIn(): UseSignInResult {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: SignInFormValues): Promise<SignInResult | null> {
    setError(null);
    setIsSubmitting(true);

    try {
      return await authApplicationService.signIn(values);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Login failed';
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitForm(
    event: FormEvent<HTMLFormElement>,
    values: SignInFormValues
  ): Promise<void> {
    event.preventDefault();
    const result = await submit(values);
    if (result?.authenticated) {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return {
    error,
    isSubmitting,
    submit,
    submitForm,
  };
}
