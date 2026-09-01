import { defineConfig } from '@playwright/test';

const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: externalBaseUrl || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
  },
  webServer: externalBaseUrl ? undefined : [
    {
      command: 'npm run dev -w server',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev -w client -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
