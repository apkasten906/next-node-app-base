import { describe, expect, it } from 'vitest';

function validatePassword(password: string): boolean {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

describe('Password Strength Validation', () => {
  it('accepts and rejects passwords according to policy', () => {
    expect(validatePassword('weak')).toBe(false);
    expect(validatePassword('StrongP@ss1')).toBe(true);
    expect(validatePassword('12345678')).toBe(false);
    expect(validatePassword('Test!234')).toBe(true);
  });
});
