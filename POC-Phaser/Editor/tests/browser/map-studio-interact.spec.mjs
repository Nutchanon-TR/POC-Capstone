import { test, expect } from './starter-test.mjs';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

async function at(page, x, y) {
  const b = await page.locator('canvas').boundingBox();
  const z = Math.min((b.width - 80) / 1344, (b.height - 80) / 832);
  return { x: b.x + b.width / 2 + (x - 672) * z, y: b.y + b.height / 2 + (y - 416) * z };
}
async function exported(page, label) {
  await page.locator('.studio-menu summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await (await pending).path();
  await page.locator('.studio-menu summary').click();
  return file;
}
test('separate props, yellow interaction bounds, confirmed action, move, disable and ZIP roundtrip', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/editor');
  const canvas = page.locator('canvas');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  await page.getByText('Interact', { exact: true }).first().click();
  for (const name of [
    'คอมพิวเตอร์',
    'เอกสารกระดาษ',
    'board-front',
    'chair-padded-left',
    'sofa-down',
  ])
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'expo-booth-counter', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'คอมพิวเตอร์', exact: true }).click();
  const p = await at(page, 390, 326);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('.editor-map-meta')).toContainText('205 ชิ้น');
  await page.getByRole('button', { name: 'แก้ไข Interact', exact: true }).click();
  const q = await at(page, 395, 334);
  await page.mouse.click(q.x, q.y);
  await expect(page.getByRole('switch', { name: 'เปิด Interact', exact: true })).toBeChecked();
  await page.getByRole('textbox', { name: 'ชื่อวัตถุ', exact: true }).fill('คอมลงทะเบียน');
  await page.getByRole('button', { name: 'ยืนยันชื่อ', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-interaction-labels', /คอมลงทะเบียน/);
  await page.getByRole('textbox', { name: 'Action key', exact: true }).fill('open-registration');
  await page.getByRole('button', { name: 'ยืนยัน Action', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'ความกว้าง Interact', exact: true }).fill('48');
  await page.getByRole('spinbutton', { name: 'ความกว้าง Interact', exact: true }).press('Tab');
  const begin = await at(page, 400, 334),
    end = await at(page, 464, 366);
  await page.mouse.move(begin.x, begin.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('spinbutton', { name: 'ตำแหน่ง X', exact: true })).toHaveValue('448');
  await expect(page.getByRole('spinbutton', { name: 'ตำแหน่ง Y', exact: true })).toHaveValue('352');
  await page.screenshot({ path: 'artifacts/interact-editor.png' });
  const zipPath = await exported(page, 'Export ชุด Tiled ZIP');
  const files = unzipSync(new Uint8Array(await readFile(zipPath)));
  const doc = JSON.parse(strFromU8(files['map.tmj']));
  const node = doc.layers.flatMap((l) => l.objects ?? []).find((o) => o.name === 'คอมลงทะเบียน');
  expect(node).toMatchObject({ x: 448, y: 352 });
  expect(node.properties.find((p) => p.name === 'interactAction').value).toBe('open-registration');
  await page.getByRole('button', { name: 'ลบกรอบ Interact · เก็บภาพไว้', exact: true }).click();
  await expect(canvas).not.toHaveAttribute('data-interaction-labels', /คอมลงทะเบียน/);
  await expect(page.locator('.editor-map-meta')).toContainText('205 ชิ้น');
  await page.keyboard.press('Control+z');
  await expect(canvas).toHaveAttribute('data-interaction-labels', /คอมลงทะเบียน/);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  await expect(canvas).toHaveAttribute('data-interaction-labels', /คอมลงทะเบียน/);
  await page.locator('input[type="file"][accept=".tmj,.json,.zip"]').setInputFiles(zipPath);
  await expect(canvas).toHaveAttribute('data-interaction-labels', /คอมลงทะเบียน/);
  expect(errors).toEqual([]);
});

async function seedLegacyWorkspace(page) {
  const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
  const doc = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
  const recipes = JSON.parse(await readFile('public/starter/prefabs.json', 'utf8'));
  const key = (t) => t.properties.find((p) => p.name === 'assetKey').value;
  const old = set.tiles.find((t) => key(t) === 'expo-booth-counter');
  const table = set.tiles.find((t) => key(t) === 'expo-cloth-table');
  const devices = new Set(
    set.tiles
      .filter((t) => ['expo-computer', 'expo-documents'].includes(key(t)))
      .map((t) => t.id + 1),
  );
  function walk(layers) {
    for (const l of layers) {
      if (l.objects) l.objects = l.objects.filter((o) => !devices.has(o.gid));
      for (const o of l.objects ?? [])
        if (o.gid === table.id + 1) {
          o.gid = old.id + 1;
          o.y -= 18;
          o.height = 61;
        }
      walk(l.layers ?? []);
    }
  }
  walk(doc.layers);
  set.tiles = set.tiles.filter((t) => t.id < 25);
  for (const t of set.tiles)
    t.properties = t.properties.filter(
      (p) => !['interactable', 'interactKind', 'editorHidden'].includes(p.name),
    );
  const custom = structuredClone(set.tiles[0]);
  custom.id = 25;
  custom.properties = custom.properties.map((p) =>
    p.name === 'assetKey' ? { ...p, value: 'custom-user-preserved' } : p,
  );
  set.tiles.push(custom);
  set.tilecount = set.tiles.length;
  doc.layers.push({
    id: doc.nextlayerid++,
    name: 'Custom work',
    type: 'objectgroup',
    objects: [
      {
        id: doc.nextobjectid++,
        name: 'โต๊ะของฉัน',
        gid: 26,
        x: 384,
        y: 320,
        width: custom.imagewidth,
        height: custom.imageheight,
        properties: [{ name: 'myData', type: 'string', value: 'keep me' }],
      },
    ],
  });
  for (const p of recipes) {
    p.parts = p.parts.filter((part) => !['expo-computer', 'expo-documents'].includes(part.key));
    for (const part of p.parts)
      if (part.key === 'expo-cloth-table') {
        part.key = 'expo-booth-counter';
        part.y -= 18;
        part.h = 61;
      }
  }
  const textures = await Promise.all(
    set.tiles.map(async (t) => ({
      key: `tile-${t.id + 1}`,
      url:
        'data:image/png;base64,' + (await readFile('public/starter/' + t.image)).toString('base64'),
      width: t.imagewidth,
      height: t.imageheight,
    })),
  );
  const saved = {
    record: {
      id: 'local',
      name: 'Saved custom work',
      revision: 3,
      updatedAt: new Date().toISOString(),
      document: doc,
    },
    catalog: { tileset: set, textures, prefabs: recipes },
  };
  await page.goto('/__fixture');
  await page.evaluate(async (saved) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('connecta-map-studio', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('workspace');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', 'readwrite');
      tx.objectStore('workspace').put(saved, 'current');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, saved);
}

test('saved legacy map upgrade preserves uploaded assets and GIDs, is undoable and saves once', async ({
  page,
}) => {
  await seedLegacyWorkspace(page);
  await page.goto('/editor');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  await expect(page.locator('.editor-map-meta')).toContainText('205 ชิ้น');
  await expect(page.locator('.save-state')).toContainText('ยังไม่บันทึก');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.editor-map-meta')).toContainText('195 ชิ้น');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.editor-map-meta')).toContainText('205 ชิ้น');
  const file = await exported(page, 'Export TMJ');
  const doc = JSON.parse(await readFile(file, 'utf8'));
  const custom = doc.layers.find((l) => l.name === 'Custom work').objects[0];
  expect(custom).toMatchObject({ name: 'โต๊ะของฉัน', gid: 26, x: 384, y: 320 });
  expect(custom.properties).toEqual([{ name: 'myData', type: 'string', value: 'keep me' }]);
  await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.reload();
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  await expect(page.locator('.editor-map-meta')).toContainText('205 ชิ้น');
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
});

test('saved work still opens when the new starter library cannot be fetched', async ({ page }) => {
  await seedLegacyWorkspace(page);
  await page.route('**/starter/expo.tsj', (route) => route.abort());
  await page.goto('/editor');
  await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute(
    'data-phase',
    'ready',
  );
  await expect(page.locator('.editor-map-meta')).toContainText('195 ชิ้น');
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
});
