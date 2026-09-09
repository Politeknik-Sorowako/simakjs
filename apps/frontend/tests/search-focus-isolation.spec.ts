import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000';
let adminToken = '';

async function gotoAsAdmin(page: Page, path: string) {
  await page.context().addCookies([{ name: 'access_token', value: adminToken, domain: 'localhost', path: '/' }]);
  await page.goto('/login');
  await page.evaluate(({ token }) => {
    localStorage.setItem('token', token);
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 1, email: 'admin@simak.id', nama: 'Admin SIMAK', role: 'admin', roles: ['admin'] }),
    );
  }, { token: adminToken });
  await page.goto(path);
  await expect(page).toHaveURL(path);
}

const TARGET_PAGES: Array<{ name: string; path: string; selector: string }> = [
  { name: 'Apel Verifikasi', path: '/apel/verifikasi', selector: 'input[placeholder="Cari NIM/Nama..."]' },
  {
    name: 'Presensi Unknown',
    path: '/presensi-unknown',
    selector: 'input[placeholder="Cari NIM / Nama mahasiswa..."]',
  },
  { name: 'Laporan Akademik', path: '/laporan/akademik', selector: 'input[placeholder="Filter mata kuliah..."]' },
  { name: 'Laporan Rekap Nilai', path: '/laporan/rekap-nilai', selector: 'input[placeholder="Kode atau Nama MK..."]' },
  { name: 'Laporan Kompensasi', path: '/laporan-kompensasi', selector: 'input[placeholder="Cari NIM atau Nama..."]' },
  { name: 'Penonaktifan (Mahasiswa Keluar)', path: '/penonaktifan', selector: 'input[placeholder="Cari NIM atau nama..."]' },
  {
    name: 'Laporan Presensi Kelas',
    path: '/laporan/presensi-kelas',
    selector: 'input[placeholder="Kode MK, Nama MK, Kelas..."]',
  },
  {
    name: 'Laporan Peringatan',
    path: '/laporan/peringatan',
    selector: 'input[placeholder="Cari NIM, Nama, atau Pelanggaran..."]',
  },
];

test.describe('Search Focus & Table Refresh Isolation', () => {
  test.beforeAll(async ({ playwright }) => {
    // Satu login API untuk seluruh file (hindari rate-limit login),
    // token dipakai untuk otentikasi /e2e/reset dan cookie halaman.
    const ctx = await playwright.request.newContext();
    const login = await ctx.post(`${API_BASE}/auth/login`, {
      data: { email: 'admin@simak.id', password: 'password123' },
    });
    if (!login.ok()) {
      console.log('LOGIN FAILED:', login.status(), await login.text());
    }
    expect(login.ok()).toBeTruthy();
    const body = (await login.json()) as { token?: string };
    expect(body.token).toBeTruthy();
    adminToken = body.token as string;
    await ctx.dispose();
  });

  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${API_BASE}/e2e/reset`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  for (const target of TARGET_PAGES) {
    test(`mengetik di pencarian ${target.name} tidak menghilangkan fokus kursor`, async ({ page }) => {
      await gotoAsAdmin(page, target.path);

      const search = page.locator(target.selector);
      await expect(search).toBeVisible();

      const placeholder = await search.getAttribute('placeholder');

      // Fokus di input pencarian
      await search.click();
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? null))
        .toBe(placeholder);

      // Ketik bertahap sambil menunggu debounce + refetch tabel
      await search.type('a');
      await page.waitForTimeout(450);
      await search.type('b');
      await page.waitForTimeout(450);

      // Fokus harus tetap di input pencarian selama request latar belakang
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? null))
        .toBe(placeholder);

      // Tidak boleh muncul full-screen loading (bubble ke root Suspense)
      const fullScreenLoader = page.locator('.min-h-screen', { hasText: 'Memuat Halaman' });
      await expect(fullScreenLoader).toHaveCount(0);

      // Header & filter bar tetap ter-mount
      await expect(search).toBeVisible();
    });
  }

  test('refresh tabel terisolasi (bukan unmount seluruh halaman) pada halaman laporan', async ({ page }) => {
    for (const target of ['/laporan/akademik', '/laporan/rekap-nilai', '/laporan-kompensasi', '/laporan/peringatan']) {
      await gotoAsAdmin(page, target);

      const input = page.locator('input[placeholder]').first();
      await expect(input).toBeVisible();
      await input.click();

      // Munculkan indikator data (h1 / heading) lalu ketik — heading tidak boleh hilang
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();

      await input.type('tes');
      await page.waitForTimeout(700);

      await expect
        .poll(() => page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? null))
        .not.toBeNull();

      // Heading tetap tampil setelah refetch (halaman tidak di-unmount)
      await expect(heading).toBeVisible();
    }
  });
});
