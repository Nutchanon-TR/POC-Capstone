import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../public/assets/characters/', import.meta.url));
const source = `${directory}/source/Student02.png`;
// ช่องภาพต้นฉบับไม่ใช่ 320x320 จึงกำหนดเส้นแบ่งจากภาพที่ตรวจแล้ว
const xs = [0, 315, 632, 948, 1263];
const ys = [0, 318, 624, 914, 1246];
const frames = [];
for (let row = 0; row < 4; row++) {
  for (let column = 0; column < 4; column++) {
    const region = {
      left: xs[column],
      top: ys[row],
      width: xs[column + 1] - xs[column],
      height: ys[row + 1] - ys[row],
    };
    const { data, info } = await sharp(source)
      .extract(region)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = info.width,
      top = info.height,
      right = 0,
      bottom = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 100) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    }
    if (left > right) throw new Error(`Empty frame ${row}:${column}`);
    frames.push({
      row,
      column,
      region,
      crop: { left, top, width: right - left + 1, height: bottom - top + 1 },
    });
  }
}
// scale เดียวทุกเฟรม ป้องกันตัวละครขยาย/หดระหว่างเดิน
const scale = 52 / Math.max(...frames.map((frame) => frame.crop.height));
const composite = [];
for (const frame of frames) {
  const width = Math.round(frame.crop.width * scale);
  const height = Math.round(frame.crop.height * scale);
  const cropped = await sharp(source).extract(frame.region).toBuffer();
  const input = await sharp(cropped)
    .extract(frame.crop)
    .resize(width, height, { kernel: 'nearest' })
    .png()
    .toBuffer();
  composite.push({
    input,
    left: frame.column * 64 + Math.round((64 - width) / 2),
    top: frame.row * 64 + 62 - height,
  });
}
await mkdir(directory, { recursive: true });
await sharp({ create: { width: 256, height: 256, channels: 4, background: '#00000000' } })
  .composite(composite)
  .png()
  .toFile(`${directory}/student-walk.png`);
await writeFile(
  `${directory}/student-walk.meta.json`,
  JSON.stringify(
    {
      source: 'source/Student02.png',
      frameWidth: 64,
      frameHeight: 64,
      columns: 4,
      rows: ['down', 'up', 'left', 'right'],
      feet: { x: 32, y: 62 },
      scale,
      splitX: xs,
      splitY: ys,
    },
    null,
    2,
  ),
);
console.info('Prepared 16 frames at 64 × 64 with a shared feet anchor.');
