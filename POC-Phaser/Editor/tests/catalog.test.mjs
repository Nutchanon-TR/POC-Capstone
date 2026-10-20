import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogFromTileset } from '../shared/map/bundle.ts';
import { mergeCatalogs } from '../shared/map/catalog.ts';

function catalog(keys) {
  return catalogFromTileset(
    {
      type: 'tileset',
      name: 'test',
      objectalignment: 'topleft',
      tiles: keys.map((key, id) => ({
        id,
        image: `tile-${id}.png`,
        imagewidth: 32,
        imageheight: 32,
        properties: [{ name: 'assetKey', type: 'string', value: key }],
      })),
    },
    (image) => `data:${keys.join('-')}/${image}`,
  );
}

test('sharing preserves local GIDs/images and remaps colliding source IDs without mutating either map', () => {
  const target = catalog(['chair', 'custom-a']);
  const source = catalog(['desk', 'custom-b', 'chair']);
  source.defaultSizes = { desk: { width: 64, height: 64 } };
  source.prefabs = [
    {
      key: 'office',
      width: 96,
      height: 64,
      parts: [
        { key: 'chair', x: 0, y: 0, w: 32, h: 32 },
        { key: 'desk', x: 32, y: 0, w: 64, h: 64 },
      ],
    },
  ];
  const before = structuredClone({ target, source });
  const shared = mergeCatalogs(target, source);
  assert.deepEqual(shared.tiles.slice(0, 2), target.tiles);
  assert.deepEqual(shared.textures.slice(0, 2), target.textures);
  assert.deepEqual(
    shared.tiles.map((tile) => tile.meta.assetKey),
    ['chair', 'custom-a', 'desk', 'custom-b'],
  );
  assert.deepEqual(
    shared.tiles.map((tile) => tile.gid),
    [1, 2, 3, 4],
  );
  assert.equal(shared.textures[2].url, source.textures[0].url);
  assert.equal(new Set(shared.tiles.map((tile) => tile.image)).size, 4);
  assert.deepEqual(shared.defaultSizes.desk, { width: 64, height: 64 });
  assert.deepEqual(shared.prefabs, source.prefabs);
  assert.deepEqual({ target, source }, before);
  assert.deepEqual(mergeCatalogs(shared, source), shared, 'repeat merging is idempotent');
  const restored = catalogFromTileset(
    shared.tileset,
    (image) =>
      shared.textures.find((t) => shared.tiles.find((tile) => tile.key === t.key)?.image === image)
        .url,
  );
  assert.deepEqual(
    restored.tiles.map((tile) => tile.meta.assetKey),
    shared.tiles.map((tile) => tile.meta.assetKey),
  );
});

test('local floor variants and local prefab definitions take precedence over shared versions', () => {
  const target = catalog(['floor']);
  const source = catalog(['floor', 'desk']);
  target.tiles[0].imagewidth = target.tiles[0].imageheight = 16;
  target.tiles[0].meta.ground = true;
  target.prefabs = [
    { key: 'office', width: 16, height: 16, parts: [{ key: 'floor', x: 0, y: 0, w: 16, h: 16 }] },
  ];
  source.prefabs = [{ ...target.prefabs[0], width: 64 }];
  const merged = mergeCatalogs(target, source);
  assert.equal(merged.tiles[0].imagewidth, 16);
  assert.deepEqual(merged.prefabs, target.prefabs);
});
