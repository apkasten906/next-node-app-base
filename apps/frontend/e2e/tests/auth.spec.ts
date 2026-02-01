import { test, expect } from '@playwright/test';

import { TestData, WaitHelpers } from '../helpers/test-helpers';
import { AuthPage } from '../pages/auth.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Authentication Flow', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    await authPage.goto();
  });

  test('should sign in with valid credentials', async ({ page }) => {
    const user = TestData.getValidUser();

    await authPage.signIn(user.email, user.password);
    await authPage.waitForAuth();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify welcome message appears
    await expect(dashboardPage.welcomeMessage).toBeVisible();

    // Verify auth token is stored
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(
      (c) => c.name === 'auth-token' || c.name === 'next-auth.session-token'
    );
    expect(authCookie).toBeDefined();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await authPage.signIn('test@example.com', 'wrongpassword');

    // Error message should appear
    await expect(authPage.errorMessage).toBeVisible();
    await expect(authPage.errorMessage).toContainText(/invalid credentials/i);

    // Should remain on sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);

    // No auth token should be set
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(
      (c) => c.name === 'auth-token' || c.name === 'next-auth.session-token'
    );
    expect(authCookie).toBeUndefined();
  });

  test('should validate required fields', async () => {
    // Click sign in without filling fields
    await authPage.signInButton.click();

    // Check for validation errors
    const errors = await authPage.getAllErrors();
    expect(errors.length).toBeGreaterThan(0);

    // Verify email error
    const emailError = await authPage.getFieldError('Email');
    expect(emailError).toContain('required');

    // Verify password error
    const passwordError = await authPage.getFieldError('Password');
    expect(passwordError).toContain('required');
  });

  test('should validate email format', async () => {
    await authPage.emailInput.fill('notanemail');
    await authPage.passwordInput.fill('Test123!');
    await authPage.signInButton.click();

    const emailError = await authPage.getFieldError('Email');
    expect(emailError).toMatch(/invalid|format/i);
  });

  test('should persist session across page refresh', async ({ page }) => {
    const user = TestData.getValidUser();

    // Sign in
    await authPage.signIn(user.email, user.password);
    await authPage.waitForAuth();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(dashboardPage.welcomeMessage).toBeVisible();
  });

  test('should sign out successfully', async ({ page }) => {
    const user = TestData.getValidUser();

    // Sign in first
    await authPage.signIn(user.email, user.password);
    await authPage.waitForAuth();

    // Sign out
    await authPage.signOut();

    // Verify redirected to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Verify auth cookie is cleared
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(
      (c) => c.name === 'auth-token' || c.name === 'next-auth.session-token'
    );
    expect(authCookie).toBeUndefined();

    // Try to access protected page
    await page.goto('/dashboard');

    // Should be redirected back to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to email field
    await page.keyboard.press('Tab');
    await expect(authPage.emailInput).toBeFocused();

    // Type email
    await page.keyboard.type('test@example.com');

    // Tab to password field
    await page.keyboard.press('Tab');
    await expect(authPage.passwordInput).toBeFocused();

    // Type password
    await page.keyboard.type('Test123!');

    // Submit with Enter key
    await page.keyboard.press('Enter');

    // Should initiate sign-in
    await WaitHelpers.waitForAPIResponse(page, '/api/auth/signin');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const user = TestData.getValidUser();
    await authPage.signIn(user.email, user.password);
    await authPage.waitForAuth();

    // Verify mobile navigation is displayed
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    await expect(mobileNav).toBeVisible();
  });
});
