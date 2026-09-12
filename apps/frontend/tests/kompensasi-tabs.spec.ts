import { expect, test } from '@playwright/test';

test.describe('Kompensasi Saya — Pemisahan Riwayat dengan Tabs', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('tab default adalah Ketidakhadiran dan dapat beralih ke Pelunasan', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/kompensasi-saya');
    await expect(page.locator('h1', { hasText: 'Detail Kompensasi Saya' })).toBeVisible();

    const historyTab = page.getByRole('button', { name: /^Riwayat Ketidakhadiran/ });
    const paymentTab = page.getByRole('button', { name: /^Riwayat Pelunasan/ });
    await expect(historyTab).toBeVisible();
    await expect(paymentTab).toBeVisible();

    // Default tab: Ketidakhadiran
    await expect(page.locator('h2', { hasText: 'Riwayat Ketidakhadiran' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Riwayat Pelunasan Kompensasi' })).toHaveCount(0);

    // Switch to Pelunasan
    await paymentTab.click();
    await expect(page.locator('h2', { hasText: 'Riwayat Pelunasan Kompensasi' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Riwayat Ketidakhadiran' })).toHaveCount(0);

    // Switch back
    await historyTab.click();
    await expect(page.locator('h2', { hasText: 'Riwayat Ketidakhadiran' })).toBeVisible();
  });
});
