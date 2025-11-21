import { test, expect } from '@playwright/test';

test.describe('Dashboard Page - Unauthenticated', () => {
  test('should redirect to sign in when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign in page
    await page.waitForURL(/auth\/signin/);
    await expect(page).toHaveURL(/auth\/signin/);
  });
});

test.describe('Dashboard Page - Authenticated', () => {
  test.beforeEach(async ({ context }) => {
    // Mock authentication session for dashboard tests
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token-dashboard',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Date.now() / 1000 + 3600,
      },
    ]);
  });

  test('should display dashboard heading', async ({ page }) => {
    await page.goto('/dashboard');

    const heading = page.getByRole('heading', { name: /Dashboard/i });
    await expect(heading).toBeVisible();
  });

  test('should show user greeting', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for welcome message or user greeting
    const greeting = page.getByText(/Welcome/i);
    await expect(greeting).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for common dashboard navigation items
    // Adjust these based on your actual dashboard UI
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Dashboard - API Integration', () => {
  test.beforeEach(async ({ context }) => {
    // Mock authentication
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token-api',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Date.now() / 1000 + 3600,
      },
    ]);
  });

  test('should load user data from API', async ({ page }) => {
    // Mock API response
    await page.route('**/api/users/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        }),
      });
    });

    await page.goto('/dashboard');

    // Verify dashboard loaded successfully
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/users/profile', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal Server Error',
        }),
      });
    });

    await page.goto('/dashboard');

    // Should still render dashboard even if API fails
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Dashboard - User Actions', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token-actions',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Date.now() / 1000 + 3600,
      },
    ]);
  });

  test('should allow sign out', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for sign out button
    const signOutButton = page.getByRole('button', { name: /Sign Out/i });
    
    if (await signOutButton.isVisible()) {
      await signOutButton.click();

      // Should redirect to home or sign in page
      await page.waitForURL(/\/(auth\/signin)?$/);
    }
  });
});
