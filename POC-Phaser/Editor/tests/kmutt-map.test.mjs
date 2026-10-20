import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogFromTileset, importBundle } from '../shared/map/bundle.ts';
import { compileDocument } from '../shared/map/compile.mjs';
import { canWalk } from '../shared/map/walk.ts';

const root = 'public/maps/kmutt/';
const document = JSON.parse(await readFile(root + 'map.tmj', 'utf8'));
const set = JSON.parse(await readFile(root + 'expo.tsj', 'utf8'));
const pngs = new Map(
  await Promise.all(set.tiles.map(async (t) => [t.image, await readFile(root + t.image)])),
);
const catalog = catalogFromTileset(
  set,
  (image) => 'data:image/png;base64,' + pngs.get(image).toString('base64'),
);
const world = compileDocument(document, catalog.tiles, catalog.textures);
test('authored KMUTT map has six reference zones, twelve movable booths and valid native PNG geometry', () => {
  assert.equal(document.properties.find((p) => p.name === 'title').value, 'kmutt');
  assert.equal(world.zones.length, 6);
  assert.equal(world.summary.booths, 12);
  assert.equal(world.objects.filter((o) => o.name.startsWith('Audience seat')).length, 70);
  assert.equal(world.objects.filter((o) => o.name.startsWith('Workshop table')).length, 6);
  assert(canWalk(world, world.spawn));
  for (const tile of set.tiles) {
    const bytes = pngs.get(tile.image);
    assert.equal(bytes.readUInt32BE(16), tile.imagewidth, tile.image);
    assert.equal(bytes.readUInt32BE(20), tile.imageheight, tile.image);
  }
  for (const object of world.objects) {
    const tile = catalog.tiles.find((t) => t.key === object.texture);
    assert.equal(object.width, tile.imagewidth);
    assert.equal(object.height, tile.imageheight);
  }
  const stage = catalog.tiles.find((t) => t.meta.assetKey === 'kmutt-stage-platform');
  assert(
    !stage.meta.ground,
    'large platforms are placed as props, never painted into 32px floor cells',
  );
});
test('portable KMUTT ZIP roundtrip retains every object, collision, interaction and all PNGs', async () => {
  const imported = importBundle(new Uint8Array(await readFile(root + 'kmutt-tiled.zip')));
  const restored = compileDocument(
    imported.document,
    imported.catalog.tiles,
    imported.catalog.textures,
  );
  assert.deepEqual(restored.objects, world.objects);
  assert.deepEqual(restored.colliders, world.colliders);
  assert.deepEqual(restored.zones, world.zones);
  assert.deepEqual(restored.interactions, world.interactions);
  assert.equal(imported.catalog.tiles.length, set.tiles.length);
});
