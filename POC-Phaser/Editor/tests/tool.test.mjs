import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { catalogFromTileset, floorGids, buildBundle, importBundle } from '../shared/map/bundle.ts';
import {
  gridPosition,
  gridPlacement,
  placementShape,
  rectangleCells,
  cellArea,
  zoneAtPoint,
} from '../shared/map/grid.ts';
import {
  addAsset,
  erasableObjectsInArea,
  removeObjects,
  paintFloor,
  renamePlacement,
  placements,
  findNode,
} from '../shared/map/editor.ts';
import {
  addRectangle,
  editAssetCollider,
  createBlankMap,
  resizeMap,
  parseMapDocument,
} from '../shared/map/studio.ts';
import { compileDocument } from '../shared/map/compile.mjs';

const map = JSON.parse(await readFile('public/starter/expo.tmj', 'utf8'));
const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
const urls = new Map();
for (const tile of set.tiles)
  urls.set(
    tile.image,
    'data:image/png;base64,' + (await readFile('public/starter/' + tile.image)).toString('base64'),
  );
const catalog = catalogFromTileset(set, (image) => urls.get(image), floorGids(map));
catalog.prefabs = JSON.parse(await readFile('public/starter/prefabs.json', 'utf8'));
const compile = (doc) => compileDocument(doc, catalog.tiles, catalog.textures, { editor: true });

test('map tile sizes control floor cells, world bounds, rectangle validation and resize geometry', () => {
  for (const size of [16, 32, 64, 128]) {
    const doc = createBlankMap(10, 8, 0, 'Tile-size fixture', size);
    assert.equal(compile(doc).width, 10 * size);
    assert.equal(compile(doc).height, 8 * size);
    assert.equal(compile(doc).tileSize, size);
    addRectangle(doc, 'zone', { x: 9 * size, y: 7 * size, width: size, height: size });
    assert.throws(
      () => addRectangle(doc, 'zone', { x: 10 * size, y: 0, width: 1, height: 1 }),
      /ภายในแมป/,
    );
    resizeMap(doc, 12, 10, 0);
    assert.equal(compile(doc).width, 12 * size);
    assert.equal(doc.layers[0].data.length, 120);
    const floor = structuredClone(
      catalog.tiles.find((t) => t.meta.assetKey === 'floor-ivory-center'),
    );
    floor.imagewidth = size;
    floor.imageheight = size;
    const resizedCatalog = {
      ...catalog,
      tiles: catalog.tiles.map((t) => (t.gid === floor.gid ? floor : t)),
    };
    const shape = placementShape(resizedCatalog, floor.meta.assetKey, size, true, size);
    assert.deepEqual(shape.parts, [{ texture: floor.key, x: 0, y: 0, width: size, height: size }]);
    paintFloor(doc, [{ x: size, y: size }], floor.gid);
    const world = compileDocument(doc, resizedCatalog.tiles, catalog.textures, { editor: true });
    assert.deepEqual(
      world.floors.map(({ x, y, width, height }) => ({ x, y, width, height })),
      [{ x: size, y: size, width: size, height: size }],
    );
  }
  const invalid = createBlankMap(10, 8, 0, 'Bad size');
  invalid.tilewidth = 24;
  assert.throws(() => parseMapDocument(invalid));
});

test('16px grid aligns placements while floor brushes keep the native 32px tile footprint', () => {
  assert.equal(gridPosition(400 - 1e-10, 16), 400);
  assert.equal(gridPosition(31, 16), 16);
  assert.equal(gridPosition(-0.1, 16), -16);
  assert.deepEqual(gridPlacement(405, 341, 50, 29, 16, { width: 1344, height: 832 }), {
    x: 400,
    y: 336,
    width: 64,
    height: 32,
    valid: true,
  });
  const floor = placementShape(catalog, 'floor-ivory-center', 16, true);
  assert.equal(floor.width, 32);
  assert.equal(floor.height, 32);
  assert.deepEqual(
    floor.parts.map((p) => [p.x, p.y, p.width, p.height]),
    [[0, 0, 32, 32]],
  );
});

test('editing or removing an asset collider preserves artwork and all other collision geometry', () => {
  const before = compile(map),
    rect = before.colliders.find((r) => r.id.includes(':'));
  assert(rect);
  const geometry = (list) =>
    list.map(({ x, y, width, height }) => JSON.stringify([x, y, width, height])).sort();
  const editable = structuredClone(map);
  const key = editAssetCollider(editable, before.colliders, rect.id);
  const node = findNode(editable, key);
  assert.equal(typeof node.id, 'number');
  assert.equal(node.type, 'Collider');
  assert.deepEqual(
    [node.x, node.y, node.width, node.height],
    [rect.x, rect.y, rect.width, rect.height],
  );
  const afterEdit = compile(editable);
  assert.deepEqual(afterEdit.objects, before.objects);
  assert.deepEqual(geometry(afterEdit.colliders), geometry(before.colliders));
  const removed = structuredClone(map);
  editAssetCollider(removed, before.colliders, rect.id, true);
  const afterRemove = compile(removed);
  assert.deepEqual(afterRemove.objects, before.objects);
  assert.deepEqual(
    geometry(afterRemove.colliders),
    geometry(before.colliders.filter((r) => r.id !== rect.id)),
  );
});

test('renaming synchronizes node names, legacy label/title properties, picker and compiled map label', () => {
  const draft = structuredClone(map);
  const key = addRectangle(draft, 'zone', { x: 384, y: 320, width: 160, height: 128 });
  const node = findNode(draft, key);
  node.name = 'internal-zone';
  node.properties = [
    { name: 'label', type: 'string', value: 'ชื่อเดิม' },
    { name: 'title', type: 'string', value: 'legacy title' },
  ];
  assert.equal(placements(draft).find((p) => p.key === key).name, 'ชื่อเดิม');
  renamePlacement(draft, key, '  ชื่อใหม่  ');
  assert.equal(node.name, 'ชื่อใหม่');
  assert(node.properties.every((p) => p.value === 'ชื่อใหม่'));
  assert.equal(placements(draft).find((p) => p.key === key).name, 'ชื่อใหม่');
  assert.equal(compile(draft).zones.find((z) => z.id === node.id).label, 'ชื่อใหม่');
  assert.throws(() => renamePlacement(draft, key, '   '), /ชื่อ/);
  assert.equal(node.name, 'ชื่อใหม่');
});

test('zone hit testing chooses the smaller nested zone and the newest overlapping zone', () => {
  const zones = [
    { id: 1, x: 0, y: 0, width: 320, height: 320 },
    { id: 2, x: 32, y: 32, width: 64, height: 64 },
    { id: 3, x: 32, y: 32, width: 64, height: 64 },
  ];
  assert.equal(zoneAtPoint(zones, { x: 40, y: 40 })?.id, 3);
  assert.equal(zoneAtPoint(zones, { x: 40, y: 40 }, 2)?.id, 2);
  assert.equal(zoneAtPoint(zones, { x: 40, y: 40 }, 1)?.id, 3);
  assert.equal(zoneAtPoint(zones, { x: 96, y: 96 })?.id, 1);
  assert.equal(zoneAtPoint(zones, { x: 320, y: 320 }), undefined);
});

test('rectangular drag is inclusive, shrinks on reversal and clips to map bounds', () => {
  const start = { x: 320, y: 320 },
    stride = { width: 32, height: 32 },
    bounds = { width: 1344, height: 832 };
  const large = rectangleCells(start, { x: 448, y: 384 }, stride, bounds);
  assert.equal(large.length, 15);
  assert.deepEqual(cellArea(large, stride), { x: 320, y: 320, width: 160, height: 96 });
  assert.equal(rectangleCells(start, { x: 352, y: 352 }, stride, bounds).length, 4);
  const reverse = rectangleCells(start, { x: 192, y: 256 }, stride, bounds);
  assert.equal(reverse.length, 15);
  assert.deepEqual(cellArea(reverse, stride), { x: 192, y: 256, width: 160, height: 96 });
  assert.equal(rectangleCells({ x: 0, y: 0 }, { x: -96, y: -96 }, stride, bounds).length, 1);
});

test('floor rectangle applies exactly fifteen cells, and layout pitch avoids overlapping artwork', () => {
  const draft = structuredClone(map),
    stride = { width: 32, height: 32 };
  const cells = rectangleCells({ x: 320, y: 320 }, { x: 448, y: 384 }, stride, {
    width: 1344,
    height: 832,
  });
  paintFloor(draft, cells, 999);
  assert.equal(
    draft.layers.find((l) => l.type === 'tilelayer').data.filter((gid) => gid === 999).length,
    15,
  );
  const tall = { width: 32, height: 96 };
  const stamps = rectangleCells({ x: 320, y: 320 }, { x: 448, y: 512 }, tall, {
    width: 1344,
    height: 832,
  });
  assert.equal(stamps.length, 15);
  assert.equal(cellArea(stamps, tall).height, 288);
});

test('bulk eraser removes layout and props including nested pieces, preserving floor and logical markers', () => {
  const draft = structuredClone(map);
  const layout = catalog.tiles.find((t) => t.meta.family === 'Layout');
  assert(layout);
  const key = addAsset(draft, catalog, layout.meta.assetKey, 320, 320);
  const prop = addAsset(draft, catalog, 'expo-booth-counter', 320, 320);
  const world = compile(draft),
    area = { x: 0, y: 0, width: 1344, height: 832 };
  const matched = erasableObjectsInArea(catalog, world.objects, area);
  assert(matched.some((o) => o.id === Number(key.split(':')[1])));
  assert(matched.some((o) => o.id === Number(prop.split(':')[1])));
  const floors = structuredClone(world.floors);
  removeObjects(
    draft,
    matched.map((o) => o.id),
  );
  const after = compile(draft);
  assert.equal(after.objects.length, world.objects.length - matched.length);
  assert(!after.objects.some((o) => o.id === Number(prop.split(':')[1])));
  assert.deepEqual(after.floors, floors);
  assert.deepEqual(after.zones, world.zones);
  const removedIds = new Set(matched.map((o) => o.id));
  assert.deepEqual(
    after.colliders,
    world.colliders.filter((c) => !removedIds.has(Number(c.id.split(':')[0]))),
  );
  assert.equal(erasableObjectsInArea(catalog, after.objects, area).length, 0);
});

test('grid uses the containing cell, including negative coordinates and boundaries', () => {
  assert.equal(gridPosition(63.9, 32), 32);
  assert.equal(gridPosition(64, 32), 64);
  assert.equal(gridPosition(-0.1, 32), -32);
  assert.equal(gridPosition(111, 1), 96); // unsupported free placement falls back to 32px
  const rect = gridPlacement(99, 73, 116, 61, 32, { width: 320, height: 256 });
  assert.deepEqual(rect, { x: 96, y: 64, width: 128, height: 64, valid: true });
  assert.equal(gridPlacement(319, 250, 116, 61, 32, { width: 320, height: 256 }).valid, false);
});
test('ghost and committed asset share native dimensions, key and grid origin', () => {
  const shape = placementShape(catalog, 'expo-booth-counter');
  assert(shape);
  const rect = gridPlacement(430, 370, shape.width, shape.height, 32, { width: 1344, height: 832 });
  const draft = structuredClone(map),
    key = addAsset(draft, catalog, 'expo-booth-counter', rect.x, rect.y);
  const object = compile(draft).objects.find((o) => o.id === Number(key.split(':')[1]));
  assert(object);
  assert.equal(object.x, rect.x);
  assert.equal(object.y, rect.y);
  assert.equal(object.width, shape.parts[0].width);
  assert.equal(object.height, shape.parts[0].height);
});
test('prefab ghost uses all actual pieces, floor and uniform scale', () => {
  const shape = placementShape(catalog, 'booth-01');
  assert(shape);
  assert.equal(shape.parts.length, catalog.prefabs[0].parts.length);
  const draft = structuredClone(map),
    before = compile(draft).objects.length;
  addAsset(draft, catalog, 'booth-01', 64, 64);
  assert.equal(compile(draft).objects.length - before, shape.parts.length);
});
test('64px paint preview covers exactly four real floor tiles', () => {
  const shape = placementShape(catalog, 'floor-ivory-center', 64, true);
  assert.deepEqual(
    shape.parts.map((p) => [p.x, p.y]),
    [
      [0, 0],
      [32, 0],
      [0, 32],
      [32, 32],
    ],
  );
  assert.equal(shape.width, 64);
  assert.equal(shape.height, 64);
});
test('generic map editing does not require a gameplay spawn or character', () => {
  const draft = structuredClone(map);
  draft.layers = draft.layers.filter((l) => l.name !== 'Spawn');
  const world = compile(draft);
  assert.equal(world.summary.booths, 5);
  assert.equal(world.npcs.length, 0);
  assert.equal(world.zones.length, 12);
});
test('portable ZIP contains every real PNG and roundtrips geometry and catalog', async () => {
  const zip = await buildBundle(map, catalog),
    files = unzipSync(zip);
  const exported = JSON.parse(strFromU8(files['map.tmj']));
  assert.equal(exported.tilesets[0].source, 'tilesets/map.tsj');
  const tileset = JSON.parse(strFromU8(files['tilesets/map.tsj']));
  for (const t of tileset.tiles) {
    assert(files['images/tile-' + (t.id + 1) + '.png']);
    assert(!t.image.includes('api/'));
    assert(!t.image.includes('world/'));
  }
  const imported = importBundle(zip);
  assert.deepEqual(imported.document.layers, map.layers);
  assert.equal(imported.catalog.tiles.length, catalog.tiles.length);
  assert.equal(imported.catalog.prefabs.length, 5);
  assert.equal(
    compileDocument(imported.document, imported.catalog.tiles, imported.catalog.textures, {
      editor: true,
    }).objects.length,
    204,
  );
});
test('bundle filenames cannot collide when input PNG basenames are duplicated', async () => {
  const duplicate = structuredClone(catalog);
  duplicate.tiles[0].image = 'a/same.png';
  duplicate.tiles[1].image = 'b/same.png';
  const files = unzipSync(await buildBundle(map, duplicate));
  assert(files['images/tile-1.png']);
  assert(files['images/tile-2.png']);
});
test('ZIP rejects missing resources, escaping paths and lying image dimensions', async () => {
  const original = unzipSync(await buildBundle(map, catalog));
  const missing = { ...original };
  delete missing['images/tile-1.png'];
  assert.throws(() => importBundle(zipSync(missing)), /PNG/);
  const escaped = structuredClone(map);
  escaped.tilesets[0].source = '../outside.tsj';
  assert.throws(
    () => importBundle(zipSync({ 'map.tmj': strToU8(JSON.stringify(escaped)) })),
    /Path/,
  );
  const invalidSet = JSON.parse(strFromU8(original['tilesets/map.tsj']));
  invalidSet.tiles[0].imagewidth++;
  assert.throws(
    () =>
      importBundle(
        zipSync({ ...original, 'tilesets/map.tsj': strToU8(JSON.stringify(invalidSet)) }),
      ),
    /ขนาด PNG/,
  );
});
