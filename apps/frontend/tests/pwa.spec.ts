import { expect, test } from '@playwright/test';

test.describe('PWA Validation Suite', () => {
  test('should have valid PWA web manifest link and Apple meta tags', async ({ page }) => {
    await page.goto('/login');

    // Check web manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');

    // Check Apple mobile web app capability tags
    const appleCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleCapable).toHaveAttribute('content', 'yes');

    const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(appleTitle).toHaveAttribute('content', 'SIMAK Vokasi');

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute('href', '/apple-touch-icon.png');
  });

  test('should load web manifest JSON with valid PWA properties', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toContain('SIMAK Vokasi');
    expect(manifest.short_name).toBe('SIMAK Vokasi');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });
});
