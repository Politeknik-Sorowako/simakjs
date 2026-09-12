import { expect, test } from '@playwright/test';

test.describe('KRS Mandiri — Toggle Pengaturan Sistem', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('saat dinonaktifkan, tombol kontrak KRS disembunyikan dan banner tampil', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const adminToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(adminToken).toBeTruthy();

    const setRes = await request.put('http://localhost:3000/system/parameters/KRS_MANDIRI_ENABLED', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { value: 'false' },
    });
    expect(setRes.ok()).toBeTruthy();

    try {
      await page.click('text=Logout');
      await expect(page).toHaveURL(/\/login/);
      await page.fill('input[type="email"]', 'mahasiswa@simak.id');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/dashboard/);

      await page.goto('/krs');
      await expect(page.locator('text=Pengisian KRS Mandiri Dinonaktifkan')).toBeVisible();
      await expect(page.getByRole('button', { name: /Kontrak KRS/ })).toHaveCount(0);
    } finally {
      // Restore flag so it does not leak to other tests (system_settings is not reset by /e2e/reset)
      await request.put('http://localhost:3000/system/parameters/KRS_MANDIRI_ENABLED', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { value: 'true' },
      });
    }
  });
});
