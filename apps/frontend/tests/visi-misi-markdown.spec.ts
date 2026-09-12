import { expect, test } from '@playwright/test';

test.describe('Visi Misi Prodi — Rich Markdown Editor', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('editor markdown menyediakan pratinjau terformat', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/visi-misi-prodi');
    await page.getByRole('button', { name: /Tambah Visi Misi/ }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Editor markdown pertama adalah field Visi.
    const visiEditor = dialog.locator('textarea').first();
    await visiEditor.fill('**Visi Unggul**\n- Inovasi\n- Kolaborasi');

    // Tombol pratinjau pertama (field Visi).
    await dialog.getByRole('button', { name: 'Pratinjau' }).first().click();

    await expect(dialog.locator('.markdown-viewer strong', { hasText: 'Visi Unggul' })).toBeVisible();
    await expect(dialog.locator('.markdown-viewer li', { hasText: 'Inovasi' })).toBeVisible();
  });
});
