import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseWorld } from '../src/game/tiled/parseWorld';
import { movePlayer, overlaps } from '../src/game/domain/movement';
import { nearestComputer } from '../src/game/domain/interaction';
import { playerFeet, type World } from '../src/game/domain/world';

const map = JSON.parse(readFileSync('public/assets/map/map.tmj', 'utf8'));
const tileset = JSON.parse(readFileSync('public/assets/map/tilesets/map.tsj', 'utf8'));
const world = parseWorld(map, tileset);
const emptyWorld: World = { ...world, colliders: [] };

test('real export preserves top-left placement, spawn and computer identity', () => {
  assert.equal(world.width, 1344);
  assert.equal(world.height, 832);
  assert.deepEqual(world.spawn, { x: 160, y: 736 });
  assert.equal(world.objects.length, 212);
  const computers = world.interactions.filter((item) => item.kind === 'computer');
  assert.equal(computers.length, 4);
  assert.equal(computers[0]?.id, 229);
  assert.equal(computers[0]?.y, 224);
  assert.equal(world.objects.find((item) => item.id === 229)?.depth, 299);
  assert.ok(world.colliders.length > 21, 'TSJ footprints must supplement explicit walls');
  assert.equal(
    world.colliders.some((collider) => overlaps(playerFeet(world.spawn), collider)),
    false,
  );
});

test('diagonal motion has the same distance as straight motion', () => {
  const start = {
    x: 500,
    y: 500,
    facing: 'down',
    moving: false,
  } satisfies import('../src/game/domain/world').PlayerState;
  const straight = movePlayer(start, { x: 1, y: 0 }, 0.05, emptyWorld);
  const diagonal = movePlayer(start, { x: 1, y: 1 }, 0.05, emptyWorld);
  assert.ok(Math.abs(Math.hypot(diagonal.x - 500, diagonal.y - 500) - (straight.x - 500)) < 0.0001);
  assert.equal(start.x, 500, 'movement must not mutate caller state');
});

test('a thin wall stops movement and allows sliding along its edge', () => {
  const wallWorld = { ...emptyWorld, colliders: [{ x: 520, y: 0, width: 2, height: 832 }] };
  let player: import('../src/game/domain/world').PlayerState = {
    x: 500,
    y: 500,
    facing: 'down',
    moving: false,
  };
  for (let frame = 0; frame < 120; frame++)
    player = movePlayer(player, { x: 1, y: 1 }, 1 / 60, wallWorld);
  assert.ok(player.x <= 511);
  assert.ok(player.y > 700);
  assert.equal(overlaps(playerFeet(player), wallWorld.colliders[0]), false);
});

test('nearby computer can be reached from in front of its blocking table', () => {
  const computer = world.interactions.find((item) => item.id === 229);
  assert.ok(computer);
  assert.equal(nearestComputer({ x: 704, y: 308 }, world.interactions)?.id, computer.id);
  assert.equal(nearestComputer(world.spawn, world.interactions), null);
  assert.equal(
    world.colliders.some((collider) => overlaps(playerFeet({ x: 704, y: 308 }), collider)),
    false,
  );
});

test('object overrides disable interaction without removing its image', () => {
  const changed = structuredClone(map);
  const placed = changed.layers
    .flatMap((item: { objects?: { id: number; properties?: unknown[] }[] }) => item.objects ?? [])
    .find((item: { id: number }) => item.id === 229);
  assert.ok(placed);
  placed.properties = [{ name: 'interactEnabled', value: false }];
  const parsed = parseWorld(changed, tileset);
  assert.ok(parsed.objects.some((item) => item.id === 229));
  assert.equal(
    parsed.interactions.some((item) => item.id === 229),
    false,
  );
});

test('scaled interaction bounds and layer offsets are applied once', () => {
  const changed = structuredClone(map);
  const targetLayer = changed.layers.find(
    (item: { name: string }) => item.name === 'Structures and furniture',
  );
  const placed = targetLayer.objects.find((item: { id: number }) => item.id === 229);
  targetLayer.offsetx = 10;
  targetLayer.offsety = 20;
  placed.width = 64;
  placed.height = 72;
  placed.properties = [
    { name: 'interactEnabled', value: true },
    { name: 'interactX', value: 2 },
    { name: 'interactY', value: 3 },
    { name: 'interactWidth', value: 8 },
    { name: 'interactHeight', value: 9 },
  ];
  const parsed = parseWorld(changed, tileset);
  const target = parsed.interactions.find((item) => item.id === 229);
  assert.ok(target);
  assert.deepEqual(
    { x: target.x, y: target.y, width: target.width, height: target.height },
    { x: 702, y: 250, width: 16, height: 18 },
  );
});

test('unsupported export fails at the parser rather than rendering an incorrect map', () => {
  assert.throws(() => parseWorld({ ...map, orientation: 'isometric' }, tileset));
  assert.throws(() => parseWorld({ ...map, properties: [] }, tileset), /ProjectExpo32/);
});
