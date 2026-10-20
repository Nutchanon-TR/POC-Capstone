import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';

async function exportDocument(page) {
  await page.locator('.studio-menu summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export TMJ', exact: true }).click();
  const document = JSON.parse(await readFile(await (await pending).path(), 'utf8'));
  await page.locator('.studio-menu summary').click();
  return document;
}

async function coordinates(page) {
  const b = await page.locator('canvas').boundingBox();
  const zoom = Math.min((b.width - 80) / 1344, (b.height - 80) / 832);
  return (x, y) => ({
    x: b.x + b.width / 2 + (x - 672) * zoom,
    y: b.y + b.height / 2 + (y - 416) * zoom,
  });
}

test('rectangular previews, batch undo, layout erase, floor fill and Space panning', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/editor');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  const meta = page.locator('.editor-map-meta'),
    canvas = page.locator('canvas');
  const count = (n) => expect(meta).toContainText(`${n} ชิ้น`);
  const preview = async () => JSON.parse(await canvas.getAttribute('data-drag-preview'));
  const move = async (point) => page.mouse.move(point.x, point.y, { steps: 5 });
  await count(204);
  const dock = await page.locator('.tool-dock').boundingBox();
  const workspace = await page.locator('.editor-workspace').boundingBox();
  expect(Math.abs(dock.x + dock.width / 2 - workspace.x - workspace.width / 2)).toBeLessThan(2);
  expect(dock.y).toBeGreaterThan(workspace.y + workspace.height * 0.8);
  await expect(page.locator('.dock-tools .dock-button')).toHaveCount(8);
  await expect(page.locator('.dock-tools .dock-tool-menu')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'เลือก / ย้าย', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: 'artifacts/pixel-studio-desktop.png' });
  const original = await exportDocument(page);
  await page.getByText('Layout', { exact: true }).first().click();
  await page.getByRole('button', { name: 'wall-mint-n', exact: true }).click();
  const at = await coordinates(page),
    start = at(390, 326),
    end = at(518, 518);
  await move(start);
  await page.mouse.down();
  await move(end);
  expect((await preview()).count).toBe(15);
  await count(204);
  await move(at(422, 422));
  expect((await preview()).count).toBe(4);
  await move(end);
  await page.screenshot({ path: 'artifacts/layout-drag-preview.png' });
  await page.mouse.up();
  await count(219);
  await page.keyboard.press('Control+z');
  await count(204);
  await page.keyboard.press('Control+Shift+z');
  await count(219);

  await page.getByText('Prop', { exact: true }).first().click();
  await page.getByRole('button', { name: 'โต๊ะคลุมผ้า', exact: true }).click();
  await move(start);
  await page.mouse.click(start.x, start.y);
  await count(220);
  await page.getByRole('button', { name: 'ลบ Layout / Prop', exact: true }).click();
  await move(start);
  await page.mouse.down();
  await move(at(518, 582));
  expect((await preview()).count).toBe(16);
  await count(220);
  await page.screenshot({ path: 'artifacts/layout-erase-preview.png' });
  await page.mouse.up();
  await count(204);
  await page.keyboard.press('Control+z');
  await count(220);
  await page.keyboard.press('Control+y');
  await count(204);
  // Erasing leaves object counters monotonic, but all visible/logical layers match.
  expect((await exportDocument(page)).layers.filter((l) => l.name !== 'Editor props')).toEqual(
    original.layers,
  );

  await page.getByText('Floor', { exact: true }).first().click();
  const floorCards = page.locator('.asset-card');
  const floorNames = await floorCards.allTextContents();
  const floorIndex = floorNames.findIndex(
    (name) => name.includes('wood') && name.includes('center'),
  );
  expect(floorIndex).toBeGreaterThanOrEqual(0);
  await floorCards.nth(floorIndex).click();
  await move(start);
  await page.mouse.down();
  await move(at(518, 390));
  expect((await preview()).count).toBe(15);
  await page.screenshot({ path: 'artifacts/floor-drag-preview.png' });
  await page.mouse.up();
  const filled = await exportDocument(page);
  const beforeFloor = original.layers.find((l) => l.type === 'tilelayer').data;
  const afterFloor = filled.layers.find((l) => l.type === 'tilelayer').data;
  expect(afterFloor.filter((gid, i) => gid !== beforeFloor[i])).toHaveLength(15);
  await page.keyboard.press('Control+z');
  expect((await exportDocument(page)).layers.find((l) => l.type === 'tilelayer').data).toEqual(
    beforeFloor,
  );

  await page.getByText('Layout', { exact: true }).first().click();
  await page.getByRole('button', { name: 'wall-mint-n', exact: true }).click();
  await move(start);
  await page.mouse.down();
  await move(end);
  await page.keyboard.press('Escape');
  await expect(canvas).not.toHaveAttribute('data-drag-preview');
  await page.mouse.up();
  await count(204);

  // Holding Space pans in placement mode and suppresses stamps.
  await move(start);
  const beforePan = JSON.parse(await canvas.getAttribute('data-placement-preview'));
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-preview-visible', 'false');
  await page.mouse.down();
  await move({ x: start.x + 100, y: start.y + 60 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await move(start);
  await expect
    .poll(async () => JSON.parse(await canvas.getAttribute('data-placement-preview')).x)
    .not.toBe(beforePan.x);
  await count(204);
  await page.getByRole('button', { name: 'พอดีจอ', exact: true }).click();

  // Selection handlers must not move props when Space pans over an object.
  await page.getByRole('button', { name: 'เลือก / ย้าย', exact: true }).click();
  const beforeSelectPan = await exportDocument(page);
  await move(at(260, 410));
  await page.keyboard.down('Space');
  await page.mouse.down();
  await move(at(324, 474));
  await page.mouse.up();
  await page.keyboard.up('Space');
  expect(await exportDocument(page)).toEqual(beforeSelectPan);
  await page.getByRole('button', { name: 'พอดีจอ', exact: true }).click();

  // Outside release cancels instead of applying a partially drawn rectangle.
  await page.getByRole('button', { name: 'wall-mint-n', exact: true }).click();
  await move(start);
  await page.mouse.down();
  await move(end);
  await page.mouse.move(workspace.x - 5, 400);
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute('data-drag-preview');
  await count(204);

  // Text controls keep native keyboard behavior and do not undo the map.
  await page.locator('.studio-menu summary').click();
  await page.getByRole('button', { name: 'Blueprint / ขนาดแมป' }).click();
  const title = page.getByRole('textbox', { name: 'ชื่อแมป', exact: true });
  await title.fill('Keyboard');
  await title.press('End');
  await page.keyboard.press('Space');
  await expect(title).toHaveValue('Keyboard ');
  await page.keyboard.press('Control+z');
  await count(204);
  expect(errors).toEqual([]);
});

test.describe('small screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  test('dock fits, shelf can open and selecting an asset returns to the map', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
      'data-phase',
      'ready',
    );
    await expect(page.locator('.studio-shelf')).toBeHidden();
    const dock = await page.locator('.tool-dock').boundingBox();
    expect(dock.x).toBeGreaterThanOrEqual(0);
    expect(dock.x + dock.width).toBeLessThanOrEqual(390);
    expect(dock.y + dock.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await expect(page.locator('.dock-tools .dock-button')).toHaveCount(8);
    await expect(page.locator('.dock-tools .dock-tool-menu')).toHaveCount(3);
    await page.screenshot({ path: 'artifacts/pixel-studio-mobile.png' });
    await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน' }).click();
    await expect(page.locator('.studio-shelf')).toBeVisible();
    await page.screenshot({ path: 'artifacts/pixel-studio-mobile-library.png' });
    await page.getByRole('button', { name: 'table-long-v', exact: true }).click();
    await expect(page.locator('.studio-shelf')).toBeHidden();
    await expect(page.getByRole('button', { name: 'วาง asset', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
