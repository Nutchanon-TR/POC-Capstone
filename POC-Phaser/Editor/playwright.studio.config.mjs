import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataRoot =
  process.env.STUDIO_TEST_DATA_DIR || mkdtempSync(path.join(tmpdir(), 'map-studio-browser-'));

export default defineConfig({
  testDir: './tests/browser',
  testMatch: [
    'map-studio-assets.spec.mjs',
    'map-studio-delete.spec.mjs',
    'map-studio-selection.spec.mjs',
    'map-studio-booths.spec.mjs',
    'map-studio-transform.spec.mjs',
    'shared-assets.spec.mjs',
    'kmutt-map.spec.mjs',
    'map-studio-gestures.spec.mjs',
    'map-studio-zones.spec.mjs',
    'map-studio-colliders.spec.mjs',
    'map-studio-interact.spec.mjs',
    'map-studio-library.spec.mjs',
    'map-studio-order.spec.mjs',
    'map-studio-walk.spec.mjs',
  ],
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:3005',
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start -- --port 3005',
    url: 'http://127.0.0.1:3005/editor',
    env: { MAP_STUDIO_TEST_MODE: '1', MAP_STUDIO_DATA_DIR: dataRoot },
    reuseExistingServer: true,
    timeout: 60000,
  },
});
