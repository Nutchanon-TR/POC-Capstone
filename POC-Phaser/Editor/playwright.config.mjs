import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run api:dev',
      url: 'http://127.0.0.1:3102/maps/default',
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: 'npm run dev -- --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: true,
      timeout: 120000,
      env: { NEXT_PUBLIC_GAME_DEBUG: '1' },
    },
  ],
});
