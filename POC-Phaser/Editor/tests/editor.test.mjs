import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { compileDocument, propertiesOf } from '../shared/map/compile.mjs';
import {
  addAsset,
  movePlacement,
  paintFloor,
  placements,
  removePlacement,
} from '../shared/map/editor.ts';
import {
  addRectangle,
  createBlankMap,
  fitBlueprint,
  getBlueprint,
  parseMapDocument,
  resizeMap,
  resizeObject,
  setBlueprint,
  updateObjectProperty,
} from '../shared/map/studio.ts';
const source = JSON.parse(await readFile('maps/exhibition.tmj', 'utf8'));
const tileset = JSON.parse(await readFile('maps/tilesets/exhibition.tsj', 'utf8'));
const catalog = {
  tiles: tileset.tiles.map((t) => ({
    ...t,
    gid: t.id + 1,
    key: `tile-${t.id + 1}`,
    meta: propertiesOf(t),
  })),
  textures: [],
  prefabs: JSON.parse(await readFile('assets/booth-parts.json', 'utf8')),
};
const compile = (m) => compileDocument(m, catalog.tiles, []);
test('blank map resizing preserves floor cells, marker IDs and the Tiled roundtrip', () => {
  const floor = catalog.tiles.find(
    (t) => t.meta.ground && t.imagewidth === 32 && t.imageheight === 32,
  );
  const map = createBlankMap(20, 16, floor.gid, 'Studio test');
  map.layers[0].data[21] = 0;
  resizeMap(map, 24, 18, floor.gid);
  assert.equal(map.layers[0].data[25], 0);
  assert.equal(map.layers[0].data[23], floor.gid);
  assert.equal(map.layers[0].data.length, 24 * 18);
  assert.deepEqual(compile(map), compile(parseMapDocument(JSON.parse(JSON.stringify(map)))));
  assert.deepEqual(compile(map).spawn, { x: 320, y: 256 });
  resizeMap(map, 18, 14, floor.gid);
  assert.equal(map.layers[0].data[19], 0);
  assert.throws(() => resizeMap(map, 0, 20, floor.gid), /ขนาดแมป/);
});
test('blueprint fits without stretching, survives the document and does not affect playable geometry', () => {
  const floor = catalog.tiles.find(
    (t) => t.meta.ground && t.imagewidth === 32 && t.imageheight === 32,
  );
  const map = createBlankMap(20, 20, floor.gid, 'Blueprint test');
  const before = compile(map);
  const blueprint = fitBlueprint(
    {
      name: 'plan.png',
      url: 'data:image/png;base64,YQ==',
      imageWidth: 100,
      imageHeight: 50,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      opacity: 0.4,
      visible: true,
    },
    640,
    640,
  );
  assert.equal(blueprint.width / blueprint.height, 2);
  assert.equal(blueprint.y, 160);
  setBlueprint(map, blueprint);
  assert.deepEqual(getBlueprint(parseMapDocument(JSON.parse(JSON.stringify(map)))), blueprint);
  assert.deepEqual(compile(map), before);
  setBlueprint(map);
  assert.equal(getBlueprint(map), undefined);
});
test('aspect-locked object edits scale physics; collision can be disabled independently of depth', () => {
  const map = createBlankMap(30, 30, 0, 'Geometry test');
  const tile = catalog.tiles.find((t) => t.meta.assetKey === 'round-table');
  const key = addAsset(map, catalog, tile.meta.assetKey, 100, 100);
  const before = compile(map);
  resizeObject(map, key, 'width', tile.imagewidth / 2, true);
  const after = compile(map);
  assert.equal(after.objects[0].height, tile.imageheight / 2);
  assert.equal(after.colliders[0].width, before.colliders[0].width / 2);
  updateObjectProperty(map, key, 'collisionEnabled', false);
  updateObjectProperty(map, key, 'depthY', 80);
  const disabled = compile(map);
  assert.equal(disabled.colliders.length, 0);
  assert.equal(disabled.objects[0].depth, 140);
});
test('drawn zones and blockers remain editable and reject blocked spawns', () => {
  const map = createBlankMap(20, 20, 0, 'Regions test');
  const zone = addRectangle(map, 'zone', { x: 32, y: 32, width: 96, height: 64 });
  const blocker = addRectangle(map, 'collider', { x: 160, y: 160, width: 64, height: 32 });
  assert.equal(placements(map).find((p) => p.key === zone).kind, 'zone');
  assert.equal(compile(map).colliders.length, 1);
  movePlacement(map, blocker, 288, 288);
  resizeObject(map, blocker, 'height', 64, false);
  assert.throws(() => compile(map), /spawn overlaps/);
  removePlacement(map, blocker);
  assert.equal(compile(map).colliders.length, 0);
  assert.throws(
    () => addRectangle(map, 'zone', { x: 630, y: 0, width: 32, height: 32 }),
    /ภายในแมป/,
  );
});
test('moving a booth moves its host, collisions and depth together, with stable object IDs', () => {
  const map = structuredClone(source),
    before = compile(map),
    group = placements(map).find((p) => p.name.startsWith('booth3-4'));
  movePlacement(map, group.key, group.x + 32, group.y + 16);
  const after = compile(map);
  assert.equal(after.npcs[0].x, before.npcs[0].x + 32);
  assert.equal(after.npcs[0].y, before.npcs[0].y + 16);
  for (const id of group.objectIds) {
    const a = before.objects.find((o) => o.id === id),
      b = after.objects.find((o) => o.id === id);
    assert.equal(b.depth, a.depth + 16);
    assert.equal(b.x, a.x + 32);
  }
});
test('add/remove prefab, paint floor and JSON roundtrip preserve canonical document semantics', () => {
  const map = structuredClone(source),
    key = addAsset(map, catalog, 'booth1-1', 500, 1900);
  assert.equal(compile(map).summary.booths, 25);
  removePlacement(map, key);
  assert.equal(compile(map).summary.booths, 24);
  const tile = catalog.tiles.find((t) => t.meta.ground && t.imagewidth === 32);
  paintFloor(map, [{ x: 1280, y: 2190 }], tile.gid);
  assert.deepEqual(compile(map), compile(JSON.parse(JSON.stringify(map))));
});
test('reject malformed map, unsupported tile flips, obstructed host and invalid spawn footprint', () => {
  const map = structuredClone(source);
  map.width = NaN;
  assert.throws(() => compile(map));
  const flipped = structuredClone(source);
  flipped.layers[0].data[0] = 0x80000001;
  assert.throws(() => compile(flipped), /flipped/);
  const blocked = structuredClone(source),
    npc = placements(blocked).find((p) => p.kind === 'npc');
  movePlacement(blocked, npc.key, 0, 0);
  assert.throws(() => compile(blocked), /NPC patrol/);
  const spawn = structuredClone(source),
    point = placements(spawn).find((p) => p.kind === 'spawn');
  movePlacement(spawn, point.key, 4, 200);
  assert.throws(() => compile(spawn), /spawn/);
});
test('all 48 registered frames contain exactly the original crop pixels, with unchanged source hashes', async () => {
  const sources = JSON.parse(await readFile('assets/characters.json', 'utf8'));
  for (const source of sources) {
    assert.equal(
      createHash('sha256')
        .update(await readFile(source.source))
        .digest('hex'),
      source.sha256,
    );
    for (const frame of source.frames) {
      const original = await sharp(source.source)
        .extract(frame.crop)
        .ensureAlpha()
        .raw()
        .toBuffer();
      const prepared = await sharp(`public/world/characters/${source.key}-walk.png`)
        .extract({
          left: (frame.frame % 6) * source.frameWidth + frame.padding.left,
          top: Math.floor(frame.frame / 6) * source.frameHeight + frame.padding.top,
          width: frame.crop.width,
          height: frame.crop.height,
        })
        .ensureAlpha()
        .raw()
        .toBuffer();
      assert.equal(
        createHash('sha256').update(prepared).digest('hex'),
        createHash('sha256').update(original).digest('hex'),
        `${source.key}:${frame.frame}`,
      );
    }
  }
});
