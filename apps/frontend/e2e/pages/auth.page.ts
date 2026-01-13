import { Locator, Page } from '@playwright/test';

/**
 * Page Object Model for Authentication Pages
 * Encapsulates selectors and actions for sign-in/sign-up flows
 */
export class AuthPage {
  readonly page: Page;

  // Selectors
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signOutButton: Locator;
  readonly errorMessage: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email', { exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.signOutButton = page.getByRole('button', { name: 'Sign Out' });
    this.errorMessage = page.getByRole('alert');
    this.validationErrors = page.locator('[role="alert"]');
  }

  /**
   * Navigate to sign-in page
   */
  async goto(): Promise<void> {
    await this.page.goto('/auth/signin');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sign in with credentials
   */
  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuth(): Promise<void> {
    await this.page.waitForURL('**/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.signOutButton.click();
    await this.page.waitForURL('**/auth/signin');
  }

  /**
   * Check if signed in
   */
  async isSignedIn(): Promise<boolean> {
    return await this.signOutButton.isVisible().catch(() => false);
  }

  /**
   * Get validation error for specific field
   */
  async getFieldError(fieldLabel: string): Promise<string | null> {
    const field = this.page.getByLabel(fieldLabel);
    const errorId = await field.getAttribute('aria-describedby');
    if (!errorId) return null;
    return await this.page.locator(`#${errorId}`).textContent();
  }

  /**
   * Get all validation errors
   */
  async getAllErrors(): Promise<string[]> {
    const errors = await this.validationErrors.allTextContents();
    return errors.filter((e) => e.trim().length > 0);
  }
}
