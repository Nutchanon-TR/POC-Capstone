import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { headAnchor } from './diagnose-frames.mjs';
const frameWidth = 288,
  frameHeight = 256,
  footY = 240;
const sources = [
  { key: 'kaguya', file: 'Kaguya', columnWidth: 229, rows: [0, 190, 380, 571, 761] },
  { key: 'internwitch', file: 'InternWitch', columnWidth: 213, rows: [0, 224, 424, 630, 835] },
];
await mkdir('public/world/characters', { recursive: true });
const manifest = [];
for (const source of sources) {
  const frames = [],
    records = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 6; col++) {
      const rect = {
        left: col * source.columnWidth,
        top: source.rows[row],
        width: source.columnWidth,
        height: source.rows[row + 1] - source.rows[row],
      };
      const crop = await sharp(`asset/${source.file}.png`)
        .extract(rect)
        .ensureAlpha()
        .png()
        .toBuffer();
      const raw = await sharp(crop).raw().toBuffer();
      const anchor = headAnchor(raw, rect.width, rect.height, source.key);
      let bottom = 0;
      for (let y = Math.floor(rect.height * 0.7); y < rect.height; y++)
        for (let x = Math.max(0, anchor.x - 36); x < Math.min(rect.width, anchor.x + 36); x++)
          if (raw[(y * rect.width + x) * 4 + 3] > 245) bottom = Math.max(bottom, y);
      const top = footY - bottom;
      let left = Math.round(frameWidth / 2 - anchor.x);
      // Re-measure the same visible feature after padding (the detector uses the upper head band).
      for (let pass = 0; pass < 3; pass++) {
        const result = await sharp({
          create: { width: frameWidth, height: frameHeight, channels: 4, background: '#00000000' },
        })
          .composite([{ input: crop, left, top }])
          .raw()
          .toBuffer();
        left += frameWidth / 2 - headAnchor(result, frameWidth, frameHeight, source.key).x;
      }
      if (left < 0 || top < 0 || left + rect.width > frameWidth || top + rect.height > frameHeight)
        throw Error(`Frame ${source.key}:${row}:${col} exceeds its canvas`);
      frames.push({
        raw,
        width: rect.width,
        height: rect.height,
        left: col * frameWidth + left,
        top: row * frameHeight + top,
      });
      records.push({ frame: row * 6 + col, crop: rect, padding: { left, top }, footY });
    }
  // Copy RGBA rows directly: alpha compositing can round semi-transparent RGB values.
  const packed = Buffer.alloc(frameWidth * 6 * frameHeight * 4 * 4);
  for (const frame of frames)
    for (let y = 0; y < frame.height; y++)
      frame.raw.copy(
        packed,
        ((frame.top + y) * frameWidth * 6 + frame.left) * 4,
        y * frame.width * 4,
        (y + 1) * frame.width * 4,
      );
  await sharp(packed, { raw: { width: frameWidth * 6, height: frameHeight * 4, channels: 4 } })
    .png()
    .toFile(`public/world/characters/${source.key}-walk.png`);
  await sharp(`public/world/characters/${source.key}-walk.png`)
    .extract({ left: 0, top: frameHeight, width: frameWidth, height: frameHeight })
    .png()
    .toFile(`public/world/characters/${source.key}-portrait.png`);
  manifest.push({
    key: source.key,
    source: `asset/${source.file}.png`,
    sha256: createHash('sha256')
      .update(await readFile(`asset/${source.file}.png`))
      .digest('hex'),
    frameWidth,
    frameHeight,
    frames: records,
  });
}
await writeFile('assets/characters.json', JSON.stringify(manifest, null, 2));
console.log('Prepared 48 registered frames from the two supplied PNGs; no pixels repainted.');
