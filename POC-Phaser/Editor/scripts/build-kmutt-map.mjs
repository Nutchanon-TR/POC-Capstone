import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { catalogFromTileset } from '../shared/map/bundle.ts';
import { compileDocument } from '../shared/map/compile.mjs';
import { canWalk } from '../shared/map/walk.ts';

const pipeline =
  'D:/A_SIT04/SIT4-TERM1/a_M_CapStone/BussinessMd/MyMdTool/ImageGenerate/ObjectGenerate/PythonPipeline/kmutt-job-fair-v1';
const out = 'public/maps/kmutt';
await mkdir(out, { recursive: true });
const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
const inventory = JSON.parse(await readFile(path.join(pipeline, 'inventory.json'), 'utf8'));
const prop = (name, value) => ({
  name,
  type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string',
  value,
});
const keyOf = (t) => t.properties.find((p) => p.name === 'assetKey')?.value;
for (const tile of set.tiles) {
  await mkdir(path.dirname(path.join(out, tile.image)), { recursive: true });
  await copyFile(path.join('public/starter', tile.image), path.join(out, tile.image));
}
for (const item of inventory.assets) {
  if (set.tiles.some((t) => keyOf(t) === item.id)) continue;
  const ground = item.id.includes('-floor-');
  const platform = item.id === 'kmutt-stage-platform';
  const structure = item.id.includes('-trim-');
  const kind = item.id.startsWith('chair-')
    ? 'chair'
    : item.id.includes('screen') || item.id.includes('panel')
      ? 'board'
      : 'custom';
  const interactable =
    !ground &&
    !structure &&
    !platform &&
    !['barrier-v', 'planter-h', 'sign-right'].includes(item.id);
  let footprint;
  if (!ground && !structure && !platform) {
    const h = item.id.startsWith('chair-')
      ? 16
      : item.id.includes('panel') || item.id.includes('screen')
        ? 10
        : item.id === 'barrier-v'
          ? 61
          : 20;
    footprint = {
      id: 1,
      name: 'Footprint',
      x: item.id === 'barrier-v' ? 1 : 4,
      y: Math.max(0, item.height - h - 3),
      width: item.width - (item.id === 'barrier-v' ? 2 : 8),
      height: h,
      rotation: 0,
    };
  }
  set.tiles.push({
    id: Math.max(...set.tiles.map((t) => t.id)) + 1,
    image: item.image,
    imagewidth: item.width,
    imageheight: item.height,
    properties: [
      prop('assetKey', item.id),
      prop('kind', ground ? 'floor' : structure ? 'structure' : 'prop'),
      prop('ground', ground),
      prop('depthY', item.height - 3),
      prop('label', item.id),
      ...(interactable ? [prop('interactable', true), prop('interactKind', kind)] : []),
    ],
    ...(footprint ? { objectgroup: { type: 'objectgroup', objects: [footprint] } } : {}),
  });
}
set.name = 'kmutt-job-fair';
set.tilecount = set.tiles.length;
set.nexttileid = Math.max(...set.tiles.map((t) => t.id)) + 1;
set.tilewidth = Math.max(...set.tiles.map((t) => t.imagewidth));
set.tileheight = Math.max(...set.tiles.map((t) => t.imageheight));
const tiles = new Map(set.tiles.map((t) => [keyOf(t), t]));
const gid = (key) => {
  const t = tiles.get(key);
  if (!t) throw Error(`Missing asset ${key}`);
  return t.id + 1;
};
let objectId = 1,
  layerId = 1;
const width = 80,
  height = 56;
const layers = [],
  targets = [];
const floor = {
  id: layerId++,
  name: 'Hall / zone floor',
  type: 'tilelayer',
  x: 0,
  y: 0,
  width,
  height,
  visible: true,
  opacity: 1,
  data: Array(width * height).fill(gid('kmutt-floor-ivory')),
};
layers.push(floor);
function paint(key, x, y, w, h) {
  for (let row = y / 32; row < (y + h) / 32; row++)
    for (let col = x / 32; col < (x + w) / 32; col++) floor.data[row * width + col] = gid(key);
}
paint('kmutt-floor-oat', 96, 128, 512, 544);
paint('kmutt-floor-sage', 736, 128, 800, 544);
paint('kmutt-floor-sage', 1728, 64, 736, 640);
paint('kmutt-floor-sage', 608, 800, 1536, 544);
paint('kmutt-floor-ivory', 608, 992, 1536, 128);
paint('kmutt-floor-oat', 96, 1376, 448, 352);
paint('kmutt-floor-oat', 1536, 1312, 928, 416);
paint('kmutt-floor-guide', 288, 1696, 64, 32);
const objectLayer = (name, dest = layers) => {
  const l = { id: layerId++, name, type: 'objectgroup', visible: true, opacity: 1, objects: [] };
  dest.push(l);
  return l;
};
const boundaries = objectLayer('Perimeter / entrance');
const items = objectLayer('Furniture / decor');
const markers = objectLayer('Zones / interaction targets');
function sprite(layer, key, x, y, name = key, properties = {}) {
  const t = tiles.get(key);
  if (!t) throw Error(key);
  const o = {
    id: objectId++,
    name,
    gid: gid(key),
    x,
    y,
    width: t.imagewidth,
    height: t.imageheight,
    rotation: 0,
    visible: true,
    properties: Object.entries(properties).map(([k, v]) => prop(k, v)),
  };
  layer.objects.push(o);
  return o;
}
function rect(layer, name, type, x, y, w, h, properties = {}) {
  const o = {
    id: objectId++,
    name,
    type,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    visible: true,
    properties: Object.entries(properties).map(([k, v]) => prop(k, v)),
  };
  layer.objects.push(o);
  return o;
}
// Low trim keeps the reference's open exhibition plan readable, including the lower-left entry.
for (let x = 32; x < 2528; x += 32) {
  sprite(boundaries, 'kmutt-trim-h', x, 32, 'Hall north trim');
  if (x < 256 || x >= 384) sprite(boundaries, 'kmutt-trim-h', x, 1744, 'Hall south trim');
}
for (let y = 32; y < 1760; y += 32) {
  sprite(boundaries, 'kmutt-trim-v', 32, y, 'Hall west trim');
  sprite(boundaries, 'kmutt-trim-v', 2512, y, 'Hall east trim');
}
for (const r of [
  [32, 32, 2496, 16],
  [32, 32, 16, 1728],
  [2512, 32, 16, 1728],
  [32, 1744, 224, 16],
  [384, 1744, 2144, 16],
])
  rect(boundaries, 'Hall boundary', 'Collider', ...r);
const zones = [
  ['1 · Registration', 96, 1376, 448, 352, 320, 1504],
  ['2 · Jobseeker Zone', 608, 800, 1536, 544, 704, 1008],
  ['3 · Food & Beverage', 96, 128, 512, 544, 336, 416],
  ['4 · Interview Area', 736, 128, 800, 544, 864, 640],
  ['5 · Workshop Area', 1536, 1312, 928, 416, 2000, 1536],
  ['6 · Main Stage', 1728, 64, 736, 640, 2056, 288],
];
for (const [name, x, y, w, h, tx, ty] of zones) {
  rect(markers, name, 'Zone', x, y, w, h, { zoneKey: name.split(' · ')[1] });
  targets.push({ name, x: tx, y: ty });
}
markers.objects.push({
  id: objectId++,
  name: 'KMUTT entrance',
  type: 'Spawn',
  point: true,
  x: 320,
  y: 1704,
  width: 0,
  height: 0,
  rotation: 0,
  visible: true,
});
sprite(items, 'expo-registration-desk', 224, 1408, 'KMUTT Registration', {
  interactEnabled: true,
  interactKind: 'custom',
  interactAction: 'kmutt.registration',
});
sprite(items, 'board-front', 96, 1384, 'KMUTT programme', { interactAction: 'kmutt.programme' });
sprite(items, 'barrier-v', 240, 1520, 'Registration queue left');
sprite(items, 'barrier-v', 400, 1520, 'Registration queue right');
sprite(items, 'sign-right', 464, 1488, 'To company booths');
sprite(items, 'plant-medium', 112, 1648);
sprite(items, 'plant-medium', 480, 1648);
// Cafe: six small shared tables, each approached from a generous transverse aisle.
sprite(items, 'kmutt-buffet-counter', 128, 160, 'Coffee & refreshments', {
  interactAction: 'kmutt.refreshments',
});
sprite(items, 'kmutt-buffet-counter', 352, 160, 'Snacks & drinks', {
  interactAction: 'kmutt.refreshments',
});
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 2; col++) {
    const x = 128 + col * 256,
      y = 288 + row * 128;
    sprite(items, 'table-round-small', x + 48, y, `Cafe table ${row * 2 + col + 1}`);
    sprite(items, 'chair-padded-right', x, y + 10, 'Cafe chair');
    sprite(items, 'chair-padded-left', x + 112, y + 10, 'Cafe chair');
  }
sprite(items, 'bin-sort', 576, 160, 'Recycling');
// Interview pods use the same panel family as the company booths, two people per desk.
for (let row = 0; row < 2; row++)
  for (let col = 0; col < 3; col++) {
    const x = 768 + col * 256,
      y = 160 + row * 256,
      n = row * 3 + col + 1;
    sprite(items, 'kmutt-booth-panel', x, y, `Interview ${n} privacy panel`);
    const table = sprite(items, 'table-short-h', x + 66, y + 80, `Interview ${n} desk`);
    sprite(items, 'chair-padded-right', x + 18, y + 88, `Interview ${n} candidate`);
    sprite(items, 'chair-padded-left', x + 148, y + 88, `Interview ${n} recruiter`);
    sprite(items, 'expo-documents', x + 88, y + 66, `Interview ${n} documents`, {
      renderDepth: table.y + table.height + 1,
      interactAction: `kmutt.interview.${n}`,
    });
    targets.push({ name: `Interview ${n}`, x: x + 100, y: y + 164 });
  }
// Authored booth groups remain selectable as one unit, with separate table/computer/documents.
const boothParts = [
  ['kmutt-booth-panel', 0, 0],
  ['expo-cloth-table', 40, 100],
  ['chair-padded-down', 80, 68],
  ['expo-computer', 64, 76],
  ['expo-documents', 120, 92],
];
for (let row = 0; row < 2; row++)
  for (let col = 0; col < 6; col++) {
    const n = row * 6 + col + 1,
      x = 640 + col * 256,
      y = 832 + row * 320;
    const group = {
      id: layerId++,
      name: `KMUTT Company ${String(n).padStart(2, '0')}`,
      type: 'group',
      offsetx: x,
      offsety: y,
      visible: true,
      opacity: 1,
      properties: [prop('boothId', `kmutt-company-${n}`)],
      layers: [],
    };
    layers.push(group);
    const layer = objectLayer('Independent booth pieces', group.layers);
    for (const [key, px, py] of boothParts) {
      const tabletop = key === 'expo-computer' || key === 'expo-documents';
      sprite(layer, key, px, py, `${group.name} · ${key}`, {
        ...(tabletop ? { renderDepth: y + 146 + (key === 'expo-documents' ? 1 : 0) } : {}),
        ...(tabletop ? { interactAction: `kmutt.company.${n}` } : {}),
      });
    }
    targets.push({ name: `Company ${n}`, x: x + 96, y: y + 176 });
  }
// Stage: a walkable platform, presentation equipment and 70 seats with a central aisle.
sprite(items, 'kmutt-stage-platform', 1856, 144, 'Main stage platform', { renderDepth: -900 });
sprite(items, 'kmutt-stage-screen', 1920, 64, 'KMUTT career talks', {
  interactAction: 'kmutt.main-stage',
});
sprite(items, 'kmutt-podium', 2032, 176, 'Speaker podium', { interactAction: 'kmutt.speaker' });
for (let row = 0; row < 7; row++)
  for (let col = 0; col < 10; col++)
    sprite(
      items,
      'chair-padded-up',
      1824 + col * 40 + (col >= 5 ? 56 : 0),
      320 + row * 56,
      `Audience seat ${row + 1}-${col + 1}`,
      { interactAction: 'kmutt.seat' },
    );
// Six workshop tables, four seats per table, with boards outside the main circulation route.
for (let row = 0; row < 2; row++)
  for (let col = 0; col < 3; col++) {
    const x = 1600 + col * 256,
      y = 1392 + row * 192,
      n = row * 3 + col + 1;
    const table = sprite(items, 'table-long-h', x, y, `Workshop table ${n}`);
    for (const dx of [8, 80]) {
      sprite(items, 'chair-padded-down', x + dx, y - 48, 'Workshop north chair');
      sprite(items, 'chair-padded-up', x + dx, y + 64, 'Workshop south chair');
    }
    sprite(items, 'expo-documents', x + 50, y - 12, `Workshop ${n} handouts`, {
      renderDepth: table.y + table.height + 1,
      interactAction: 'kmutt.workshop',
    });
    targets.push({ name: `Workshop table ${n}`, x: x + 64, y: y + 104 });
  }
sprite(items, 'board-front', 2336, 1376, 'Workshop board', {
  interactAction: 'kmutt.workshop-board',
});
sprite(items, 'board-front', 2336, 1600, 'Workshop schedule', {
  interactAction: 'kmutt.workshop-schedule',
});
for (const x of [800, 1120]) {
  sprite(items, 'sofa-up', x, 1552, 'Waiting lounge sofa');
  sprite(items, 'table-short-h', x + 16, 1480, 'Waiting lounge coffee table');
  sprite(items, 'plant-small', x + 112, 1552);
}
for (const [x, y] of [
  [96, 96],
  [656, 96],
  [1584, 128],
  [2400, 96],
  [96, 1232],
  [512, 704],
  [1568, 704],
  [2256, 1184],
  [656, 1648],
  [1440, 1648],
])
  sprite(items, 'plant-medium', x, y, 'Hall planter');
for (const [x, y] of [
  [96, 688],
  [768, 688],
  [1312, 688],
  [1728, 736],
  [2208, 736],
])
  sprite(items, 'planter-h', x, y, 'Zone edge planter');

const document = {
  type: 'map',
  orientation: 'orthogonal',
  infinite: false,
  renderorder: 'right-down',
  version: '1.10',
  tiledversion: '1.11.0',
  width,
  height,
  tilewidth: 32,
  tileheight: 32,
  nextobjectid: objectId,
  nextlayerid: layerId,
  properties: [
    prop('title', 'kmutt'),
    prop('eventTitle', 'KMUTT Job Fair'),
    prop('profile', 'KMUTT-Editor32-v1'),
    prop('layoutReference', 'job-fair-map.webp / six-zone layout; orthogonal adaptation'),
    prop('design.primaryAisle', 128),
    prop('design.minimumSecondaryAisle', 64),
  ],
  layers,
  tilesets: [{ firstgid: 1, source: 'expo.tsj' }],
};
const textures = new Map(
  await Promise.all(
    set.tiles.map(async (t) => [
      t.image,
      'data:image/png;base64,' + (await readFile(path.join(out, t.image))).toString('base64'),
    ]),
  ),
);
const catalog = catalogFromTileset(set, (image) => textures.get(image));
const world = compileDocument(document, catalog.tiles, catalog.textures);
// Prove that the real foot rectangle can reach every public zone, company and table from entry.
const step = 8,
  columns = world.width / step,
  rows = world.height / step;
const walkable = new Uint8Array(columns * rows),
  visited = new Uint8Array(walkable.length);
for (let row = 0; row < rows; row++)
  for (let col = 0; col < columns; col++)
    walkable[row * columns + col] = Number(canWalk(world, { x: col * step, y: row * step }));
const start = Math.round(world.spawn.y / step) * columns + Math.round(world.spawn.x / step),
  queue = [start];
visited[start] = 1;
for (let head = 0; head < queue.length; head++) {
  const index = queue[head],
    x = index % columns,
    y = Math.floor(index / columns);
  for (const [dx, dy] of [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]) {
    const px = x + dx,
      py = y + dy,
      next = py * columns + px;
    if (px < 0 || py < 0 || px >= columns || py >= rows || !walkable[next] || visited[next])
      continue;
    visited[next] = 1;
    queue.push(next);
  }
}
for (const target of targets) {
  const index = Math.round(target.y / step) * columns + Math.round(target.x / step);
  if (!visited[index])
    throw Error(`Unreachable approach: ${target.name} at ${target.x},${target.y}`);
}
const prefabs = [
  {
    key: 'kmutt-booth',
    width: 196,
    height: 176,
    parts: boothParts.map(([key, x, y]) => {
      const t = tiles.get(key);
      return {
        key,
        x,
        y,
        w: t.imagewidth,
        h: t.imageheight,
        ...(['expo-computer', 'expo-documents'].includes(key) ? { depthY: 146 - y } : {}),
      };
    }),
  },
];
await writeFile(path.join(out, 'map.tmj'), JSON.stringify(document, null, 2) + '\n');
await writeFile(path.join(out, 'expo.tsj'), JSON.stringify(set, null, 2) + '\n');
await writeFile(path.join(out, 'prefabs.json'), JSON.stringify(prefabs, null, 2) + '\n');
const report = {
  title: 'kmutt',
  size: [width, height],
  world: [world.width, world.height],
  zoneCount: world.zones.length,
  booths: world.summary.booths,
  objects: world.objects.length,
  colliders: world.colliders.length,
  audienceSeats: 70,
  workshopTables: 6,
  interviewStations: 6,
  targets,
  reachableApproaches: targets.length,
  walkableSamples: queue.length,
  footprint: [26, 12],
  sampleStep: 8,
  generatedProps: 5,
  palette: inventory.palette,
};
await writeFile(path.join(out, 'design-report.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(path.join(pipeline, 'design-report.json'), JSON.stringify(report, null, 2) + '\n');
const bundle = {
  'map.tmj': strToU8(JSON.stringify(document, null, 2)),
  'expo.tsj': strToU8(JSON.stringify(set, null, 2)),
  'studio/prefabs.json': strToU8(JSON.stringify(prefabs)),
  'design-report.json': strToU8(JSON.stringify(report, null, 2)),
  'README.txt': strToU8(
    'KMUTT Job Fair. Open map.tmj in Tiled. 80x56 tiles at 32px. Keep expo.tsj, props/ and structure/ beside it. Individual art, collision, zone and interact metadata remain editable. Consumer supplies actions for interactAction and reads renderDepth for tabletop objects. This is an authored orthogonal adaptation of the supplied six-zone job-fair plan, not a reproduction of its isometric projection.\n',
  ),
};
for (const t of set.tiles)
  bundle[t.image] = new Uint8Array(await readFile(path.join(out, t.image)));
const zip = zipSync(bundle, { level: 6 });
await writeFile(path.join(out, 'kmutt-tiled.zip'), zip);
await writeFile(path.join(pipeline, 'kmutt-tiled.zip'), zip);
console.log(JSON.stringify({ ...report, targets: undefined, palette: undefined }, null, 2));
