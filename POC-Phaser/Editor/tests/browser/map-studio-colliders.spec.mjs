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

function regionObjects(document, type) {
  const result = [];
  function walk(layers) {
    for (const layer of layers) {
      result.push(...(layer.objects ?? []).filter((o) => (o.class || o.type) === type));
      walk(layer.layers ?? []);
    }
  }
  walk(document.layers);
  return result;
}

test('16px snapping, explicit name confirmation, existing collider editing and native floor painting', async ({
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
        layer.objects = layer.objects.filter(
          (o) => !['Zone', 'Area', 'Collider'].includes(o.class || o.type),
        );
      stripRegions(layer.layers ?? []);
    }
  }
  stripRegions(original.layers);
  original.layers.push({
    id: original.nextlayerid++,
    name: 'Studio regions',
    type: 'objectgroup',
    objects: [
      {
        id: original.nextobjectid++,
        name: 'internal-zone',
        type: 'Zone',
        x: 384,
        y: 320,
        width: 160,
        height: 128,
        properties: [
          { name: 'label', type: 'string', value: 'โซนเดิม' },
          { name: 'title', type: 'string', value: 'legacy title' },
        ],
      },
      {
        id: original.nextobjectid++,
        name: 'internal-collider',
        type: 'Collider',
        x: 640,
        y: 320,
        width: 128,
        height: 96,
        properties: [{ name: 'label', type: 'string', value: 'กรอบเดิม' }],
      },
    ],
  });
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'collider-test.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await expect(
    page.getByText('นำเข้าฉบับร่างแล้ว กดบันทึกเพื่อเก็บเป็นไฟล์ถาวร', { exact: true }),
  ).toBeVisible();
  await page.locator('.inline-field .ant-select').click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: '16 px' })
    .click();
  await page.getByRole('button', { name: 'พื้นที่', exact: true }).click();
  const canvas = page.locator('canvas');
  const b = await canvas.boundingBox();
  const zoom = Math.min((b.width - 80) / 1344, (b.height - 80) / 832);
  const at = (x, y) => ({
    x: b.x + b.width / 2 + (x - 672) * zoom,
    y: b.y + b.height / 2 + (y - 416) * zoom,
  });
  const move = (point) => page.mouse.move(point.x, point.y, { steps: 8 });
  await page.mouse.click(at(400, 336).x, at(400, 336).y);
  const name = page.getByRole('textbox', { name: 'ชื่อวัตถุ', exact: true });
  const picker = page.locator('.properties-panel .ant-select');
  await expect(name).toHaveValue('โซนเดิม');
  await expect(picker).toContainText('โซนเดิม');
  await name.fill('โซนใหม่');
  await name.press('Tab');
  await expect(canvas).toHaveAttribute('data-zone-labels', JSON.stringify(['โซนเดิม']));
  await expect(picker).toContainText('โซนเดิม');
  await page.getByRole('button', { name: 'ยืนยันชื่อ', exact: true }).click();
  await expect(name).toHaveValue('โซนใหม่');
  await expect(picker).toContainText('โซนใหม่');
  await expect(canvas).toHaveAttribute('data-zone-labels', JSON.stringify(['โซนใหม่']));
  const zone = regionObjects(await exportDocument(page), 'Zone')[0];
  expect(zone.name).toBe('โซนใหม่');
  expect(zone.properties.every((p) => p.value === 'โซนใหม่')).toBe(true);
  await page.keyboard.press('Control+z');
  await expect(name).toHaveValue('โซนเดิม');
  await expect(picker).toContainText('โซนเดิม');
  await page.keyboard.press('Control+Shift+z');
  await name.fill('โซนชื่อ Enter');
  await name.press('Enter');
  await expect(canvas).toHaveAttribute('data-zone-labels', JSON.stringify(['โซนชื่อ Enter']));
  await name.fill('   ');
  await expect(page.getByRole('button', { name: 'ยืนยันชื่อ', exact: true })).toBeDisabled();
  await name.fill('โซนชื่อ Enter');
  await move(at(410, 350));
  await page.mouse.down();
  await move(at(426, 366));
  await page.mouse.up();
  expect(regionObjects(await exportDocument(page), 'Zone')[0]).toMatchObject({ x: 400, y: 336 });

  await page.getByRole('button', { name: 'กรอบชน', exact: true }).click();
  await page.mouse.click(at(656, 336).x, at(656, 336).y);
  await expect(page.getByRole('button', { name: 'ลบกรอบชน', exact: true })).toBeVisible();
  await expect(name).toHaveValue('กรอบเดิม');
  await name.fill('กรอบชนใหม่');
  await page.getByRole('button', { name: 'ยืนยันชื่อ', exact: true }).click();
  await expect(picker).toContainText('กรอบชนใหม่');
  await expect(canvas).toHaveAttribute('data-collider-labels', JSON.stringify(['กรอบชนใหม่']));
  expect(regionObjects(await exportDocument(page), 'Collider')).toHaveLength(1);
  await move(at(658, 338));
  await page.mouse.down();
  await move(at(674, 354));
  await page.mouse.up();
  expect(regionObjects(await exportDocument(page), 'Collider')[0]).toMatchObject({
    x: 656,
    y: 336,
  });
  await page.getByRole('spinbutton', { name: 'ความกว้างวัตถุ', exact: true }).fill('160');
  await page.getByRole('spinbutton', { name: 'ความกว้างวัตถุ', exact: true }).press('Tab');
  await page.getByRole('spinbutton', { name: 'ความสูงวัตถุ', exact: true }).fill('128');
  await page.getByRole('spinbutton', { name: 'ความสูงวัตถุ', exact: true }).press('Tab');
  const beforeDelete = regionObjects(await exportDocument(page), 'Collider')[0];
  expect(beforeDelete).toMatchObject({
    name: 'กรอบชนใหม่',
    x: 656,
    y: 336,
    width: 160,
    height: 128,
  });
  await page.screenshot({ path: 'artifacts/collider-editing-16px.png' });
  await page.getByRole('button', { name: 'ลบกรอบชน', exact: true }).click();
  expect(regionObjects(await exportDocument(page), 'Collider')).toHaveLength(0);
  await page.keyboard.press('Control+z');
  expect(regionObjects(await exportDocument(page), 'Collider')[0]).toEqual(beforeDelete);
  await page.getByRole('button', { name: 'สร้างกรอบชนใหม่', exact: true }).click();
  await move(at(674, 354));
  await page.mouse.down();
  await move(at(706, 386));
  await page.mouse.up();
  expect(regionObjects(await exportDocument(page), 'Collider')).toHaveLength(2);

  // Native floor remains one complete 32px tile at the selected 16px snap.
  await page.getByRole('button', { name: 'คลังชิ้นส่วน', exact: true }).click();
  await page.getByText('Floor', { exact: true }).first().click();
  const cards = page.locator('.asset-card');
  const names = await cards.allTextContents();
  await cards
    .nth(names.findIndex((label) => label.includes('wood') && label.includes('center')))
    .click();
  const beforeFloor = (await exportDocument(page)).layers.find((l) => l.type === 'tilelayer').data;
  await move(at(350, 310));
  await expect
    .poll(async () => JSON.parse(await canvas.getAttribute('data-placement-preview')))
    .toMatchObject({ x: 320, y: 288, width: 32, height: 32 });
  await page.mouse.click(at(350, 310).x, at(350, 310).y);
  const afterFloor = (await exportDocument(page)).layers.find((l) => l.type === 'tilelayer').data;
  expect(afterFloor.filter((gid, i) => gid !== beforeFloor[i])).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('collider supplied by an asset can be deleted or edited without changing the artwork', async ({
  page,
}) => {
  await page.goto('/editor');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  const map = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  const tileset = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
  const tile = tileset.tiles.find(
    (t) =>
      t.objectgroup?.objects.length && !t.properties.some((p) => p.name === 'ground' && p.value),
  );
  const collision = tile.objectgroup.objects[0];
  map.layers = [
    map.layers.find((l) => l.type === 'tilelayer'),
    {
      id: map.nextlayerid++,
      name: 'Test asset',
      type: 'objectgroup',
      objects: [
        {
          id: map.nextobjectid++,
          name: 'asset-test',
          gid: tile.id + 1,
          x: 320,
          y: 320,
          width: tile.imagewidth,
          height: tile.imageheight,
          visible: true,
        },
      ],
    },
  ];
  await page.locator('input[accept=".tmj,.json,.zip"]').setInputFiles({
    name: 'asset-collider.tmj',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(map)),
  });
  await expect(
    page.getByText('นำเข้าฉบับร่างแล้ว กดบันทึกเพื่อเก็บเป็นไฟล์ถาวร', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'กรอบชน', exact: true }).click();
  const b = await page.locator('canvas').boundingBox();
  const zoom = Math.min((b.width - 80) / 1344, (b.height - 80) / 832);
  const point = {
    x: b.x + b.width / 2 + (320 + collision.x + collision.width / 2 - 672) * zoom,
    y: b.y + b.height / 2 + (320 + collision.y + collision.height / 2 - 416) * zoom,
  };
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('.collider-actions')).toContainText('กรอบชนจาก asset');
  await page.getByRole('button', { name: 'ลบกรอบชน', exact: true }).click();
  const removed = await exportDocument(page);
  expect(regionObjects(removed, 'Collider')).toHaveLength(tile.objectgroup.objects.length - 1);
  const source = removed.layers.flatMap((l) => l.objects ?? []).find((o) => o.gid);
  expect(source).toMatchObject({
    x: 320,
    y: 320,
    width: tile.imagewidth,
    height: tile.imageheight,
    name: 'asset-test',
  });
  expect(source.properties.find((p) => p.name === 'collisionEnabled').value).toBe(false);
  await page.keyboard.press('Control+z');
  expect((await exportDocument(page)).layers).toEqual(map.layers);
  await page.mouse.click(point.x, point.y);
  await page.getByRole('button', { name: 'แก้ไขกรอบชน', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อวัตถุ', exact: true }).fill('กรอบแยกจาก asset');
  await page.getByRole('button', { name: 'ยืนยันชื่อ', exact: true }).click();
  const edited = await exportDocument(page);
  const rectangles = regionObjects(edited, 'Collider');
  expect(rectangles).toHaveLength(tile.objectgroup.objects.length);
  expect(rectangles.some((o) => o.name === 'กรอบแยกจาก asset')).toBe(true);
  expect(edited.layers.flatMap((l) => l.objects ?? []).find((o) => o.gid)).toMatchObject({
    x: 320,
    y: 320,
    width: tile.imagewidth,
    height: tile.imageheight,
  });
});
