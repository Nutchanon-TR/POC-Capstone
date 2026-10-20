import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogFromTileset, buildBundle, importBundle } from '../shared/map/bundle.ts';
import { compileDocument } from '../shared/map/compile.mjs';
import { addAsset, findNode, placements, movePlacement } from '../shared/map/editor.ts';
import { createBlankMap, setProperty, addRectangle } from '../shared/map/studio.ts';
import { reorderPlacement, renderOrderState, restoreRenderOrder } from '../shared/map/order.ts';

const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
const urls = new Map(
  await Promise.all(
    set.tiles.map(async (tile) => [
      tile.image,
      'data:image/png;base64,' +
        (await readFile('public/starter/' + tile.image)).toString('base64'),
    ]),
  ),
);
const catalog = catalogFromTileset(set, (image) => urls.get(image));
catalog.prefabs = JSON.parse(await readFile('public/starter/prefabs.json', 'utf8'));
const compile = (doc) => compileDocument(doc, catalog.tiles, catalog.textures, { editor: true });
const order = (doc) =>
  compile(doc)
    .objects.filter((o) => !o.ground)
    .sort((a, b) => a.depth - b.depth)
    .map((o) => o.name);
function fixture(tied = false) {
  const doc = createBlankMap(42, 26, 0, 'Stack fixture');
  const keys = ['A', 'B', 'C'].map((name, index) => {
    const key = addAsset(doc, catalog, 'table-short-v', 320, 320),
      node = findNode(doc, key);
    node.name = name;
    if (!tied) setProperty(node, 'renderDepth', 100 * (index + 1));
    return key;
  });
  addRectangle(doc, 'zone', { x: 600, y: 400, width: 64, height: 64 });
  addRectangle(doc, 'collider', { x: 700, y: 400, width: 64, height: 64 });
  return { doc, keys };
}

test('four ordering actions move the selected sprite without changing geometry or unrelated depths', () => {
  for (const [action, index, expected] of [
    ['front', 0, ['B', 'C', 'A']],
    ['back', 2, ['C', 'A', 'B']],
    ['forward', 0, ['B', 'A', 'C']],
    ['backward', 2, ['A', 'C', 'B']],
  ]) {
    const { doc, keys } = fixture(),
      before = compile(doc),
      original = structuredClone(doc);
    reorderPlacement(doc, before.objects, keys[index], action);
    assert.deepEqual(order(doc), expected);
    const after = compile(doc);
    assert.deepEqual(after.colliders, before.colliders);
    assert.deepEqual(after.zones, before.zones);
    assert.deepEqual(
      after.objects.map((o) => ({ ...o, depth: 0 })),
      before.objects.map((o) => ({ ...o, depth: 0 })),
    );
    keys
      .filter((_, i) => i !== index)
      .forEach((key) => assert.deepEqual(findNode(doc, key), findNode(original, key)));
  }
});

test('single-step ordering handles equal depths and preserves non-overlapping peers outside the tie', () => {
  const { doc, keys } = fixture(true);
  const distant = addAsset(doc, catalog, 'expo-computer', 640, 400),
    original = structuredClone(findNode(doc, distant));
  const baseline = compile(doc);
  reorderPlacement(doc, baseline.objects, keys[0], 'forward');
  assert.deepEqual(order(doc).slice(0, 3), ['B', 'A', 'C']);
  assert.deepEqual(findNode(doc, distant), original);
  assert.deepEqual(
    renderOrderState(
      compile(doc).objects,
      placements(doc).find((p) => p.key === keys[0]),
    ),
    {
      first: 2,
      last: 2,
      total: 4,
      count: 1,
      front: true,
      back: true,
      forward: true,
      backward: true,
    },
  );
  reorderPlacement(doc, compile(doc).objects, keys[0], 'backward');
  assert.deepEqual(order(doc).slice(0, 3), ['A', 'B', 'C']);
});

test('booth ordering keeps internal order, native ground tiles, geometry and collision intact', () => {
  const doc = createBlankMap(42, 26, 0, 'Booth');
  const key = addAsset(doc, catalog, 'booth-01', 320, 320);
  addAsset(doc, catalog, 'table-long-v', 320, 400);
  const before = compile(doc),
    item = placements(doc).find((p) => p.key === key),
    ids = new Set(item.objectIds);
  const memberOrder = before.objects
    .filter((o) => ids.has(o.id) && !o.ground)
    .sort((a, b) => a.depth - b.depth)
    .map((o) => o.id);
  const ground = before.objects
    .filter((o) => ids.has(o.id) && o.ground)
    .map((o) => structuredClone(findNode(doc, `object:${o.id}`)));
  reorderPlacement(doc, before.objects, key, 'front');
  const after = compile(doc),
    ordered = after.objects.filter((o) => !o.ground).sort((a, b) => a.depth - b.depth);
  assert.deepEqual(
    ordered.slice(-memberOrder.length).map((o) => o.id),
    memberOrder,
  );
  ground.forEach((node) => assert.deepEqual(findNode(doc, `object:${node.id}`), node));
  assert.deepEqual(after.colliders, before.colliders);
  assert.deepEqual(
    after.objects.map((o) => ({ ...o, depth: 0 })),
    before.objects.map((o) => ({ ...o, depth: 0 })),
  );
  movePlacement(doc, key, 384, 352);
  assert.deepEqual(
    compile(doc)
      .objects.filter((o) => ids.has(o.id) && !o.ground)
      .map((o) => o.depth),
    after.objects.filter((o) => ids.has(o.id) && !o.ground).map((o) => o.depth),
  );
});

test('ordering survives real portable ZIP roundtrip and boundary actions are no-ops', async () => {
  const { doc, keys } = fixture();
  reorderPlacement(doc, compile(doc).objects, keys[0], 'front');
  const baseline = JSON.stringify(doc);
  reorderPlacement(doc, compile(doc).objects, keys[0], 'front');
  assert.equal(JSON.stringify(doc), baseline);
  const imported = importBundle(await buildBundle(doc, catalog));
  const restored = compileDocument(
    imported.document,
    imported.catalog.tiles,
    imported.catalog.textures,
    { editor: true },
  );
  assert.deepEqual(
    restored.objects
      .filter((o) => !o.ground)
      .sort((a, b) => a.depth - b.depth)
      .map((o) => o.name),
    ['B', 'C', 'A'],
  );
  assert.deepEqual(imported.document.layers, doc.layers);
});

test('automatic sorting clears only selected overrides and follows Y after moving again', () => {
  const { doc, keys } = fixture();
  const peer = structuredClone(findNode(doc, keys[1]));
  restoreRenderOrder(doc, compile(doc).objects, keys[0]);
  assert(!findNode(doc, keys[0]).properties.some((p) => p.name === 'renderDepth'));
  assert.deepEqual(findNode(doc, keys[1]), peer);
  const before = compile(doc).objects.find((o) => o.name === 'A');
  movePlacement(doc, keys[0], before.x, before.y + 32);
  assert.equal(compile(doc).objects.find((o) => o.name === 'A').depth, before.depth + 32);
});

test('ground/logical markers have no ordering controls and extreme imported depths stay finite', () => {
  const { doc, keys } = fixture();
  const floor = addAsset(doc, catalog, 'floor-ivory-center', 32, 32);
  assert.equal(
    renderOrderState(
      compile(doc).objects,
      placements(doc).find((p) => p.key === floor),
    ),
    undefined,
  );
  assert.equal(
    renderOrderState(
      compile(doc).objects,
      placements(doc).find((p) => p.kind === 'zone'),
    ),
    undefined,
  );
  keys.forEach((key) => setProperty(findNode(doc, key), 'renderDepth', 1e100));
  reorderPlacement(doc, compile(doc).objects, keys[0], 'front');
  assert.deepEqual(order(doc), ['B', 'C', 'A']);
  assert(
    compile(doc)
      .objects.filter((o) => !o.ground)
      .every((o) => Number.isFinite(o.depth) && o.depth > 0 && o.depth < 90000),
  );
  setProperty(findNode(doc, keys[0]), 'renderDepth', 'invalid');
  assert.throws(() => compile(doc), /renderDepth must be a finite number/);
});
