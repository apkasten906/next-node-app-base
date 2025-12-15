import { test, expect } from '@playwright/test';

import { TestData, AuthHelpers, WaitHelpers } from '../helpers/test-helpers';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * E2E Tests for API Integration
 * Based on features/03-api-integration.feature BDD scenarios
 */
test.describe('API Integration', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Sign in before each test
    const user = TestData.getValidUser();
    await AuthHelpers.signInViaAPI(page, user.email, user.password);
    await dashboardPage.goto();
  });

  test('Create a new item', async ({ page }) => {
    await page.goto('/items');
    
    // Click create button
    await page.locator('[data-testid="create-item-button"]').click();
    
    // Fill form
    await page.locator('[data-testid="item-name-input"]').fill('Test Item');
    await page.locator('[data-testid="item-description-input"]').fill('Test Description');
    
    // Submit and wait for API
    const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items', 'POST');
    await page.locator('[data-testid="save-item-button"]').click();
    const response = await responsePromise;
    
    // Verify response
    expect(response.status()).toBe(201);
    
    // Verify item appears in list
    await expect(page.locator('[data-testid="item-list"]')).toContainText('Test Item');
  });

  test('Read item details', async ({ page }) => {
    await page.goto('/items');
    
    // Click on first item
    await page.locator('[data-testid="item-row"]').first().click();
    
    // Verify details page loads
    await expect(page.locator('[data-testid="item-details"]')).toBeVisible();
    
    // Verify data is displayed
    await expect(page.locator('[data-testid="item-name"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="item-description"]')).not.toBeEmpty();
  });

  test('Update existing item', async ({ page }) => {
    await page.goto('/items');
    
    // Click on first item
    await page.locator('[data-testid="item-row"]').first().click();
    
    // Click edit button
    await page.locator('[data-testid="edit-item-button"]').click();
    
    // Update fields
    await page.locator('[data-testid="item-name-input"]').fill('Updated Item');
    
    // Submit and wait for API
    const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items/*', 'PUT');
    await page.locator('[data-testid="save-item-button"]').click();
    const response = await responsePromise;
    
    // Verify response
    expect(response.status()).toBe(200);
    
    // Verify updated name is displayed
    await expect(page.locator('[data-testid="item-name"]')).toContainText('Updated Item');
  });

  test('Delete item with confirmation', async ({ page }) => {
    await page.goto('/items');
    
    // Click on first item
    await page.locator('[data-testid="item-row"]').first().click();
    
    // Click delete button
    await page.locator('[data-testid="delete-item-button"]').click();
    
    // Confirm deletion
    const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items/*', 'DELETE');
    await page.locator('[data-testid="confirm-delete-button"]').click();
    const response = await responsePromise;
    
    // Verify response
    expect(response.status()).toBe(204);
    
    // Verify redirect to list
    await expect(page).toHaveURL(/\/items$/);
  });

  test('Search items by keyword', async ({ page }) => {
    await page.goto('/items');
    
    // Enter search term
    await page.locator('[data-testid="search-input"]').fill('test');
    
    // Wait for API response
    await WaitHelpers.waitForAPIResponse(page, '/api/items?*search=test*', 'GET');
    
    // Verify results are filtered
    const items = page.locator('[data-testid="item-row"]');
    await expect(items).not.toHaveCount(0);
    
    // Verify all results contain search term
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toContainText(/test/i);
    }
  });

  test('Filter items by category', async ({ page }) => {
    await page.goto('/items');
    
    // Select category filter
    await page.locator('[data-testid="category-filter"]').selectOption('electronics');
    
    // Wait for API response
    await WaitHelpers.waitForAPIResponse(page, '/api/items?*category=electronics*', 'GET');
    
    // Verify results are filtered
    await expect(page.locator('[data-testid="item-row"]')).not.toHaveCount(0);
  });

  test('Sort items by name', async ({ page }) => {
    await page.goto('/items');
    
    // Click name column header
    const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items?*sort=name*', 'GET');
    await page.locator('[data-testid="sort-name"]').click();
    await responsePromise;
    
    // Verify items are sorted
    const firstItem = await page.locator('[data-testid="item-row"]').first().textContent();
    const secondItem = await page.locator('[data-testid="item-row"]').nth(1).textContent();
    
    expect(firstItem!.localeCompare(secondItem!)).toBeLessThanOrEqual(0);
  });

  test('Paginate through items', async ({ page }) => {
    await page.goto('/items');
    
    // Verify first page is loaded
    await expect(page.locator('[data-testid="page-info"]')).toContainText('Page 1');
    
    // Click next page
    const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items?*page=2*', 'GET');
    await page.locator('[data-testid="next-page-button"]').click();
    await responsePromise;
    
    // Verify second page is loaded
    await expect(page.locator('[data-testid="page-info"]')).toContainText('Page 2');
  });

  test('Change items per page', async ({ page }) => {
    await page.goto('/items');
    
    // Change page size
    const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items?*limit=50*', 'GET');
    await page.locator('[data-testid="page-size-select"]').selectOption('50');
    await responsePromise;
    
    // Verify more items are displayed
    const itemCount = await page.locator('[data-testid="item-row"]').count();
    expect(itemCount).toBeGreaterThan(10);
  });

  test('Bulk select and delete items', async ({ page }) => {
    await page.goto('/items');
    
    // Select multiple items
    await page.locator('[data-testid="select-item-checkbox"]').first().check();
    await page.locator('[data-testid="select-item-checkbox"]').nth(1).check();
    
    // Click bulk delete
    await page.locator('[data-testid="bulk-delete-button"]').click();
    
    // Confirm deletion
    const responsePromise = WaitHelpers.waitForAPIResponse(page, '/api/items/bulk', 'DELETE');
    await page.locator('[data-testid="confirm-bulk-delete-button"]').click();
    await responsePromise;
    
    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('2 items deleted');
  });

  test('Export items to CSV', async ({ page }) => {
    await page.goto('/items');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-csv-button"]').click();
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('Show validation errors from API', async ({ page }) => {
    await page.goto('/items');
    
    // Click create button
    await page.locator('[data-testid="create-item-button"]').click();
    
    // Submit empty form
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify API validation errors are displayed
    await expect(page.locator('[data-testid="item-name-error"]')).toContainText('Name is required');
  });

  test('Handle API timeout gracefully', async ({ page }) => {
    await page.goto('/items');
    
    // Simulate slow API by using network throttling
    await page.route('/api/items/slow', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000)); // Exceed timeout
      await route.fulfill({ status: 200, body: '{}' });
    });
    
    // Trigger slow request
    await page.locator('[data-testid="slow-operation-button"]').click();
    
    // Verify timeout error is shown
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(/timeout|took too long/i);
  });

  test('Handle network errors', async ({ page }) => {
    await page.goto('/items');
    
    // Simulate network error
    await page.route('/api/items', route => route.abort('failed'));
    
    // Trigger request
    await page.locator('[data-testid="create-item-button"]').click();
    await page.locator('[data-testid="item-name-input"]').fill('Test');
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify network error is shown
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(/network error|connection failed/i);
  });

  test('Show optimistic UI updates', async ({ page }) => {
    await page.goto('/items');
    
    // Click create button
    await page.locator('[data-testid="create-item-button"]').click();
    
    // Fill form
    await page.locator('[data-testid="item-name-input"]').fill('Optimistic Item');
    
    // Submit
    await page.locator('[data-testid="save-item-button"]').click();
    
    // Verify optimistic update (item appears immediately)
    await expect(page.locator('[data-testid="item-list"]')).toContainText('Optimistic Item');
  });

  test('Receive real-time updates via WebSocket', async ({ page }) => {
    await page.goto('/items');
    
    // Wait for WebSocket connection
    await WaitHelpers.waitForWebSocket(page);
    
    // Simulate another user creating an item
    await page.evaluate(() => {
      // Trigger WebSocket message
      // eslint-disable-next-line no-undef
      const event = new CustomEvent('websocket-message', {
        detail: { type: 'item-created', data: { id: '999', name: 'Real-time Item' } }
      });
      // eslint-disable-next-line no-undef
      window.dispatchEvent(event);
    });
    
    // Verify new item appears in list
    await expect(page.locator('[data-testid="item-list"]')).toContainText('Real-time Item');
  });

  test('Handle rate limiting', async ({ page }) => {
    await page.goto('/items');
    
    // Simulate rate limit response
    await page.route('/api/items', route => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      });
    });
    
    // Trigger request
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Verify rate limit message is shown
    await expect(page.locator('[data-testid="toast-warning"]')).toContainText(/rate limit|too many requests/i);
  });

  test('Use cached data when appropriate', async ({ page }) => {
    await page.goto('/items');
    
    // First load - should hit API
    const firstLoadPromise = WaitHelpers.waitForAPIResponse(page, '/api/items', 'GET');
    await page.reload();
    await firstLoadPromise;
    
    // Second load - should use cache (no API call)
    let apiCalled = false;
    await page.route('/api/items', () => {
      apiCalled = true;
    });
    
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Verify API was not called
    expect(apiCalled).toBe(false);
  });

  test('Handle API version mismatch', async ({ page }) => {
    await page.goto('/items');
    
    // Simulate version mismatch
    await page.route('/api/items', route => {
      route.fulfill({
        status: 426,
        headers: { 'X-API-Version': '2.0.0' },
        body: JSON.stringify({ error: 'API version mismatch' }),
      });
    });
    
    // Trigger request
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Verify version mismatch message
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(/version|upgrade required/i);
  });

  test('Retry failed requests', async ({ page }) => {
    await page.goto('/items');
    
    let attempts = 0;
    
    // Simulate intermittent failures
    await page.route('/api/items', route => {
      attempts++;
      if (attempts < 3) {
        route.abort('failed');
      } else {
        route.fulfill({ status: 200, body: JSON.stringify([]) });
      }
    });
    
    // Trigger request
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Verify retry succeeded
    await expect(page.locator('[data-testid="item-list"]')).toBeVisible();
    expect(attempts).toBe(3);
  });
});
