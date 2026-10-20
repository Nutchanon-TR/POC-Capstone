import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const tileset = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
const tiles = ['expo-computer', 'table-short-v', 'sofa-down'].map((key) =>
  tileset.tiles.find((t) => t.properties.some((p) => p.name === 'assetKey' && p.value === key)),
);
const images = await Promise.all(
  tiles.map(async (t) =>
    sharp(await readFile('public/starter/' + t.image))
      .resize(96, 96, { kernel: 'nearest', fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer(),
  ),
);
// Sample a flat, opaque part shared by three real images, so camera rounding cannot hide a failure.
let sample;
for (let y = 8; y < 88 && !sample; y++)
  for (let x = 8; x < 88 && !sample; x++) {
    const colors = images.map((data) => [...data.subarray((y * 96 + x) * 4, (y * 96 + x) * 4 + 3)]);
    if (new Set(colors.map((c) => c.join(','))).size !== 3) continue;
    const flat = images.every((data, index) => {
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const offset = ((y + dy) * 96 + x + dx) * 4;
          if (data[offset + 3] !== 255 || colors[index].some((c, i) => c !== data[offset + i]))
            return false;
        }
      return true;
    });
    if (flat) sample = { x, y, colors };
  }
if (!sample) throw Error('No shared opaque pixel found in stack fixture');

async function setup(page) {
  await page.goto('/editor');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  const doc = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  Object.assign(doc, {
    width: 42,
    height: 26,
    tilewidth: 32,
    tileheight: 32,
    nextlayerid: 3,
    nextobjectid: 4,
  });
  doc.layers = [
    {
      id: 1,
      type: 'tilelayer',
      name: 'Floor',
      width: 42,
      height: 26,
      data: Array(1092).fill(0),
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
    },
    {
      id: 2,
      type: 'objectgroup',
      name: 'Props',
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      objects: tiles.map((t, i) => ({
        id: i + 1,
        name: `ชั้น ${'ABC'[i]}`,
        gid: t.id + 1,
        x: 320,
        y: 320,
        width: 96,
        height: 96,
        rotation: 0,
        visible: true,
        properties: [
          { name: 'renderDepth', type: 'float', value: 100 * (i + 1) },
          { name: 'interactEnabled', type: 'bool', value: false },
        ],
      })),
    },
  ];
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'stack.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.locator('.editor-map-meta')).toContainText('3 ชิ้น');
  if (!(await page.locator('.shelf-tabs').isVisible()))
    await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน', exact: true }).click();
  await page
    .locator('.shelf-tabs')
    .getByRole('button', { name: 'รายละเอียด', exact: true })
    .click();
  return doc;
}
async function select(page, name) {
  await page.getByRole('combobox', { name: 'เลือกวัตถุในแมป' }).click();
  await page.locator('.ant-select-dropdown:visible').getByText(name, { exact: true }).click();
  await expect(page.locator('.render-order-controls')).toBeVisible();
}
async function exported(page) {
  await page.locator('.studio-menu summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export TMJ', exact: true }).click();
  const file = await (await pending).path();
  await page.locator('.studio-menu summary').click();
  return JSON.parse(await readFile(file, 'utf8'));
}
const visualOrder = (doc) =>
  doc.layers
    .flatMap((l) => l.objects ?? [])
    .filter((o) => o.gid)
    .sort(
      (a, b) =>
        a.properties.find((p) => p.name === 'renderDepth').value -
        b.properties.find((p) => p.name === 'renderDepth').value,
    )
    .map((o) => o.name);
async function expectTop(page, index) {
  const canvas = page.locator('canvas'),
    b = await canvas.boundingBox();
  const zoom = Math.min((b.width - 80) / 1344, (b.height - 80) / 832);
  const x = Math.round(b.width / 2 + (320 + sample.x - 672) * zoom);
  const y = Math.round(b.height / 2 + (320 + sample.y - 416) * zoom);
  await expect
    .poll(async () => {
      const { data, info } = await sharp(await canvas.screenshot())
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const offset = (y * info.width + x) * 4;
      return [...data.subarray(offset, offset + 3)];
    })
    .toEqual(sample.colors[index]);
}

test('four stack controls change real rendering, Undo/Redo, save and exported order without moving sprites', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const original = await setup(page);
  await select(page, 'ชั้น A');
  await expect(page.getByRole('button', { name: 'หลังสุด', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'ลง 1 ระดับ', exact: true })).toBeDisabled();
  await expectTop(page, 2);
  await page.getByRole('button', { name: 'ขึ้น 1 ระดับ', exact: true }).click();
  expect(visualOrder(await exported(page))).toEqual(['ชั้น B', 'ชั้น A', 'ชั้น C']);
  await page.getByRole('button', { name: 'หน้าสุด', exact: true }).click();
  await expectTop(page, 0);
  await expect(page.getByRole('button', { name: 'หน้าสุด', exact: true })).toBeDisabled();
  await page.keyboard.press('Control+z');
  await expectTop(page, 2);
  await page.keyboard.press('Control+Shift+z');
  await expectTop(page, 0);
  await page.getByRole('button', { name: 'ลง 1 ระดับ', exact: true }).click();
  expect(visualOrder(await exported(page))).toEqual(['ชั้น B', 'ชั้น A', 'ชั้น C']);
  await page.getByRole('button', { name: 'หลังสุด', exact: true }).click();
  await expectTop(page, 2);
  await select(page, 'ชั้น C');
  await page.getByRole('button', { name: 'หลังสุด', exact: true }).click();
  await expectTop(page, 1);
  await page.getByRole('button', { name: 'ขึ้น 1 ระดับ', exact: true }).click();
  expect(visualOrder(await exported(page))).toEqual(['ชั้น A', 'ชั้น C', 'ชั้น B']);
  await page.getByRole('button', { name: 'หน้าสุด', exact: true }).click();
  await expectTop(page, 2);
  await page.screenshot({ path: 'artifacts/asset-order-desktop.png' });
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  await expectTop(page, 2);
  const saved = await exported(page);
  expect(visualOrder(saved)).toEqual(['ชั้น A', 'ชั้น B', 'ชั้น C']);
  expect(
    saved.layers[1].objects.map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
    })),
  ).toEqual(
    original.layers[1].objects.map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
    })),
  );
  expect(errors).toEqual([]);
});

test('mobile controls fit, preserve selection and can reset to automatic Y sorting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await select(page, 'ชั้น A');
  for (const name of ['หน้าสุด', 'หลังสุด', 'ขึ้น 1 ระดับ', 'ลง 1 ระดับ']) {
    const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }
  await page.getByRole('button', { name: 'หน้าสุด', exact: true }).click();
  await expect(page.locator('.render-order-heading')).toContainText('3 / 3');
  await expect(
    page.getByRole('spinbutton', { name: 'แนวหน้าหลังวัตถุ', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'เรียงตามตำแหน่งอัตโนมัติ', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'แนวหน้าหลังวัตถุ', exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: 'artifacts/asset-order-mobile.png' });
  const doc = await exported(page);
  expect(doc.layers[1].objects[0].properties.some((p) => p.name === 'renderDepth')).toBe(false);
});
