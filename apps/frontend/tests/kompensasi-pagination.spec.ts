import { expect, test } from '@playwright/test';

test.describe('Kompensasi Saya — Paging Riwayat (Tabs)', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('tab pelunasan memiliki opsi 10/20/50/100 dan pager independen dari ketidakhadiran', async ({
    page,
    request,
  }) => {
    // Login admin to seed payment records for the seeded student
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(mhsRes.ok()).toBeTruthy();
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    for (let i = 0; i < 25; i++) {
      const r = await request.post('http://localhost:3000/presensi/kompensasi/bayar', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          mahasiswaId: mhsId,
          jumlahMenit: 10,
          tanggal: '2026-06-01',
          keterangan: `Pelunasan ${i + 1}`,
        },
      });
      expect(r.ok()).toBeTruthy();
    }

    // Switch to the student account
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/kompensasi-saya');
    await expect(page.locator('h1', { hasText: 'Detail Kompensasi Saya' })).toBeVisible();

    // Default tab is Ketidakhadiran (no pager when empty)
    await expect(page.locator('h2', { hasText: 'Riwayat Ketidakhadiran' })).toBeVisible();
    await expect(page.locator('text=Tidak ada riwayat kompensasi.')).toBeVisible();

    // Switch to Pelunasan tab
    await page.getByRole('button', { name: /^Riwayat Pelunasan/ }).click();
    await expect(page.locator('h2', { hasText: 'Riwayat Pelunasan Kompensasi' })).toBeVisible();

    const pager = page.locator('select').filter({ has: page.locator('option[value="10"]') }).first();
    await expect(pager).toBeVisible();
    expect(await pager.locator('option').allTextContents()).toEqual(['10', '20', '50', '100']);

    const paymentRows = page.locator('table').last().locator('tbody tr');
    await expect(paymentRows).toHaveCount(20);

    await pager.selectOption('50');
    await expect(paymentRows).toHaveCount(25);

    // Switch back: history tab keeps its own (empty) state
    await page.getByRole('button', { name: /^Riwayat Ketidakhadiran/ }).click();
    await expect(page.locator('text=Tidak ada riwayat kompensasi.')).toBeVisible();
  });
});
