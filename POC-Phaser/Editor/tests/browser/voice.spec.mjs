import { test, expect } from '@playwright/test';

// Chromium supplies synthetic microphone input: these tests never open a physical mic.
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
});
test.setTimeout(90000);
async function instrument(context) {
  await context.addInitScript(() => {
    window.__testConnections = [];
    window.__testTracks = [];
    const Original = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Original {
      constructor(...args) {
        super(...args);
        window.__testConnections.push(this);
      }
    };
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await getUserMedia(...args);
      window.__testTracks.push(...stream.getTracks());
      return stream;
    };
  });
}
async function ready(page) {
  await page.goto('/');
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase', 'ready');
  await expect(page.getByRole('region', { name: 'ห้องเสียง', exact: true })).toHaveAttribute(
    'data-presence',
    'connected',
  );
  return page.evaluate(() => window.__HALL_SESSION__.getSnapshot().id);
}
const voice = (page) => page.getByRole('region', { name: 'ห้องเสียง', exact: true });
const receivedBytes = (page) =>
  page.evaluate(async () => {
    let bytes = 0;
    for (const connection of window.__testConnections) {
      if (connection.connectionState === 'closed') continue;
      for (const stat of (await connection.getStats()).values()) {
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') bytes += stat.bytesReceived || 0;
      }
    }
    return bytes;
  });
const allTracksStopped = (page) =>
  page.evaluate(() => window.__testTracks.every((track) => track.readyState === 'ended'));

test('two players see movement and exchange real WebRTC audio, mute, leave and reconnect cleanly', async ({
  context,
  page,
}) => {
  await instrument(context);
  const other = await context.newPage();
  const errors = [];
  for (const p of [page, other]) p.on('pageerror', (error) => errors.push(error.message));
  const firstId = await ready(page),
    secondId = await ready(other);
  expect(firstId).not.toBe(secondId);
  await expect
    .poll(() =>
      page.evaluate(
        (id) => window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').remotePlayers.has(id),
        secondId,
      ),
    )
    .toBe(true);
  await page.evaluate(() =>
    window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').player.resetTo(1280, 1200),
  );
  await page.locator('canvas').focus();
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  const position = await page.evaluate(
    () => window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').player.x,
  );
  expect(position).toBeGreaterThan(1295);
  await expect
    .poll(() =>
      other.evaluate(
        (id) =>
          window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').remotePlayers.get(id)?.x,
        firstId,
      ),
    )
    .toBeGreaterThan(1295);
  await expect
    .poll(() =>
      other.evaluate(
        ({ id, x }) =>
          Math.abs(
            window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').remotePlayers.get(id).x -
              x,
          ),
        { id: firstId, x: position },
      ),
    )
    .toBeLessThan(2);
  await page.getByRole('combobox', { name: 'เลือกตัวละคร' }).click();
  await page.getByText('InternWitch', { exact: true }).last().click();
  await expect
    .poll(() =>
      other.evaluate(
        (id) =>
          window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').remotePlayers.get(id)
            ?.texture.key,
        firstId,
      ),
    )
    .toBe('internwitch');
  for (const p of [page, other]) {
    await p.getByRole('button', { name: 'เข้าร่วมห้องเสียง', exact: true }).click();
    await expect(voice(p)).toHaveAttribute('data-voice', 'connected');
    expect(await p.evaluate(() => window.__testTracks.length)).toBe(0);
    await expect(p.getByRole('button', { name: 'เปิดไมค์', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  }
  await expect
    .poll(() =>
      page.evaluate(() => window.__HALL_SESSION__.voice.getSnapshot().participants.length),
    )
    .toBe(2);
  await page.getByRole('button', { name: 'เปิดไมค์', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ปิดไมค์', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(other.locator(`audio[data-participant="${firstId}"]`)).toHaveCount(1);
  await expect.poll(() => receivedBytes(other)).toBeGreaterThan(1000);
  const before = await receivedBytes(other);
  await expect.poll(() => receivedBytes(other)).toBeGreaterThan(before + 500);
  await other.getByRole('button', { name: 'เปิดไมค์', exact: true }).click();
  await expect.poll(() => receivedBytes(page)).toBeGreaterThan(1000);
  await page.screenshot({ path: 'artifacts/voice-two-players.png' });
  await page.getByRole('button', { name: 'ปิดไมค์', exact: true }).click();
  await expect.poll(() => allTracksStopped(page)).toBe(true);
  await expect
    .poll(() =>
      other.evaluate(
        (id) =>
          window.__HALL_SESSION__.voice.getSnapshot().participants.find((p) => p.id === id)?.mic,
        firstId,
      ),
    )
    .toBe(false);
  await page.getByRole('button', { name: 'ออกจากห้องเสียง', exact: true }).click();
  await expect(voice(page)).toHaveAttribute('data-voice', 'idle');
  await expect(page.locator('[data-voice-audio]')).toHaveCount(0);
  await expect
    .poll(() =>
      other.evaluate(() => window.__HALL_SESSION__.voice.getSnapshot().participants.length),
    )
    .toBe(1);
  await page.getByRole('button', { name: 'เข้าร่วมห้องเสียง', exact: true }).click();
  await expect(voice(page)).toHaveAttribute('data-voice', 'connected');
  await page.getByRole('button', { name: 'เปิดไมค์', exact: true }).click();
  await expect.poll(() => allTracksStopped(page)).toBe(false);
  // A presence reconnect closes media and replaces the identity without ghost avatars.
  await page.evaluate(() => window.__HALL_SESSION__.retry());
  await expect(voice(page)).toHaveAttribute('data-voice', 'idle');
  await expect.poll(() => allTracksStopped(page)).toBe(true);
  await expect(voice(page)).toHaveAttribute('data-presence', 'connected');
  await expect
    .poll(() =>
      other.evaluate(
        (id) => window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').remotePlayers.has(id),
        firstId,
      ),
    )
    .toBe(false);
  // Client-side navigation must stop capture, disconnect voice and remove its audio elements.
  await other.getByRole('link', { name: 'แก้ไขแมป ↗' }).click();
  await expect(other).toHaveURL(/\/editor/);
  await expect.poll(() => allTracksStopped(other)).toBe(true);
  await expect(other.locator('[data-voice-audio]')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        (id) => window.__EXHIBITION_GAME__.scene.getScene('ExhibitionWorld').remotePlayers.has(id),
        secondId,
      ),
    )
    .toBe(false);
  expect(errors).toEqual([]);
});

test('microphone denial is actionable; leaving during a pending request stops late tracks', async ({
  context,
  page,
}) => {
  await instrument(context);
  await ready(page);
  await page.getByRole('button', { name: 'เข้าร่วมห้องเสียง', exact: true }).click();
  await expect(voice(page)).toHaveAttribute('data-voice', 'connected');
  await page.evaluate(() => {
    window.__allowedMic = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.getByRole('button', { name: 'เปิดไมค์', exact: true }).click();
  await expect(voice(page).getByRole('alert')).toContainText('ไม่ได้รับสิทธิ์ไมค์');
  await expect(voice(page)).toHaveAttribute('data-voice', 'connected');
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async (...args) => {
      await new Promise((resolve) => {
        window.__releaseMic = resolve;
      });
      return window.__allowedMic(...args);
    };
  });
  await page.getByRole('button', { name: 'เปิดไมค์', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.__releaseMic)).toBe('function');
  await page.getByRole('button', { name: 'ออกจากห้องเสียง', exact: true }).click();
  await page.evaluate(() => window.__releaseMic());
  await expect.poll(() => page.evaluate(() => window.__testTracks.length)).toBeGreaterThan(0);
  await expect.poll(() => allTracksStopped(page)).toBe(true);
  await expect(voice(page)).toHaveAttribute('data-voice', 'idle');
  await expect(page.locator('[data-voice-audio]')).toHaveCount(0);
});
