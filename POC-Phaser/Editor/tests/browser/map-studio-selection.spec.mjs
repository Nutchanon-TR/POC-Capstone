import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';

const ready = (page) =>
  expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute('data-phase', 'ready');
async function setup(page) {
  await page.goto('/editor');
  await ready(page);
  const original = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
  const gid = (key) =>
    set.tiles.find((tile) =>
      tile.properties.some((property) => property.name === 'assetKey' && property.value === key),
    ).id + 1;
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
    width: 32,
    height: 24,
    nextlayerid: 500,
    nextobjectid: 500,
    properties: [{ name: 'title', type: 'string', value: 'Selection commands' }],
    layers: [
      { id: 1, name: 'Floor', type: 'tilelayer', width: 32, height: 24, data: Array(768).fill(0) },
      {
        id: 2,
        name: 'Props',
        type: 'objectgroup',
        objects: [
          prop(100, 'First', 128, 128),
          prop(101, 'Second', 256, 160),
          prop(102, 'Third', 448, 224),
          prop(200, 'Locked layout', 128, 400, 'wall-mint-n', 160, 32),
        ],
      },
      {
        id: 300,
        name: 'Group',
        type: 'group',
        offsetx: 640,
        offsety: 96,
        properties: [{ name: 'boothId', type: 'string', value: 'source-booth' }],
        layers: [
          {
            id: 301,
            name: 'Pieces',
            type: 'objectgroup',
            objects: [prop(302, 'Group A', 0, 0), prop(303, 'Group B', 64, 0)],
          },
        ],
      },
    ],
  };
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'selection.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(map)),
  });
  await expect(page.locator('.editor-title h1')).toHaveText('Selection commands');
  await ready(page);
}
async function point(page, x, y) {
  const box = await page.locator('canvas').boundingBox(),
    z = Math.min((box.width - 80) / 1024, (box.height - 80) / 768);
  return { x: box.x + box.width / 2 + (x - 512) * z, y: box.y + box.height / 2 + (y - 384) * z };
}
async function click(page, x, y, options) {
  const at = await point(page, x, y);
  await page.mouse.click(at.x, at.y, options);
}
async function drag(page, from, to) {
  const a = await point(page, ...from),
    b = await point(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}
async function exported(page) {
  await page.locator('.studio-menu summary').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export TMJ', exact: true }).click();
  const map = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  await page.locator('.studio-menu summary').click();
  return map;
}
const all = (map) =>
  map.layers.flatMap((layer) => [...(layer.objects ?? []), ...all({ layers: layer.layers ?? [] })]);
const keys = (page) => page.locator('canvas').getAttribute('data-selection-keys').then(JSON.parse);
async function chooseThree(page) {
  await click(page, 144, 144);
  await page.keyboard.down('Shift');
  await click(page, 272, 176);
  await click(page, 464, 240);
  await page.keyboard.up('Shift');
  await expect.poll(() => keys(page)).toEqual(['object:100', 'object:101', 'object:102']);
}
async function menu(page) {
  await click(page, 144, 144, { button: 'right' });
  await expect(page.getByRole('menu', { name: 'เมนูการเลือก', exact: true })).toBeVisible();
}

test('Shift toggles and extends marquee selection; Ctrl+C/V pastes complete selections with single Undo and preserves native input shortcuts', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setup(page);
  await chooseThree(page);
  await page.keyboard.down('Shift');
  await click(page, 272, 176);
  await page.keyboard.up('Shift');
  await expect.poll(() => keys(page)).toEqual(['object:100', 'object:102']);
  await page.keyboard.down('Shift');
  await drag(page, [224, 128], [320, 208]);
  await page.keyboard.up('Shift');
  await expect.poll(() => keys(page)).toEqual(['object:100', 'object:101', 'object:102']);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect(page.locator('.editor-map-meta')).toContainText('9 ชิ้น');
  let map = await exported(page);
  const copies = all(map).filter((object) => object.id >= 500);
  expect(copies).toHaveLength(3);
  expect(copies.map((object) => object.x)).toEqual([160, 288, 480]);
  await page.keyboard.press('Control+v');
  await expect(page.locator('.editor-map-meta')).toContainText('12 ชิ้น');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.editor-map-meta')).toContainText('9 ชิ้น');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.editor-map-meta')).toContainText('12 ชิ้น');
  const name = page.getByRole('textbox', { name: 'ชื่อวัตถุ', exact: true });
  await name.fill('Native copy');
  await name.press('Control+a');
  await name.press('Control+c');
  await name.press('Control+v');
  await expect(page.locator('.editor-map-meta')).toContainText('12 ชิ้น');
  map = await exported(page);
  expect(new Set(all(map).map((object) => object.id)).size).toBe(all(map).length);
  expect(errors).toEqual([]);
});

test('Layout cannot move directly or in a marquee; context menu aligns, distributes, layers, copies and deletes as one edit', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setup(page);
  await drag(page, [144, 416], [208, 480]);
  expect(all(await exported(page)).find((object) => object.id === 200)).toMatchObject({
    x: 128,
    y: 400,
  });
  await drag(page, [96, 96], [512, 480]);
  await expect.poll(() => keys(page)).toEqual(['object:100', 'object:101', 'object:102']);
  await menu(page);
  await page.getByRole('menuitem', { name: 'จัดองค์ประกอบ', exact: true }).hover();
  await page.screenshot({ path: 'artifacts/selection-context-align.png' });
  await page
    .getByRole('menu', { name: 'จัดองค์ประกอบ', exact: true })
    .getByRole('menuitem', { name: 'บน', exact: true })
    .click();
  expect(
    all(await exported(page))
      .filter((object) => [100, 101, 102].includes(object.id))
      .map((object) => object.y),
  ).toEqual([128, 128, 128]);
  await menu(page);
  await page.getByRole('menuitem', { name: 'เว้นระยะห่างเท่ากัน', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'แนวนอน', exact: true }).click();
  expect(all(await exported(page)).find((object) => object.id === 101).x).toBe(288);
  await page.keyboard.press('Control+Alt+]');
  expect(
    all(await exported(page))
      .filter((object) => [100, 101, 102].includes(object.id))
      .every((object) => object.properties.some((property) => property.name === 'renderDepth')),
  ).toBe(true);
  await menu(page);
  await page.getByRole('menuitem', { name: 'คัดลอก', exact: false }).click();
  await menu(page);
  await page.getByRole('menuitem', { name: 'วาง', exact: false }).click();
  await expect(page.locator('.editor-map-meta')).toContainText('9 ชิ้น');
  await page.keyboard.press('Delete');
  await expect(page.locator('.editor-map-meta')).toContainText('6 ชิ้น');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.editor-map-meta')).toContainText('9 ชิ้น');
  const before = await exported(page);
  await drag(page, [144, 161], [528, 208]);
  await page.keyboard.press('Alt+Shift+t');
  const after = await exported(page);
  expect(
    all(after)
      .filter((object) => object.id >= 500)
      .map((object) => object.x),
  ).not.toEqual(
    all(before)
      .filter((object) => object.id >= 500)
      .map((object) => object.x),
  );
  expect(all(after).find((object) => object.id === 200)).toMatchObject({ x: 128, y: 400 });
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await ready(page);
  expect(await exported(page)).toEqual(after);
  expect(errors).toEqual([]);
});

test('copy/paste preserves whole booths and works after switching to a new map', async ({
  page,
}) => {
  await setup(page);
  await click(page, 656, 112);
  await page.keyboard.down('Shift');
  await click(page, 144, 144);
  await page.keyboard.up('Shift');
  await expect.poll(() => keys(page)).toEqual(['object:100', 'layer:300']);
  await page.keyboard.press('Control+c');
  await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).click();
  await page.getByRole('textbox', { name: 'ชื่อแมปใหม่', exact: true }).fill('Pasted booth');
  await page.getByRole('button', { name: 'สร้างแมป', exact: true }).click();
  await expect(page.locator('.editor-title h1')).toHaveText('Pasted booth');
  await ready(page);
  await page.keyboard.press('Control+v');
  await expect(page.locator('.editor-map-meta')).toContainText('3 ชิ้น');
  const map = await exported(page);
  expect(map.layers.filter((layer) => layer.type === 'group')).toHaveLength(1);
  expect(new Set(all(map).map((object) => object.id)).size).toBe(all(map).length);
});
