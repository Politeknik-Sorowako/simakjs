import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Jalankan secara berurutan agar status DB konsisten
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bun run dev > backend.log 2>&1',
      cwd: '../backend',
      url: 'http://localhost:3000/swagger',
      reuseExistingServer: false,
    },
    {
      command: 'bun run dev',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
    }
  ],
});
