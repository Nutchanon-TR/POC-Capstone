import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const base = process.env.SMOKE_URL || 'http://127.0.0.1:3101';
  await page.goto(base);
  await page.locator('[data-phase="ready"]').waitFor();
  assert.equal(await page.locator('canvas').count(), 1);
  assert.equal(await page.evaluate(() => typeof window.__EXHIBITION_GAME__), 'undefined');
  assert.equal(await page.evaluate(() => typeof window.__HALL_SESSION__), 'undefined');
  const voice = page.getByRole('region', { name: 'ห้องเสียง', exact: true });
  await page.locator('.voice-panel[data-presence="connected"]').waitFor();
  await voice.getByRole('button', { name: 'เข้าร่วมห้องเสียง', exact: true }).click();
  await page.locator('.voice-panel[data-voice="connected"]').waitFor();
  assert.equal(
    await voice.getByRole('button', { name: 'เปิดไมค์', exact: true }).getAttribute('aria-pressed'),
    'false',
  );
  await voice.getByRole('button', { name: 'ออกจากห้องเสียง', exact: true }).click();
  assert.equal(await page.locator('[data-voice-audio]').count(), 0);
  await page.screenshot({ path: 'artifacts/production-hall.png' });
  await page.getByRole('link', { name: 'แก้ไขแมป ↗' }).click();
  await page.locator('.editor-canvas canvas').waitFor();
  await page.locator('.editor-canvas[data-phase="ready"]').waitFor();
  await page.getByRole('button', { name: 'booth1-1', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => typeof window.__EXHIBITION_EDITOR__), 'undefined');
  await page.screenshot({ path: 'artifacts/production-editor.png' });
  assert.deepEqual(errors, []);
  console.log(
    'Production hall/editor and muted LiveKit join/leave passed; one canvas, no page errors, no debug handles.',
  );
} finally {
  await browser.close();
}
