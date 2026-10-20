import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

const ready = (page) =>
  expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute('data-phase', 'ready');
async function setup(page) {
  await page.goto('/editor');
  await ready(page);
  const original = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
  const gid = (key) =>
    set.tiles.find((tile) => tile.properties.some((p) => p.name === 'assetKey' && p.value === key))
      .id + 1;
  const prop = (id, name, x, y, key = 'bin-sort', width = 32, height = 32) => ({
    id,
    name,
    x,
    y,
    width,
    height,
    gid: gid(key),
    rotation: 0,
    visible: true,
  });
  const map = {
    ...original,
    width: 30,
    height: 20,
    nextobjectid: 500,
    nextlayerid: 500,
    properties: [{ name: 'title', type: 'string', value: 'Transform tests' }],
    layers: [
      { id: 1, name: 'Floor', type: 'tilelayer', width: 30, height: 20, data: Array(600).fill(0) },
      {
        id: 2,
        name: 'Props',
        type: 'objectgroup',
        objects: [
          prop(100, 'First', 96, 96),
          prop(101, 'Second', 160, 96),
          prop(102, 'Computer', 544, 256, 'expo-computer', 64, 64),
          prop(103, 'Footprint table', 736, 416, 'table-long-v', 48, 107),
          { id: 300, name: 'Zone A', type: 'Zone', x: 96, y: 256, width: 128, height: 96 },
          { id: 301, name: 'Collider A', type: 'Collider', x: 320, y: 256, width: 128, height: 96 },
        ],
      },
      {
        id: 200,
        name: 'Booth',
        type: 'group',
        offsetx: 320,
        offsety: 96,
        properties: [{ name: 'boothId', type: 'string', value: 'group-transform' }],
        layers: [
          {
            id: 201,
            name: 'Pieces',
            type: 'objectgroup',
            objects: [prop(202, 'Group first', 0, 0), prop(203, 'Group second', 64, 0)],
          },
        ],
      },
    ],
  };
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'transforms.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(map)),
  });
  await expect(page.locator('.editor-title h1')).toHaveText('Transform tests');
  await ready(page);
}
async function point(page, x, y) {
  const box = await page.locator('canvas').boundingBox();
  const z = Math.min((box.width - 80) / 960, (box.height - 80) / 640);
  return { x: box.x + box.width / 2 + (x - 480) * z, y: box.y + box.height / 2 + (y - 320) * z };
}
async function click(page, x, y) {
  const p = await point(page, x, y);
  await page.mouse.click(p.x, p.y);
}
async function drag(page, from, to, release = true) {
  const a = await point(page, ...from),
    b = await point(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  if (release) await page.mouse.up();
}
async function exportMap(page, zip = false) {
  await page.locator('.studio-menu summary').click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: zip ? 'Export ชุด Tiled ZIP' : 'Export TMJ', exact: true })
    .click();
  const bytes = new Uint8Array(await readFile(await (await download).path()));
  await page.locator('.studio-menu summary').click();
  return JSON.parse(zip ? strFromU8(unzipSync(bytes)['map.tmj']) : new TextDecoder().decode(bytes));
}
const all = (map) =>
  map.layers.flatMap((layer) => [...(layer.objects ?? []), ...all({ layers: layer.layers ?? [] })]);
const selectedKeys = (page) =>
  page.locator('canvas').getAttribute('data-selection-keys').then(JSON.parse);

test('marquee selects and drags multiple objects and whole booths, with cancel, one-step undo and reload', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  await drag(page, [64, 64], [224, 160]);
  await expect.poll(() => selectedKeys(page)).toEqual(['object:100', 'object:101']);
  await drag(page, [112, 112], [176, 176]);
  let map = await exportMap(page);
  expect(all(map).find((o) => o.id === 100)).toMatchObject({ x: 160, y: 160 });
  expect(all(map).find((o) => o.id === 101)).toMatchObject({ x: 224, y: 160 });
  await page.keyboard.press('Control+z');
  map = await exportMap(page);
  expect(all(map).find((o) => o.id === 100).x).toBe(96);
  expect(all(map).find((o) => o.id === 101).x).toBe(160);
  await page.keyboard.press('Control+Shift+z');
  await drag(page, [64, 64], [448, 224]);
  await expect.poll(() => selectedKeys(page)).toEqual(['object:100', 'object:101', 'layer:200']);
  const before = await exportMap(page);
  await drag(page, [176, 176], [208, 208], false);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await exportMap(page)).toEqual(before);
  await drag(page, [176, 176], [208, 208]);
  map = await exportMap(page, true);
  expect(map.layers.find((l) => l.id === 200)).toMatchObject({ offsetx: 352, offsety: 128 });
  expect(all(map).find((o) => o.id === 202)).toMatchObject({ x: 0, y: 0 });
  expect(all(map).find((o) => o.id === 203)).toMatchObject({ x: 64, y: 0 });
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await ready(page);
  expect(await exportMap(page)).toEqual(map);
  expect(errors).toEqual([]);
});

test('edge and corner handles resize zones, collision and scaled Interact while keeping artwork intact', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  const canvas = page.locator('canvas');
  await page.getByRole('button', { name: 'พื้นที่', exact: true }).click();
  await click(page, 144, 304);
  await expect(canvas).toHaveAttribute('data-resize-handles', /"handle":"nw"/);
  await drag(page, [224, 352], [288, 384], false);
  await expect(canvas).toHaveAttribute('data-resize-preview', /"width":192/);
  await page.screenshot({ path: 'artifacts/region-resize-preview.png' });
  await page.mouse.up();
  let map = await exportMap(page);
  expect(all(map).find((o) => o.id === 300)).toMatchObject({
    x: 96,
    y: 256,
    width: 192,
    height: 128,
  });
  await page.keyboard.press('Control+z');
  expect(all(await exportMap(page)).find((o) => o.id === 300).width).toBe(128);
  await page.keyboard.press('Control+Shift+z');
  // Opposite edge stays fixed while the left edge is dragged out.
  await drag(page, [96, 320], [64, 320]);
  expect(all(await exportMap(page)).find((o) => o.id === 300)).toMatchObject({ x: 64, width: 224 });
  await page.getByRole('button', { name: 'กรอบชน', exact: true }).click();
  await click(page, 368, 304);
  await drag(page, [448, 304], [480, 304]);
  expect(all(await exportMap(page)).find((o) => o.id === 301)).toMatchObject({
    width: 160,
    height: 96,
  });
  await page.getByRole('button', { name: 'แก้ไข Interact', exact: true }).click();
  await click(page, 576, 288);
  await drag(page, [608, 320], [672, 352]);
  map = await exportMap(page, true);
  const computer = all(map).find((o) => o.id === 102);
  expect(computer).toMatchObject({ x: 544, y: 256, width: 64, height: 64 });
  expect(Number(computer.properties.find((p) => p.name === 'interactWidth').value)).toBeGreaterThan(
    0,
  );
  await page.getByRole('button', { name: 'กรอบชน', exact: true }).click();
  // The table's native footprint can be resized directly, without a separate edit button.
  const tableTile = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8')).tiles.find(
    (tile) => tile.properties.some((p) => p.name === 'assetKey' && p.value === 'table-long-v'),
  );
  const footprint = tableTile.objectgroup.objects[0];
  await drag(
    page,
    [736 + footprint.x + footprint.width, 416 + footprint.y + footprint.height],
    [832, 544],
  );
  map = await exportMap(page);
  expect(all(map).find((o) => o.id === 103)).toMatchObject({
    x: 736,
    y: 416,
    width: 48,
    height: 107,
  });
  expect(all(map).find((o) => o.id === 103).properties).toContainEqual({
    name: 'collisionEnabled',
    type: 'bool',
    value: false,
  });
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await ready(page);
  expect(await exportMap(page)).toEqual(map);
  expect(errors).toEqual([]);
});

test('tablet resize supports free sizes, cancel and edge clicks without accidental edits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await setup(page);
  await page.getByRole('button', { name: 'พื้นที่', exact: true }).click();
  await click(page, 144, 304);
  const baseline = await exportMap(page);
  await click(page, 224, 304);
  expect(await exportMap(page)).toEqual(baseline);
  await drag(page, [224, 352], [288, 384], false);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await exportMap(page)).toEqual(baseline);
  await page.getByRole('combobox', { name: 'ขนาดบล็อก', exact: true }).click();
  await page.locator('.ant-select-dropdown').getByText('อิสระ', { exact: true }).click();
  await drag(page, [224, 352], [263.5, 367.25]);
  const zone = all(await exportMap(page)).find((object) => object.id === 300);
  expect(zone.width).toBeGreaterThan(160);
  expect(zone.width).toBeLessThan(180);
  expect(zone.width % 32).not.toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(900);
});
