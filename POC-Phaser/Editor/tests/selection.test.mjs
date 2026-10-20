import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogFromTileset } from '../shared/map/bundle.ts';
import { addAsset, findNode, placements } from '../shared/map/editor.ts';
import { createBlankMap, setProperty } from '../shared/map/studio.ts';
import { compileDocument } from '../shared/map/compile.mjs';
import {
  copySelection,
  pasteSelection,
  alignSelection,
  spaceSelection,
} from '../shared/map/selection.ts';
import { unlockedSelection, moveSelection } from '../shared/map/transform.ts';
import { reorderSelection } from '../shared/map/order.ts';

const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
const catalog = catalogFromTileset(set, (image) => `/starter/${image}`);
catalog.prefabs = JSON.parse(await readFile('public/starter/prefabs.json', 'utf8'));
const blank = () => createBlankMap(50, 40, 0, 'Selection', 32);
const compile = (map, library = catalog) =>
  compileDocument(map, library.tiles, library.textures, { editor: true });

test('copy/paste creates unique group, layer and object IDs, keeps offsets and skips the unique spawn', () => {
  const map = blank();
  const group = addAsset(map, catalog, catalog.prefabs[0].key, 64, 64);
  const prop = addAsset(map, catalog, 'bin-sort', 400, 96);
  const before = compile(map);
  const contents = copySelection(
    map,
    catalog,
    before,
    placements(map).map((item) => item.key),
  );
  assert.equal(contents.nodes.length, 2);
  const pasted = pasteSelection(map, catalog, contents, 32);
  assert.equal(pasted.length, 2);
  const after = compile(map);
  assert.equal(after.objects.length, before.objects.length * 2);
  const copied = after.objects.slice(before.objects.length);
  // Pasted groups and loose items can appear in a different traversal order.
  for (const object of before.objects)
    assert(
      copied.some(
        (item) =>
          item.asset === object.asset && item.x === object.x + 32 && item.y === object.y + 32,
      ),
    );
  const ids = placements(map).flatMap((item) => (item.kind === 'booth' ? [] : item.objectIds));
  assert.equal(new Set(ids).size, ids.length);
  assert.notEqual(
    findNode(map, group).properties.find((property) => property.name === 'boothId').value,
    findNode(
      map,
      pasted.find((key) => key.startsWith('layer:')),
    ).properties.find((property) => property.name === 'boothId').value,
  );
  assert.equal(findNode(map, prop).x, 400);
});

test('cross-map paste remaps GIDs by logical asset key instead of copying the source GID', () => {
  const source = blank();
  const key = addAsset(source, catalog, 'bin-sort', 96, 96);
  const contents = copySelection(source, catalog, compile(source), [key]);
  const targetCatalog = catalogFromTileset(
    {
      ...set,
      tiles: set.tiles.map((tile, index) => ({ ...tile, id: set.tiles.length - index - 1 })),
    },
    (image) => `/starter/${image}`,
  );
  const target = blank();
  const [pasted] = pasteSelection(target, targetCatalog, contents, 32);
  const object = compile(target, targetCatalog).objects[0];
  assert.equal(object.asset, 'bin-sort');
  assert.notEqual(findNode(target, pasted).gid, findNode(source, key).gid);
});

test('standalone Layout stays locked during marquee commands and direct batch movement', () => {
  const map = blank();
  const key = addAsset(map, catalog, 'wall-mint-n', 96, 96);
  const prop = addAsset(map, catalog, 'bin-sort', 160, 96);
  const world = compile(map);
  assert.deepEqual(unlockedSelection(catalog, world, placements(map), [key, prop]), [prop]);
  moveSelection(map, world, [key, prop], 32, 32, catalog);
  assert.equal(findNode(map, key).x, 96);
  assert.equal(findNode(map, prop).x, 192);
  assert.equal(copySelection(map, catalog, compile(map), [key]), undefined);
});

test('align and distribute preserve size and equalize edge gaps for different asset widths', () => {
  const map = blank();
  const keys = [
    addAsset(map, catalog, 'bin-sort', 64, 96),
    addAsset(map, catalog, 'table-short-v', 192, 160),
    addAsset(map, catalog, 'bin-sort', 400, 224),
  ];
  let world = compile(map);
  const widths = world.objects.map((object) => object.width);
  alignSelection(map, catalog, world, keys, 'top');
  world = compile(map);
  assert(world.objects.every((object) => object.y === 96));
  spaceSelection(map, catalog, world, keys, 'horizontal');
  world = compile(map);
  const sorted = [...world.objects].sort((a, b) => a.x - b.x);
  assert.equal(
    sorted[1].x - sorted[0].x - sorted[0].width,
    sorted[2].x - sorted[1].x - sorted[1].width,
  );
  assert.deepEqual(
    world.objects.map((object) => object.width),
    widths,
  );
  assert.equal(sorted[0].x, 64);
  assert.equal(sorted[2].x, 400);
});

test('batch layer ordering preserves the relative order inside the selection', () => {
  const map = blank();
  const keys = [0, 1, 2, 3].map((index) => addAsset(map, catalog, 'bin-sort', 64 + index * 32, 64));
  keys.forEach((key, index) => setProperty(findNode(map, key), 'renderDepth', index * 10));
  const before = compile(map);
  reorderSelection(map, before.objects, [keys[0], keys[2]], 'front');
  const sorted = compile(map).objects.sort((a, b) => a.depth - b.depth);
  assert.deepEqual(
    sorted.map((object) => object.id),
    [
      Number(keys[1].split(':')[1]),
      Number(keys[3].split(':')[1]),
      Number(keys[0].split(':')[1]),
      Number(keys[2].split(':')[1]),
    ],
  );
});

test('tidy produces an even grid inside map bounds without altering source object sizes', () => {
  const map = blank();
  const keys = [
    addAsset(map, catalog, 'bin-sort', 64, 64),
    addAsset(map, catalog, 'bin-sort', 160, 96),
    addAsset(map, catalog, 'bin-sort', 256, 160),
    addAsset(map, catalog, 'bin-sort', 352, 192),
  ];
  spaceSelection(map, catalog, compile(map), keys, 'tidy', 16);
  const objects = compile(map).objects;
  assert.equal(new Set(objects.map((object) => object.x)).size, 2);
  assert.equal(new Set(objects.map((object) => object.y)).size, 2);
  assert(
    objects.every(
      (object) => object.width === objects[0].width && object.height === objects[0].height,
    ),
  );
});
