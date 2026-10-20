import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
const ready = (page) =>
  expect(page.getByTestId('editor-canvas')).toHaveAttribute('data-phase', 'ready');
async function createMap(page, name) {
  if (!(await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).isVisible()))
    await page.getByRole('button', { name: 'เปิด / ปิดรายการแมป', exact: true }).click();
  await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).click();
  await page.getByRole('textbox', { name: 'ชื่อแมปใหม่', exact: true }).fill(name);
  await page.getByRole('button', { name: 'สร้างแมป', exact: true }).click();
  await expect(page.locator('.editor-title h1')).toHaveText(name);
  await ready(page);
}
async function zip(page) {
  await page.locator('.studio-menu summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export ชุด Tiled ZIP', exact: true }).click();
  const files = unzipSync(new Uint8Array(await readFile(await (await pending).path())));
  await page.locator('.studio-menu summary').click();
  return {
    map: JSON.parse(strFromU8(files['map.tmj'])),
    tileset: JSON.parse(strFromU8(files['tilesets/map.tsj'])),
    prefabs: JSON.parse(strFromU8(files['studio/prefabs.json'])),
  };
}
const all = (map) =>
  map.layers.flatMap((layer) => [...(layer.objects ?? []), ...all({ layers: layer.layers ?? [] })]);
async function placeBin(page, x = 0.5) {
  await page.getByRole('button', { name: 'bin-sort', exact: true }).click();
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width * x, box.y + box.height / 2);
}
async function openAsset(page, name) {
  await page.getByRole('button', { name: 'จัดการ asset', exact: true }).click();
  await expect(page.locator('.asset-manager h1')).toHaveText('จัดการ asset');
  await page.getByRole('searchbox', { name: 'ค้นหา asset ในคลัง', exact: true }).fill(name);
  await page.getByRole('button', { name: `แก้ไข asset ${name}`, exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'ชื่อ asset', exact: true })).toBeVisible();
}
async function saveAsset(page) {
  await page.getByRole('button', { name: 'บันทึก asset', exact: true }).click();
  await expect(page.getByText('บันทึก asset ถาวรแล้ว', { exact: true })).toBeVisible();
}

test('asset gallery edits shared names, default sizes, collision and Interact; deletion survives a fresh profile without removing placed images', async ({
  page,
  browser,
  baseURL,
  extraHTTPHeaders,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/editor');
  await ready(page);
  await createMap(page, 'Asset originals');
  await placeBin(page);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  const before = await zip(page);
  const original = all(before.map).find((o) => o.gid);
  await openAsset(page, 'bin-sort');
  await page.getByRole('textbox', { name: 'ชื่อ asset', exact: true }).fill('Shared bin');
  await page.getByRole('spinbutton', { name: 'ความกว้างมาตรฐาน asset', exact: true }).fill('54');
  await page.getByRole('spinbutton', { name: 'ความสูงมาตรฐาน asset', exact: true }).fill('56');
  await page.getByRole('spinbutton', { name: 'กรอบ asset width', exact: true }).fill('20');
  await page.getByRole('spinbutton', { name: 'กรอบ asset height', exact: true }).fill('12');
  await page.getByRole('spinbutton', { name: 'กรอบ asset x', exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: 'กรอบ asset y', exact: true }).fill('4');
  await page.getByRole('switch', { name: 'เปิด Interact ของ asset', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชนิด Interact ของ asset', exact: true }).fill('inspect');
  await page.getByRole('textbox', { name: 'Action key ของ asset', exact: true }).fill('open-bin');
  await page.getByRole('spinbutton', { name: 'กรอบ asset width', exact: true }).fill('20');
  await page.getByRole('spinbutton', { name: 'กรอบ asset height', exact: true }).fill('20');
  await page.getByRole('spinbutton', { name: 'กรอบ asset x', exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: 'กรอบ asset y', exact: true }).fill('4');
  await saveAsset(page);
  await page.screenshot({ path: 'artifacts/asset-manager-edit.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'กลับไปแมป', exact: true }).click();
  await ready(page);
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.getByRole('button', { name: 'คลังชิ้นส่วน', exact: true }).click();
  await page.getByRole('button', { name: 'Prop', exact: true }).click();
  await page.getByRole('button', { name: 'Shared bin', exact: true }).click();
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width * 0.7, canvas.y + canvas.height / 2);
  let bundle = await zip(page);
  const objects = all(bundle.map).filter((o) => o.gid);
  expect(objects).toHaveLength(2);
  expect(objects[0]).toEqual(original);
  expect(objects[1]).toMatchObject({ width: 54, height: 56, name: 'Shared bin' });
  const tile = bundle.tileset.tiles.find((tile) =>
    tile.properties.some((p) => p.name === 'assetKey' && p.value === 'bin-sort'),
  );
  expect(tile.properties.find((p) => p.name === 'label').value).toBe('Shared bin');
  expect(tile.properties.find((p) => p.name === 'interactAction').value).toBe('open-bin');
  expect(tile.objectgroup.objects[0]).toMatchObject({ x: 2, y: 4, width: 20, height: 12 });
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await createMap(page, 'Shared assets map');
  await page.getByRole('button', { name: 'คลังชิ้นส่วน', exact: true }).click();
  await page.getByRole('button', { name: 'Prop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Shared bin', exact: true })).toBeVisible();
  await openAsset(page, 'Shared bin');
  await expect(
    page.getByRole('spinbutton', { name: 'ความกว้างมาตรฐาน asset', exact: true }),
  ).toHaveValue('54');
  await page.getByRole('button', { name: 'ลบ asset จากคลัง', exact: true }).click();
  await page
    .locator('.ant-popconfirm')
    .getByRole('button', { name: 'ลบ asset', exact: true })
    .click();
  await expect(page.getByRole('textbox', { name: 'ชื่อ asset', exact: true })).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'แก้ไข asset Shared bin', exact: true }),
  ).toHaveCount(0);
  const fresh = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: 1600, height: 1000 },
  });
  try {
    const other = await fresh.newPage();
    await other.goto('/editor');
    await ready(other);
    await other.getByRole('button', { name: 'เปิดแมป Asset originals', exact: true }).click();
    await ready(other);
    bundle = await zip(other);
    expect(all(bundle.map).filter((o) => o.gid)).toEqual(objects);
    const savedTile = bundle.tileset.tiles.find((tile) =>
      tile.properties.some((p) => p.name === 'assetKey' && p.value === 'bin-sort'),
    );
    expect(savedTile.properties.find((p) => p.name === 'interactAction').value).toBe('open-bin');
    await other.getByRole('button', { name: 'จัดการ asset', exact: true }).click();
    await other.getByRole('searchbox', { name: 'ค้นหา asset ในคลัง', exact: true }).fill('bin');
    await expect(
      other.getByRole('button', { name: 'แก้ไข asset Shared bin', exact: true }),
    ).toHaveCount(0);
    await expect(
      other.getByRole('button', { name: 'แก้ไข asset bin-sort', exact: true }),
    ).toHaveCount(0);
  } finally {
    await fresh.close();
  }
  expect(errors).toEqual([]);
});

test('mobile asset page keeps map drafts and Undo history, supports keyboard cards and direct frame resize', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor');
  await ready(page);
  await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน', exact: true }).click();
  await placeBin(page);
  await expect(page.locator('.editor-map-meta')).toContainText('205 ชิ้น');
  await page.getByRole('button', { name: 'จัดการ asset', exact: true }).click();
  await page.getByRole('searchbox', { name: 'ค้นหา asset ในคลัง', exact: true }).fill('bin-sort');
  const card = page.getByRole('button', { name: 'แก้ไข asset bin-sort', exact: true });
  await card.focus();
  await page.keyboard.press('Control+z');
  await card.press('Space');
  await expect(page.getByRole('textbox', { name: 'ชื่อ asset', exact: true })).toBeVisible();
  const width = page.getByRole('spinbutton', { name: 'กรอบ asset width', exact: true });
  const originalWidth = Number(await width.inputValue());
  const image = page.getByLabel('ภาพแก้ไขกรอบ asset', { exact: true });
  const handle = page.getByRole('button', { name: 'ปรับกรอบ asset e', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const box = await image.boundingBox(),
    h = await handle.boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 - (box.width * 3) / 27, h.y + h.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Number(await width.inputValue())).toBeCloseTo(originalWidth - 3, 1);
  await page.screenshot({ path: 'artifacts/asset-manager-mobile.png', animations: 'disabled' });
  const manager = await page.locator('.asset-manager').boundingBox();
  expect(manager.x + manager.width).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'กลับไปแมป', exact: true }).click();
  await ready(page);
  await expect(page.locator('.editor-map-meta')).toContainText('205 ชิ้น');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.editor-map-meta')).toContainText('204 ชิ้น');
  expect(errors).toEqual([]);
});

test('placed Booth inspector edits one instance, hides XY and preserves other booths, metadata, Undo and saved output', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/editor');
  await ready(page);
  const map = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
  const gid = (key) =>
    set.tiles.find((t) => t.properties.some((p) => p.name === 'assetKey' && p.value === key)).id +
    1;
  const booth = (id, x) => ({
    id,
    name: `Booth ${id}`,
    type: 'group',
    offsetx: x,
    offsety: 64,
    properties: [
      { name: 'boothId', type: 'string', value: `fixture-${id}` },
      { name: 'boothWidth', type: 'float', value: 192 },
      { name: 'boothHeight', type: 'float', value: 192 },
    ],
    layers: [
      {
        id: id + 10,
        type: 'objectgroup',
        name: 'Pieces',
        objects: [
          {
            id: id + 1,
            name: 'bin-sort',
            gid: gid('bin-sort'),
            x: 0,
            y: 0,
            width: 27,
            height: 28,
            visible: true,
          },
          {
            id: id + 2,
            name: 'Custom computer',
            gid: gid('expo-computer'),
            x: 64,
            y: 64,
            width: 32,
            height: 36,
            visible: true,
            properties: [
              { name: 'interactAction', type: 'string', value: 'local-action' },
              { name: 'collisionEnabled', type: 'bool', value: false },
            ],
          },
          { id: id + 3, name: 'Booth zone', type: 'Zone', x: 0, y: 96, width: 96, height: 32 },
        ],
      },
    ],
  });
  map.width = 32;
  map.height = 24;
  map.nextobjectid = 1000;
  map.nextlayerid = 1000;
  map.properties = [{ name: 'title', type: 'string', value: 'Local instances' }];
  map.layers = [
    { id: 1, name: 'Floor', type: 'tilelayer', width: 32, height: 24, data: Array(768).fill(0) },
    booth(100, 64),
    booth(200, 384),
  ];
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'instances.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(map)),
  });
  await expect(page.locator('.editor-title h1')).toHaveText('Local instances');
  await ready(page);
  const baseline = await zip(page);
  const box = await page.locator('canvas').boundingBox(),
    z = Math.min((box.width - 80) / 1024, (box.height - 80) / 768);
  await page.mouse.click(
    box.x + box.width / 2 + (76 - 512) * z,
    box.y + box.height / 2 + (76 - 384) * z,
  );
  await expect(page.getByRole('button', { name: 'แก้ไขบูธนี้', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'ตำแหน่ง X', exact: true })).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'ตำแหน่ง Y', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'แก้ไขบูธนี้', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByLabel('กริดชุดบูธ', { exact: true }).selectOption('0');
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ', exact: true }).fill('Edited instance');
  await dialog.locator('.booth-preview-part[data-part-key="bin-sort"]').click();
  await page.keyboard.press('Backspace');
  const computer = dialog.locator('.booth-preview-part[data-part-key="expo-computer"]');
  await computer.click();
  const c = await computer.boundingBox(),
    preview = await dialog.locator('.booth-preview').boundingBox();
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width / 2 + (preview.width * 32) / 192, c.y + c.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  const handle = await dialog
    .getByRole('button', { name: 'ปรับขนาดชิ้นส่วน ล่างขวา', exact: true })
    .boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 + (preview.width * 16) / 192,
    handle.y + handle.height / 2 + (preview.height * 16) / 192,
    { steps: 8 },
  );
  await page.mouse.up();
  await dialog.getByRole('button', { name: 'ใช้กับบูธนี้', exact: true }).click();
  await expect(dialog).toBeHidden();
  const after = await zip(page);
  const edited = after.map.layers.find((l) => l.id === 100);
  expect(edited.name).toBe('Edited instance');
  expect(after.map.layers.find((l) => l.id === 200)).toEqual(
    baseline.map.layers.find((l) => l.id === 200),
  );
  expect(all({ layers: [edited] }).find((o) => o.id === 101)).toBeUndefined();
  const node = all({ layers: [edited] }).find((o) => o.id === 102);
  expect(node).toMatchObject({ x: 96, y: 64, width: 48, height: 52 });
  expect(node.properties.find((p) => p.name === 'interactAction').value).toBe('local-action');
  expect(all({ layers: [edited] }).find((o) => o.id === 103)).toEqual(
    all(baseline.map).find((o) => o.id === 103),
  );
  expect(after.prefabs).toEqual(baseline.prefabs);
  await page.keyboard.press('Control+z');
  expect((await zip(page)).map.layers).toEqual(baseline.map.layers);
  await page.keyboard.press('Control+Shift+z');
  expect((await zip(page)).map.layers).toEqual(after.map.layers);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await ready(page);
  expect((await zip(page)).map.layers).toEqual(after.map.layers);
  expect(errors).toEqual([]);
});

test('Booth width and height use floor-cell counts so a 4 by 4 frame fills with exactly sixteen tiles', async ({
  page,
}) => {
  await page.goto('/editor');
  await ready(page);
  await page.getByRole('button', { name: 'Booth', exact: true }).click();
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ', exact: true }).fill('Four by four');
  await page.getByRole('spinbutton', { name: 'ความกว้างชุดบูธ', exact: true }).fill('4');
  await page.getByRole('spinbutton', { name: 'ความสูงชุดบูธ', exact: true }).fill('4');
  await expect(dialog).toContainText('กรอบ 128 × 128 px');
  await dialog
    .getByRole('group', { name: 'หมวด asset สำหรับบูธ' })
    .getByRole('button', { name: 'Floor', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'เลือก asset floor-wood-center', exact: true }).click();
  const frame = dialog.locator('.booth-preview'),
    box = await frame.boundingBox();
  await page.mouse.move(box.x + 2, box.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2, { steps: 8 });
  await expect(frame).toHaveAttribute('data-floor-preview-count', '16');
  await page.mouse.up();
  await expect(dialog.locator('.booth-preview-part')).toHaveCount(16);
  await page.getByRole('spinbutton', { name: 'ความกว้างชุดบูธ', exact: true }).fill('3');
  await page.getByRole('spinbutton', { name: 'ความกว้างชุดบูธ', exact: true }).press('Tab');
  await expect(page.getByRole('spinbutton', { name: 'ความกว้างชุดบูธ', exact: true })).toHaveValue(
    '4',
  );
  await dialog.getByRole('button', { name: 'บันทึกชุดบูธ', exact: true }).click();
  await expect(dialog).toBeHidden();
  await ready(page);
  const recipe = (await zip(page)).prefabs.find((p) => p.label === 'Four by four');
  expect(recipe).toMatchObject({ width: 128, height: 128 });
  expect(recipe.parts).toHaveLength(16);
  expect(Math.max(...recipe.parts.map((p) => p.x + p.w))).toBe(128);
  expect(Math.max(...recipe.parts.map((p) => p.y + p.h))).toBe(128);
});
