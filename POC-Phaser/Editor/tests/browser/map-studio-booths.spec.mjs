import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

const ready = (page) =>
  expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute('data-phase', 'ready');
async function boothTab(page) {
  if (!(await page.locator('.studio-shelf').isVisible()))
    await page.getByRole('button', { name: 'เปิด / ปิดคลังชิ้นส่วน' }).click();
  await page
    .locator('.shelf-tabs')
    .getByRole('button', { name: 'คลังชิ้นส่วน', exact: true })
    .click();
  await page.getByRole('button', { name: 'Booth', exact: true }).click();
}
async function addPart(page, asset, category = asset === 'คอมพิวเตอร์' ? 'Interact' : 'Prop') {
  await page
    .getByRole('dialog')
    .getByRole('group', { name: 'หมวด asset สำหรับบูธ' })
    .getByRole('button', { name: category, exact: true })
    .click();
  await page.getByRole('searchbox', { name: 'ค้นหา asset สำหรับบูธ' }).fill(asset);
  await page.getByRole('button', { name: `เลือก asset ${asset}`, exact: true }).click();
  if (category === 'Floor') {
    await expect(page.getByRole('button', { name: '＋ เพิ่มชิ้นส่วน', exact: true })).toHaveCount(
      0,
    );
    const frame = await page.locator('.booth-preview').boundingBox();
    await page.mouse.click(frame.x + (8 * frame.width) / 192, frame.y + (8 * frame.height) / 192);
  } else await page.getByRole('button', { name: '＋ เพิ่มชิ้นส่วน', exact: true }).click();
}
async function saveBooth(page) {
  await page.getByRole('button', { name: 'บันทึกชุดบูธ', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await ready(page);
}
async function zip(page) {
  await page.locator('.studio-menu summary').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export ชุด Tiled ZIP', exact: true }).click();
  const files = unzipSync(new Uint8Array(await readFile(await (await download).path())));
  await page.locator('.studio-menu summary').click();
  return {
    map: JSON.parse(strFromU8(files['map.tmj'])),
    prefabs: JSON.parse(strFromU8(files['studio/prefabs.json'])),
  };
}
async function createMap(page, name) {
  await page.getByRole('button', { name: 'สร้างแมปใหม่', exact: false }).click();
  await page.getByRole('textbox', { name: 'ชื่อแมปใหม่', exact: true }).fill(name);
  await page.getByRole('button', { name: 'สร้างแมป', exact: true }).click();
  await expect(page.locator('.editor-title h1')).toHaveText(name);
  await ready(page);
}

test('Booth popup creates, visually arranges, edits and deletes shared recipes without deleting placed booths', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/editor');
  await ready(page);
  await boothTab(page);
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ' }).fill('บูธออกแบบเอง');
  await addPart(page, 'bin-sort');
  await addPart(page, 'คอมพิวเตอร์');
  await expect(page.getByRole('spinbutton', { name: /^ชิ้นส่วนบูธ/ })).toHaveCount(0);
  const part = page.getByRole('button', { name: 'ชิ้นส่วน 2 คอมพิวเตอร์', exact: true });
  const b = await part.boundingBox(),
    preview = await page.locator('.booth-preview').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    b.x + b.width / 2 + (preview.width / 192) * 80,
    b.y + b.height / 2 + (preview.width / 192) * 64,
    {
      steps: 8,
    },
  );
  await page.mouse.up();
  await expect(part).toHaveAttribute('data-part-x', '80');
  await expect(part).toHaveAttribute('data-part-y', '64');
  await page.screenshot({ path: 'artifacts/booth-popup-desktop.png' });
  await saveBooth(page);
  await expect(page.getByRole('button', { name: 'บูธออกแบบเอง', exact: true })).toBeVisible();
  await createMap(page, 'Booth placement');
  await boothTab(page);
  await page.getByRole('button', { name: 'บูธออกแบบเอง', exact: true }).click();
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await expect(page.locator('.editor-map-meta')).toContainText('1 บูธ');
  const before = await zip(page);
  await boothTab(page);
  await page.getByRole('button', { name: 'แก้ไขบูธ บูธออกแบบเอง', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ' }).fill('บูธใหม่เวอร์ชันสอง');
  await saveBooth(page);
  await expect(page.getByRole('button', { name: 'บูธใหม่เวอร์ชันสอง', exact: true })).toBeVisible();
  expect((await zip(page)).map).toEqual(before.map);
  await page.getByRole('button', { name: 'ลบชุดบูธ บูธใหม่เวอร์ชันสอง', exact: true }).click();
  await page
    .locator('.ant-popconfirm')
    .getByRole('button', { name: 'ลบชุดบูธ', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'บูธใหม่เวอร์ชันสอง', exact: true })).toHaveCount(
    0,
  );
  expect((await zip(page)).map).toEqual(before.map);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await ready(page);
  await boothTab(page);
  await expect(page.getByRole('button', { name: 'บูธใหม่เวอร์ชันสอง', exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('.editor-map-meta')).toContainText('1 บูธ');
  await page.getByRole('button', { name: 'เปิดแมป Connecta Exhibition', exact: true }).click();
  await ready(page);
  await boothTab(page);
  await expect(page.getByRole('button', { name: 'บูธใหม่เวอร์ชันสอง', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'แก้ไขบูธ booth-01', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ' }).fill('ชุดเดิมที่แก้ไข');
  await saveBooth(page);
  await page.reload();
  await ready(page);
  await boothTab(page);
  await expect(page.getByRole('button', { name: 'ชุดเดิมที่แก้ไข', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('saved maps, uploaded PNG and Booth recipes reopen in an entirely fresh browser profile from disk', async ({
  page,
  browser,
  baseURL,
  extraHTTPHeaders,
}) => {
  await page.goto('/editor');
  await ready(page);
  await createMap(page, 'Permanent map');
  await page.locator('.studio-menu summary').click();
  await page.getByRole('button', { name: 'เพิ่ม asset PNG', exact: true }).click();
  await page
    .getByLabel('ไฟล์ asset PNG', { exact: true })
    .setInputFiles('public/starter/props/bin-sort.png');
  await page.getByRole('textbox', { name: 'ชื่อ asset ใหม่' }).fill('Permanent PNG');
  await page.getByRole('spinbutton', { name: 'ความกว้าง asset ใหม่' }).fill('54');
  await page.getByRole('button', { name: 'เพิ่มเข้าในคลัง', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.locator('.studio-menu summary').click();
  await ready(page);
  await boothTab(page);
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ' }).fill('Permanent booth');
  await addPart(page, 'Permanent PNG');
  await saveBooth(page);
  await page.getByRole('button', { name: 'Permanent booth', exact: true }).click();
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  const before = await zip(page);
  const fresh = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: 1600, height: 1000 },
  });
  try {
    const other = await fresh.newPage();
    await other.goto('/editor');
    await ready(other);
    await expect(other.locator('.editor-title h1')).toHaveText('Permanent map');
    await expect(other.locator('.editor-map-meta')).toContainText('1 บูธ');
    await boothTab(other);
    await expect(other.getByRole('button', { name: 'Permanent booth', exact: true })).toBeVisible();
    const reopened = await zip(other);
    expect(reopened.map).toEqual(before.map);
    expect(reopened.prefabs.find((prefab) => prefab.label === 'Permanent booth')).toEqual(
      before.prefabs.find((prefab) => prefab.label === 'Permanent booth'),
    );
    await expect
      .poll(() =>
        other
          .getByRole('button', { name: 'Permanent booth', exact: true })
          .locator('img')
          .first()
          .evaluate((image) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
  } finally {
    await fresh.close();
  }
});

test('mobile Booth popup fits, saves and cancels independently of the map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor');
  await ready(page);
  await boothTab(page);
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ' }).fill('Mobile booth');
  await addPart(page, 'bin-sort');
  const frame = await page.locator('.booth-preview').boundingBox();
  expect(Math.abs(frame.width - frame.height)).toBeLessThan(1);
  await expect(page.getByRole('button', { name: 'บันทึกชุดบูธ', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/booth-popup-mobile.png' });
  const b = await page.getByRole('dialog').boundingBox();
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  await saveBooth(page);
  await expect(page.getByRole('button', { name: 'Mobile booth', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'แก้ไขบูธ Mobile booth', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ' }).fill('Canceled');
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mobile booth', exact: true })).toBeVisible();
});

async function movePart(page, part, dx, dy) {
  const box = await part.boundingBox();
  const frame = await page.locator('.booth-preview').boundingBox();
  const scale = frame.width / 192;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx * scale, box.y + box.height / 2 + dy * scale, {
    steps: 8,
  });
  await page.mouse.up();
}
async function resizePart(page, handle, dx, dy, cancel = false) {
  const button = page.getByRole('button', { name: `ปรับขนาดชิ้นส่วน ${handle}`, exact: true });
  const box = await button.boundingBox();
  const frame = await page.locator('.booth-preview').boundingBox();
  const scale = frame.width / 192;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx * scale, box.y + box.height / 2 + dy * scale, {
    steps: 8,
  });
  if (cancel) await page.keyboard.press('Escape');
  await page.mouse.up();
}

test('Booth composer groups a collapsible contents list, resizes directly and preserves front/back after saving', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/editor');
  await ready(page);
  await boothTab(page);
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ', exact: true }).fill('Visual booth');
  await page.getByLabel('กริดชุดบูธ', { exact: true }).selectOption('0');
  await addPart(page, 'bin-sort');
  const bin = page.locator('.booth-preview-part[data-part-key="bin-sort"]');
  const w = Number(await bin.getAttribute('data-part-width'));
  const h = Number(await bin.getAttribute('data-part-height'));
  await movePart(page, bin, 64, 64);
  await expect(bin).toHaveAttribute('data-part-x', '64');
  await expect(bin).toHaveAttribute('data-part-y', '64');
  await expect(dialog.locator('.booth-resize-handle')).toHaveCount(8);
  await resizePart(page, 'ล่างขวา', 16, 16);
  await expect(bin).toHaveAttribute('data-part-width', String(w + 16));
  await expect(bin).toHaveAttribute('data-part-height', String(h + 16));
  await resizePart(page, 'ซ้าย', 8, 0);
  await expect(bin).toHaveAttribute('data-part-x', '72');
  await expect(bin).toHaveAttribute('data-part-width', String(w + 8));
  await resizePart(page, 'ล่างขวา', 16, 16, true);
  await expect(bin).toHaveAttribute('data-part-width', String(w + 8));
  await expect(dialog).toBeVisible();
  await addPart(page, 'wall-mint-n', 'Layout');
  await addPart(page, 'floor-wood-center', 'Floor');
  await addPart(page, 'คอมพิวเตอร์');
  const computer = page.locator('.booth-preview-part[data-part-key="expo-computer"]');
  const wall = page.locator('.booth-preview-part[data-part-key="wall-mint-n"]');
  expect(Number(await computer.evaluate((node) => node.style.zIndex))).toBeGreaterThan(
    Number(await wall.evaluate((node) => node.style.zIndex)),
  );
  await expect(dialog.locator('.booth-contents')).not.toHaveAttribute('open', '');
  await dialog.locator('.booth-contents > summary').click();
  await expect(dialog.locator('.booth-part-category')).toHaveCount(4);
  for (const category of ['Prop', 'Layout', 'Floor', 'Interact'])
    await expect(
      dialog
        .locator('.booth-part-category')
        .filter({ has: page.locator('summary', { hasText: category }) })
        .getByRole('button'),
    ).toHaveCount(1);
  const order = dialog.getByRole('group', { name: 'ลำดับชิ้นส่วนบูธ', exact: true });
  await order.getByRole('button', { name: 'หลังสุด', exact: true }).click();
  expect(Number(await computer.evaluate((node) => node.style.zIndex))).toBeLessThan(
    Number(await bin.evaluate((node) => node.style.zIndex)),
  );
  await order.getByRole('button', { name: 'หน้า', exact: true }).click();
  expect(Number(await computer.evaluate((node) => node.style.zIndex))).toBeGreaterThan(
    Number(await bin.evaluate((node) => node.style.zIndex)),
  );
  await order.getByRole('button', { name: 'หลัง', exact: true }).click();
  expect(Number(await computer.evaluate((node) => node.style.zIndex))).toBeLessThan(
    Number(await bin.evaluate((node) => node.style.zIndex)),
  );
  await order.getByRole('button', { name: 'หน้าสุด', exact: true }).click();
  expect(Number(await computer.evaluate((node) => node.style.zIndex))).toBeGreaterThan(
    Number(await wall.evaluate((node) => node.style.zIndex)),
  );
  await expect(
    dialog.getByRole('spinbutton', { name: /^ชิ้นส่วนบูธ|แนวหน้าหลังชิ้นส่วนบูธ/ }),
  ).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/booth-composer-resize.png', animations: 'disabled' });
  await saveBooth(page);
  const recipe = (await zip(page)).prefabs.find((p) => p.label === 'Visual booth');
  expect(recipe.parts.map((p) => p.key)).toEqual([
    'floor-wood-center',
    'bin-sort',
    'wall-mint-n',
    'expo-computer',
  ]);
  expect(recipe.parts[1]).toMatchObject({ x: 72, y: 64, w: w + 8, h: h + 16 });
  await page.getByRole('button', { name: 'แก้ไขบูธ Visual booth', exact: true }).click();
  await expect(computer).toHaveCSS('z-index', '4');
  await expect(bin).toHaveAttribute('data-part-x', '72');
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  expect(errors).toEqual([]);
});

test('Booth floor and asset erasers work through overlaps, and Backspace deletes selected parts without deleting native input', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/editor');
  await ready(page);
  await boothTab(page);
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await addPart(page, 'floor-wood-center', 'Floor');
  await addPart(page, 'bin-sort');
  const frame = await page.locator('.booth-preview').boundingBox();
  const clickOverlap = () =>
    page.mouse.click(frame.x + (8 * frame.width) / 192, frame.y + (8 * frame.width) / 192);
  await dialog.getByRole('button', { name: 'ลบพื้น', exact: true }).click();
  await clickOverlap();
  await expect(dialog.locator('.booth-preview-part[data-part-category="Floor"]')).toHaveCount(0);
  await expect(dialog.locator('.booth-preview-part[data-part-key="bin-sort"]')).toHaveCount(1);
  await addPart(page, 'floor-wood-center', 'Floor');
  await dialog.getByRole('button', { name: 'ลบ asset', exact: true }).click();
  await clickOverlap();
  await expect(dialog.locator('.booth-preview-part[data-part-key="bin-sort"]')).toHaveCount(0);
  await expect(dialog.locator('.booth-preview-part[data-part-category="Floor"]')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'เลือก / ย้าย', exact: true }).click();
  await clickOverlap();
  await page.keyboard.press('Backspace');
  await expect(dialog.locator('.booth-preview-part')).toHaveCount(0);
  await addPart(page, 'bin-sort');
  const name = page.getByRole('textbox', { name: 'ชื่อชุดบูธ', exact: true });
  await name.fill('Native');
  await name.press('End');
  await name.press('Backspace');
  await expect(name).toHaveValue('Nativ');
  await expect(dialog.locator('.booth-preview-part')).toHaveCount(1);
  await page.locator('.booth-preview').focus();
  await page.keyboard.press('Backspace');
  await expect(dialog.locator('.booth-preview-part')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'บันทึกชุดบูธ', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  expect(errors).toEqual([]);
});

test('Booth Floor previews on hover, stamps on click, fills a reversible rectangle on release and cancels without committing', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/editor');
  await ready(page);
  await boothTab(page);
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByRole('textbox', { name: 'ชื่อชุดบูธ', exact: true }).fill('Painted floor booth');
  await dialog
    .getByRole('group', { name: 'หมวด asset สำหรับบูธ' })
    .getByRole('button', { name: 'Floor', exact: true })
    .click();
  await page.getByRole('button', { name: 'เลือก asset floor-wood-center', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '＋ เพิ่มชิ้นส่วน', exact: true })).toHaveCount(
    0,
  );
  const frame = page.locator('.booth-preview');
  const box = await frame.boundingBox();
  const at = (x, y) => ({ x: box.x + (x * box.width) / 192, y: box.y + (y * box.height) / 192 });
  const move = async (x, y) => {
    const p = at(x, y);
    await page.mouse.move(p.x, p.y, { steps: 6 });
  };
  const floor = dialog.locator('.booth-preview-part[data-part-category="Floor"]');
  await move(8, 8);
  await expect(frame).toHaveAttribute('data-floor-preview-count', '1');
  await expect(floor).toHaveCount(0);
  await page.mouse.click(at(8, 8).x, at(8, 8).y);
  await expect(floor).toHaveCount(1);
  await page.mouse.click(at(8, 8).x, at(8, 8).y);
  await expect(floor).toHaveCount(1);
  await page.mouse.down();
  await move(136, 72);
  await expect(frame).toHaveAttribute('data-floor-preview-count', '15');
  await expect(floor).toHaveCount(1);
  await move(40, 40);
  await expect(frame).toHaveAttribute('data-floor-preview-count', '4');
  await move(136, 72);
  await page.screenshot({ path: 'artifacts/booth-floor-preview.png', animations: 'disabled' });
  await page.mouse.up();
  await expect(floor).toHaveCount(15);
  await expect(frame).toHaveAttribute('data-floor-preview-count', '0');
  await move(8, 136);
  await page.mouse.down();
  await move(72, 168);
  await expect(frame).toHaveAttribute('data-floor-preview-count', '6');
  await page.keyboard.press('Escape');
  await expect(frame).toHaveAttribute('data-floor-preview-count', '0');
  await page.mouse.up();
  await expect(floor).toHaveCount(15);
  await move(8, 136);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, at(136, 168).y, { steps: 6 });
  await page.mouse.up();
  await expect(floor).toHaveCount(15);
  await move(8, 136);
  await page.mouse.down();
  await move(72, 168);
  await frame.dispatchEvent('pointercancel');
  await page.mouse.up();
  await expect(floor).toHaveCount(15);
  await page.getByRole('button', { name: 'เลือก asset floor-mint-center', exact: true }).click();
  await page.mouse.click(at(8, 8).x, at(8, 8).y);
  await expect(floor).toHaveCount(15);
  await expect(
    dialog.locator('.booth-preview-part[data-part-key="floor-mint-center"]'),
  ).toHaveCount(1);
  await saveBooth(page);
  const recipe = (await zip(page)).prefabs.find((p) => p.label === 'Painted floor booth');
  expect(recipe.parts).toHaveLength(15);
  expect(new Set(recipe.parts.map((p) => `${p.x}:${p.y}`)).size).toBe(15);
  expect(recipe.parts.every((p) => p.w === 32 && p.h === 32)).toBe(true);
  await page.getByRole('button', { name: 'แก้ไขบูธ Painted floor booth', exact: true }).click();
  await expect(floor).toHaveCount(15);
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  expect(errors).toEqual([]);
});

test('Booth Floor painting stays aligned on a small screen and can return to selecting floor parts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor');
  await ready(page);
  await boothTab(page);
  await page.getByRole('button', { name: '＋ เพิ่มบูธ', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await addPart(page, 'floor-wood-center', 'Floor');
  const frame = page.locator('.booth-preview');
  const box = await frame.boundingBox();
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  await page.mouse.move(box.x + (box.width * 40) / 192, box.y + (box.height * 40) / 192);
  await expect(frame).toHaveAttribute('data-floor-preview-count', '1');
  await page.mouse.click(box.x + (box.width * 40) / 192, box.y + (box.height * 40) / 192);
  await expect(dialog.locator('.booth-preview-part')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'เลือก / ย้าย', exact: true }).click();
  const part = dialog.locator('.booth-preview-part').last();
  await part.click();
  await expect(dialog.locator('.booth-resize-handle')).toHaveCount(8);
  await page.keyboard.press('Backspace');
  await expect(dialog.locator('.booth-preview-part')).toHaveCount(1);
  await saveBooth(page);
});
