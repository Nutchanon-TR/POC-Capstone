import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogFromTileset, buildBundle, importBundle } from '../shared/map/bundle.ts';
import { compileDocument } from '../shared/map/compile.mjs';
import {
  addAsset,
  movePlacement,
  removePlacement,
  renamePlacement,
  findNode,
} from '../shared/map/editor.ts';
import { updateObjectProperty, createBlankMap } from '../shared/map/studio.ts';
import { upgradeExpoCatalog, splitExpoCounters } from '../shared/map/expo-upgrade.ts';

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

test('interaction metadata follows scaled asset geometry, name, move, disable and portable export', async () => {
  const doc = createBlankMap(42, 26, 0, 'Interactions');
  const key = addAsset(doc, catalog, 'expo-computer', 320, 320);
  const node = findNode(doc, key);
  node.width *= 2;
  node.height *= 2;
  for (const [name, value] of Object.entries({
    interactX: -4,
    interactY: 2,
    interactWidth: 40,
    interactHeight: 38,
    interactAction: 'open-terminal',
  }))
    updateObjectProperty(doc, key, name, value);
  renamePlacement(doc, key, 'คอมลงทะเบียน');
  movePlacement(doc, key, 384, 352);
  const rect = compile(doc).interactions[0];
  assert.deepEqual(rect, {
    id: node.id,
    label: 'คอมลงทะเบียน',
    kind: 'computer',
    actionKey: 'open-terminal',
    x: 376,
    y: 356,
    width: 80,
    height: 76,
  });
  const imported = importBundle(await buildBundle(doc, catalog));
  assert.deepEqual(
    compileDocument(imported.document, imported.catalog.tiles, imported.catalog.textures, {
      editor: true,
    }).interactions,
    [rect],
  );
  updateObjectProperty(doc, key, 'interactEnabled', false);
  assert.equal(compile(doc).interactions.length, 0);
  assert.equal(compile(doc).objects.length, 1);
  updateObjectProperty(doc, key, 'interactEnabled', true);
  removePlacement(doc, key);
  assert.equal(compile(doc).interactions.length, 0);
});

test('legacy library upgrade preserves uploaded GIDs and decomposes counters once with correct depth', () => {
  const saved = structuredClone(catalog);
  saved.tiles = saved.tiles.filter((t) => t.id < 25);
  saved.textures = saved.textures.filter((t) => saved.tiles.some((tile) => tile.key === t.key));
  const custom = structuredClone(saved.tiles[0]);
  custom.id = 25;
  custom.gid = 26;
  custom.key = 'tile-26';
  custom.meta.assetKey = 'custom-user-table';
  custom.properties = custom.properties.map((p) =>
    p.name === 'assetKey' ? { ...p, value: custom.meta.assetKey } : p,
  );
  saved.tiles.push(custom);
  saved.textures.push({ ...saved.textures[0], key: custom.key });
  const doc = createBlankMap(42, 26, 0, 'Saved map');
  const key = addAsset(doc, saved, 'expo-booth-counter', 320, 320);
  const uploaded = addAsset(doc, saved, 'custom-user-table', 640, 320);
  const originalCustom = structuredClone(findNode(doc, uploaded));
  assert.equal(upgradeExpoCatalog(saved, catalog), true);
  splitExpoCounters(doc, saved);
  const world = compileDocument(doc, saved.tiles, saved.textures, { editor: true });
  assert.equal(findNode(doc, key).id, Number(key.split(':')[1]));
  assert.deepEqual(findNode(doc, uploaded), originalCustom);
  assert.equal(saved.tiles.find((t) => t.meta.assetKey === 'custom-user-table').gid, 26);
  assert.equal(new Set(saved.tiles.map((t) => t.gid)).size, saved.tiles.length);
  const table = world.objects.find((o) => o.asset === 'expo-cloth-table');
  for (const key of ['expo-computer', 'expo-documents'])
    assert(world.objects.find((o) => o.asset === key).depth > table.depth);
  const before = JSON.stringify(doc);
  upgradeExpoCatalog(saved, catalog);
  splitExpoCounters(doc, saved);
  assert.equal(JSON.stringify(doc), before);
  assert(saved.prefabs.every((p) => !p.parts.some((part) => part.key === 'expo-booth-counter')));
});

test('interaction frames remain editable on individual pieces inside movable booth groups', () => {
  const doc = createBlankMap(42, 26, 0, 'Booth');
  const key = addAsset(doc, catalog, 'booth-01', 320, 320);
  const before = compile(doc);
  const computer = before.objects.find((o) => o.asset === 'expo-computer');
  const table = before.objects.find((o) => o.asset === 'expo-cloth-table');
  assert(computer.depth > table.depth);
  const bounds = before.interactions.find((r) => r.id === computer.id);
  movePlacement(doc, key, 384, 352);
  const moved = compile(doc).interactions.find((r) => r.id === computer.id);
  assert.equal(moved.x, bounds.x + 64);
  assert.equal(moved.y, bounds.y + 32);
  updateObjectProperty(doc, `object:${computer.id}`, 'interactAction', 'registration');
  assert.equal(
    compile(doc).interactions.find((r) => r.id === computer.id).actionKey,
    'registration',
  );
});
