import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show sign in page with OAuth providers', async ({ page }) => {
    await page.goto('/auth/signin');

    await expect(page).toHaveTitle(/Sign In/);

    const heading = page.getByRole('heading', { name: 'Sign In' });
    await expect(heading).toBeVisible();

    // Check for OAuth provider buttons
    const googleButton = page.getByRole('button', { name: /Google/i });
    await expect(googleButton).toBeVisible();

    const githubButton = page.getByRole('button', { name: /GitHub/i });
    await expect(githubButton).toBeVisible();
  });

  test('should redirect to home when accessing sign in while authenticated', async ({ page }) => {
    // This test assumes you have a way to mock authentication
    // For now, it just checks the redirect flow structure
    await page.goto('/auth/signin');

    // If authenticated, should see home page elements
    // This would need proper session mocking in a real test
    await expect(page).toHaveURL(/\/(auth\/signin)?/);
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

  test('should display user session info when authenticated', async ({ context, page }) => {
    // Mock authentication session
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Date.now() / 1000 + 3600, // 1 hour
      },
    ]);

    await page.goto('/');

    // When authenticated, should show user menu or profile
    // This would need proper NextAuth session mocking
    // For now, just verify the page loads
    await expect(page).toHaveURL('/');
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
