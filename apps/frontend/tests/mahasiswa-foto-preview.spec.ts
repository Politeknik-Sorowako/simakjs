import { expect, test } from '@playwright/test';

test.describe('Mahasiswa — Foto Preview & Unduh', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('avatar mahasiswa dapat diklik untuk pratinjau dan menampilkan tombol unduh', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    const auth = { Authorization: `Bearer ${token}` };

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', { headers: auth });
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    // Tetapkan foto agar tombol unduh tampil.
    const upd = await request.put(`http://localhost:3000/mahasiswa/${mhsId}`, {
      headers: auth,
      data: { foto: '/storage/photos/mahasiswa/20200001.jpg' },
    });
    expect(upd.ok()).toBeTruthy();

    await page.goto('/mahasiswa');
    await expect(page.locator('h1', { hasText: 'Data Mahasiswa' })).toBeVisible();

    const avatarButton = page.locator('table tbody button[title]').first();
    await expect(avatarButton).toBeVisible();
    await avatarButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Unduh Foto/ })).toBeVisible();
  });
});
