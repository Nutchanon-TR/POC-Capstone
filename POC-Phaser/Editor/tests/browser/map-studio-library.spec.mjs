import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

const ready = (page) =>
  expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute('data-phase', 'ready');
async function createMap(page, name, size = 16, width = 20, height = 12, floor = false) {
  if (
    (await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).count()) === 0 ||
    !(await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).isVisible())
  )
    await page.getByRole('button', { name: 'เปิด / ปิดรายการแมป' }).click();
  await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).click();
  await page.getByRole('textbox', { name: 'ชื่อแมปใหม่', exact: true }).fill(name);
  await page.getByRole('spinbutton', { name: 'ความกว้างแมปใหม่' }).fill(String(width));
  await page.getByRole('spinbutton', { name: 'ความสูงแมปใหม่' }).fill(String(height));
  await page.getByRole('combobox', { name: 'Tile size แมปใหม่' }).click();
  await page.locator('.ant-select-dropdown').getByText(`${size} px`, { exact: true }).click();
  if (floor) {
    await page.getByRole('combobox', { name: 'พื้นแมปใหม่' }).click();
    await page
      .locator('.ant-select-dropdown')
      .getByText('floor-ivory-center', { exact: true })
      .click();
  }
  await page.getByRole('button', { name: 'สร้างแมป', exact: true }).click();
  await expect(page.locator('.editor-title h1')).toHaveText(name);
  await ready(page);
}
async function point(page, x, y, width = 320, height = 192) {
  const b = await page.locator('canvas').boundingBox(),
    z = Math.min((b.width - 80) / width, (b.height - 80) / height);
  return {
    x: b.x + b.width / 2 + (x - width / 2) * z,
    y: b.y + b.height / 2 + (y - height / 2) * z,
  };
}
async function exportFile(page, name = 'Export TMJ') {
  await page.locator('.studio-menu summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const file = await (await pending).path();
  await page.locator('.studio-menu summary').click();
  return readFile(file);
}
async function snapshots(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('connecta-map-studio');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const r = db.transaction('maps').objectStore('maps').getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
test('Codex-style map list, per-map drafts/undo, independent duplicate and reload persistence', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/editor');
  await ready(page);
  await expect(page.locator('.map-activity-rail button')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'จัดการ asset', exact: true })).toBeVisible();
  await expect(page.locator('.map-list-row')).toHaveCount(1);
  await expect(page.locator('.map-open-button img')).toHaveAttribute('src', /^data:image\/png/);
  await expect(page.locator('.map-open-button time')).toHaveAttribute('datetime', /T/);
  await page.getByRole('button', { name: 'พับรายการแมป' }).click();
  await expect(page.locator('.map-library-panel')).toBeHidden();
  await page.getByRole('button', { name: 'เปิด / ปิดรายการแมป' }).click();
  await createMap(page, 'แมป A');
  await page.getByRole('button', { name: 'table-long-v', exact: true }).click();
  const at = await point(page, 99, 51);
  await page.mouse.click(at.x, at.y);
  await expect(page.locator('.editor-map-meta')).toContainText('1 ชิ้น');
  await page.getByRole('button', { name: 'เปิดแมป Connecta Exhibition', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('button', { name: 'เปิดแมป แมป A', exact: true })).toContainText(
    'ยังไม่บันทึก',
  );
  await page.getByRole('button', { name: 'เปิดแมป แมป A', exact: true }).click();
  await ready(page);
  await expect(page.locator('.editor-map-meta')).toContainText('1 ชิ้น');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.editor-map-meta')).toContainText('0 ชิ้น');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.editor-map-meta')).toContainText('1 ชิ้น');
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.getByRole('button', { name: 'Duplicate แมป แมป A', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อแมปใหม่', exact: true }).fill('แมป A สำเนา');
  await page.getByRole('button', { name: 'สร้างสำเนาแมป', exact: true }).click();
  await ready(page);
  await expect(page.locator('.editor-title h1')).toHaveText('แมป A สำเนา');
  await expect(page.locator('.map-list-row')).toHaveCount(3);
  const chosen = await point(page, 108, 60);
  await page.mouse.click(chosen.x, chosen.y);
  await page.getByRole('button', { name: 'ลบชิ้นส่วนที่เลือก', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.getByRole('button', { name: 'เปิดแมป แมป A', exact: true }).click();
  await ready(page);
  await expect(page.locator('.editor-map-meta')).toContainText('1 ชิ้น');
  await page.reload();
  await ready(page);
  await expect(page.locator('.editor-title h1')).toHaveText('แมป A');
  const stored = await snapshots(page);
  expect(stored).toHaveLength(3);
  expect(new Set(stored.map((s) => s.record.id)).size).toBe(3);
  expect(
    stored
      .find((s) => s.record.name === 'แมป A')
      .record.document.layers.flatMap((l) => l.objects ?? [])
      .filter((o) => o.gid),
  ).toHaveLength(1);
  expect(
    stored
      .find((s) => s.record.name === 'แมป A สำเนา')
      .record.document.layers.flatMap((l) => l.objects ?? [])
      .filter((o) => o.gid),
  ).toHaveLength(0);
  await page.screenshot({ path: 'artifacts/map-library-desktop.png' });
  expect(errors).toEqual([]);
});

test('16/64/128px maps paint the correct rectangle and export matching native floor PNGs', async ({
  page,
}) => {
  await page.goto('/editor');
  await ready(page);
  for (const size of [16, 64, 128]) {
    await createMap(page, `Tile ${size}`, size, 12, 10, true);
    await page.getByText('Floor', { exact: true }).first().click();
    await page.getByRole('button', { name: 'floor-wood-center', exact: true }).click();
    const begin = await point(page, size + 2, size + 2, 12 * size, 10 * size),
      end = await point(page, 3 * size + 2, 2 * size + 2, 12 * size, 10 * size);
    await page.mouse.move(begin.x, begin.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 6 });
    await page.mouse.up();
    const files = unzipSync(new Uint8Array(await exportFile(page, 'Export ชุด Tiled ZIP')));
    const doc = JSON.parse(strFromU8(files['map.tmj'])),
      set = JSON.parse(strFromU8(files['tilesets/map.tsj']));
    expect(doc).toMatchObject({ width: 12, height: 10, tilewidth: size, tileheight: size });
    const floor = set.tiles.find(
      (t) => t.properties.find((p) => p.name === 'assetKey')?.value === 'floor-wood-center',
    );
    expect(doc.layers[0].data.filter((gid) => gid === floor.id + 1)).toHaveLength(6);
    expect(floor).toMatchObject({ imagewidth: size, imageheight: size });
    expect(set.tileheight).toBeGreaterThanOrEqual(size);
    expect(set.tilewidth).toBe(Math.max(...set.tiles.map((t) => t.imagewidth)));
    const png = files[`images/tile-${floor.id + 1}.png`],
      view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(size);
    expect(view.getUint32(20)).toBe(size);
    await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
    await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  }
  await page.getByRole('button', { name: 'เปิดแมป Connecta Exhibition', exact: true }).click();
  await ready(page);
  const original = JSON.parse((await exportFile(page)).toString());
  expect(original.tilewidth).toBe(32);
  expect(
    (await snapshots(page)).map((s) => s.record.document.tilewidth).sort((a, b) => a - b),
  ).toEqual([16, 32, 64, 128]);
});

test.describe('mobile library', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  test('map icon opens overlay without overflowing the workspace', async ({ page }) => {
    await page.goto('/editor');
    await ready(page);
    await expect(page.locator('.map-library-panel')).toBeHidden();
    await page.getByRole('button', { name: 'เปิด / ปิดรายการแมป' }).click();
    await expect(page.locator('.map-library-panel')).toBeVisible();
    await page.screenshot({ path: 'artifacts/map-library-mobile.png' });
    await page.getByRole('button', { name: 'เปิดแมป Connecta Exhibition', exact: true }).click();
    await expect(page.locator('.map-library-panel')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    const b = await page.locator('.tool-dock').boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(40);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  });
});

test('saving a stale tab cannot overwrite the newer revision of the same map', async ({
  page,
  context,
}) => {
  await page.goto('/editor');
  await ready(page);
  await createMap(page, 'Concurrent map');
  const other = await context.newPage();
  await other.goto('/editor');
  await ready(other);
  await page.getByRole('button', { name: 'table-long-v', exact: true }).click();
  let p = await point(page, 99, 51);
  await page.mouse.click(p.x, p.y);
  await other.getByRole('button', { name: 'chair-padded-left', exact: true }).click();
  p = await point(other, 195, 51);
  await other.mouse.click(p.x, p.y);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await other.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(other.locator('.ant-alert-error')).toContainText('มีอีกหน้าต่างแก้แมปนี้');
  const stored = (await snapshots(page)).find((s) => s.record.name === 'Concurrent map');
  expect(stored.record.revision).toBe(2);
  const placed = stored.record.document.layers.flatMap((l) => l.objects ?? []).filter((o) => o.gid);
  expect(placed).toHaveLength(1);
  expect(placed[0].name).toBe('table-long-v');
});

test.describe('tablet library', () => {
  test.use({ viewport: { width: 900, height: 900 } });
  test('side panels overlay instead of squeezing the canvas on narrower desktop windows', async ({
    page,
  }) => {
    await page.goto('/editor');
    await ready(page);
    await expect(page.locator('.map-library-panel')).toBeHidden();
    await expect(page.locator('.studio-shelf')).toBeHidden();
    await page.getByRole('button', { name: 'เปิด / ปิดรายการแมป' }).click();
    await expect(page.locator('.map-library-panel')).toBeVisible();
    await page.getByRole('button', { name: 'พับรายการแมป' }).click();
    const before = await page.locator('canvas').boundingBox();
    await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน' }).click();
    await expect(page.locator('.studio-shelf')).toBeVisible();
    const after = await page.locator('canvas').boundingBox();
    expect(after.width).toBe(before.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(900);
    await page.screenshot({ path: 'artifacts/map-library-tablet.png' });
  });
});
