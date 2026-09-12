import { expect, test } from '@playwright/test';

test.describe('Bimbingan Akademik — Mahasiswa tanpa Chat', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('chat dihilangkan, mahasiswa dapat merespons sesi dan menandai sudah dibaca', async ({ page, request }) => {
    // Login as admin only to obtain an admin token for cleanup if needed later.
    await page.goto('/login');
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const dosenToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(dosenToken).toBeTruthy();

    const mhsRes = await request.get('http://localhost:3000/mahasiswa?search=20200001', {
      headers: { Authorization: `Bearer ${dosenToken}` },
    });
    expect(mhsRes.ok()).toBeTruthy();
    const mhsBody = (await mhsRes.json()) as { data?: { id: number }[] };
    const mhsId = mhsBody.data?.[0]?.id;
    expect(mhsId).toBeTruthy();

    // Dosen creates a session and sends a thread message to mark bimbingan unread.
    const sesiRes = await request.post(`http://localhost:3000/bimbingan/mahasiswa/${mhsId}/sesi`, {
      headers: { Authorization: `Bearer ${dosenToken}` },
      data: { pertemuanKe: 1, tanggalBimbingan: '2025-03-01', solusi: 'Perbaiki rencana studi.', statusBkd: true },
    });
    expect(sesiRes.ok()).toBeTruthy();

    const threadRes = await request.post(`http://localhost:3000/bimbingan/mahasiswa/${mhsId}/thread`, {
      headers: { Authorization: `Bearer ${dosenToken}` },
      data: { pesan: 'Mohon dibaca catatan bimbingan.', tipe: 'uts' },
    });
    expect(threadRes.ok()).toBeTruthy();

    // Switch to student account
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/bimbingan');
    await expect(page.locator('text=Catatan Dosen PA')).toBeVisible();

    // Chat UI must be gone
    await expect(page.locator('text=Konsultasi Dosen PA')).toHaveCount(0);
    await expect(page.locator('input[placeholder="Tulis pesan bimbingan..."]')).toHaveCount(0);
    await expect(page.locator('text=Tipe Bimbingan:')).toHaveCount(0);

    // Session card is rendered compactly; reply through the detail modal thread.
    await expect(page.locator('text=Pertemuan Ke-1')).toBeVisible();
    await page.getByRole('button', { name: /Detail Sesi & Percakapan/ }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('Tulis balasan...').fill('Baik, akan saya perbaiki.');
    await dialog.getByRole('button', { name: 'Kirim' }).click();
    await expect(dialog.locator('text=Baik, akan saya perbaiki.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Tutup dialog' }).click();

    // Explicit mark-as-read button works
    const markRead = page.getByRole('button', { name: 'Tandai Sudah Dibaca' });
    await expect(markRead).toBeVisible();
    await markRead.click();
    await expect(page.locator('text=✓ Sudah Dibaca')).toBeVisible();
  });
});
