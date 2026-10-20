import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { worldSchema, contains } from "../src/game/world";
import { Navigation } from "../src/game/navigation";
import { HallSimulation } from "../src/game/simulation";
import { HallBridge } from "../src/game/bridge";
import { characters, characterNames } from "../src/domain/catalog";
const publicRoot = resolve("public");
const world = worldSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(publicRoot, "assets/maps/exhibition/runtime.json"),
      "utf8",
    ),
  ),
);
test("compiled Tiled map has all resources, objects and collision data", () => {
  assert.equal(world.width, 1344);
  assert.equal(world.height, 832);
  assert.equal(world.sprites.length, 204);
  assert.equal(world.collisions.length, 45);
  for (const tile of world.tiles)
    assert.ok(existsSync(resolve(publicRoot, tile.image)), tile.image);
  for (const c of characters) {
    assert.ok(existsSync(resolve(publicRoot, c.walk)));
    if (c.idle) assert.ok(existsSync(resolve(publicRoot, c.idle)));
  }
});
test("all booth warp destinations are accessible and reachable from spawn", () => {
  const sim = new HallSimulation(
    world,
    { name: "Visitor", character: 0 },
    characterNames,
  );
  for (const area of world.areas.filter((a) => a.kind === "booth")) {
    assert.equal(sim.warp(area.id), true);
    assert.equal(sim.navigation.blocked(sim.player), false);
    assert.equal(contains(area, sim.player), true);
    const path = sim.navigation.path(world.spawn, sim.player);
    assert.ok(path.length > 0, area.id);
    for (const p of path) assert.equal(sim.navigation.blocked(p), false);
  }
});
test("foot collision prevents manually walking through walls", () => {
  const nav = new Navigation(world);
  let point = { ...world.spawn };
  for (let i = 0; i < 1000; i++) point = nav.move(point, -1, 0, 0.04, 128);
  assert.equal(nav.blocked(point), false);
  assert.ok(point.x >= 48);
});
test("14 distinct NPCs animate through simulation and pause without teleporting", () => {
  const sim = new HallSimulation(
    world,
    { name: "Visitor", character: 0 },
    characterNames,
  );
  assert.equal(sim.npcs.length, 14);
  const start = sim.npcs.map((p) => ({ x: p.x, y: p.y }));
  for (let i = 0; i < 120; i++) sim.update(1 / 60, { x: 0, y: 0 });
  assert.ok(sim.npcs.some((p, i) => p.x !== start[i].x || p.y !== start[i].y));
  sim.motion = false;
  const paused = sim.npcs.map((p) => ({ x: p.x, y: p.y }));
  for (let i = 0; i < 120; i++) sim.update(1 / 60, { x: 0, y: 0 });
  assert.deepEqual(
    sim.npcs.map((p) => ({ x: p.x, y: p.y })),
    paused,
  );
});
test("bridge subscriptions are instance scoped and unsubscribe on disposal", () => {
  const a = new HallBridge(),
    b = new HallBridge();
  let count = 0;
  const off = a.onCommand(() => count++);
  b.send({ type: "motion", enabled: true });
  assert.equal(count, 0);
  a.send({ type: "motion", enabled: true });
  assert.equal(count, 1);
  off();
  a.send({ type: "motion", enabled: true });
  assert.equal(count, 1);
});
