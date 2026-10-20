import { test, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
test('character switching keeps feet and hitbox; one booth host patrols and pauses while talking', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase', 'ready');
  const before = await page.evaluate(() => {
    const s = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld');
    return {
      x: s.player.x,
      y: s.player.y,
      width: s.player.body.width,
      height: s.player.body.height,
    };
  });
  await page.getByRole('combobox', { name: 'เลือกตัวละคร' }).click();
  await page.getByText('InternWitch', { exact: true }).last().click();
  const after = await page.evaluate(() => {
    const s = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld');
    return {
      x: s.player.x,
      y: s.player.y,
      width: s.player.body.width,
      height: s.player.body.height,
    };
  });
  expect(after).toEqual(before);
  const host = await page.evaluate(() => {
    const s = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld');
    s.player.resetTo(s.npcs[0].x, s.npcs[0].y + 70);
    return { x: s.npcs[0].x, count: s.npcs.length };
  });
  expect(host.count).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() => window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').npcs[0].x),
    )
    .not.toBe(host.x);
  await page.getByRole('button', { name: 'พูดคุย · E' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(120);
  const stopped = await page.evaluate(() => {
    const n = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').npcs[0];
    return { x: n.x, y: n.y, vx: n.body.velocity.x };
  });
  expect(stopped.vx).toBe(0);
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(
      () => window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').npcs[0].x,
    ),
  ).toBe(stopped.x);
  await page.screenshot({ path: 'artifacts/npc-dialogue.png' });
  await page.getByRole('button', { name: 'กลับไปสำรวจ' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('dragging a booth persists to PostgreSQL and reloads; ZIP contains a portable Tiled map', async ({
  page,
  request,
}) => {
  const original = await (await request.get('/api/backend/maps/default')).json();
  let saved;
  try {
    await page.goto('/editor');
    await expect(page.locator('.editor-canvas canvas')).toHaveCount(1);
    await page.waitForFunction(() =>
      window.__EXHIBITION_EDITOR__?.scene.getScene('MapEditor').sys.isActive(),
    );
    const target = await page.evaluate(() => {
      const scene = window.__EXHIBITION_EDITOR__.scene.getScene('MapEditor'),
        state = scene.state;
      const item = state.placements.find((i) => i.name.startsWith('booth1-1'));
      const obj = state.world.objects.find((o) => item.objectIds.includes(o.id));
      const c = scene.cameras.main;
      return {
        x: (obj.x + obj.width / 2 - c.worldView.x) * c.zoom,
        y: (obj.y + obj.height / 2 - c.worldView.y) * c.zoom,
        zoom: c.zoom,
        originalX: item.x,
        key: item.key,
      };
    });
    const canvas = await page.locator('.editor-canvas canvas').boundingBox();
    await page.mouse.move(canvas.x + target.x, canvas.y + target.y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + target.x + 32 * target.zoom, canvas.y + target.y, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(page.getByLabel('ตำแหน่ง X')).toHaveValue(String(target.originalX + 32));
    await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
    await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
    saved = await (await request.get('/api/backend/maps/default')).json();
    expect(saved.revision).toBe(original.revision + 1);
    expect(saved.document.layers.find((l) => `layer:${l.id}` === target.key).offsetx).toBe(
      target.originalX + 32,
    );
    await page.reload();
    await expect(page.locator('.editor-canvas canvas')).toHaveCount(1);
    await expect(page.locator('.save-state')).toContainText(`v${saved.revision}`);
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ZIP สำหรับ Tiled', exact: true }).click();
    const download = await downloading;
    await download.saveAs('artifacts/exhibition-tiled.zip');
    const files = unzipSync(new Uint8Array(await readFile('artifacts/exhibition-tiled.zip')));
    expect(files['exhibition.tmj']).toBeTruthy();
    expect(files['tilesets/exhibition.tsj']).toBeTruthy();
    const root = path.resolve('artifacts/tiled-bundle');
    for (const [name, data] of Object.entries(files)) {
      const file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep)) throw Error('Unsafe ZIP path');
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    }
  } finally {
    if (saved)
      expect(
        (
          await request.put(`/api/backend/maps/${original.id}`, {
            data: { ...original, revision: saved.revision },
          })
        ).status(),
      ).toBe(200);
  }
});
test('editor places a prop, undoes/redoes, previews, exports TMJ and imports without saving', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/editor');
  await expect(page.locator('.editor-canvas canvas')).toHaveCount(1);
  await page.getByText('Prop', { exact: true }).click();
  const asset = page.locator('.asset-card').first();
  await asset.click();
  const canvas = page.locator('.editor-canvas canvas');
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.4 } });
  await expect(page.locator('.save-state')).toContainText('ยังไม่บันทึก');
  await expect(page.getByLabel('ตำแหน่ง X')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.save-state')).toContainText('ยังไม่บันทึก');
  await page.getByRole('button', { name: 'ทดลองเดิน', exact: true }).click();
  await expect(page.getByRole('dialog').locator('canvas')).toHaveCount(1);
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export TMJ', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs('artifacts/editor-export.tmj');
  await page.locator('input[accept=".tmj,.json"]').setInputFiles('artifacts/editor-export.tmj');
  await expect(page.getByText('นำเข้าเป็นฉบับร่างแล้ว กดบันทึกเมื่อต้องการใช้ในเกม')).toBeVisible();
  await page.screenshot({ path: 'artifacts/editor.png' });
  expect(errors).toEqual([]);
});
