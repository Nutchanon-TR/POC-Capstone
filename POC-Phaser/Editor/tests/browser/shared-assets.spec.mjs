import { test, expect } from './studio-test.mjs';
import { readFile } from 'node:fs/promises';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const ready = (page) =>
  expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute('data-phase', 'ready');
async function stored(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('connecta-map-studio');
      r.onsuccess = () => resolve(r.result);
    });
    try {
      return await new Promise((resolve) => {
        const r = db.transaction('maps').objectStore('maps').getAll();
        r.onsuccess = () => resolve(r.result);
      });
    } finally {
      db.close();
    }
  });
}
async function create(page, name, size) {
  await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).click();
  await page.getByRole('textbox', { name: 'ชื่อแมปใหม่', exact: true }).fill(name);
  await page.getByRole('spinbutton', { name: 'ความกว้างแมปใหม่' }).fill('20');
  await page.getByRole('spinbutton', { name: 'ความสูงแมปใหม่' }).fill('12');
  await page.getByRole('combobox', { name: 'Tile size แมปใหม่' }).click();
  await page.locator('.ant-select-dropdown').getByText(`${size} px`, { exact: true }).click();
  await page.getByRole('button', { name: 'สร้างแมป', exact: true }).click();
  await expect(page.locator('.editor-title h1')).toHaveText(name);
  await ready(page);
}
async function upload(page, name, floor = false) {
  await page.locator('.studio-menu summary').click();
  await page.getByRole('button', { name: 'เพิ่ม asset PNG', exact: true }).click();
  await page
    .getByLabel('ไฟล์ asset PNG', { exact: true })
    .setInputFiles('public/starter/props/bin-sort.png');
  if (floor) {
    const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
    const tile = set.tiles.find((tile) =>
      tile.properties.some((p) => p.name === 'kind' && p.value === 'floor'),
    );
    await page
      .getByLabel('ไฟล์ asset PNG', { exact: true })
      .setInputFiles(`public/starter/${tile.image}`);
    await expect(page.getByRole('textbox', { name: 'ชื่อ asset ใหม่' })).toHaveValue(
      tile.image.split('/').at(-1).replace('.png', ''),
    );
    await page.getByRole('combobox', { name: 'ประเภท asset ใหม่' }).click();
    await page
      .locator('.ant-select-dropdown')
      .getByText('พื้นจัตุรัส · ตาม Tile size แมป', { exact: true })
      .click();
  }
  await page.getByRole('textbox', { name: 'ชื่อ asset ใหม่' }).fill(name);
  await page.getByRole('button', { name: 'เพิ่มเข้าในคลัง', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.locator('.studio-menu summary').click();
  await ready(page);
}
async function showCustom(page, name) {
  await page
    .locator('.shelf-tabs')
    .getByRole('button', { name: 'คลังชิ้นส่วน', exact: true })
    .click();
  await page.getByRole('button', { name: 'ของฉัน', exact: true }).click();
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
}
async function bundle(page) {
  await page.locator('.studio-menu summary').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export ชุด Tiled ZIP', exact: true }).click();
  const files = unzipSync(new Uint8Array(await readFile(await (await download).path())));
  await page.locator('.studio-menu summary').click();
  return { files, tileset: JSON.parse(strFromU8(files['tilesets/map.tsj'])) };
}

test('preset and uploaded assets share across saved/cached/new maps with native floor ZIPs', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/editor');
  await ready(page);
  const originals = await stored(page);
  const kmutt = JSON.parse(await readFile('public/maps/kmutt/expo.tsj', 'utf8'));
  const stage = kmutt.tiles.find((tile) =>
    tile.properties.some((p) => p.name === 'assetKey' && p.value === 'kmutt-stage-platform'),
  );
  const stageLabel = stage.properties.find((p) => p.name === 'label').value;
  await expect(page.getByRole('button', { name: stageLabel, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'เปิดแมป kmutt', exact: true }).click();
  await ready(page);
  await page.getByRole('button', { name: 'เปิดแมป Connecta Exhibition', exact: true }).click();
  await ready(page);
  await upload(page, 'Shared bin');
  await showCustom(page, 'Shared bin');
  // Uploading a library item must not save or overwrite any map document/revision.
  expect(await stored(page)).toEqual(originals);
  await page.getByRole('button', { name: 'เปิดแมป kmutt', exact: true }).click();
  await ready(page);
  await showCustom(page, 'Shared bin');
  await create(page, 'Shared 16', 16);
  await showCustom(page, 'Shared bin');
  await page.getByRole('button', { name: 'Shared bin', exact: true }).click();
  const bounds = await page.locator('canvas').boundingBox();
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.locator('.editor-map-meta')).toContainText('1 ชิ้น');
  await upload(page, 'Shared floor', true);
  const sixteen = await bundle(page);
  const placed = JSON.parse(strFromU8(sixteen.files['map.tmj']))
    .layers.flatMap((layer) => layer.objects ?? [])
    .find((object) => object.name === 'Shared bin');
  const bin = sixteen.tileset.tiles.find((tile) =>
    tile.properties.some((p) => p.name === 'label' && p.value === 'Shared bin'),
  );
  expect(placed.gid).toBe(bin.id + 1);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await ready(page);
  await expect(page.locator('.editor-map-meta')).toContainText('1 ชิ้น');
  const floor = sixteen.tileset.tiles.find((tile) =>
    tile.properties.some((p) => p.name === 'label' && p.value === 'Shared floor'),
  );
  expect(floor.imagewidth).toBe(16);
  const image = sixteen.files[floor.image.replace('../', '')];
  expect(new DataView(image.buffer, image.byteOffset).getUint32(16)).toBe(16);
  await page.getByRole('button', { name: 'เปิดแมป Connecta Exhibition', exact: true }).click();
  await ready(page);
  await showCustom(page, 'Shared floor');
  const thirtyTwo = await bundle(page);
  const nativeFloor = thirtyTwo.tileset.tiles.find((tile) =>
    tile.properties.some((p) => p.name === 'label' && p.value === 'Shared floor'),
  );
  expect(nativeFloor.imagewidth).toBe(32);
  expect(
    new DataView(
      thirtyTwo.files[nativeFloor.image.replace('../', '')].buffer,
      thirtyTwo.files[nativeFloor.image.replace('../', '')].byteOffset,
    ).getUint32(16),
  ).toBe(32);
  await page.reload();
  await ready(page);
  await showCustom(page, 'Shared bin');
  await showCustom(page, 'Shared floor');
  await page.screenshot({ path: 'artifacts/shared-assets.png' });
  expect(errors).toEqual([]);
});

test('parallel uploads from stale tabs survive together and refresh on return without changing map revisions', async ({
  page,
  context,
}) => {
  await page.goto('/editor');
  await ready(page);
  const original = await stored(page);
  const other = await context.newPage();
  await other.goto('/editor');
  await ready(other);
  await Promise.all([upload(page, 'From tab A'), upload(other, 'From tab B')]);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await showCustom(page, 'From tab A');
  await showCustom(page, 'From tab B');
  expect(await stored(page)).toEqual(original);
  await page.reload();
  await ready(page);
  await showCustom(page, 'From tab A');
  await showCustom(page, 'From tab B');
});

test('ZIP-only custom assets enter the shared library and remain available in a previously cached map', async ({
  page,
}) => {
  await page.goto('/editor');
  await ready(page);
  await create(page, 'Imported library', 32);
  const exported = await bundle(page);
  const tile = exported.tileset.tiles.find((tile) =>
    tile.properties.some((p) => p.name === 'assetKey' && p.value === 'bin-sort'),
  );
  tile.id = 0;
  tile.properties = tile.properties.map((p) =>
    p.name === 'assetKey'
      ? { ...p, value: 'custom-from-zip' }
      : p.name === 'label'
        ? { ...p, value: 'Imported shared prop' }
        : p,
  );
  exported.tileset.tiles = [tile];
  exported.tileset.tilecount = 1;
  const document = JSON.parse(strFromU8(exported.files['map.tmj']));
  document.layers = document.layers
    .filter((layer) => layer.type === 'tilelayer')
    .map((layer) => ({ ...layer, data: layer.data.map(() => 0) }));
  const bytes = zipSync({
    'map.tmj': strToU8(JSON.stringify(document)),
    'tilesets/map.tsj': strToU8(JSON.stringify(exported.tileset)),
    'studio/prefabs.json': strToU8('[]'),
    [tile.image.replace('../', '')]: exported.files[tile.image.replace('../', '')],
  });
  await page
    .locator('input[type="file"][accept=".tmj,.json,.zip"]')
    .setInputFiles({ name: 'shared.zip', mimeType: 'application/zip', buffer: Buffer.from(bytes) });
  await showCustom(page, 'Imported shared prop');
  await page.getByRole('button', { name: 'เปิดแมป Connecta Exhibition', exact: true }).click();
  await ready(page);
  await showCustom(page, 'Imported shared prop');
  const shared = await bundle(page);
  const restored = shared.tileset.tiles.find((tile) =>
    tile.properties.some((p) => p.name === 'assetKey' && p.value === 'custom-from-zip'),
  );
  expect(restored.id).toBeGreaterThan(0);
  expect(shared.files[restored.image.replace('../', '')]).toEqual(
    exported.files[tile.image.replace('../', '')],
  );
  await page.reload();
  await ready(page);
  await showCustom(page, 'Imported shared prop');
});
