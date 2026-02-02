import { Locator, Page, Response, WebSocket } from '@playwright/test';

/**
 * Test Data Utilities
 * Provides consistent test data across E2E tests
 */
export class TestData {
  /**
   * Get valid user credentials
   */
  static getValidUser(): { email: string; password: string; name: string } {
    return {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };
  }

  /**
   * Get admin user credentials
   */
  static getAdminUser(): { email: string; password: string; name: string; role: string } {
    return {
      email: 'admin@example.com',
      password: 'Admin123!',
      name: 'Admin User',
      role: 'ADMIN',
    };
  }

  /**
   * Generate random email
   */
  static generateEmail(): string {
    return `test-${Date.now()}@example.com`;
  }

  /**
   * Generate random name
   */
  static generateName(): string {
    return `Test User ${Date.now()}`;
  }

  /**
   * Get invalid credentials for testing error cases
   */
  static getInvalidCredentials(): Array<{ email: string; password: string; expected: string }> {
    return [
      { email: 'test@example.com', password: 'wrong', expected: 'Invalid credentials' },
      { email: 'notanemail', password: 'Test123!', expected: 'Invalid email format' },
      { email: '', password: 'Test123!', expected: 'Email is required' },
      { email: 'test@example.com', password: '', expected: 'Password is required' },
    ];
  }
}

/**
 * Authentication Helpers
 * Common authentication actions for E2E tests
 */
export class AuthHelpers {
  /**
   * Sign in as test user via API
   * Faster than UI login for setup
   */
  static async signInViaAPI(page: Page, email?: string, password?: string): Promise<void> {
    const user = TestData.getValidUser();
    const effectiveEmail = email ?? user.email;
    const effectivePassword = password ?? user.password;
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

    // Call backend login endpoint to receive HttpOnly cookies
    const response = await page.request.post(`${baseUrl}/api/auth/login`, {
      data: {
        email: effectiveEmail,
        password: effectivePassword,
      },
    });

    if (!response.ok()) {
      throw new Error('Failed to sign in via API');
    }

    // Extract Set-Cookie headers and set them in the browser context
    const setCookieHeaders = response
      .headersArray()
      .filter((h) => h.name.toLowerCase() === 'set-cookie')
      .map((h) => h.value);

    const cookiesToSet: Array<{ name: string; value: string; domain: string; path: string }> = [];
    for (const raw of setCookieHeaders) {
      // Example: access_token=...; Path=/; HttpOnly; SameSite=Lax
      const [pair] = raw.split(';');
      if (!pair) continue;
      const idx = pair.indexOf('=');
      if (idx <= 0) continue;
      const name = pair.substring(0, idx).trim();
      const value = pair.substring(idx + 1).trim();
      if (name === 'access_token' || name === 'refresh_token') {
        cookiesToSet.push({ name, value, domain: 'localhost', path: '/' });
      }
    }

    if (cookiesToSet.length) {
      await page.context().addCookies(cookiesToSet);
    }
  }

  /**
   * Clear authentication state
   */
  static async clearAuth(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();

      sessionStorage.clear();
    });
  }
}

/**
 * Wait Helpers
 * Common wait conditions for E2E tests
 */
export class WaitHelpers {
  /**
   * Wait for API request to complete
   */
  static async waitForAPIResponse(
    page: Page,
    urlPattern: string | RegExp,
    timeout?: number
  ): Promise<Response>;

  static async waitForAPIResponse(
    page: Page,
    urlPattern: string | RegExp,
    method?: string,
    timeout?: number
  ): Promise<Response>;

  static async waitForAPIResponse(
    page: Page,
    urlPattern: string | RegExp,
    methodOrTimeout: string | number = 10000,
    timeoutArg?: number
  ): Promise<Response> {
    const method = typeof methodOrTimeout === 'string' ? methodOrTimeout : undefined;
    const timeout = typeof methodOrTimeout === 'number' ? methodOrTimeout : (timeoutArg ?? 10000);

    return await page.waitForResponse(
      (response) => {
        if (method && response.request().method() !== method) return false;
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Wait for WebSocket connection
   */
  static async waitForWebSocket(page: Page, timeout = 10000): Promise<WebSocket> {
    return await page.waitForEvent('websocket', { timeout });
  }

  /**
   * Wait for loading indicator to disappear
   */
  static async waitForLoadingComplete(page: Page): Promise<void> {
    await page.waitForSelector('[data-loading="true"]', { state: 'hidden' });
  }

  /**
   * Wait for toast notification
   */
  static async waitForToast(page: Page, message?: string): Promise<Locator> {
    const toast = page.getByRole('status').filter({ hasText: message });
    await toast.waitFor({ state: 'visible' });
    return toast;
  }
}

/**
 * Screenshot Helpers
 * Utilities for taking screenshots during tests
 */
export class ScreenshotHelpers {
  /**
   * Take full page screenshot
   */
  static async takeFullPageScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Take element screenshot
   */
  static async takeElementScreenshot(page: Page, selector: string, name: string): Promise<void> {
    const element = page.locator(selector);
    await element.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
    });
  }
}

/**
 * Accessibility Helpers
 * Utilities for accessibility testing
 */
export class AccessibilityHelpers {
  /**
   * Check keyboard navigation
   */
  static async testKeyboardNavigation(
    page: Page,
    expectedFocusableCount: number
  ): Promise<boolean> {
    let focusableCount = 0;

    for (let i = 0; i < expectedFocusableCount * 2; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => globalThis.document.activeElement?.tagName);
      if (focused && focused !== 'BODY') {
        focusableCount++;
      }
    }

    return focusableCount >= expectedFocusableCount;
  }

  /**
   * Get ARIA role of element
   */
  static async getARIARole(page: Page, selector: string): Promise<string | null> {
    return await page.locator(selector).getAttribute('role');
  }

  /**
   * Check if element has accessible name
   */
  static async hasAccessibleName(page: Page, selector: string): Promise<boolean> {
    const element = page.locator(selector);
    const ariaLabel = await element.getAttribute('aria-label');
    const ariaLabelledBy = await element.getAttribute('aria-labelledby');
    const title = await element.getAttribute('title');

    return !!(ariaLabel || ariaLabelledBy || title);
  }
}
