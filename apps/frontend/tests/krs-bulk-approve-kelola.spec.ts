import { expect, test } from '@playwright/test';

test.describe('KRS — Approve Massal di Tab Kelola', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  async function seedPendingKrs(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    const auth = { Authorization: `Bearer ${token}` };

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', { headers: auth });
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    const mkRes = await request.get('http://localhost:3000/mata-kuliah?limit=100', { headers: auth });
    const mkBody = (await mkRes.json()) as { data?: { id: number }[] };
    const mkId = mkBody.data?.[0]?.id;
    expect(mkId).toBeTruthy();

    const kelasARes = await request.get('http://localhost:3000/kelas-kuliah?limit=100', { headers: auth });
    const kelasABody = (await kelasARes.json()) as { data?: { id: number }[] };
    const kelasA = kelasABody.data?.[0]?.id;
    expect(kelasA).toBeTruthy();

    const kelasBRes = await request.post('http://localhost:3000/kelas-kuliah', {
      headers: auth,
      data: { mataKuliahId: mkId, periodeId: '20231', namaKelas: '1B' },
    });
    expect(kelasBRes.ok()).toBeTruthy();
    const kelasB = ((await kelasBRes.json()) as { id: number }).id;

    for (const kelasId of [kelasA, kelasB]) {
      const r = await request.post('http://localhost:3000/krs', {
        headers: auth,
        data: { mahasiswaId: mhsId, kelasKuliahId: kelasId },
      });
      expect(r.ok()).toBeTruthy();
    }
  }

  test('admin dapat menyetujui semua KRS pending tercentang sekaligus', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await seedPendingKrs(page, request);

    await page.goto('/krs');
    await expect(page.locator('h1', { hasText: 'Kontrak Rencana Studi' })).toBeVisible();

    // Two pending rows are present.
    await expect(page.locator('table tbody').getByText('Pending')).toHaveCount(2);

    // Select all pending rows via the header checkbox.
    await page.locator('table thead input[type="checkbox"]').check();

    const approveButton = page.getByRole('button', { name: /Setujui Terpilih/ });
    await expect(approveButton).toBeEnabled();
    await approveButton.click();

    await expect(page.locator('table tbody').getByText('Pending')).toHaveCount(0);
    await expect(page.locator('table tbody').getByText('Disetujui').first()).toBeVisible();
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
  });
});
