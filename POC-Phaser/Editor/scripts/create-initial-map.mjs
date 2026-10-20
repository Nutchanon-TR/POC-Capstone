// One-time authoring aid. The resulting TMJ is the source of truth thereafter.
// Refuses to overwrite edits unless the author explicitly supplies --replace.
import { readFile, writeFile, access } from 'node:fs/promises';

const target = 'maps/exhibition.tmj';
try {
  await access(target);
  if (!process.argv.includes('--replace'))
    throw new Error(
      'Map exists. Edit it in Tiled; use --replace only to deliberately discard map edits.',
    );
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
const tileset = JSON.parse(await readFile('maps/tilesets/exhibition.tsj', 'utf8'));
const booths = JSON.parse(await readFile('assets/booth-parts.json', 'utf8'));
const byKey = new Map(
  tileset.tiles.map((t) => [t.properties.find((p) => p.name === 'assetKey').value, t]),
);
const properties = (values) =>
  Object.entries(values).map(([name, value]) => ({
    name,
    type: typeof value === 'number' ? 'float' : 'string',
    value,
  }));
let objectId = 1,
  layerId = 1;
const layers = [];
const tileSize = 32,
  width = 80,
  height = 74;
function objectLayer(name, objects, extra = {}) {
  return {
    id: layerId++,
    name,
    type: 'objectgroup',
    draworder: 'topdown',
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    objects,
    ...extra,
  };
}
function tile(key, x, y, scale = 0.62, name = key) {
  const t = byKey.get(key);
  if (!t) throw new Error(`Unknown asset ${key}`);
  return {
    id: objectId++,
    name,
    type: '',
    gid: t.id + 1,
    x,
    y,
    width: t.imagewidth * scale,
    height: t.imageheight * scale,
    rotation: 0,
    visible: true,
  };
}
function rect(name, type, x, y, width, height, extra = {}) {
  return { id: objectId++, name, type, x, y, width, height, rotation: 0, visible: true, ...extra };
}
const floor = new Array(width * height).fill(byKey.get('floor-white').id + 1);
const paint = (x, y, w, h, key) => {
  for (let iy = y; iy < y + h; iy++)
    for (let ix = x; ix < x + w; ix++) floor[iy * width + ix] = byKey.get(key).id + 1;
};
paint(0, 0, width, 3, 'floor-blue');
paint(0, height - 3, width, 3, 'floor-blue');
paint(0, 0, 3, height, 'floor-blue');
paint(width - 3, 0, 3, height, 'floor-blue');
// Main north/south aisle; warmer south gallery; lounge and reception islands.
paint(37, 3, 6, 66, 'floor-blue');
paint(3, 43, 74, 14, 'floor-beige');
paint(5, 59, 22, 10, 'floor-wood');
paint(53, 59, 22, 10, 'floor-wood');
paint(31, 60, 18, 9, 'floor-blue');
layers.push({
  id: layerId++,
  name: 'Floor · paint tiles here',
  type: 'tilelayer',
  x: 0,
  y: 0,
  width,
  height,
  opacity: 1,
  visible: true,
  data: floor,
});
for (const [i, booth] of booths.entries()) {
  const local = i < 9 ? i : i < 18 ? i - 9 : i - 18;
  const sourceColumn = local % 3;
  const row = Math.floor(local / 3);
  const scale = 0.62;
  let cx, y;
  if (i < 18) {
    cx = (i < 9 ? [310, 670, 1030] : [1530, 1890, 2250])[sourceColumn];
    y = [200, 605, 1010][row];
  } else {
    cx = [270, 665, 1050, 1500, 1900, 2290][local];
    y = 1415;
  }
  const x = Math.round(cx - (booth.width * scale) / 2);
  const group = {
    id: layerId++,
    name: `${booth.key} · move as a group`,
    type: 'group',
    x: 0,
    y: 0,
    offsetx: x,
    offsety: y,
    opacity: 1,
    visible: true,
    properties: properties({ boothId: booth.key }),
    layers: [
      objectLayer(
        'Pieces',
        booth.parts.map((p) => tile(p.key, p.x * scale, p.y * scale, scale)),
      ),
    ],
  };
  layers.push(group);
}
const furnishing = [];
// Reception: visible first, with a free spawn and clear approach.
for (const [key, x, y, scale] of [
  ['counter', 1155, 1930, 0.65],
  ['kiosk', 990, 1940, 0.56],
  ['banner', 1475, 1910, 0.55],
  ['brochure-rack', 1450, 2070, 0.6],
  ['hologram', 1035, 2080, 0.58],
  ['plant', 870, 2000, 0.6],
  ['plant', 1590, 2000, 0.6],
  ['sofa', 230, 1920, 0.65],
  ['round-table', 430, 2040, 0.6],
  ['chair', 605, 2030, 0.65],
  ['desk', 250, 2130, 0.62],
  ['monitor', 660, 1885, 0.62],
  ['plant', 190, 2030, 0.58],
  ['display-case', 1820, 2000, 0.66],
  ['sofa', 2130, 1915, 0.65],
  ['chair', 2110, 2120, 0.65],
  ['round-table', 2240, 2070, 0.6],
  ['plant', 2350, 2110, 0.6],
])
  furnishing.push(tile(key, x, y, scale));
// Smaller displays inhabit booths while preserving an entrance and walking space.
for (const [i, key] of [
  'monitor',
  'hologram',
  'display-case',
  'kiosk',
  'brochure-rack',
  'plant',
].entries()) {
  furnishing.push(tile(key, [310, 670, 1030, 1530, 1890, 2250][i] - 40, 340, 0.36));
}
layers.push(objectLayer('Furniture · all 12 Prop designs', furnishing));
const walls = [];
for (let x = 90; x + 258 <= 2470; x += 258) walls.push(tile('wall', x, 40, 0.6));
// Side pillars and glass sections imply the perimeter without inventing art.
for (const x of [40, 2470])
  for (const y of [370, 740, 1110, 1500, 1910, 2210]) walls.push(tile('pillar', x, y, 0.6));
for (let x = 95; x < 1000; x += 252) walls.push(tile('glass-wall', x, 2265, 0.6));
for (let x = 1460; x < 2400; x += 252) walls.push(tile('glass-wall', x, 2265, 0.6));
for (const [key, x, y, scale] of [
  ['wall-corner-left', 80, 105, 0.6],
  ['wall-corner-right', 2290, 105, 0.6],
  ['glass-corner', 90, 1850, 0.6],
  ['glass-pillar', 785, 1840, 0.6],
  ['glass-entry', 1140, 2260, 0.6],
  ['door-closed', 90, 2190, 0.6],
  ['door-open', 2355, 2190, 0.6],
  ['wall-screen', 1790, 1840, 0.6],
  ['pillar-corner', 2370, 1815, 0.6],
])
  walls.push(tile(key, x, y, scale));
layers.push(objectLayer('Architecture · all Layout pieces', walls));
layers.push(
  objectLayer('World collision', [
    rect('North boundary', 'Collider', 0, 0, 2560, 160),
    rect('West boundary', 'Collider', 0, 0, 96, 2368),
    rect('East boundary', 'Collider', 2464, 0, 96, 2368),
    rect('South boundary', 'Collider', 0, 2320, 2560, 48),
  ]),
);
layers.push(
  objectLayer('Spawn and zones', [
    rect('Entrance', 'Spawn', 1280, 2190, 0, 0, { point: true }),
    rect('Reception', 'Zone', 850, 1840, 860, 480, {
      properties: properties({ label: 'โถงต้อนรับ' }),
    }),
    rect('Lounge', 'Zone', 100, 1840, 730, 480, {
      properties: properties({ label: 'มุมนั่งพัก' }),
    }),
    rect('Showcase', 'Zone', 1730, 1840, 720, 480, {
      properties: properties({ label: 'พื้นที่จัดแสดง' }),
    }),
    rect('Open booths', 'Zone', 100, 160, 1100, 1200, {
      properties: properties({ label: 'โซนบูธ Open' }),
    }),
    rect('Studio booths', 'Zone', 1360, 160, 1100, 1200, {
      properties: properties({ label: 'โซนบูธ Studio' }),
    }),
    rect('Pavilion', 'Zone', 100, 1376, 2360, 440, {
      properties: properties({ label: 'โซนบูธ Pavilion' }),
    }),
  ]),
);
await writeFile(
  target,
  JSON.stringify(
    {
      type: 'map',
      version: '1.10',
      tiledversion: '1.12.2',
      orientation: 'orthogonal',
      renderorder: 'right-down',
      infinite: false,
      width,
      height,
      tilewidth: tileSize,
      tileheight: tileSize,
      nextlayerid: layerId,
      nextobjectid: objectId,
      properties: properties({
        title: 'Exhibition Hall',
        subtitle: 'A place to meet, explore & connect',
        backgroundColor: '#152C43',
      }),
      tilesets: [{ firstgid: 1, source: 'tilesets/exhibition.tsj' }],
      layers,
    },
    null,
    2,
  ),
);
console.log(`Created ${target}: ${booths.length} booths, ${objectId - 1} objects.`);
