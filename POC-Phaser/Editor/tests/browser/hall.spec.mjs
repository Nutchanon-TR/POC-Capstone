import { test, expect } from '@playwright/test';

const sceneState = (page) =>
  page.evaluate(() => {
    const scene = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld');
    const p = scene.player;
    return {
      x: p.x,
      y: p.y,
      depth: p.depth,
      frame: p.frame.name,
      animation: p.anims.currentAnim?.key,
      playing: p.anims.isPlaying,
      vx: p.body.velocity.x,
      vy: p.body.velocity.y,
      top: p.body.top,
      bottom: p.body.bottom,
      blocked: p.body.blocked,
      renderer: scene.game.renderer.type,
    };
  });
async function ready(page) {
  await page.goto('/');
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.locator('canvas').focus();
}
async function place(page, x, y) {
  await page.evaluate(
    ({ x, y }) => {
      const scene = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld');
      scene.player.resetTo(x, y);
    },
    { x, y },
  );
  await page.locator('canvas').focus();
}
async function walk(page, key, duration) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
}

test('loads all assets, walks in four directions, animates and normalizes diagonal speed', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const failures = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await ready(page);
  for (const [key, direction] of [
    ['w', 'up'],
    ['s', 'down'],
    ['a', 'left'],
    ['d', 'right'],
  ]) {
    await place(page, 1280, 1200);
    const before = await sceneState(page);
    await page.keyboard.down(key);
    await page.waitForTimeout(180);
    const moving = await sceneState(page);
    expect(moving.animation).toBe(`kaguya:walk:${direction}`);
    expect(moving.playing).toBe(true);
    await page.waitForFunction(
      (frame) =>
        window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').player.frame.name !== frame,
      moving.frame,
    );
    await page.keyboard.up(key);
    await page.waitForTimeout(80);
    const after = await sceneState(page);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(15);
    expect(after.playing).toBe(false);
    expect(after.vx).toBe(0);
    expect(after.vy).toBe(0);
  }
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(100);
  const diagonal = await sceneState(page);
  expect(Math.hypot(diagonal.vx, diagonal.vy)).toBeCloseTo(235, 2);
  await page.keyboard.up('w');
  await page.keyboard.up('d');
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test('counter blocks the feet; draw order changes behind and in front of it', async ({ page }) => {
  await ready(page);
  const counter = await page.evaluate(() => {
    const w = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').worldData;
    const o = w.objects.find((o) => o.asset === 'counter');
    return { ...o, collision: w.colliders.find((c) => c.id.startsWith(`${o.id}:`)) };
  });
  const x = counter.x + counter.width / 2;
  await place(page, x, counter.collision.y + counter.collision.height + 100);
  await walk(page, 'w', 1000);
  const blocked = await sceneState(page);
  expect(blocked.top).toBeGreaterThanOrEqual(counter.collision.y + counter.collision.height - 1);
  expect(blocked.top).toBeLessThan(counter.collision.y + counter.collision.height + 3);
  const ordering = () =>
    page.evaluate((id) => {
      const s = window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld');
      s.children.depthSort();
      const o = s.children.getByName(`object:${id}`);
      return { actor: s.children.list.indexOf(s.player), prop: s.children.list.indexOf(o) };
    }, counter.id);
  await place(page, x, counter.collision.y - 4);
  await page.waitForTimeout(180);
  let order = await ordering();
  expect(order.actor).toBeLessThan(order.prop);
  await page.screenshot({ path: 'artifacts/depth-behind.png' });
  await place(page, x, counter.collision.y + counter.collision.height + 18);
  await page.waitForTimeout(180);
  order = await ordering();
  expect(order.actor).toBeGreaterThan(order.prop);
  await page.screenshot({ path: 'artifacts/depth-front.png' });
});

test('all six Pavilion doors are walkable; floors stay below the player', async ({ page }) => {
  await ready(page);
  const thresholds = await page.evaluate(() =>
    window.__EXHIBITION_GAME__.scene
      .getScene('ExhibitionWorld')
      .worldData.objects.filter(
        (o) => o.asset.startsWith('booth3') && o.asset.endsWith('threshold'),
      ),
  );
  expect(thresholds).toHaveLength(6);
  for (const threshold of thresholds) {
    const x = threshold.x + threshold.width / 2;
    await place(page, x, threshold.y + threshold.height + 32);
    await walk(page, 'w', 550);
    const state = await sceneState(page);
    expect(state.y, threshold.asset).toBeLessThan(threshold.y + 10);
  }
});

test('blur stops movement, overview survives resize, reset restores the spawn', async ({
  page,
}) => {
  await ready(page);
  const spawn = await page.evaluate(
    () => window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').worldData.spawn,
  );
  await place(page, 1280, 1200);
  await page.keyboard.down('w');
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'ขยายแผนที่' }).focus();
  await page.waitForTimeout(80);
  expect((await sceneState(page)).vy).toBe(0);
  await page.keyboard.up('w');
  await page.getByText('ดูทั้งห้อง', { exact: true }).click();
  const before = await page.getByLabel('ระดับซูม').textContent();
  await page.setViewportSize({ width: 1100, height: 780 });
  await expect(page.getByLabel('ระดับซูม')).not.toHaveText(before);
  await page.getByRole('button', { name: 'กลับจุดเริ่มต้น' }).click();
  await page.waitForTimeout(100);
  const state = await sceneState(page);
  expect(state.x).toBe(spawn.x);
  expect(state.y).toBe(spawn.y);
  await expect(page.getByRole('radio', { name: 'ติดตามตัวละคร', exact: true })).toBeChecked();
});

test('mobile controls move and release; layout stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const before = await sceneState(page);
  const button = page.getByRole('button', { name: 'เดินซ้าย', exact: true });
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const after = await sceneState(page);
  expect(after.x).toBeLessThan(before.x - 20);
  expect(after.vx).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/mobile.png' });
});

test('map load error is actionable and retry mounts exactly one game', async ({ page }) => {
  await page.route('**/api/backend/maps/default/runtime', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: 'พื้นที่แผนที่' }).getByRole('alert'),
  ).toContainText('503');
  await page.unroute('**/api/backend/maps/default/runtime');
  await page.getByRole('button', { name: 'ลองอีกครั้ง' }).click();
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('canvas')).toHaveCount(1);
});
