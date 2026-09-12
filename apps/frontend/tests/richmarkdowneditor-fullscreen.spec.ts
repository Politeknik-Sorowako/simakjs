import { expect, test } from '@playwright/test';

test.describe('RichMarkdownEditor — Mode Layar Penuh', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('tombol layar penuh membuka overlay dan Escape menutupnya', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const dosenToken = await page.evaluate(() => localStorage.getItem('token'));
    const auth = { Authorization: `Bearer ${dosenToken}` };

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', { headers: auth });
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    const createRes = await request.post(`http://localhost:3000/bimbingan/mahasiswa/${mhsId}/sesi`, {
      headers: auth,
      data: { pertemuanKe: 1, tanggalBimbingan: '2025-09-12', solusi: 'Catatan awal', statusBkd: true },
    });
    expect(createRes.ok()).toBeTruthy();

    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/bimbingan');
    await page.getByRole('button', { name: /Detail Sesi & Percakapan/ }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Buka layar penuh.
    const toggle = dialog.getByTestId('rme-fullscreen-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    const overlay = page.getByTestId('rme-fullscreen');
    await expect(overlay).toBeVisible();

    // Editor tetap dapat diisi dalam mode layar penuh.
    await overlay.locator('textarea').fill('**Konten layar penuh**');
    await expect(overlay.locator('textarea')).toHaveValue(/\*\*Konten layar penuh\*\*/);

    // Escape menutup overlay tanpa menutup modal.
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });
});
