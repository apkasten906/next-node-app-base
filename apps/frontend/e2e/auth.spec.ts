import { expect, test } from '@playwright/test';

import { AuthHelpers } from './helpers/test-helpers';

test.describe('Authentication Flow', () => {
  test('should show sign in form', async ({ page }) => {
    await page.goto('/auth/signin');

    const heading = page.getByRole('heading', { name: 'Sign In' });
    await expect(heading).toBeVisible();

    // Check for email/password inputs and submit button
    await expect(page.getByPlaceholder('email@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should allow accessing sign in page when unauthenticated', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page).toHaveURL('/auth/signin');
  });

  test('should show error page with sign in link when unauthorized', async ({ page }) => {
    // Try to access protected dashboard without authentication
    await page.goto('/dashboard');

    // Should either redirect to sign in or show unauthorized message
    const currentUrl = page.url();
    const isSignInPage = currentUrl.includes('/auth/signin');
    const isUnauthorizedPage = currentUrl.includes('/unauthorized');

    expect(isSignInPage || isUnauthorizedPage).toBeTruthy();
  });

  test('should allow accessing dashboard when authenticated', async ({ page }) => {
    await AuthHelpers.signInViaAPI(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Protected Routes', () => {
  test('should block access to dashboard when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign in
    await page.waitForURL(/auth\/signin/);
    await expect(page).toHaveURL(/auth\/signin/);
  });

  test('should allow access to public pages', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');

    await page.goto('/auth/signin');
    await expect(page).toHaveURL('/auth/signin');
  });
});
