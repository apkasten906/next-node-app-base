'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { authApplicationService, type SignInResult } from '@/src/application/auth/sign-in';

export interface SignInFormValues {
  email: string;
  password: string;
}

export interface UseSignInResult {
  error: string | null;
  isSubmitting: boolean;
  submit: (values: SignInFormValues) => Promise<SignInResult>;
  submitForm: (event: FormEvent<HTMLFormElement>, values: SignInFormValues) => Promise<void>;
}

export function useSignIn(): UseSignInResult {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: SignInFormValues): Promise<SignInResult> {
    setError(null);
    setIsSubmitting(true);

    try {
      return await authApplicationService.signIn(values);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Login failed';
      setError(message);
      throw caughtError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitForm(
    event: FormEvent<HTMLFormElement>,
    values: SignInFormValues
  ): Promise<void> {
    event.preventDefault();
    await submit(values);
    router.push('/dashboard');
    router.refresh();
  }

  return {
    error,
    isSubmitting,
    submit,
    submitForm,
  };
}
