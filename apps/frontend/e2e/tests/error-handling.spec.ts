import { test, expect } from '@playwright/test';

import { TestData, AuthHelpers } from '../helpers/test-helpers';

/**
 * E2E Tests for Error Handling
 * Based on features/04-error-handling.feature BDD scenarios
 */
test.describe('Error Handling', () => {
  test.beforeEach(async () => {
    // No setup needed for error handling tests
  });

  test('Show global error boundary for unhandled errors', async ({ page }) => {
    await page.goto('/error-test');
    
    // Trigger error
    await page.locator('[data-testid="trigger-error-button"]').click();
    
    // Verify error boundary is shown
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong');
    
    // Verify reset button
    await expect(page.locator('[data-testid="reset-error-button"]')).toBeVisible();
  });

  test('Reset error boundary', async ({ page }) => {
    await page.goto('/error-test');
    
    // Trigger error
    await page.locator('[data-testid="trigger-error-button"]').click();
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    
    // Click reset
    await page.locator('[data-testid="reset-error-button"]').click();
    
    // Verify error boundary is cleared
    await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
  });

  test('Show 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    
    // Verify 404 page
    await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('[data-testid="home-link"]')).toBeVisible();
  });

  test('Navigate from 404 page to home', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Click home link
    await page.locator('[data-testid="home-link"]').click();
    
    // Verify navigation to home
    await expect(page).toHaveURL('/');
  });

  test('Show 403 page for forbidden resources', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    
    // Try to access admin page
    await page.goto('/admin');
    
    // Verify 403 page
    await expect(page.locator('[data-testid="403-page"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/403|Forbidden|Access Denied/i);
  });

  test('Show 401 page for unauthorized access', async ({ page }) => {
    // Try to access protected page without signing in
    await page.goto('/dashboard');
    
    // Verify redirect to sign-in or 401 page
    await expect(page).toHaveURL(/\/auth\/signin|\/401/);
  });

  test('Show 500 page for server errors', async ({ page }) => {
    // Simulate server error
    await page.route('/api/items', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
    });
    
    await page.goto('/items');
    
    // Verify error page or message
    await expect(page.locator('[data-testid="500-error"]')).toBeVisible();
  });

  test('Handle network connection loss', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Simulate network offline
    await page.context().setOffline(true);
    
    // Try to load data
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Verify offline message
    await expect(page.locator('[data-testid="offline-message"]')).toContainText(/offline|no connection|network/i);
  });

  test('Recover when network reconnects', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Go offline
    await page.context().setOffline(true);
    await page.locator('[data-testid="refresh-button"]').click();
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    await page.locator('[data-testid="retry-button"]').click();
    
    // Verify data loads
    await expect(page.locator('[data-testid="item-list"]')).toBeVisible();
  });

  test('Show form validation errors', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items/new');
    
    // Submit empty form
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify validation errors
    await expect(page.locator('[data-testid="item-name-error"]')).toContainText('required');
    await expect(page.locator('[data-testid="item-description-error"]')).toContainText('required');
  });

  test('Clear validation errors when corrected', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items/new');
    
    // Submit empty form
    await page.locator('[data-testid="save-item-button"]').click();
    await expect(page.locator('[data-testid="item-name-error"]')).toBeVisible();
    
    // Fill field
    await page.locator('[data-testid="item-name-input"]').fill('Valid Name');
    
    // Verify error is cleared
    await expect(page.locator('[data-testid="item-name-error"]')).not.toBeVisible();
  });

  test('Show API validation errors', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items/new');
    
    // Simulate API validation error
    await page.route('/api/items', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          errors: {
            name: 'Name must be unique',
            description: 'Description is too long',
          },
        }),
      });
    });
    
    // Submit form
    await page.locator('[data-testid="item-name-input"]').fill('Duplicate Name');
    await page.locator('[data-testid="item-description-input"]').fill('Description');
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify API errors are displayed
    await expect(page.locator('[data-testid="item-name-error"]')).toContainText('must be unique');
    await expect(page.locator('[data-testid="item-description-error"]')).toContainText('too long');
  });

  test('Handle API timeout with retry option', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Simulate timeout
    await page.route('/api/items', route => {
      setTimeout(() => route.abort('timedout'), 35000);
    });
    
    // Trigger request
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Verify timeout error with retry button
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(/timeout/i);
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('Retry failed request', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    let attempts = 0;
    
    // Simulate intermittent failure
    await page.route('/api/items', route => {
      attempts++;
      if (attempts === 1) {
        route.abort('failed');
      } else {
        route.fulfill({ status: 200, body: JSON.stringify([{ id: '1', name: 'Item 1' }]) });
      }
    });
    
    // Trigger request
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Retry
    await page.locator('[data-testid="retry-button"]').click();
    
    // Verify success
    await expect(page.locator('[data-testid="item-list"]')).toContainText('Item 1');
  });

  test('Show toast notification for errors', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items/new');
    
    // Trigger error
    await page.route('/api/items', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });
    
    await page.locator('[data-testid="item-name-input"]').fill('Test');
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify toast
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(/error|failed/i);
  });

  test('Auto-dismiss toast notifications', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Trigger success toast
    await page.locator('[data-testid="show-toast-button"]').click();
    
    // Verify toast appears
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    
    // Wait for auto-dismiss
    await page.waitForTimeout(5000);
    
    // Verify toast is gone
    await expect(page.locator('[data-testid="toast-success"]')).not.toBeVisible();
  });

  test('Handle partial bulk operation failures', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Select multiple items
    await page.locator('[data-testid="select-item-checkbox"]').first().check();
    await page.locator('[data-testid="select-item-checkbox"]').nth(1).check();
    
    // Simulate partial failure
    await page.route('/api/items/bulk', route => {
      route.fulfill({
        status: 207,
        body: JSON.stringify({
          success: 1,
          failed: 1,
          errors: [{ id: '2', error: 'Permission denied' }],
        }),
      });
    });
    
    await page.locator('[data-testid="bulk-delete-button"]').click();
    await page.locator('[data-testid="confirm-bulk-delete-button"]').click();
    
    // Verify partial success message
    await expect(page.locator('[data-testid="toast-warning"]')).toContainText(/1 succeeded.*1 failed/);
  });

  test('Handle concurrent edit conflicts', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items/1');
    
    // Click edit
    await page.locator('[data-testid="edit-item-button"]').click();
    
    // Simulate conflict
    await page.route('/api/items/1', route => {
      route.fulfill({
        status: 409,
        body: JSON.stringify({ error: 'Item was modified by another user' }),
      });
    });
    
    await page.locator('[data-testid="item-name-input"]').fill('Updated Name');
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify conflict message
    await expect(page.locator('[data-testid="conflict-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-message"]')).toContainText(/modified by another user/i);
  });

  test('Refresh data after conflict resolution', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items/1');
    
    // Simulate conflict
    await page.route('/api/items/1', route => {
      route.fulfill({
        status: 409,
        body: JSON.stringify({ error: 'Item was modified' }),
      });
    }, { times: 1 });
    
    await page.locator('[data-testid="edit-item-button"]').click();
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Click refresh
    await page.locator('[data-testid="refresh-data-button"]').click();
    
    // Verify data reloaded
    await expect(page.locator('[data-testid="item-name"]')).not.toBeEmpty();
  });

  test('Handle session expiration', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Simulate session expiration
    await page.route('/api/items', route => {
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'Session expired' }) });
    });
    
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Verify redirect to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Handle WebSocket connection errors', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Simulate WebSocket error
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const event = new CustomEvent('websocket-error', {
        detail: { error: 'Connection failed' },
      });
      // eslint-disable-next-line no-undef
      window.dispatchEvent(event);
    });
    
    // Verify error message
    await expect(page.locator('[data-testid="websocket-status"]')).toContainText(/disconnected|error/i);
  });

  test('Reconnect WebSocket after error', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Simulate disconnect
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      window.dispatchEvent(new CustomEvent('websocket-error'));
    });
    
    // Wait for reconnect
    await page.waitForTimeout(3000);
    
    // Verify reconnected
    await expect(page.locator('[data-testid="websocket-status"]')).toContainText(/connected/i);
  });

  test('Handle storage quota exceeded', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items');
    
    // Simulate quota exceeded
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      Object.defineProperty(window.localStorage, 'setItem', {
        value: () => {
          // eslint-disable-next-line no-undef
          throw new DOMException('QuotaExceededError');
        },
      });
    });
    
    // Trigger storage write
    await page.locator('[data-testid="save-preferences-button"]').click();
    
    // Verify error message
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(/storage|quota/i);
  });

  test('Show browser compatibility warnings', async ({ page, browserName }) => {
    // Skip test for modern browsers
    if (browserName === 'chromium' || browserName === 'firefox') {
      test.skip();
    }
    
    await page.goto('/');
    
    // Check for compatibility warning
    const warning = page.locator('[data-testid="browser-warning"]');
    if (await warning.isVisible()) {
      await expect(warning).toContainText(/browser|update|compatibility/i);
    }
  });

  test('Error messages are accessible', async ({ page }) => {
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await page.goto('/items/new');
    
    // Submit invalid form
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify error has ARIA attributes
    const error = page.locator('[data-testid="item-name-error"]');
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(error).toHaveAttribute('aria-live', 'polite');
  });
});
