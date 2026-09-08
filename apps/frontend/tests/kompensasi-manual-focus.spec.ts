import { expect, test } from '@playwright/test';

test.describe('Kompensasi Manual — Pencarian Fokus', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('mengetik di field pencarian tidak menghilangkan fokus & tidak badai request', async ({ page }) => {
    // Login sebagai admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Buka halaman kompensasi-manual
    await page.goto('/kompensasi-manual');
    const search = page.locator('input#pencarian-kompensasi');
    await expect(search).toBeVisible();

    // Hitung request GET ke /kompensasi-manual sebelum mengetik
    let requestCount = 0;
    page.on('request', (req) => {
      const url = req.url();
      if (req.method() === 'GET' && url.includes('/kompensasi-manual')) {
        requestCount += 1;
      }
    });

    // Ketik teks bertahap di tengah teks yang sudah ada
    await search.click();
    await search.fill('20200001');
    await search.press('End');
    await search.type('0');

    // Fokus harus tetap di field pencarian
    await expect
      .poll(() =>
        page.evaluate(() => {
          const el = document.activeElement;
          return el && el.id === 'pencarian-kompensasi' ? el.id : null;
        }),
      )
      .toBe('pencarian-kompensasi');

    // Pastikan nilai input tetap sesuai yang diketik
    await expect(search).toHaveValue('202000010');

    // Pastikan tidak badai request — setelah jeda debounce hanya ~1 request
    await page.waitForTimeout(700);
    expect(requestCount).toBeLessThanOrEqual(2);
  });
});