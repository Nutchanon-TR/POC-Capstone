// Derive rectangular crops only. Every visible pixel comes from asset/*.png.
// This command rebuilds pieces/tileset, never the hand-editable map.
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'public/world/pieces');
await mkdir(out, { recursive: true });
await mkdir('maps/tilesets', { recursive: true });
const tiles = [];
const provenance = [];
const props = (values) =>
  Object.entries(values).map(([name, value]) => ({
    name,
    type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string',
    value,
  }));

async function crop(
  name,
  source,
  rect,
  { ground = false, collision, depthY, size, family = source, variant = name } = {},
) {
  const [left, top, width, height] = rect;
  let pipeline = sharp(`asset/${source}.png`).extract({ left, top, width, height });
  if (size) pipeline = pipeline.resize(size, size, { kernel: 'nearest' });
  await pipeline.png().toFile(path.join(out, `${name}.png`));
  const w = size || width;
  const h = size || height;
  const tile = {
    id: tiles.length,
    type: ground ? 'Ground' : 'Prop',
    image: `../../public/world/pieces/${name}.png`,
    imagewidth: w,
    imageheight: h,
    properties: props({ assetKey: name, family, variant, ground, depthY: depthY ?? h - 8 }),
  };
  if (collision?.length)
    tile.objectgroup = {
      type: 'objectgroup',
      draworder: 'index',
      objects: collision.map(([x, y, width, height], i) => ({
        id: i + 1,
        name: 'Footprint',
        type: '',
        x,
        y,
        width,
        height,
        rotation: 0,
        visible: true,
      })),
    };
  tiles.push(tile);
  provenance.push({ name, source: `asset/${source}.png`, crop: rect, resize: size || null });
  return tile;
}

// Floors are cropped from the inner source tile, with the original grout retained.
for (const [name, rect] of Object.entries({
  beige: [150, 108, 72, 72],
  white: [514, 108, 72, 72],
  blue: [870, 108, 72, 72],
  wood: [1235, 108, 74, 72],
})) {
  await crop(`floor-${name}`, 'Layout', rect, { ground: true, size: 32 });
}

const furniture = [
  ['round-table', [112, 108, 204, 214], [40, 155, 125, 40]],
  ['chair', [481, 134, 129, 174], [25, 129, 82, 30]],
  ['sofa', [724, 128, 341, 179], [26, 123, 286, 43]],
  ['desk', [1148, 128, 313, 181], [24, 125, 263, 39]],
  ['counter', [65, 473, 397, 170], [28, 106, 340, 50]],
  ['kiosk', [536, 396, 173, 256], [31, 205, 114, 36]],
  ['monitor', [833, 416, 216, 228], [37, 179, 139, 33]],
  ['hologram', [1215, 449, 184, 196], [28, 133, 128, 47]],
  ['display-case', [96, 730, 320, 221], [28, 161, 263, 42]],
  ['brochure-rack', [544, 732, 138, 224], [30, 175, 86, 32]],
  ['plant', [855, 716, 195, 247], [64, 188, 81, 43]],
  ['banner', [1240, 671, 191, 310], [30, 257, 134, 30]],
];
for (const [name, rect, box] of furniture)
  await crop(name, 'Prop', rect, { collision: [box], depthY: box[1] + box[3] / 2 });

const architecture = [
  ['wall', [52, 383, 430, 168], [6, 140, 418, 24]],
  ['pillar', [605, 349, 82, 209], [8, 166, 68, 35]],
  ['wall-corner-left', [820, 347, 188, 233], [12, 188, 165, 32]],
  ['wall-corner-right', [1174, 348, 292, 224], [12, 178, 270, 34]],
  ['glass-wall', [56, 609, 420, 134], [6, 104, 408, 22]],
  ['glass-pillar', [611, 565, 71, 188], [10, 159, 51, 22]],
  ['glass-corner', [771, 599, 296, 153], [12, 116, 267, 26]],
  ['glass-entry', [1105, 621, 397, 126], [9, 95, 133, 24], [254, 95, 134, 24]],
  ['door-closed', [149, 778, 153, 193], [10, 162, 133, 23]],
  ['door-open', [470, 778, 148, 209]],
  ['wall-screen', [783, 780, 322, 194], [9, 162, 305, 24]],
  ['pillar-corner', [1275, 778, 102, 202], [10, 166, 82, 25]],
];
for (const [name, rect, ...boxes] of architecture)
  await crop(name, 'Layout', rect, { collision: boxes, depthY: rect[3] - 18 });

const boothSources = {
  Booth1: [
    [24, 55, 484, 325, 142, 47],
    [533, 55, 473, 325, 142, 45],
    [1032, 55, 480, 325, 142, 45],
    [65, 414, 400, 273, 135, 42],
    [573, 414, 391, 273, 135, 40],
    [1071, 414, 401, 273, 135, 42],
    [111, 723, 307, 233, 139, 40],
    [620, 723, 298, 233, 139, 38],
    [1119, 723, 310, 233, 139, 40],
  ],
  Booth2: [
    [37, 46, 470, 337, 130, 56],
    [536, 46, 467, 337, 130, 53],
    [1031, 46, 471, 337, 130, 53],
    [60, 429, 437, 279, 126, 53],
    [571, 429, 402, 279, 126, 50],
    [1055, 429, 426, 279, 126, 53],
    [130, 747, 287, 211, 119, 28],
    [628, 747, 291, 211, 119, 27],
    [1123, 747, 291, 211, 119, 27],
  ],
  Booth3: [
    [16, 55, 503, 479, 135, 54, 98],
    [537, 55, 470, 479, 135, 50, 98],
    [1026, 55, 495, 479, 135, 51, 98],
    [80, 593, 389, 349, 119, 49, 87],
    [587, 593, 379, 349, 119, 47, 87],
    [1075, 593, 390, 349, 119, 49, 87],
  ],
};
const boothIndex = [];
for (const [source, booths] of Object.entries(boothSources)) {
  for (const [index, spec] of booths.entries()) {
    const [x, y, w, h, back, side, front = 0] = spec;
    const key = `${source.toLowerCase()}-${index + 1}`;
    const parts = [];
    async function part(suffix, dx, dy, pw, ph, options = {}) {
      await crop(`${key}-${suffix}`, source, [x + dx, y + dy, pw, ph], {
        family: source,
        variant: key,
        ...options,
      });
      parts.push({ key: `${key}-${suffix}`, x: dx, y: dy, w: pw, h: ph });
    }
    await part('back', 0, 0, w, back, {
      collision: [[side, back - 17, w - side * 2, 16]],
      depthY: back - 8,
    });
    const middle = h - back - front;
    const miniCounter = source === 'Booth2' && index >= 6;
    if (miniCounter) {
      const deskLeft = 61,
        deskRight = w - 62;
      await part('floor-left', side, back, deskLeft - side, middle, { ground: true });
      await part('floor-right', deskRight, back, w - side - deskRight, middle, { ground: true });
      await part('counter', deskLeft, back, deskRight - deskLeft, middle, {
        collision: [[2, middle - 28, deskRight - deskLeft - 4, 24]],
        depthY: middle - 16,
      });
    } else {
      await part('floor', side, back, w - side * 2, middle, { ground: true });
    }
    // Slice side walls into short vertical segments so each portion sorts by its own footline.
    const step = 32;
    for (let dy = 0; dy < middle; dy += step) {
      const sh = Math.min(step, middle - dy);
      await part(`left-${dy}`, 0, back + dy, side, sh, {
        collision: [[8, 0, side - 16, sh]],
        depthY: sh,
      });
      await part(`right-${dy}`, w - side, back + dy, side, sh, {
        collision: [[8, 0, side - 16, sh]],
        depthY: sh,
      });
    }
    if (front) {
      const gapLeft = Math.round(w * 0.43),
        gapRight = Math.round(w * 0.59);
      await part('front-left', 0, h - front, gapLeft, front, {
        collision: [[4, front - 27, gapLeft - 8, 24]],
        depthY: front - 15,
      });
      await part('threshold', gapLeft, h - front, gapRight - gapLeft, front, { ground: true });
      await part('front-right', gapRight, h - front, w - gapRight, front, {
        collision: [[4, front - 27, w - gapRight - 8, 24]],
        depthY: front - 15,
      });
    }
    boothIndex.push({ key, source, width: w, height: h, parts });
  }
}

await writeFile(
  'maps/tilesets/exhibition.tsj',
  JSON.stringify(
    {
      type: 'tileset',
      version: '1.10',
      tiledversion: '1.12.2',
      name: 'Exhibition collection',
      tilewidth: 503,
      tileheight: 310,
      tilecount: tiles.length,
      columns: 0,
      objectalignment: 'topleft',
      grid: { orientation: 'orthogonal', width: 32, height: 32 },
      tiles,
    },
    null,
    2,
  ),
);
await mkdir('assets', { recursive: true });
await writeFile('assets/booth-parts.json', JSON.stringify(boothIndex, null, 2));
const hashes = {};
for (const source of ['Layout', 'Prop', 'Booth1', 'Booth2', 'Booth3', 'Kaguya', 'InternWitch'])
  hashes[`${source}.png`] = createHash('sha256')
    .update(await readFile(`asset/${source}.png`))
    .digest('hex');

await import('./prepare-characters.mjs');
const characters = JSON.parse(await readFile('assets/characters.json', 'utf8'));
for (const character of characters)
  for (const frame of character.frames)
    provenance.push({
      name: `${character.key}-${frame.frame}`,
      source: character.source,
      crop: Object.values(frame.crop),
      frame: frame.frame,
    });
await writeFile(
  'assets/provenance.json',
  JSON.stringify(
    {
      description:
        'Rectangular source crops, nearest-neighbour floor resizing, transparent sprite padding. No generated or repainted artwork.',
      hashes,
      pieces: provenance,
    },
    null,
    2,
  ),
);
console.log(
  `Prepared ${tiles.length} Tiled tiles; ${boothIndex.length} booth variants; 48 walking frames.`,
);
