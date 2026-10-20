import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogFromTileset } from '../shared/map/bundle.ts';
import { compileDocument } from '../shared/map/compile.mjs';
import { addAsset, findNode, placements } from '../shared/map/editor.ts';
import { addRectangle, createBlankMap } from '../shared/map/studio.ts';
import {
  handlePoint,
  hitResizeHandle,
  moveSelection,
  normalizedSelection,
  placementBounds,
  resizeHandles,
  resizeRectangle,
  resizeRegion,
  selectInRectangle,
  selectionBounds,
} from '../shared/map/transform.ts';

const catalog = catalogFromTileset(
  JSON.parse(await readFile('public/starter/expo.tsj', 'utf8')),
  (image) => `/starter/${image}`,
);
catalog.prefabs = JSON.parse(await readFile('public/starter/prefabs.json', 'utf8'));
const compile = (map) => compileDocument(map, catalog.tiles, catalog.textures, { editor: true });
const blank = () => createBlankMap(50, 40, 0, 'Transforms', 32);

test('marquee selects whole booths, deduplicates children, and moves every part exactly once', () => {
  const map = blank();
  const group = addAsset(map, catalog, catalog.prefabs[0].key, 64, 64);
  const prop = addAsset(map, catalog, 'bin-sort', 900, 64);
  const world = compile(map),
    items = placements(map);
  const owner = items.find((item) => item.key === group);
  const child = `object:${owner.objectIds[0]}`;
  assert.deepEqual(normalizedSelection(items, [group, child, prop]), [group, prop]);
  const keys = selectInRectangle(world, items, { x: 32, y: 32, width: 1000, height: 500 });
  assert(keys.includes(group));
  assert(!keys.includes(child));
  const bounds = selectionBounds(world, items, keys);
  assert(bounds.width > 800);
  moveSelection(map, world, [group, child, prop], 32, 64);
  const next = compile(map);
  for (const before of world.objects) {
    const after = next.objects.find((object) => object.id === before.id);
    assert.equal(after.x, before.x + 32);
    assert.equal(after.y, before.y + 64);
  }
});

test('moving a selection beyond the map fails without partially moving its objects', () => {
  const map = blank();
  const first = addAsset(map, catalog, 'bin-sort', 32, 32);
  const second = addAsset(map, catalog, 'bin-sort', 96, 32);
  const before = structuredClone(map);
  assert.throws(() => moveSelection(map, compile(map), [first, second], -64, 0));
  assert.deepEqual(map, before);
});

test('eight resize handles keep opposite edges fixed, snap, clamp and never invert', () => {
  const rect = { x: 64, y: 64, width: 128, height: 96 },
    world = { width: 512, height: 512 };
  for (const handle of resizeHandles)
    assert.equal(hitResizeHandle(rect, handlePoint(rect, handle), 2), handle);
  assert.equal(hitResizeHandle(rect, { x: 192, y: 87 }, 1), 'e');
  assert.equal(hitResizeHandle(rect, { x: 128, y: 110 }, 1), undefined);
  assert.equal(
    hitResizeHandle({ x: 0, y: 0, width: 8, height: 8 }, { x: 4, y: 4 }, 0.5),
    undefined,
    'the center of a tiny frame remains available for moving',
  );
  assert.deepEqual(resizeRectangle(rect, 'se', { x: 250, y: 222 }, 32, world), {
    x: 64,
    y: 64,
    width: 192,
    height: 160,
  });
  assert.deepEqual(resizeRectangle(rect, 'nw', { x: -20, y: -20 }, 32, world), {
    x: 0,
    y: 0,
    width: 192,
    height: 160,
  });
  const crossed = resizeRectangle(rect, 'nw', { x: 500, y: 500 }, 32, world);
  assert.equal(crossed.width, 32);
  assert.equal(crossed.height, 32);
  assert.equal(crossed.x + crossed.width, 192);
  assert.equal(resizeRectangle(rect, 'e', { x: 200.25, y: 64 }, 0, world).width, 136.25);
});

test('nested region resize changes world bounds while preserving label and parent offsets', () => {
  const map = blank();
  const key = addRectangle(map, 'zone', { x: 32, y: 32, width: 64, height: 64 });
  const layer = map.layers.pop();
  map.layers.push({
    id: map.nextlayerid++,
    name: 'Nested',
    type: 'group',
    offsetx: 64,
    offsety: 96,
    layers: [layer],
  });
  const world = compile(map),
    target = { kind: 'zone', key, rect: world.zones[0] };
  resizeRegion(map, catalog, world, target, { x: 80, y: 112, width: 160, height: 128 });
  assert.deepEqual(
    placementBounds(
      compile(map),
      placements(map).find((item) => item.key === key),
    ),
    { ...world.zones[0], x: 80, y: 112, width: 160, height: 128 },
  );
  assert.equal(findNode(map, key).x, 16);
});

test('resizing scaled Interact writes native relative bounds and keeps asset, collision and action intact', () => {
  const map = blank(),
    key = addAsset(map, catalog, 'expo-computer', 256, 256);
  const node = findNode(map, key);
  node.width *= 2;
  node.height *= 2;
  node.properties = [{ name: 'interactAction', type: 'string', value: 'open-job' }];
  const world = compile(map),
    rect = { x: 240, y: 224, width: 128, height: 96 };
  resizeRegion(map, catalog, world, { kind: 'interact', key, rect: world.interactions[0] }, rect);
  const next = compile(map);
  assert.deepEqual(next.objects, world.objects);
  assert.deepEqual(next.colliders, world.colliders);
  assert.deepEqual(next.interactions[0], { ...world.interactions[0], ...rect });
  assert.equal(next.interactions[0].actionKey, 'open-job');
});

test('an asset footprint can resize directly into a local collider without resizing the asset', () => {
  const map = blank();
  addAsset(map, catalog, 'table-long-v', 128, 128);
  const world = compile(map),
    source = world.colliders[0];
  const rect = { x: 128, y: 160, width: 96, height: 128 };
  const key = resizeRegion(
    map,
    catalog,
    world,
    { kind: 'collider', key: `collision:${source.id}`, rect: source },
    rect,
  );
  const next = compile(map);
  assert.deepEqual(next.objects, world.objects);
  assert(!next.colliders.some((collider) => collider.id === source.id));
  assert.deepEqual(
    next.colliders.find((collider) => collider.id === key.split(':')[1]),
    { id: key.split(':')[1], ...rect },
  );
});
