import { expect, test } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the home page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Next Node App Base/);

    const heading = page.getByRole('heading', { name: 'Next Node App Base' });
    await expect(heading).toBeVisible();
  });

  test('should show sign in button when not authenticated', async ({ page }) => {
    await page.goto('/');

    const signInButton = page.getByRole('link', { name: 'Sign In' });
    await expect(signInButton).toBeVisible();
  });

  test('should display feature grid', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Turborepo')).toBeVisible();
    await expect(page.getByText('Next.js 15')).toBeVisible();
    await expect(page.getByText('Node.js 25')).toBeVisible();
    await expect(page.getByText('Prisma ORM')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TypeScript' })).toBeVisible();
    await expect(page.getByText('Testing')).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/');

    const signInButton = page.getByRole('link', { name: 'Sign In' });
    await signInButton.click();

    await expect(page).toHaveURL('/auth/signin', { timeout: 15_000 });
  });
});
