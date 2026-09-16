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

  test('tabel menyegarkan parsial tanpa unmount halaman penuh saat mengetik', async ({ page }) => {
    // Login sebagai admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/kompensasi-manual');
    const search = page.locator('input#pencarian-kompensasi');
    await expect(search).toBeVisible();

    // Saat data awal selesai dimuat, table harus tampil
    await expect(page.locator('table')).toBeVisible();
    await search.click();

    // Fokus aktif di field pencarian sebelum mengetik
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? null))
      .toBe('pencarian-kompensasi');

    // Ketik bertahap sehingga memicu beberapa putaran debounce + refetch
    await search.type('2020');
    await page.waitForTimeout(450); // melewati jeda debounce 350ms (refetch pertama)
    await search.type('0001');
    await page.waitForTimeout(450); // melewati debounce kedua

    // Assertion selama & sesudah refetch: fokus harus tetap di input
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? null))
      .toBe('pencarian-kompensasi');

    // Tidak boleh muncul full-screen RouteLoadingFallback / layar loading penuh
    const fullScreenLoader = page.locator('.min-h-screen', { hasText: 'Memuat Halaman' });
    await expect(fullScreenLoader).toHaveCount(0);

    // Header bar & filter bar tidak boleh hilang (komponen induk tetap mounted)
    await expect(page.locator('h1', { hasText: 'Kompensasi Manual' })).toBeVisible();
    await expect(search).toBeVisible();

    // Tabel tetap ada (refetch parsial, bukan unmount penuh)
    await expect(page.locator('table')).toBeVisible();
  });

  test('pencarian mahasiswa di dalam modal Tambah Kompensasi tidak me-refresh halaman', async ({ page }) => {
    // Login sebagai admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/kompensasi-manual');

    // Buka modal Tambah Kompensasi
    await page.getByRole('button', { name: /Tambah Kompensasi/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Tambah Kompensasi Manual' });
    await expect(dialog).toBeVisible();

    // Catat URL sebelum mengetik untuk memastikan tidak ada navigasi/refresh penuh
    const urlBefore = page.url();

    // Buka dropdown SearchableSelect mahasiswa dan ketik pencarian
    const combo = dialog.getByRole('combobox');
    await combo.click();
    const mhsSearch = dialog.getByPlaceholder('Ketik untuk mencari...');
    await expect(mhsSearch).toBeFocused();
    await mhsSearch.type('0102');

    // Modal harus tetap terbuka (tidak ter-unmount / tidak refresh)
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Tambah Kompensasi Manual')).toBeVisible();

    // Tidak boleh muncul full-screen RouteLoadingFallback
    const fullScreenLoader = page.locator('.min-h-screen', { hasText: 'Memuat Halaman' });
    await expect(fullScreenLoader).toHaveCount(0);

    // URL tidak berubah (tidak ada refresh/navigasi penuh)
    expect(page.url()).toBe(urlBefore);

    // Fokus tetap terjaga di input pencarian di dalam modal
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? null))
      .toBe('Ketik untuk mencari...');

    // Dropdown tetap menampilkan pilihan (terfilter) atau pesan kosong tanpa menutup modal
    const listbox = dialog.getByRole('listbox');
    await expect(listbox).toBeVisible();
  });
});