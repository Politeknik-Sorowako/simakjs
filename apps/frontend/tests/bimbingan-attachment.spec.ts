import { expect, test } from '@playwright/test';

test.describe('Bimbingan — Rich Text & Lampiran', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('mahasiswa dapat mengunggah lampiran pada sesi bimbingan', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const dosenToken = await page.evaluate(() => localStorage.getItem('token'));
    const auth = { Authorization: `Bearer ${dosenToken}` };

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', { headers: auth });
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    const createRes = await request.post(`http://localhost:3000/bimbingan/mahasiswa/${mhsId}/sesi`, {
      headers: auth,
      data: { pertemuanKe: 1, tanggalBimbingan: '2025-09-12', solusi: '**Catatan penting**', statusBkd: true },
    });
    expect(createRes.ok()).toBeTruthy();

    // Switch to student account.
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/bimbingan');
    await page.getByRole('button', { name: /Detail Sesi & Percakapan/ }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Solusi markdown ter-render.
    await expect(dialog.locator('.markdown-viewer strong', { hasText: 'Catatan penting' })).toBeVisible();

    // Unggah lampiran (PDF ±64KB) melalui tombol toolbar 📎 File pada editor.
    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'dokumen-bimbingan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test lampiran bimbingan'),
    });

    // Link berkas tersisip otomatis ke draft percakapan dengan URL berdomain lengkap.
    const draftValue = await dialog.locator('textarea').first().inputValue();
    expect(draftValue).toContain('[📄 File dokumen-bimbingan.pdf]');
    expect(draftValue).toMatch(/\(https?:\/\/[^)]+\/storage\/bimbingan-attachments\//);

    // Kirim balasan, lalu link unduhan tampil di bubble percakapan.
    await dialog.getByRole('button', { name: 'Kirim' }).click();
    const downloadLink = dialog.getByRole('link', { name: /dokumen-bimbingan.pdf/ });
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('href', /^https?:\/\/.+\/storage\/bimbingan-attachments\//);
  });
});
