import { test, expect, type Page } from '@playwright/test';
import { z } from 'zod';

const stateSchema = z.object({
  status: z.literal('ready'),
  player: z.object({ x: z.number(), y: z.number(), moving: z.boolean() }),
  active: z.object({ id: z.number() }).nullable(),
  nearby: z.object({ id: z.number() }).nullable(),
  paused: z.boolean(),
  debug: z.boolean(),
  computerCount: z.number(),
  colliderCount: z.number(),
});

async function state(page: Page) {
  const raw = await page.getByTestId('game-host').getAttribute('data-game-state');
  return stateSchema.parse(JSON.parse(raw ?? '{}'));
}
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('game-host')).toHaveAttribute('data-game-state', /"ready"/, {
    timeout: 30000,
  });
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByTestId('game-host')).toHaveAttribute('data-phaser-version', '4.2.1');
}
async function moveTo(page: Page, key: string, axis: 'x' | 'y', target: number, sign: number) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      ({ axis, target, sign }) => {
        const raw = document.querySelector<HTMLElement>('[data-testid="game-host"]')?.dataset
          .gameState;
        if (!raw) return false;
        const current = JSON.parse(raw);
        return sign < 0 ? current.player[axis] <= target : current.player[axis] >= target;
      },
      { axis, target, sign },
      { timeout: 6000 },
    );
  } finally {
    await page.keyboard.up(key);
  }
}

test('real keyboard route opens a computer, pauses movement, closes and resets', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await ready(page);
  const initial = await state(page);
  expect(initial.computerCount).toBe(4);
  expect(initial.colliderCount).toBe(52);
  expect(initial.player.x).toBe(160);
  await page.getByTestId('game-host').focus();
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await moveTo(page, 'ArrowUp', 'y', 520, -1);
  await moveTo(page, 'ArrowRight', 'x', 550, 1);
  // ใช้ทางเดินกว้างก่อนเข้าโต๊ะ ป้องกัน telemetry 10Hz ทำให้เลยจุดเลี้ยว
  await moveTo(page, 'ArrowUp', 'y', 360, -1);
  await moveTo(page, 'ArrowRight', 'x', 704, 1);
  await moveTo(page, 'ArrowUp', 'y', 310, -1);
  await expect(page.getByRole('button', { name: 'เปิดคอมพิวเตอร์', exact: true })).toBeEnabled();
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await state(page)).active?.id).toBe(229);
  const before = (await state(page)).player;
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  expect((await state(page)).player).toEqual(before);
  await page.getByRole('button', { name: 'ลองกดปุ่มในแผงคอมพิวเตอร์' }).click();
  await expect(page.getByRole('status')).toContainText('ยังไม่ได้เรียก API');
  await page.getByRole('button', { name: 'กลับไปสำรวจห้อง' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByTestId('game-host')).toBeFocused();
  await page.getByRole('button', { name: 'กลับจุดเริ่มต้น', exact: true }).click();
  expect((await state(page)).player.x).toBe(160);
  expect((await state(page)).player.y).toBe(736);
  expect(errors).toEqual([]);
});

test('debug and learning panels preserve a single canvas and gate keyboard input', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('switch').click();
  expect((await state(page)).debug).toBe(true);
  await page.getByRole('button', { name: 'คู่มือโค้ด', exact: true }).click();
  await expect(page.getByText('แต่ละส่วนมีเจ้าของชัดเจน')).toBeVisible();
  expect((await state(page)).paused).toBe(true);
  const before = (await state(page)).player;
  await page.keyboard.press('ArrowRight');
  expect((await state(page)).player).toEqual(before);
  await page.getByText('อ่านโค้ดทีละส่วน', { exact: true }).click();
  await expect(page.getByText('ตามหนึ่งรอบจากหน้าเว็บถึงเกม')).toBeVisible();
  await page.getByRole('button', { name: '3 เดินหนึ่ง frame' }).click();
  await expect(page.getByText('game/domain/movement.ts', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('game-host')).toBeFocused();
  expect((await state(page)).paused).toBe(false);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId('game-host')).toHaveAttribute('data-game-state', /"ready"/);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('mobile controls move, release and fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const button = page.getByRole('button', { name: 'เดิน up', exact: true });
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) throw new Error('Missing mobile direction button');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(async () => (await state(page)).player.y).toBeLessThan(725);
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).player.moving).toBe(false);
  const stopped = (await state(page)).player.y;
  await page.waitForTimeout(200);
  expect((await state(page)).player.y).toBe(stopped);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('asset load errors provide retry and recover after reload', async ({ page }) => {
  await page.route('**/assets/map/map.tmj', (route) =>
    route.fulfill({ status: 404, body: 'not found' }),
  );
  await page.goto('/');
  await expect(page.locator('.error-message[role="alert"]')).toContainText('เปิดห้องไม่สำเร็จ');
  await page.unroute('**/assets/map/map.tmj');
  await page.getByRole('button', { name: 'ลองอีกครั้ง' }).click();
  await expect(page.getByTestId('game-host')).toHaveAttribute('data-game-state', /"ready"/);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('opening the guide during map loading retains pause after boot', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/map/map.tmj', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'คู่มือโค้ด', exact: true }).click();
  release();
  await expect(page.getByTestId('game-host')).toHaveAttribute('data-game-state', /"ready"/);
  expect((await state(page)).paused).toBe(true);
  await expect(page.getByText('แต่ละส่วนมีเจ้าของชัดเจน')).toBeVisible();
});
