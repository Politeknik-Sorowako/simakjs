import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000';
let adminToken = '';
let mhsId = 0;
let kegiatanNama = '';

/**
 * Memuat halaman cetak SKPI sebagai admin (cookie JWT untuk RBAC backend;
 * localStorage hanya state klien AuthContext — pola khs-cetak-persetujuan).
 */
async function gotoCetakAsAdmin(page: Page) {
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
  await page.goto(`/skpi/cetak/${mhsId}`);
  await expect(page).toHaveURL(`/skpi/cetak/${mhsId}`);
}

/** Membuat 1 kategori + 1 rekaman kegiatan terverifikasi milik mahasiswa seed. */
async function setupKegiatanTerverifikasi(page: Page): Promise<void> {
  const kat = await page.request.post(`${API_BASE}/skpi/kategori`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { nama: 'Pelatihan E2E', jenis: 'pelatihan', poinDefault: 10 },
  });
  expect(kat.ok()).toBeTruthy();
  const katBody = (await kat.json()) as { id?: number };
  const kategoriId = Number(katBody.id ?? 0);
  expect(kategoriId).toBeGreaterThan(0);

  kegiatanNama = `Lomba Coding E2E ${Date.now()}`;
  const created = await page.request.post(`${API_BASE}/skpi/kegiatan`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: kegiatanNama,
      tanggalMulai: '2026-01-15',
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

test.describe('SKPI Cetak — tabel riwayat kegiatan tampil di screen & print', () => {
  test.beforeAll(async ({ playwright }) => {
    // PRASYARAT LINGKUNGAN: `admin@simak.id` harus sudah ada — seed sekali via
    // `bun run src/scripts/seed-admin.ts` (pola khs-cetak-persetujuan).
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

  test('tabel pencapaian tampil saat screen dan TETAP tampil pada media print (regresi allowlist CSS)', async ({
    page,
  }) => {
    await setupKegiatanTerverifikasi(page);
    await gotoCetakAsAdmin(page);

    // Layar: tabel riwayat kegiatan tampil berisi rekaman terverifikasi.
    const table = page.locator('#print-area-skpi table');
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.getByText(kegiatanNama)).toBeVisible();
    await expect(table.getByText('Total Poin Pencapaian')).toBeVisible();

    // Print: aturan global @media print menyembunyikan SEMUA tabel kecuali yang
    // terdaftar di allowlist index.css. Regresi: #print-area-skpi pernah lupa
    // didaftarkan sehingga hasil cetak/PDF kehilangan seluruh tabel riwayat.
    await page.emulateMedia({ media: 'print' });
    await expect(table).toBeVisible();
    await expect(table.getByText(kegiatanNama)).toBeVisible();
    await expect(table.getByText('Total Poin Pencapaian')).toBeVisible();

    // Kembali ke layar: tetap konsisten.
    await page.emulateMedia({ media: 'screen' });
    await expect(table).toBeVisible();
  });
});
