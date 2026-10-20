import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { Pool } from 'pg';
import sharp from 'sharp';
import { unzipSync, strFromU8 } from 'fflate';
loadEnvFile('server/.env.local');

async function worldPoint(page, x, y) {
  const local = await page.evaluate(
    ({ x, y }) => {
      const c = window.__EXHIBITION_EDITOR__.scene.getScene('MapEditor').cameras.main;
      return { x: (x - c.worldView.x) * c.zoom, y: (y - c.worldView.y) * c.zoom };
    },
    { x, y },
  );
  const box = await page.locator('.editor-canvas canvas').boundingBox();
  return { x: box.x + local.x, y: box.y + local.y };
}
test('blueprint, new PNG asset, aspect lock, regions, preview and portable export roundtrip', async ({
  page,
  request,
}) => {
  const original = await (await request.get('/api/backend/maps/default')).json();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const name = `Studio fixture ${Date.now()}`;
  let assetKey, saved;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('artifacts', { recursive: true });
  await sharp({ create: { width: 512, height: 384, channels: 4, background: '#dce5eb' } })
    .png()
    .toFile('artifacts/test-blueprint.png');
  await sharp({ create: { width: 64, height: 96, channels: 4, background: '#617a8c' } })
    .png()
    .toFile('artifacts/test-asset.png');
  try {
    await page.goto('/editor');
    await expect(page.locator('.editor-canvas')).toHaveAttribute('data-phase', 'ready');
    await page.getByRole('button', { name: 'Blueprint / ขนาดแมป', exact: true }).click();
    await page.getByLabel('ชื่อแมป', { exact: true }).fill('Studio integration');
    await page.getByLabel('จำนวนช่องแนวนอน').fill('20');
    await page.getByLabel('จำนวนช่องแนวตั้ง').fill('20');
    await page.getByRole('button', { name: 'เริ่มแมปใหม่', exact: true }).click();
    await expect(page.locator('.editor-title h1')).toHaveText('Studio integration');
    await page.getByRole('button', { name: 'Blueprint / ขนาดแมป', exact: true }).click();
    await page
      .locator('input[accept="image/png,image/jpeg,image/webp"]')
      .setInputFiles('artifacts/test-blueprint.png');
    await expect(page.getByText('test-blueprint.png', { exact: true })).toBeVisible();
    await page.waitForFunction(() =>
      window.__EXHIBITION_EDITOR__.textures.exists('studio-blueprint'),
    );
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'เพิ่ม asset PNG', exact: true }).click();
    await page.getByLabel('ไฟล์ asset PNG').setInputFiles('artifacts/test-asset.png');
    await page.getByLabel('ชื่อ asset ใหม่').fill(name);
    await page.getByLabel('ความกว้าง asset ใหม่').fill('32');
    await page.getByLabel('พื้นที่ชน asset ใหม่', { exact: true }).click();
    const added = page.waitForResponse(
      (response) => response.url().endsWith('/assets') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'เพิ่มเข้าในคลัง', exact: true }).click();
    assetKey = (await (await added).json()).key;
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('.editor-canvas')).toHaveAttribute('data-phase', 'ready');
    await expect(page.locator('.asset-card').filter({ hasText: name })).toBeVisible();
    const point = await worldPoint(page, 160, 160);
    await page.mouse.click(point.x, point.y);
    await expect(page.getByLabel('ความกว้างวัตถุ')).toHaveValue('32');
    await expect(page.getByLabel('ความสูงวัตถุ')).toHaveValue('48');
    await page.getByLabel('ความกว้างวัตถุ').fill('64');
    await expect(page.getByLabel('ความสูงวัตถุ')).toHaveValue('96');
    const geometry = await page.evaluate(() => {
      const s = window.__EXHIBITION_EDITOR__.scene.getScene('MapEditor');
      return {
        object: s.state.world.objects[0],
        collision: s.state.world.colliders[0],
        blueprint: s.state.blueprint,
      };
    });
    expect(geometry.object.width).toBe(64);
    expect(geometry.collision.width).toBe(64);
    expect(geometry.blueprint.width / geometry.blueprint.height).toBeCloseTo(4 / 3);
    await page.getByLabel('แสดงกรอบชน', { exact: true }).click();
    await page
      .locator('.ant-segmented-item')
      .filter({ hasText: /^กรอบชน$/ })
      .click();
    const from = await worldPoint(page, 416, 128),
      to = await worldPoint(page, 480, 160);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__EXHIBITION_EDITOR__.scene.getScene('MapEditor').state.world.colliders.length,
        ),
      )
      .toBe(2);
    await page
      .locator('.ant-segmented-item')
      .filter({ hasText: /^พื้นที่$/ })
      .click();
    const zoneFrom = await worldPoint(page, 64, 64),
      zoneTo = await worldPoint(page, 128, 96);
    await page.mouse.move(zoneFrom.x, zoneFrom.y);
    await page.mouse.down();
    await page.mouse.move(zoneTo.x, zoneTo.y, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__EXHIBITION_EDITOR__.scene.getScene('MapEditor').state.world.zones.length,
        ),
      )
      .toBe(1);
    await page.getByRole('button', { name: 'ทดลองเดิน', exact: true }).click();
    await expect(page.getByRole('dialog').locator('[data-phase]')).toHaveAttribute(
      'data-phase',
      'ready',
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'บันทึกแมป', exact: true }).click();
    await expect(page.locator('.save-state')).toContainText('บันทึกแล้ว');
    saved = await (await request.get('/api/backend/maps/default')).json();
    await page.reload();
    await expect(page.locator('.editor-canvas')).toHaveAttribute('data-phase', 'ready');
    await page.waitForFunction(() =>
      window.__EXHIBITION_EDITOR__.textures.exists('studio-blueprint'),
    );
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ZIP สำหรับ Tiled', exact: true }).click();
    const download = await downloading;
    await download.saveAs('artifacts/studio-tiled.zip');
    const files = unzipSync(new Uint8Array(await readFile('artifacts/studio-tiled.zip')));
    const map = JSON.parse(strFromU8(files['exhibition.tmj']));
    const tileset = JSON.parse(strFromU8(files['tilesets/exhibition.tsj']));
    expect(map.width).toBe(20);
    expect(map.properties.some((p) => p.name === 'studio.blueprint')).toBe(true);
    const tile = tileset.tiles.find((t) =>
      t.properties.some((p) => p.name === 'assetKey' && p.value === assetKey),
    );
    expect(files[`pieces/${tile.image.split('/').pop()}`]).toBeTruthy();
    const exported = await sharp(files[`pieces/${tile.image.split('/').pop()}`]).metadata();
    expect(exported.height).toBe(96);
    await page.screenshot({ path: 'artifacts/map-studio.png' });
    expect(errors).toEqual([]);
  } finally {
    if (saved)
      expect(
        (
          await request.put(`/api/backend/maps/${original.id}`, {
            data: { ...original, revision: saved.revision },
          })
        ).status(),
      ).toBe(200);
    await pool.query('DELETE FROM editor_assets WHERE name=$1', [name]);
    await pool.end();
  }
});
