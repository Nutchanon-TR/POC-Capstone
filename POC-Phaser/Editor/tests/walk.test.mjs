import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { canWalk, walkSpawn, moveWalker } from '../shared/map/walk.ts';
import { gridPosition, gridPlacement, placementShape } from '../shared/map/grid.ts';

const world = {
  width: 320,
  height: 240,
  spawn: { x: 40, y: 80 },
  colliders: [{ x: 100, y: 30, width: 1, height: 180 }],
};
test('preview walker respects thin walls, world bounds, diagonal speed and sliding', () => {
  let position = { ...world.spawn };
  for (let i = 0; i < 100; i++) position = moveWalker(world, position, { x: 1, y: 0 }, 16);
  assert(canWalk(world, position));
  assert(position.x <= 87 && position.x > 84);
  const slide = moveWalker(world, position, { x: 1, y: 1 }, 100);
  assert(slide.y > position.y && slide.x <= 87);
  const diagonal = moveWalker(world, world.spawn, { x: 1, y: 1 }, 100);
  assert(
    Math.abs(Math.hypot(diagonal.x - world.spawn.x, diagonal.y - world.spawn.y) - 16) < 0.0001,
  );
  for (let i = 0; i < 100; i++) position = moveWalker(world, position, { x: -1, y: -1 }, 100);
  assert(canWalk(world, position));
  assert(position.x >= 13 && position.y >= 12);
  assert.deepEqual(moveWalker(world, position, { x: 0, y: 0 }, 100), position);
});
test('preview spawn finds clear space on maps with a blocked or absent usable spawn', () => {
  const blocked = { ...world, spawn: { x: 100, y: 70 } };
  assert(canWalk(blocked, walkSpawn(blocked)));
  assert.equal(
    walkSpawn({ ...world, colliders: [{ x: 0, y: 0, width: 320, height: 240 }] }),
    undefined,
  );
});
test('free mode keeps coordinates and native footprint while 8px mode quantizes cells', () => {
  assert.equal(gridPosition(107.35, 0), 107.35);
  assert.equal(gridPosition(107.35, 8), 104);
  assert.deepEqual(gridPlacement(107.35, 61.2, 20, 18, 0, world), {
    x: 107.35,
    y: 61.2,
    width: 20,
    height: 18,
    valid: true,
  });
  assert.equal(gridPlacement(319, 0, 20, 18, 0, world).valid, false);
  const tile = {
    gid: 1,
    key: 'floor',
    imagewidth: 32,
    imageheight: 32,
    meta: { assetKey: 'floor' },
  };
  const paint = placementShape({ tiles: [tile], prefabs: [] }, 'floor', 0, true, 32);
  assert.equal(paint.width, 32);
  assert.equal(paint.parts.length, 1);
});
test('student atlas has sixteen foot-aligned frames and the source PNG retains its hash', async () => {
  const atlas = JSON.parse(await readFile('public/editor/characters/student02/atlas.json', 'utf8'));
  assert.equal(Object.keys(atlas.frames).length, 16);
  const sizes = new Set();
  for (const [name, value] of Object.entries(atlas.frames)) {
    assert.match(name, /^(up|down|left|right)-[0-3]$/);
    assert.equal(value.spriteSourceSize.y + value.spriteSourceSize.h, value.sourceSize.h);
    assert(value.frame.x >= 0 && value.frame.x + value.frame.w <= 1263);
    assert(value.frame.y >= 0 && value.frame.y + value.frame.h <= 1246);
    sizes.add(JSON.stringify(value.sourceSize));
  }
  assert.equal(sizes.size, 1);
  assert.equal(
    createHash('sha256')
      .update(await readFile('public/editor/characters/student02/Student02.png'))
      .digest('hex'),
    atlas.meta.sourceSHA256,
  );
});
