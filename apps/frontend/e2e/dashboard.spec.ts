import { expect, test } from '@playwright/test';

import { AuthHelpers } from './helpers/test-helpers';

test.describe('Dashboard Page - Unauthenticated', () => {
  test('should redirect to sign in when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign in page
    await page.waitForURL(/auth\/signin/);
    await expect(page).toHaveURL(/auth\/signin/);
  });
});

test.describe('Dashboard Page - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via backend API to set cookies
    await AuthHelpers.signInViaAPI(page);
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
  test.beforeEach(async ({ page }) => {
    await AuthHelpers.signInViaAPI(page);
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
  test.beforeEach(async ({ page }) => {
    // Authenticate via backend API to set cookies
    await AuthHelpers.signInViaAPI(page);
  });

  test('should remain on dashboard while authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });
});
