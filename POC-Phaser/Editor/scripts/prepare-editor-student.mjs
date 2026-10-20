import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw Error('Provide the Student02.png source path.');
const bytes = await readFile(source);
const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== 1263 || info.height !== 1246)
  throw Error('Unexpected Student02 source dimensions.');
const rows = [0, 317, 624, 911, info.height];
const frames = [];
for (const [row, direction] of ['down', 'up', 'left', 'right'].entries()) {
  for (let column = 0; column < 4; column++) {
    const left = Math.floor((column * info.width) / 4),
      right = Math.floor(((column + 1) * info.width) / 4);
    let x1 = right,
      y1 = rows[row + 1],
      x2 = left,
      y2 = rows[row];
    for (let y = rows[row]; y < rows[row + 1]; y++)
      for (let x = left; x < right; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 16) {
          x1 = Math.min(x1, x);
          y1 = Math.min(y1, y);
          x2 = Math.max(x2, x);
          y2 = Math.max(y2, y);
        }
      }
    x1 = Math.max(left, x1 - 2);
    y1 = Math.max(rows[row], y1 - 2);
    x2 = Math.min(right - 1, x2 + 2);
    y2 = Math.min(rows[row + 1] - 1, y2 + 2);
    frames.push({
      name: `${direction}-${column}`,
      frame: { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 },
    });
  }
}
const width = Math.max(...frames.map((f) => f.frame.w)),
  height = Math.max(...frames.map((f) => f.frame.h));
const atlas = {
  frames: Object.fromEntries(
    frames.map(({ name, frame }) => [
      name,
      {
        frame,
        rotated: false,
        trimmed: true,
        spriteSourceSize: {
          x: Math.floor((width - frame.w) / 2),
          y: height - frame.h,
          w: frame.w,
          h: frame.h,
        },
        sourceSize: { w: width, h: height },
      },
    ]),
  ),
  meta: {
    image: 'Student02.png',
    size: { w: info.width, h: info.height },
    scale: '1',
    sourceSHA256: createHash('sha256').update(bytes).digest('hex'),
  },
};
const output = 'public/editor/characters/student02';
await mkdir(output, { recursive: true });
await copyFile(source, `${output}/Student02.png`);
await writeFile(`${output}/atlas.json`, JSON.stringify(atlas, null, 2) + '\n');
console.log(
  `Prepared 16 atlas frames with a shared ${width}x${height} foot anchor. Source PNG copied unchanged.`,
);
