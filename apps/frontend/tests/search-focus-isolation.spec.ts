import { expect, test, type Page } from '@playwright/test';

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
  { name: 'Laporan Peringatan', path: '/laporan/peringatan', selector: 'input[placeholder="Cari NIM, Nama, atau Pelanggaran..."]' },
];

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@simak.id');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Search Focus & Table Refresh Isolation', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  for (const target of TARGET_PAGES) {
    test(`mengetik di pencarian ${target.name} tidak menghilangkan fokus kursor`, async ({ page }) => {
      await loginAdmin(page);
      await page.goto(target.path);

      const search = page.locator(target.selector);
      await expect(search).toBeVisible();

      // Fokus di input pencarian
      await search.click();
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? null))
        .toBe(search.getAttribute('placeholder').then((p) => p ?? null));

      // Ketik bertahap sambil menunggu debounce + refetch tabel
      await search.type('a');
      await page.waitForTimeout(450);
      await search.type('b');
      await page.waitForTimeout(450);

      // Fokus harus tetap di input pencarian selama request latar belakang
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? null))
        .toBe(search.getAttribute('placeholder').then((p) => p ?? null));

      // Tidak boleh muncul full-screen loading (bubble ke root Suspense)
      const fullScreenLoader = page.locator('.min-h-screen', { hasText: 'Memuat Halaman' });
      await expect(fullScreenLoader).toHaveCount(0);

      // Header & filter bar tetap ter-mount
      await expect(search).toBeVisible();
    });
  }

  test('refresh tabel terisolasi (bukan unmount seluruh halaman) pada halaman laporan', async ({ page }) => {
    await loginAdmin(page);

    for (const target of ['/laporan/akademik', '/laporan/rekap-nilai', '/laporan-kompensasi', '/laporan/peringatan']) {
      await page.goto(target);

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