import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000';
let adminToken = '';
let mhsToken = '';
let mhsId = 0;

/**
 * Memuat halaman cetak KHS dengan token + peran tertentu. Kepatuhan RBAC
 * backend diuji oleh JWT cookie (`access_token`); localStorage hanya untuk
 * state klien (AuthContext).
 */
async function gotoAsRole(page: Page, path: string, token: string, role: string, email: string) {
  await page.context().addCookies([{ name: 'access_token', value: token, domain: 'localhost', path: '/' }]);
  await page.goto('/login');
  await page.evaluate(
    ({ token, role, email }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: 1, email, nama: role, role, roles: [role] }));
    },
    { token, role, email },
  );
  await page.goto(path);
  await expect(page).toHaveURL(path);
}

/** Intercept jalur tanda tangan: rekam setiap POST penandatanganan. */
async function trackSignPosts(page: Page, sink: string[]) {
  await page.route('**/document-signatures/khs/**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && req.url().endsWith('/sign')) sink.push(req.url());
    await route.continue();
  });
}

test.describe('KHS Cetak — persetujuan tanda tangan eksplisit', () => {
  test.beforeAll(async ({ playwright }) => {
    // Satu login per peran untuk seluruh file (hindari rate-limit login).
    // PRASYARAT LINGKUNGAN: `admin@simak.id` harus sudah ada — seed sekali via
    // `bun run src/scripts/seed-admin.ts` (arahkan DATABASE_URL ke DB test bila
    // memakai DB test). Suite test backend menghapus tabel users, jadi bila login
    // di bawah gagal, jalankan seed-admin ulang lalu run lagi.
    // `mahasiswa@simak.id` baru dibuat oleh /e2e/reset, jadi reset-bootstrap
    // dijalankan SEBELUM login mahasiswa (token berlaku lintas reset — pola
    // yang sama dengan spec lain: login sekali, reset per test).
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

    const mhs = await ctx.post(`${API_BASE}/auth/login`, {
      data: { email: 'mahasiswa@simak.id', password: 'password123' },
    });
    expect(mhs.ok()).toBeTruthy();
    mhsToken = ((await mhs.json()) as { token?: string }).token ?? '';
    expect(mhsToken).toBeTruthy();
    await ctx.dispose();
  });

  test.beforeEach(async ({ request }) => {
    // Reset per test: id mahasiswa berubah tiap seed ulang (sequence tak di-reset),
    // jadi mhsId DIAMBIL dari respons reset — jangan di-hardcode.
    const res = await request.post(`${API_BASE}/e2e/reset`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data?: { mahasiswaId?: number } };
    mhsId = Number(body.data?.mahasiswaId ?? 0);
    expect(mhsId).toBeGreaterThan(0);
  });

  test('memuat halaman cetak tidak menandatangani otomatis; tanda tangan hanya via konfirmasi eksplisit', async ({
    page,
  }) => {
    const signPosts: string[] = [];
    await trackSignPosts(page, signPosts);

    await gotoAsRole(page, `/khs/cetak/${mhsId}/20231`, adminToken, 'admin', 'admin@simak.id');

    // Banner "belum ditandatangani" tampil — halaman dibuka tanpa signature.
    const banner = page.locator('[role="status"]').filter({ hasText: 'Dokumen belum ditandatangani' });
    await expect(banner).toBeVisible();

    // TIDAK ada penandatanganan otomatis saat memuat halaman (regresi perilaku lama:
    // resource signature pernah memanggil POST .../sign sendiri).
    await page.waitForTimeout(500);
    expect(signPosts).toHaveLength(0);

    const bannerButton = banner.getByRole('button', { name: 'Setujui & Tandatangani' });
    await expect(bannerButton).toBeVisible();

    // Batal di modal → tidak ada POST, banner tetap.
    await bannerButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Batal' }).click();
    await expect(dialog).toBeHidden();
    expect(signPosts).toHaveLength(0);
    await expect(banner).toBeVisible();

    // Konfirmasi → modal tertutup setelah selesai, POST sign terjadi,
    // banner hilang, QR tampil.
    await bannerButton.click();
    await dialog.getByRole('button', { name: 'Setujui & Tandatangani' }).click();
    await expect.poll(() => signPosts.length).toBeGreaterThan(0);
    await expect(dialog).toBeHidden({ timeout: 15000 });
    await expect(banner).toBeHidden({ timeout: 15000 });
    await expect(page.locator('img[alt="QR verifikasi dokumen"]')).toBeVisible({ timeout: 15000 });
  });

  test('pemirsa tanpa kewenangan (mahasiswa) melihat banner tanpa tombol persetujuan', async ({ page }) => {
    const signPosts: string[] = [];
    await trackSignPosts(page, signPosts);

    await gotoAsRole(page, `/khs/cetak/${mhsId}/20231`, mhsToken, 'mahasiswa', 'mahasiswa@simak.id');

    const banner = page.locator('[role="status"]').filter({ hasText: 'Dokumen belum ditandatangani' });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Setujui & Tandatangani' })).toHaveCount(0);

    await page.waitForTimeout(500);
    expect(signPosts).toHaveLength(0);
  });

  test('dokumen sudah signed: muat ulang tidak memicu POST baru dan QR tampil', async ({ page }) => {
    const signPosts: string[] = [];
    await trackSignPosts(page, signPosts);

    // Tandatangani dulu via API resmi sebelum halaman dibuka (state signed).
    const signed = await page.request.post(`${API_BASE}/document-signatures/khs/${mhsId}/20231/sign`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(signed.ok()).toBeTruthy();

    await gotoAsRole(page, `/khs/cetak/${mhsId}/20231`, adminToken, 'admin', 'admin@simak.id');

    // Jalur signed: banner "belum ditandatangani" tidak ada, QR langsung tampil
    // (auto-print menunggu signature load, jadi cetakan tidak kehilangan QR).
    await expect(page.locator('[role="status"]').filter({ hasText: 'Dokumen belum ditandatangani' })).toHaveCount(0);
    await expect(page.locator('img[alt="QR verifikasi dokumen"]')).toBeVisible({ timeout: 15000 });

    // Memuat halaman yang sudah signed tidak pernah memicu penandatanganan ulang.
    await page.waitForTimeout(500);
    expect(signPosts).toHaveLength(0);
  });
});
