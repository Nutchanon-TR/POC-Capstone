import sharp from 'sharp';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

// Observe the character's blue hair, not the moving lantern/glow or transparent padding.
export function headAnchor(data, width, height, kind = 'kaguya') {
  const xs = [],
    ys = [];
  for (let y = 18; y < Math.min(height, 92); y++)
    for (let x = 15; x < width - 15; x++) {
      const i = (y * width + x) * 4,
        [r, g, b, a] = data.subarray(i, i + 4);
      const match =
        kind === 'kaguya'
          ? b > r * 1.3 && b > g * 1.08 && b > 35 && r < 115
          : r > 155 && r > g * 1.5 && r > b * 1.6;
      if (a > 220 && match) {
        xs.push(x);
        ys.push(y);
      }
    }
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  return { x: xs[Math.floor(xs.length / 2)], y: ys[Math.floor(ys.length / 2)] };
}

if (process.argv[1]?.endsWith('diagnose-frames.mjs')) {
  const { data, info } = await sharp('public/world/characters/kaguya-walk.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let row = 0; row < 4; row++) {
    const anchors = [];
    for (let col = 0; col < 6; col++) {
      const width = info.width / 6,
        height = info.height / 4;
      const frame = await sharp(data, { raw: info })
        .extract({ left: col * width, top: row * height, width, height })
        .raw()
        .toBuffer();
      anchors.push(headAnchor(frame, width, height));
    }
    rows.push({
      direction: ['up', 'down', 'left', 'right'][row],
      anchors,
      spreadX: Math.max(...anchors.map((a) => a.x)) - Math.min(...anchors.map((a) => a.x)),
    });
  }
  await writeFile('artifacts/frame-alignment-after.json', JSON.stringify(rows, null, 2));
  console.log(
    rows.map(({ direction, anchors, spreadX }) => ({
      direction,
      centers: anchors.map((a) => a.x),
      spreadX,
    })),
  );
  assert.ok(
    rows.every((r) => r.spreadX <= 3),
    'Visible head shifts between frames by more than 3 source pixels.',
  );
}
