import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';

const ready = (page) =>
  expect(page.getByTestId('editor-canvas')).toHaveAttribute('data-phase', 'ready');
const objects = (map) => map.layers.flatMap((layer) => layer.objects ?? []);
async function setup(page) {
  await page.goto('/editor');
  await ready(page);
  const map = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
  const tile = (key) =>
    set.tiles.find((t) => t.properties.some((p) => p.name === 'assetKey' && p.value === key));
  const colliderTile = set.tiles.find(
    (t) =>
      t.objectgroup?.objects.length && !t.properties.some((p) => p.name === 'ground' && p.value),
  );
  const prop = (id, name, x, y, asset) => ({
    id,
    name,
    gid: asset.id + 1,
    x,
    y,
    width: asset.imagewidth,
    height: asset.imageheight,
    visible: true,
  });
  map.width = 32;
  map.height = 24;
  map.nextobjectid = 100;
  map.nextlayerid = 10;
  map.properties = [{ name: 'title', type: 'string', value: 'Deletion tools' }];
  map.layers = [
    { id: 1, name: 'Floor', type: 'tilelayer', width: 32, height: 24, data: Array(768).fill(0) },
    {
      id: 2,
      name: 'Objects',
      type: 'objectgroup',
      objects: [
        prop(10, 'First', 128, 128, tile('bin-sort')),
        prop(11, 'Second', 256, 128, tile('bin-sort')),
        { ...prop(12, 'Locked layout', 128, 400, tile('wall-mint-n')), width: 160, height: 32 },
        { id: 20, name: 'Test zone', type: 'Zone', x: 384, y: 128, width: 96, height: 96 },
        { id: 21, name: 'Test collider', type: 'Collider', x: 512, y: 128, width: 96, height: 96 },
        {
          ...prop(22, 'Test computer', 640, 128, tile('expo-computer')),
          width: 64,
          height: 64,
          properties: [
            { name: 'interactEnabled', type: 'bool', value: true },
            ...['interactX', 'interactY', 'interactWidth', 'interactHeight'].map((name, i) => ({
              name,
              type: 'float',
              value: i < 2 ? 0 : tile('expo-computer').imagewidth,
            })),
            { name: 'interactAction', type: 'string', value: 'open-computer' },
          ],
        },
        prop(23, 'Asset collider', 320, 400, colliderTile),
      ],
    },
  ];
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'delete.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(map)),
  });
  await expect(page.locator('.editor-title h1')).toHaveText('Deletion tools');
  await ready(page);
  return { map, collider: colliderTile.objectgroup.objects[0] };
}
async function click(page, x, y) {
  const box = await page.locator('canvas').boundingBox();
  const z = Math.min((box.width - 80) / 1024, (box.height - 80) / 768);
  await page.mouse.click(
    box.x + box.width / 2 + (x - 512) * z,
    box.y + box.height / 2 + (y - 384) * z,
  );
}
async function exported(page) {
  await page.locator('.studio-menu summary').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export TMJ', exact: true }).click();
  const map = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  await page.locator('.studio-menu summary').click();
  return map;
}
async function thaiUndo(page, shiftKey = false) {
  await page.evaluate(
    (shiftKey) =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: shiftKey ? '(' : 'ผ',
          code: 'KeyZ',
          ctrlKey: true,
          shiftKey,
          bubbles: true,
          cancelable: true,
        }),
      ),
    shiftKey,
  );
}
async function deletionMode(page, name, menuLabel) {
  await page.getByRole('button', { name: `เมนู${name}`, exact: true }).click();
  await page.getByRole('menuitem', { name: menuLabel ?? `ลบ${name}`, exact: true }).click();
  await expect(page.locator('.editor-mode')).toContainText(`คลิกเพื่อลบ${name}`);
}

test('Backspace removes multiple selected props and locked Layout; Thai Ctrl+ผ undoes and input editing stays native', async ({
  page,
}) => {
  await setup(page);
  await click(page, 140, 140);
  await page.keyboard.down('Shift');
  await click(page, 268, 140);
  await page.keyboard.up('Shift');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-selection-keys',
    JSON.stringify(['object:10', 'object:11']),
  );
  await page.keyboard.press('Backspace');
  expect(objects(await exported(page)).filter((o) => [10, 11].includes(o.id))).toHaveLength(0);
  await thaiUndo(page);
  expect(objects(await exported(page)).filter((o) => [10, 11].includes(o.id))).toHaveLength(2);
  await thaiUndo(page, true);
  expect(objects(await exported(page)).filter((o) => [10, 11].includes(o.id))).toHaveLength(0);
  await page.keyboard.press('Control+z');
  await click(page, 144, 416);
  await page.keyboard.press('Backspace');
  expect(objects(await exported(page)).find((o) => o.id === 12)).toBeUndefined();
  await thaiUndo(page);
  await click(page, 140, 140);
  const name = page.getByRole('textbox', { name: 'ชื่อวัตถุ', exact: true });
  await name.fill('Native');
  await name.press('End');
  await name.press('Backspace');
  await expect(name).toHaveValue('Nativ');
  await name.dispatchEvent('keydown', {
    key: 'ผ',
    code: 'KeyZ',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  expect(objects(await exported(page))).toHaveLength(7);
});

test('region dropdowns delete only their own kind, Backspace removes selected frames and asset colliders preserve artwork', async ({
  page,
}) => {
  const { collider } = await setup(page);
  await deletionMode(page, 'พื้นที่');
  await click(page, 544, 160); // A collider is unaffected by the zone eraser.
  expect(objects(await exported(page)).find((o) => o.id === 21)).toBeDefined();
  await click(page, 416, 160);
  expect(objects(await exported(page)).find((o) => o.id === 20)).toBeUndefined();
  await thaiUndo(page);
  await page.getByRole('button', { name: 'พื้นที่', exact: true }).click();
  await click(page, 416, 160);
  await page.keyboard.press('Backspace');
  expect(objects(await exported(page)).find((o) => o.id === 20)).toBeUndefined();
  await thaiUndo(page);
  await deletionMode(page, 'กรอบชน');
  await click(page, 544, 160);
  expect(objects(await exported(page)).find((o) => o.id === 21)).toBeUndefined();
  await thaiUndo(page);
  await page.getByRole('button', { name: 'กรอบชน', exact: true }).click();
  await click(page, 544, 160);
  await page.keyboard.press('Backspace');
  expect(objects(await exported(page)).find((o) => o.id === 21)).toBeUndefined();
  await thaiUndo(page);
  await deletionMode(page, 'กรอบชน');
  const x = 320 + collider.x + collider.width / 2;
  const y = 400 + collider.y + collider.height / 2;
  await click(page, x, y);
  let source = objects(await exported(page)).find((o) => o.id === 23);
  expect(source.properties.find((p) => p.name === 'collisionEnabled').value).toBe(false);
  expect(source).toMatchObject({ name: 'Asset collider', x: 320, y: 400 });
  await thaiUndo(page);
  await page.getByRole('button', { name: 'กรอบชน', exact: true }).click();
  await click(page, x, y);
  await page.keyboard.press('Backspace');
  source = objects(await exported(page)).find((o) => o.id === 23);
  expect(source.properties.find((p) => p.name === 'collisionEnabled').value).toBe(false);
});

test('Interact dropdown and Backspace remove its frame while keeping artwork and action; dropdown fits a phone', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setup(page);
  const canvas = page.locator('canvas');
  await deletionMode(page, 'กรอบ Interact', 'ลบกรอบ Interact · เก็บภาพไว้');
  await click(page, 650, 140);
  let source = objects(await exported(page)).find((o) => o.id === 22);
  expect(source.properties.find((p) => p.name === 'interactEnabled').value).toBe(false);
  expect(source.properties.find((p) => p.name === 'interactAction').value).toBe('open-computer');
  expect(source).toMatchObject({ x: 640, y: 128, width: 64, height: 64 });
  await thaiUndo(page);
  await page.getByRole('button', { name: 'แก้ไข Interact', exact: true }).click();
  await click(page, 650, 140);
  await page.keyboard.press('Backspace');
  await expect(canvas).not.toHaveAttribute('data-interaction-labels', /Test computer/);
  source = objects(await exported(page)).find((o) => o.id === 22);
  expect(source.gid).toBeGreaterThan(0);
  expect(objects(await exported(page))).toHaveLength(7);
  await thaiUndo(page);
  await expect(canvas).toHaveAttribute('data-interaction-labels', /Test computer/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'พับรายการแมป', exact: true }).click();
  await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน', exact: true }).click();
  await page.getByRole('button', { name: 'เมนูกรอบ Interact', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/region-delete-mobile.png', animations: 'disabled' });
  expect(errors).toEqual([]);
});
