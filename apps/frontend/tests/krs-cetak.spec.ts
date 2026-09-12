import { expect, test } from '@playwright/test';

test.describe('KRS — Cetak di Jendela Baru', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('tombol Cetak KRS membuka jendela baru berisi dokumen tanpa layout aplikasi', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/krs');
    const printButton = page.getByRole('button', { name: /Cetak KRS/ }).first();
    await expect(printButton).toBeVisible();

    const [popup] = await Promise.all([page.waitForEvent('popup'), printButton.click()]);
    await popup.waitForLoadState('domcontentloaded');

    expect(popup.url()).toContain('/krs/cetak');
    expect(popup.url()).toContain('mahasiswaId=');

    // Dedicated print document renders and the app shell (sidebar) is absent
    await expect(popup.locator('#print-area-krs')).toBeVisible();
    await expect(popup.locator('h2', { hasText: 'POLITEKNIK SOROWAKO' })).toBeVisible();
    await expect(popup.locator('aside')).toHaveCount(0);
  });
});
