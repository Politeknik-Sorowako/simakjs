import { test, expect } from '@playwright/test';

test('basic test to check server availability', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('text=SIMAK')).toBeVisible();
});
