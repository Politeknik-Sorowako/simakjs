import { expect, test } from '@playwright/test';

test.describe('Bimbingan Akademik — Mahasiswa', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('halaman /bimbingan termuat tanpa error boundary untuk role mahasiswa', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/bimbingan');
    await expect(page).toHaveURL(/\/bimbingan/);

    // Must not hit the global ErrorBoundary fallback nor a TDZ ReferenceError
    await expect(page.locator('text=Terjadi Kendala Memuat Halaman')).toHaveCount(0);
    await expect(page.locator('text=Cannot access')).toHaveCount(0);
    expect(pageErrors.filter((m) => m.includes('before initialization'))).toHaveLength(0);

    // Student view must render its chat panel
    await expect(page.locator('text=Konsultasi Dosen PA')).toBeVisible();
  });
});
