import { test, expect } from './studio-test.mjs';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

async function ready(page) {
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
}
async function records(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('connecta-map-studio', 2);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const value = await new Promise((resolve, reject) => {
      const r = db.transaction('maps').objectStore('maps').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return value;
  });
}
test('KMUTT is seeded once as a separate editable map, keeps active work and roundtrips saved exports', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/editor');
  await ready(page);
  await expect(page.locator('.editor-title h1')).toHaveText('Connecta Exhibition');
  await expect(page.locator('.map-list-row')).toHaveCount(2);
  const initial = await records(page),
    original = initial.find((s) => s.record.id === 'local');
  await page.getByRole('button', { name: 'เปิดแมป kmutt', exact: true }).click();
  await ready(page);
  await expect(page.locator('.editor-title h1')).toHaveText('kmutt');
  await expect(page.locator('.editor-map-meta')).toContainText('12 บูธ');
  await page.getByRole('button', { name: 'พื้นที่', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-zone-labels',
    /Registration.*Jobseeker.*Food.*Interview.*Workshop.*Main Stage/,
  );
  await page.getByRole('button', { name: 'เลือก / ย้าย', exact: true }).click();
  await page.getByRole('switch', { name: 'Grid', exact: true }).click();
  if (await page.getByRole('button', { name: 'ปิดคลังชิ้นส่วน', exact: true }).isVisible())
    await page.getByRole('button', { name: 'ปิดคลังชิ้นส่วน', exact: true }).click();
  await page.getByRole('button', { name: 'พับรายการแมป', exact: true }).click();
  await expect
    .poll(async () => {
      const canvasBox = await page.locator('canvas').boundingBox();
      const mountBox = await page.locator('.game-mount').boundingBox();
      return Math.abs(canvasBox.width - mountBox.width);
    })
    .toBeLessThan(2);
  await page.screenshot({ path: 'artifacts/kmutt-editor-overview.png' });
  await page.getByRole('button', { name: 'ทดลองเดินด้วยตัวละคร', exact: true }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-walk-preview', /"x":320/);
  await page.keyboard.down('KeyW');
  await expect
    .poll(async () => JSON.parse(await canvas.getAttribute('data-walk-preview')).y)
    .toBeLessThan(1640);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'artifacts/kmutt-editor-walk.png' });
  await page.getByRole('button', { name: 'ทดลองเดินด้วยตัวละคร', exact: true }).click();
  await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน', exact: true }).click();
  await page
    .locator('.shelf-tabs')
    .getByRole('button', { name: 'รายละเอียด', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'เลือกวัตถุในแมป', exact: true })
    .fill('Company 01 · expo-computer');
  await page
    .locator('.ant-select-dropdown:visible')
    .getByText('KMUTT Company 01 · expo-computer', { exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'ชื่อวัตถุ', exact: true })
    .fill('KMUTT Information Desk');
  await page.getByRole('button', { name: 'ยืนยันชื่อ', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await ready(page);
  await expect(page.locator('.editor-title h1')).toHaveText('kmutt');
  const saved = await records(page);
  expect(saved).toHaveLength(2);
  expect(saved.find((s) => s.record.id === 'local')).toEqual(original);
  const current = saved.find((s) => s.record.id === 'preset-kmutt-jobfair-v1');
  expect(current.record.revision).toBe(2);
  expect(JSON.stringify(current.record.document)).toContain('KMUTT Information Desk');
  await page.locator('.studio-menu summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export ชุด Tiled ZIP', exact: true }).click();
  const download = await pending;
  const files = unzipSync(new Uint8Array(await readFile(await download.path())));
  const restored = JSON.parse(strFromU8(files['map.tmj']));
  const tileset = JSON.parse(strFromU8(files['tilesets/map.tsj']));
  expect(restored.layers).toEqual(current.record.document.layers);
  expect(
    tileset.tiles.some((t) =>
      t.properties.some((p) => p.name === 'assetKey' && p.value === 'kmutt-booth-panel'),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('mobile KMUTT library opens the map and the student can walk using touch controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor');
  await ready(page);
  await page.getByRole('button', { name: 'เปิด / ปิดรายการแมป', exact: true }).click();
  await page.getByRole('button', { name: 'เปิดแมป kmutt', exact: true }).click();
  await ready(page);
  await expect(page.locator('.editor-title h1')).toHaveText('kmutt');
  await page.getByRole('button', { name: 'ทดลองเดินด้วยตัวละคร', exact: true }).click();
  await page.getByRole('button', { name: 'เดินขึ้น', exact: true }).hover();
  await page.mouse.down();
  await expect
    .poll(async () => JSON.parse(await page.locator('canvas').getAttribute('data-walk-preview')).y)
    .toBeLessThan(1650);
  await page.mouse.up();
  await page.screenshot({ path: 'artifacts/kmutt-editor-mobile.png' });
});
