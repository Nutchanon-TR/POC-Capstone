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

function zones(document) {
  const result = [];
  function walk(layers) {
    for (const layer of layers) {
      result.push(
        ...(layer.objects ?? []).filter((o) => ['Zone', 'Area'].includes(o.class || o.type)),
      );
      walk(layer.layers ?? []);
    }
  }
  walk(document.layers);
  return result;
}

test('zone names, blue area selection, live drag, nested creation, delete and undo', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/editor');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  const original = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  function stripRegions(layers) {
    for (const layer of layers) {
      if (layer.objects)
        layer.objects = layer.objects.filter((o) => !['Zone', 'Area'].includes(o.class || o.type));
      stripRegions(layer.layers ?? []);
    }
  }
  stripRegions(original.layers);
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'zones-test.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await page.getByRole('button', { name: 'พื้นที่', exact: true }).click();
  const canvas = page.locator('canvas');
  const b = await canvas.boundingBox();
  const zoom = Math.min((b.width - 80) / 1344, (b.height - 80) / 832);
  const at = (x, y) => ({
    x: b.x + b.width / 2 + (x - 672) * zoom,
    y: b.y + b.height / 2 + (y - 416) * zoom,
  });
  const move = (point) => page.mouse.move(point.x, point.y, { steps: 8 });
  await move(at(390, 326));
  await page.mouse.down();
  await move(at(646, 518));
  await page.mouse.up();
  const name = page.getByRole('textbox', { name: 'ชื่อวัตถุ', exact: true });
  await name.fill('พื้นที่พักผ่อน');
  await name.press('Tab');
  await page.getByRole('button', { name: 'ยืนยันชื่อ', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-zone-labels', JSON.stringify(['พื้นที่พักผ่อน']));
  const created = zones(await exportDocument(page));
  expect(created).toHaveLength(1);
  expect(created[0]).toMatchObject({
    x: 384,
    y: 320,
    width: 256,
    height: 192,
    name: 'พื้นที่พักผ่อน',
  });

  // Clicking anywhere inside selects instead of drawing a duplicate rectangle.
  await page.getByRole('button', { name: 'เลือก / ย้าย', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-zone-labels', '[]');
  await page.getByRole('button', { name: 'พื้นที่', exact: true }).click();
  await page.mouse.click(at(450, 400).x, at(450, 400).y);
  await expect(page.getByRole('button', { name: 'ลบพื้นที่', exact: true })).toBeVisible();
  await expect(page.locator('.zone-selected-name')).toHaveText('พื้นที่พักผ่อน');
  expect(zones(await exportDocument(page))).toHaveLength(1);
  await page.screenshot({ path: 'artifacts/zone-selected-blue.png' });

  await move(at(450, 400));
  await page.mouse.down();
  await move(at(514, 432));
  await page.screenshot({ path: 'artifacts/zone-moving-blue.png' });
  await page.mouse.up();
  const moved = zones(await exportDocument(page));
  expect(moved[0]).toMatchObject({ x: 448, y: 352, width: 256, height: 192 });
  await page.keyboard.press('Control+z');
  expect(zones(await exportDocument(page))[0]).toMatchObject({ x: 384, y: 320 });
  await page.keyboard.press('Control+Shift+z');

  // Explicit drawing creates a nested region while normal clicks keep selecting.
  await page.getByRole('button', { name: 'สร้างพื้นที่ใหม่', exact: true }).click();
  await move(at(486, 390));
  await page.mouse.down();
  await move(at(582, 454));
  await page.mouse.up();
  const nested = zones(await exportDocument(page));
  expect(nested).toHaveLength(2);
  await page.mouse.click(at(520, 420).x, at(520, 420).y);
  await expect(page.locator('.zone-selected-name')).toHaveText(nested[1].name);
  await page.getByRole('button', { name: 'ลบพื้นที่', exact: true }).click();
  expect(zones(await exportDocument(page))).toHaveLength(1);
  await page.keyboard.press('Control+z');
  expect(zones(await exportDocument(page))).toHaveLength(2);

  // Panning never moves the selected region, Escape cancels a pending move.
  await page.mouse.click(at(520, 420).x, at(520, 420).y);
  const beforePan = zones(await exportDocument(page));
  await move(at(520, 420));
  await page.keyboard.down('Space');
  await page.mouse.down();
  await move(at(584, 452));
  await page.mouse.up();
  await page.keyboard.up('Space');
  expect(zones(await exportDocument(page))).toEqual(beforePan);
  await page.getByRole('button', { name: 'พอดีจอ', exact: true }).click();
  await move(at(520, 420));
  await page.mouse.down();
  await move(at(584, 452));
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(zones(await exportDocument(page))).toEqual(beforePan);
  expect(errors).toEqual([]);
});
