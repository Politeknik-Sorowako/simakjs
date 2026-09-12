import { expect, test } from '@playwright/test';

test.describe('Bimbingan — Modal Detail Sesi & Thread Percakapan', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('kartu sesi ringkas membuka modal, balasan & status baca terbarui', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const dosenToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(dosenToken).toBeTruthy();
    const auth = { Authorization: `Bearer ${dosenToken}` };

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', { headers: auth });
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    // Dosen membuat sesi bimbingan.
    const createRes = await request.post(`http://localhost:3000/bimbingan/mahasiswa/${mhsId}/sesi`, {
      headers: auth,
      data: { pertemuanKe: 1, tanggalBimbingan: '2025-09-10', solusi: 'Perbaiki rencana studi.', statusBkd: true },
    });
    expect(createRes.ok()).toBeTruthy();

    const bimbRes = await request.get(`http://localhost:3000/bimbingan/mahasiswa/${mhsId}`, { headers: auth });
    const bimbBody = (await bimbRes.json()) as { sesi?: { id: number }[] };
    const sesiId = bimbBody.sesi?.[0]?.id;
    expect(sesiId).toBeTruthy();

    // Dosen mengirim balasan pada sesi.
    const replyRes = await request.post(`http://localhost:3000/bimbingan/sesi/${sesiId}/balasan`, {
      headers: auth,
      data: { pesan: 'Mohon dibaca dan ditindaklanjuti.' },
    });
    expect(replyRes.ok()).toBeTruthy();

    // Switch to student account.
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/bimbingan');
    await expect(page.locator('text=Catatan Dosen PA')).toBeVisible();

    // Kartu sesi ringkas dengan indikator belum dibaca.
    await expect(page.locator('text=Pertemuan Ke-1')).toBeVisible();
    await expect(page.locator('text=• Belum dibaca')).toBeVisible();

    // Buka popup modal detail sesi.
    await page.getByRole('button', { name: /Detail Sesi & Percakapan/ }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=Detail Sesi Pertemuan Ke-1')).toBeVisible();
    await expect(dialog.locator('text=Perbaiki rencana studi.')).toBeVisible();
    await expect(dialog.locator('text=Mohon dibaca dan ditindaklanjuti.')).toBeVisible();

    // Status baca otomatis terbarui saat modal dibuka.
    await expect(dialog.locator('text=✓ Dibaca')).toBeVisible();

    // Mahasiswa membalas dari dalam modal.
    await dialog.getByPlaceholder('Tulis balasan...').fill('Baik, akan saya perbaiki.');
    await dialog.getByRole('button', { name: 'Kirim' }).click();
    await expect(dialog.locator('text=Baik, akan saya perbaiki.')).toBeVisible();

    // Tutup modal.
    await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
    await expect(dialog).toHaveCount(0);

    // Dosen melihat balasan mahasiswa melalui modal.
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/bimbingan');

    // Kartu monitoring diringkas: avatar, nama & NIM, Dosen PA, dan jumlah bimbingan.
    const listItem = page.getByRole('button', { name: /Mahasiswa Bimbingan/ }).first();
    await expect(listItem).toContainText('NIM:');
    await expect(listItem).toContainText('PA:');
    await expect(listItem).toContainText('x Bimbingan (Semester Ini)');
    await expect(listItem.locator('button[title]')).toHaveCount(1);

    // Badge kelayakan & status baca mahasiswa sudah dihilangkan dari daftar.
    await expect(listItem.getByText('Belum', { exact: true })).toHaveCount(0);
    await expect(listItem.getByText('Layak', { exact: true })).toHaveCount(0);
    await expect(page.locator('text=• Belum Dibaca Mahasiswa')).toHaveCount(0);

    // Klik avatar membuka modal preview foto tanpa memicu pemilihan baris.
    await listItem.locator('button[title]').click();
    const photoDialog = page.locator('[role="dialog"]');
    await expect(photoDialog).toBeVisible();
    await photoDialog.getByRole('button', { name: 'Tutup dialog' }).click();
    await expect(photoDialog).toHaveCount(0);

    await listItem.click();
    await page.getByRole('button', { name: /Detail Sesi & Percakapan/ }).first().click();
    await expect(page.locator('[role="dialog"]').locator('text=Baik, akan saya perbaiki.')).toBeVisible();
  });
});
