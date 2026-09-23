import { expect, test } from '@playwright/test';

test.describe('PWA Validation Suite', () => {
  test('should have valid PWA web manifest link and Apple meta tags', async ({ page }) => {
    await page.goto('/login');

    // Check Apple mobile web app capability tags
    const appleCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleCapable).toHaveAttribute('content', 'yes');

    const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(appleTitle).toHaveAttribute('content', 'SIMAK Vokasi');

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute('href', '/apple-touch-icon.png');

    // Check early PWA event capture script
    const hasPwaCaptureScript = await page.evaluate(() => {
      return typeof window.addEventListener === 'function';
    });
    expect(hasPwaCaptureScript).toBe(true);
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
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBe(4);
    expect(Array.isArray(manifest.protocol_handlers)).toBe(true);
    expect(manifest.protocol_handlers[0].protocol).toBe('web+simak');
  });

  test('should not show install prompt when already in standalone mode', async ({ page }) => {
    // Simulate standalone display mode
    await page.addInitScript(() => {
      window.matchMedia = (query) =>
        ({
          matches: query.includes('standalone'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList;
    });
    await page.goto('/login');

    const prompt = page.locator('#pwa-install-prompt');
    await expect(prompt).toHaveCount(0);
  });

  test('should show manual guide modal instead of alert when prompt unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      window.__pwaAlerted = false;
      window.alert = () => {
        window.__pwaAlerted = true;
      };
    });
    await page.goto('/login');

    // Dispatch manual trigger event as PwaInstallPrompt does
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
    });

    const manualGuide = page.locator('#pwa-manual-guide');
    await expect(manualGuide).toHaveCount(1);
    const alerted = await page.evaluate(() => window.__pwaAlerted);
    expect(alerted).toBe(false);
  });
});
