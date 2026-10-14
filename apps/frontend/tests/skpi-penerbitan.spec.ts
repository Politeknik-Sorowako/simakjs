import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000';
let adminToken = '';
let mhsId = 0;
let kegiatanNama = '';

/** Menyiapkan 1 kategori + 1 rekaman kegiatan terverifikasi milik mahasiswa seed. */
async function setupKegiatanTerverifikasi(page: Page): Promise<void> {
  const kat = await page.request.post(`${API_BASE}/skpi/kategori`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { nama: 'Pelatihan Penerbitan', jenis: 'pelatihan', poinDefault: 10 },
  });
  expect(kat.ok()).toBeTruthy();
  const katBody = (await kat.json()) as { id?: number };
  const kategoriId = Number(katBody.id ?? 0);
  expect(kategoriId).toBeGreaterThan(0);

  kegiatanNama = `Seminar OBE E2E ${Date.now()}`;
  const created = await page.request.post(`${API_BASE}/skpi/kegiatan`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: kegiatanNama,
      tanggalMulai: '2026-02-10',
      mahasiswaId: mhsId,
    },
  });
  expect(created.ok()).toBeTruthy();
  const createdBody = (await created.json()) as { id?: number };
  const kegiatanId = Number(createdBody.id ?? 0);
  expect(kegiatanId).toBeGreaterThan(0);

  const verified = await page.request.put(`${API_BASE}/skpi/kegiatan/${kegiatanId}/verifikasi`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { action: 'approve', poin: 10 },
  });
  expect(verified.ok()).toBeTruthy();
}

/** Membuka `/skpi` sebagai admin (cookie JWT + localStorage AuthContext). */
async function gotoSkpiAsAdmin(page: Page): Promise<void> {
  await page.context().addCookies([{ name: 'access_token', value: adminToken, domain: 'localhost', path: '/' }]);
  await page.goto('/login');
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem('token', token);
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, email: 'admin@simak.id', nama: 'Admin', role: 'admin', roles: ['admin'] }),
      );
    },
    { token: adminToken },
  );
  await page.goto('/skpi');
  await expect(page).toHaveURL(/\/skpi$/);
}

test.describe('SKPI Terpadu — tab per peran, tanpa Cetak per entri, penerbitan massal', () => {
  test.beforeAll(async ({ playwright }) => {
    // PRASYARAT LINGKUNGAN: `admin@simak.id` sudah ada — seed sekali via
    // `bun run src/scripts/seed-admin.ts` (pola skpi-cetak-print.spec.ts).
    const ctx = await playwright.request.newContext();
    const admin = await ctx.post(`${API_BASE}/auth/login`, {
      data: { email: 'admin@simak.id', password: 'password123' },
    });
    expect(admin.ok()).toBeTruthy();
    adminToken = ((await admin.json()) as { token?: string }).token ?? '';
    expect(adminToken).toBeTruthy();

    const bootstrap = await ctx.post(`${API_BASE}/e2e/reset`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(bootstrap.ok()).toBeTruthy();
    await ctx.dispose();
  });

  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${API_BASE}/e2e/reset`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data?: { mahasiswaId?: number } };
    mhsId = Number(body.data?.mahasiswaId ?? 0);
    expect(mhsId).toBeGreaterThan(0);
  });

  test('tab bar per peran tampil & regresi: TIDAK ada tombol Cetak per entri kegiatan', async ({ page }) => {
    await setupKegiatanTerverifikasi(page);
    await gotoSkpiAsAdmin(page);

    // Tab bar staf: Rekaman + Verifikasi + Penerbitan.
    const tabBar = page.getByRole('button', { name: 'Rekaman' });
    await expect(tabBar).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Verifikasi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Penerbitan' })).toBeVisible();

    // Tab Rekaman: baris kegiatan TANPA tombol Cetak (cetak kini per mahasiswa).
    const rekamanRow = page.locator('tbody tr', { hasText: kegiatanNama });
    await expect(rekamanRow).toBeVisible();
    await expect(rekamanRow.getByRole('button', { name: 'Cetak' })).toHaveCount(0);

    // Tab Verifikasi: heading + baris TANPA tombol Cetak per entri.
    await page.getByRole('button', { name: 'Verifikasi' }).click();
    await expect(page.getByRole('heading', { name: 'Verifikasi SKPI' })).toBeVisible();
    const verifRow = page.locator('tbody tr', { hasText: kegiatanNama });
    await expect(verifRow).toBeVisible();
    await expect(verifRow.getByRole('button', { name: 'Cetak' })).toHaveCount(0);
    await expect(verifRow.getByRole('button', { name: 'Edit Hasil' })).toBeVisible();
  });

  test('tab Penerbitan: terbitkan tanda tangan lalu buka cetak rekap per mahasiswa', async ({ page }) => {
    await setupKegiatanTerverifikasi(page);
    await gotoSkpiAsAdmin(page);

    await page.getByRole('button', { name: 'Penerbitan' }).click();

    // Daftar mahasiswa dengan ≥1 kegiatan: satu baris siap terbit (syarat min=1).
    const row = page.locator('tbody tr').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row.getByText('Terpenuhi')).toBeVisible();
    await expect(row.getByText('Belum', { exact: true })).toBeVisible(); // status tanda tangan
    await expect(row.getByText('V 1', { exact: true })).toBeVisible(); // hitung terverifikasi

    // Terbitkan (tunggal) → modal konfirmasi → proses → badge Ditandatangani.
    await row.getByRole('button', { name: 'Terbitkan' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Terbitkan' }).click();
    await expect(row.getByText('Ditandatangani')).toBeVisible({ timeout: 15000 });

    // Tombol Cetak per baris (rekap per mahasiswa) membuka /skpi/cetak/:id.
    const popupPromise = page.waitForEvent('popup');
    await row.getByRole('button', { name: 'Cetak' }).click();
    const popup = await popupPromise;
    await popup.waitForURL(/\/skpi\/cetak\/\d+/, { timeout: 15000 });
    await expect(popup.locator('#print-area-skpi')).toBeVisible({ timeout: 15000 });
  });
});
