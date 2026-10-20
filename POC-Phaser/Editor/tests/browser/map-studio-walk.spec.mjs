import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';

async function setup(page) {
  await page.goto('/editor');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  const map = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  map.layers = [
    {
      id: 1,
      name: 'Floor',
      type: 'tilelayer',
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
      name: 'Regions',
      type: 'objectgroup',
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      objects: [
        {
          id: 1,
          name: 'Test wall',
          class: 'Collider',
          x: 400,
          y: 280,
          width: 8,
          height: 250,
          visible: true,
          rotation: 0,
        },
        {
          id: 2,
          name: 'Start',
          class: 'Spawn',
          point: true,
          x: 320,
          y: 352,
          width: 0,
          height: 0,
          visible: true,
          rotation: 0,
        },
      ],
    },
  ];
  map.nextobjectid = 3;
  map.nextlayerid = 3;
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'walk.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(map)),
  });
  await expect(page.locator('.editor-map-meta')).toContainText('0 ชิ้น');
  if (await page.getByRole('button', { name: 'ปิดคลังชิ้นส่วน', exact: true }).isVisible())
    await page.getByRole('button', { name: 'ปิดคลังชิ้นส่วน', exact: true }).click();
  return page.locator('canvas');
}
async function pose(canvas) {
  return JSON.parse(await canvas.getAttribute('data-walk-preview'));
}
async function exported(page) {
  await page.locator('.studio-menu summary').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export TMJ', exact: true }).click();
  const map = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  await page.locator('.studio-menu summary').click();
  return map;
}
async function at(page, x, y) {
  const b = await page.locator('canvas').boundingBox(),
    z = Math.min((b.width - 80) / 1344, (b.height - 80) / 832);
  return { x: b.x + b.width / 2 + (x - 672) * z, y: b.y + b.height / 2 + (y - 416) * z };
}
async function snap(page, text) {
  await page.getByRole('combobox', { name: 'ขนาดบล็อก', exact: true }).click();
  const dropdown = page.locator('.ant-select-dropdown:visible');
  await expect(dropdown.locator('.ant-select-item-option-content')).toHaveText([
    'อิสระ',
    '8 px',
    '16 px',
    '32 px',
  ]);
  await dropdown.getByText(text, { exact: true }).click();
}
test('student toggle animates four directions, obeys collision, preserves exports and cleans up on map change', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const canvas = await setup(page),
    before = await exported(page);
  const toggle = page.getByRole('button', { name: 'ทดลองเดินด้วยตัวละคร', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await pose(canvas)).x).toBe(320);
  await page.keyboard.down('KeyD');
  await expect.poll(async () => (await pose(canvas)).frame).toMatch(/^right-[1-3]$/);
  await expect.poll(async () => (await pose(canvas)).x).toBeGreaterThan(384);
  await page.keyboard.up('KeyD');
  expect((await pose(canvas)).x).toBeLessThanOrEqual(387);
  for (const [key, direction, axis, sign] of [
    ['ArrowDown', 'down', 'y', 1],
    ['KeyA', 'left', 'x', -1],
    ['ArrowUp', 'up', 'y', -1],
  ]) {
    const start = await pose(canvas);
    await page.keyboard.down(key);
    await expect
      .poll(async () => ((await pose(canvas))[axis] - start[axis]) * sign)
      .toBeGreaterThan(15);
    await expect
      .poll(async () => (await pose(canvas)).frame)
      .toMatch(new RegExp(`^${direction}-[1-3]$`));
    await page.keyboard.up(key);
  }
  await page.screenshot({ path: 'artifacts/student-walk-desktop.png' });
  const p = await at(page, 700, 400);
  await page.mouse.click(p.x, p.y);
  expect(await exported(page)).toEqual(before);
  await toggle.click();
  await expect(canvas).not.toHaveAttribute('data-walk-preview');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect.poll(async () => (await pose(canvas)).x).toBe(320);
  await page
    .getByRole('button', { name: /^Duplicate แมป/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'สร้างสำเนาแมป', exact: true }).click();
  await expect(page.locator('.editor-title h1')).toContainText('สำเนา');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  await expect(page.locator('canvas')).not.toHaveAttribute('data-walk-preview');
  await page.keyboard.press('ArrowDown');
  expect(errors).toEqual([]);
});
test('mobile round button and touch directions work, release stops movement and toggle removes student', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = await setup(page),
    toggle = page.getByRole('button', { name: 'ทดลองเดินด้วยตัวละคร', exact: true });
  const circle = await toggle.boundingBox();
  expect(circle.width).toBe(circle.height);
  expect(circle.width).toBeGreaterThanOrEqual(44);
  await toggle.click();
  const right = page.getByRole('button', { name: 'เดินขวา', exact: true });
  const bounds = await right.boundingBox();
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await right.hover();
  await page.mouse.down();
  await expect.poll(async () => (await pose(canvas)).x).toBeGreaterThan(345);
  await page.mouse.up();
  await expect.poll(async () => (await pose(canvas)).moving).toBe(false);
  await page.screenshot({ path: 'artifacts/student-walk-mobile.png' });
  await toggle.click();
  await expect(canvas).not.toHaveAttribute('data-walk-preview');
  await expect(right).toHaveCount(0);
});
test('free and 8px placement previews match committed assets, and free dragging keeps fractional coordinates', async ({
  page,
}) => {
  const canvas = await setup(page);
  await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน', exact: true }).click();
  await page.getByText('Interact', { exact: true }).first().click();
  await page.getByRole('button', { name: 'เอกสารกระดาษ', exact: true }).click();
  await snap(page, 'อิสระ');
  const p = await at(page, 195, 173);
  await page.mouse.move(p.x, p.y);
  await expect(canvas).toHaveAttribute('data-preview-visible', 'true');
  const preview = JSON.parse(await canvas.getAttribute('data-placement-preview'));
  expect(preview.x % 8).not.toBe(0);
  expect(preview.width).toBe(20);
  await page.mouse.click(p.x, p.y);
  let doc = await exported(page),
    first = doc.layers.flatMap((l) => l.objects ?? []).find((o) => o.gid);
  expect(first.x).toBe(preview.x);
  expect(first.y).toBe(preview.y);
  await snap(page, '8 px');
  const q = await at(page, 243, 205);
  await page.mouse.move(q.x, q.y);
  const eight = JSON.parse(await canvas.getAttribute('data-placement-preview'));
  expect(eight.x % 8).toBe(0);
  expect(eight.y % 8).toBe(0);
  await page.mouse.click(q.x, q.y);
  doc = await exported(page);
  const second = doc.layers
    .flatMap((l) => l.objects ?? [])
    .filter((o) => o.gid)
    .at(-1);
  expect(second.x).toBe(eight.x);
  expect(second.y).toBe(eight.y);
  await snap(page, 'อิสระ');
  await page.getByRole('button', { name: 'เลือก / ย้าย', exact: true }).click();
  const begin = await at(page, first.x + 10, first.y + 9),
    end = await at(page, first.x + 47, first.y + 32);
  await page.mouse.move(begin.x, begin.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  doc = await exported(page);
  first = doc.layers.flatMap((l) => l.objects ?? []).find((o) => o.gid);
  expect(first.x).toBeGreaterThan(preview.x + 30);
  expect(first.y).toBeGreaterThan(preview.y + 18);
  expect(first.x % 8).not.toBe(0);
  expect(Number.isFinite(first.x)).toBe(true);
  await page.screenshot({ path: 'artifacts/free-and-eight-grid.png' });
});
