import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Dashboard
 */
export class DashboardPage {
  readonly page: Page;
  
  // Selectors
  readonly welcomeMessage: Locator;
  readonly profileAvatar: Locator;
  readonly navigationMenu: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.getByRole('heading', { name: /welcome/i });
    this.profileAvatar = page.getByRole('button', { name: /profile/i });
    this.navigationMenu = page.getByRole('navigation');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific section
   */
  async navigateTo(section: string) {
    await this.navigationMenu.getByRole('link', { name: new RegExp(section, 'i') }).click();
  }

  /**
   * Check if dashboard is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.welcomeMessage.isVisible().catch(() => false);
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string | null> {
    return await this.welcomeMessage.textContent();
  }
}
