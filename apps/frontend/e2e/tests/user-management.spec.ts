import { test, expect } from '@playwright/test';

import { TestData, AuthHelpers } from '../helpers/test-helpers';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * E2E Tests for User Management
 * Based on features/02-user-management.feature BDD scenarios
 */
test.describe('User Management', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Sign in before each test
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await dashboardPage.goto();
  });

  test('View user profile', async ({ page }) => {
    await dashboardPage.navigateTo('profile');
    
    // Verify profile page loads
    await expect(page.locator('h1')).toContainText('Profile');
    
    // Verify user information is displayed
    const user = TestData.getValidUser();
    await expect(page.locator('[data-testid="profile-email"]')).toContainText(user.email);
    await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
  });

  test('Update profile information', async ({ page }) => {
    await dashboardPage.navigateTo('profile');
    
    const newName = TestData.generateName();
    
    // Fill and submit profile form
    await page.locator('[data-testid="name-input"]').fill(newName);
    await page.locator('[data-testid="save-profile-button"]').click();
    
    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Profile updated successfully');
    
    // Verify updated name is displayed
    await expect(page.locator('[data-testid="profile-name"]')).toContainText(newName);
  });

  test('Show validation errors for invalid profile data', async ({ page }) => {
    await dashboardPage.navigateTo('profile');
    
    // Clear required field
    await page.locator('[data-testid="name-input"]').fill('');
    await page.locator('[data-testid="save-profile-button"]').click();
    
    // Verify validation error
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
  });

  test('Change password successfully', async ({ page }) => {
    await dashboardPage.navigateTo('settings/security');
    
    // Fill password change form
    await page.locator('[data-testid="current-password-input"]').fill('Password123!');
    await page.locator('[data-testid="new-password-input"]').fill('NewPassword123!');
    await page.locator('[data-testid="confirm-password-input"]').fill('NewPassword123!');
    await page.locator('[data-testid="change-password-button"]').click();
    
    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Password changed successfully');
  });

  test('Validate password requirements', async ({ page }) => {
    await dashboardPage.navigateTo('settings/security');
    
    // Try weak password
    await page.locator('[data-testid="current-password-input"]').fill('Password123!');
    await page.locator('[data-testid="new-password-input"]').fill('weak');
    await page.locator('[data-testid="confirm-password-input"]').fill('weak');
    await page.locator('[data-testid="change-password-button"]').click();
    
    // Verify validation errors
    await expect(page.locator('[data-testid="new-password-error"]')).toContainText(
      /at least 8 characters|include uppercase|include number|include special character/i
    );
  });

  test('Confirm password must match', async ({ page }) => {
    await dashboardPage.navigateTo('settings/security');
    
    // Enter non-matching passwords
    await page.locator('[data-testid="current-password-input"]').fill('Password123!');
    await page.locator('[data-testid="new-password-input"]').fill('NewPassword123!');
    await page.locator('[data-testid="confirm-password-input"]').fill('DifferentPassword123!');
    await page.locator('[data-testid="change-password-button"]').click();
    
    // Verify validation error
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords must match');
  });

  test('Update notification preferences', async ({ page }) => {
    await dashboardPage.navigateTo('settings/notifications');
    
    // Toggle notification settings
    await page.locator('[data-testid="email-notifications-toggle"]').click();
    await page.locator('[data-testid="push-notifications-toggle"]').click();
    await page.locator('[data-testid="save-notifications-button"]').click();
    
    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Notification preferences updated');
  });

  test('Change language preference', async ({ page }) => {
    await dashboardPage.navigateTo('settings/preferences');
    
    // Change language
    await page.locator('[data-testid="language-select"]').selectOption('es');
    await page.locator('[data-testid="save-preferences-button"]').click();
    
    // Verify UI updates to Spanish
    await expect(page.locator('h1')).toContainText('Preferencias');
  });

  test('Upload profile avatar', async ({ page }) => {
    await dashboardPage.navigateTo('profile');
    
    // Create test image file
    const buffer = Buffer.from('fake-image-data');
    
    // Upload avatar
    const fileInput = page.locator('[data-testid="avatar-upload-input"]');
    await fileInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer,
    });
    
    // Verify upload success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Avatar uploaded successfully');
  });

  test('Validate avatar file type and size', async ({ page }) => {
    await dashboardPage.navigateTo('profile');
    
    // Try to upload invalid file type
    const buffer = Buffer.from('fake-pdf-data');
    const fileInput = page.locator('[data-testid="avatar-upload-input"]');
    await fileInput.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer,
    });
    
    // Verify error message
    await expect(page.locator('[data-testid="avatar-error"]')).toContainText(
      /Only image files are allowed|Invalid file type/i
    );
  });

  test('Enable two-factor authentication', async ({ page }) => {
    await dashboardPage.navigateTo('settings/security');
    
    // Enable 2FA
    await page.locator('[data-testid="enable-2fa-button"]').click();
    
    // Verify QR code is displayed
    await expect(page.locator('[data-testid="2fa-qr-code"]')).toBeVisible();
    
    // Verify setup instructions
    await expect(page.locator('[data-testid="2fa-instructions"]')).toContainText('Scan the QR code');
  });

  test('Verify two-factor authentication code', async ({ page }) => {
    await dashboardPage.navigateTo('settings/security');
    
    // Enable 2FA
    await page.locator('[data-testid="enable-2fa-button"]').click();
    
    // Enter verification code
    await page.locator('[data-testid="2fa-code-input"]').fill('123456');
    await page.locator('[data-testid="verify-2fa-button"]').click();
    
    // Verify either success or invalid code message
    const response = page.locator('[data-testid="2fa-status"]');
    await expect(response).toBeVisible();
  });

  test('Delete account with confirmation', async ({ page }) => {
    await dashboardPage.navigateTo('settings/account');
    
    // Click delete account
    await page.locator('[data-testid="delete-account-button"]').click();
    
    // Verify confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
    
    // Enter confirmation text
    await page.locator('[data-testid="delete-confirmation-input"]').fill('DELETE');
    await page.locator('[data-testid="confirm-delete-button"]').click();
    
    // Verify redirect to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('View active sessions', async ({ page }) => {
    await dashboardPage.navigateTo('settings/sessions');
    
    // Verify sessions list is displayed
    await expect(page.locator('[data-testid="sessions-list"]')).toBeVisible();
    
    // Verify current session is shown
    await expect(page.locator('[data-testid="current-session"]')).toContainText('Current session');
  });

  test('Revoke other sessions', async ({ page }) => {
    await dashboardPage.navigateTo('settings/sessions');
    
    // Revoke all other sessions
    await page.locator('[data-testid="revoke-all-sessions-button"]').click();
    
    // Confirm action
    await page.locator('[data-testid="confirm-revoke-button"]').click();
    
    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('All other sessions revoked');
  });

  test('Profile page is responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await dashboardPage.navigateTo('profile');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-profile-header"]')).toBeVisible();
    
    // Verify form is usable on mobile
    const nameInput = page.locator('[data-testid="name-input"]');
    await expect(nameInput).toBeVisible();
    await nameInput.click();
    await expect(nameInput).toBeFocused();
  });

  test('Settings navigation is keyboard accessible', async ({ page }) => {
    await dashboardPage.navigateTo('settings');
    
    // Tab through navigation items
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    // eslint-disable-next-line no-undef
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBeTruthy();
    
    // Navigate with Enter
    await page.keyboard.press('Enter');
    
    // Verify navigation occurred
    await expect(page).toHaveURL(/\/settings\/.+/);
  });
});
