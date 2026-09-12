import { expect, test } from '@playwright/test';

test.describe('KRS — Persetujuan Massal di Tab Massal', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  async function seedPendingKrs(
    page: import('@playwright/test').Page,
    request: import('@playwright/test').APIRequestContext,
  ) {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    const auth = { Authorization: `Bearer ${token}` };

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', { headers: auth });
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    const kelasRes = await request.get('http://localhost:3000/kelas-kuliah?limit=100', { headers: auth });
    const kelasBody = (await kelasRes.json()) as { data?: { id: number }[] };
    const kelasId = kelasBody.data?.[0]?.id;
    expect(kelasId).toBeTruthy();

    const r = await request.post('http://localhost:3000/krs', {
      headers: auth,
      data: { mahasiswaId: mhsId, kelasKuliahId: kelasId },
    });
    expect(r.ok()).toBeTruthy();
  }

  test('tab Kelola bersih, tab Massal punya Pilih Semua dan tombol Setujui Terpilih', async ({
    page,
    request,
  }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await seedPendingKrs(page, request);
    await page.goto('/krs');
    await expect(page.locator('h1', { hasText: 'Kontrak Rencana Studi' })).toBeVisible();

    // Tab Kelola (default) tidak memiliki kontrol seleksi massal.
    await expect(page.locator('table thead input[type="checkbox"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Setujui Terpilih/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Setujui KRS Terpilih/ })).toHaveCount(0);

    // Pindah ke tab Persetujuan Massal KRS.
    await page.getByRole('button', { name: 'Persetujuan Massal KRS' }).click();
    await expect(page.getByText('Daftar Mahasiswa dengan KRS Pending')).toBeVisible();

    // Header checkbox "Pilih Semua" tersedia.
    await expect(page.locator('table thead input[type="checkbox"]')).toHaveCount(1);

    const toggle = page.getByRole('button', { name: 'Centang Semua' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Batal Centang' })).toBeVisible();

    const approve = page.getByRole('button', { name: /Setujui KRS Terpilih/ });
    await expect(approve).toBeEnabled();

    // Approve memicu dialog konfirmasi.
    page.on('dialog', (dialog) => dialog.accept());
    await approve.click();

    await expect(page.locator('text=Tidak ada mahasiswa dengan kontrak KRS pending')).toBeVisible();
  });

  test('mahasiswa tidak melihat kontrol seleksi massal', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/krs');
    await expect(page.locator('h1', { hasText: 'Kontrak Rencana Studi' })).toBeVisible();
    await expect(page.locator('table thead input[type="checkbox"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Setujui Terpilih/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Setujui KRS Terpilih/ })).toHaveCount(0);
  });
});
