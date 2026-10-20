import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readStudio, studioFile, updateStudio, StudioConflict } from '../src/server/studioStore.ts';
import { applyBooths, validateBooth } from '../shared/map/workspace.ts';
import { catalogFromTileset, buildBundle, importBundle } from '../shared/map/bundle.ts';
import { addAsset, findNode } from '../shared/map/editor.ts';
import { createBlankMap } from '../shared/map/studio.ts';
import { placementShape } from '../shared/map/grid.ts';
import { compileDocument } from '../shared/map/compile.mjs';
import {
  editableBooth,
  orderBoothParts,
  reorderBoothPart,
  boothFloorBrush,
  boothFloorCells,
  paintBoothFloor,
  boothTileUnit,
  fitBoothFrame,
} from '../shared/map/booth.ts';
import { boothInstance, replaceBoothInstance } from '../shared/map/booth-instance.ts';
import { assetDefinition, applyAssetDefinitions } from '../shared/map/asset-definitions.ts';

const directory = await mkdtemp(path.join(tmpdir(), 'studio-store-unit-'));
process.env.MAP_STUDIO_DATA_DIR = directory;
const set = JSON.parse(await readFile('public/starter/expo.tsj', 'utf8'));
const pngs = new Map(
  await Promise.all(
    set.tiles.map(async (tile) => [tile.image, await readFile(`public/starter/${tile.image}`)]),
  ),
);
const catalog = catalogFromTileset(
  set,
  (image) => 'data:image/png;base64,' + pngs.get(image).toString('base64'),
);
catalog.prefabs = JSON.parse(await readFile('public/starter/prefabs.json', 'utf8'));
function snapshot() {
  return {
    record: {
      id: 'saved',
      name: 'Persistent',
      revision: 1,
      updatedAt: new Date().toISOString(),
      document: createBlankMap(30, 20, 0, 'Persistent', 32),
    },
    catalog: structuredClone(catalog),
  };
}
function operation(value, mode) {
  return {
    kind: 'map',
    snapshot: value,
    summary: {
      id: value.record.id,
      name: value.record.name,
      revision: value.record.revision,
      updatedAt: value.record.updatedAt,
      width: 30,
      height: 20,
      tileSize: 32,
    },
    mode,
  };
}

test('disk saves survive a new Node process and reject competing stale revisions atomically', async () => {
  const value = snapshot();
  await updateStudio(operation(value, { kind: 'seed' }), 'restart');
  value.record.revision = 2;
  addAsset(value.record.document, value.catalog, 'bin-sort', 96, 128);
  const results = await Promise.allSettled([
    updateStudio(operation(value, { kind: 'save', expectedRevision: 1 }), 'restart'),
    updateStudio(operation(value, { kind: 'save', expectedRevision: 1 }), 'restart'),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert(results.find((result) => result.status === 'rejected').reason instanceof StudioConflict);
  const output = await promisify(execFile)(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      "import store from './src/server/studioStore.ts';const s=await store.readStudio('restart');console.log(JSON.stringify({revision:s.maps[0].record.revision,x:s.maps[0].record.document.layers.flatMap(l=>l.objects??[]).find(o=>o.gid).x}));",
    ],
    { env: { ...process.env, MAP_STUDIO_DATA_DIR: directory } },
  );
  assert.deepEqual(JSON.parse(output.stdout), { revision: 2, x: 96 });
  assert(!(await readdir(directory)).some((file) => file.endsWith('.tmp')));
  assert.equal((await readStudio('restart')).activeMapId, 'saved');
});

test('booth edits and tombstones persist and cannot be revived by older map catalogs', async () => {
  await updateStudio({ kind: 'assets', catalog }, 'booths');
  const booth = { ...structuredClone(catalog.prefabs[0]), label: 'New booth', sizing: 'explicit' };
  await updateStudio(
    { kind: 'booth', key: booth.key, value: booth, expectedRevision: 0 },
    'booths',
  );
  await assert.rejects(
    updateStudio({ kind: 'booth', key: booth.key, value: booth, expectedRevision: 0 }, 'booths'),
    StudioConflict,
  );
  let result = await updateStudio({ kind: 'assets', catalog }, 'booths');
  assert.equal(
    result.catalog.prefabs.find((prefab) => prefab.key === booth.key).label,
    'New booth',
  );
  await updateStudio({ kind: 'booth', key: booth.key, value: null, expectedRevision: 1 }, 'booths');
  result = await updateStudio({ kind: 'assets', catalog }, 'booths');
  assert(!result.catalog.prefabs.some((prefab) => prefab.key === booth.key));
  assert(
    !applyBooths(catalog, (await readStudio('booths')).booths).prefabs.some(
      (prefab) => prefab.key === booth.key,
    ),
  );
});

test('explicit booth parts use the popup sizes once, match the ghost and retain labels in ZIP', async () => {
  const copy = structuredClone(catalog);
  copy.defaultSizes = { 'bin-sort': { width: 54, height: 56 } };
  const booth = {
    key: 'booth-custom-explicit',
    label: 'My booth',
    sizing: 'explicit',
    width: 128,
    height: 96,
    parts: [{ key: 'bin-sort', x: 16, y: 8, w: 54, h: 56 }],
  };
  validateBooth(booth, copy);
  copy.prefabs.push(booth);
  const map = createBlankMap(30, 20, 0, 'Booth test', 32);
  addAsset(map, copy, booth.key, 64, 64);
  const object = compileDocument(map, copy.tiles, copy.textures).objects[0];
  assert.deepEqual(
    { x: object.x, y: object.y, width: object.width, height: object.height },
    { x: 80, y: 72, width: 54, height: 56 },
  );
  const ghost = placementShape(copy, booth.key);
  assert.equal(ghost.width, 128);
  assert.equal(ghost.parts[0].width, 54);
  const imported = importBundle(await buildBundle(map, copy));
  assert.deepEqual(
    imported.catalog.prefabs.find((prefab) => prefab.key === booth.key),
    booth,
  );
});

test('invalid geometry and escaping namespaces leave existing disk records untouched', async () => {
  const value = snapshot();
  await updateStudio(operation(value, { kind: 'seed' }), 'invalid');
  const before = await readFile(studioFile('invalid'), 'utf8');
  value.record.revision = 2;
  value.record.document.layers.push({
    id: 50,
    name: 'Broken',
    type: 'objectgroup',
    objects: [{ id: 99, name: 'Missing', gid: 2000, x: 0, y: 0, width: 32, height: 32 }],
  });
  await assert.rejects(
    updateStudio(operation(value, { kind: 'save', expectedRevision: 1 }), 'invalid'),
  );
  assert.equal(await readFile(studioFile('invalid'), 'utf8'), before);
  assert.throws(() => studioFile('../escape'));
  assert.throws(() =>
    validateBooth(
      {
        key: 'bad',
        width: 32,
        height: 32,
        parts: [{ key: 'bin-sort', x: 30, y: 0, w: 32, h: 32 }],
      },
      catalog,
    ),
  );
});

test('booth stack survives placement, movement, resizing and ZIP with four ordering actions', async () => {
  const part = (key, x, y, w = 32, h = 32) => ({ key, x, y, w, h });
  let booth = orderBoothParts(
    {
      key: 'stack-booth',
      sizing: 'explicit',
      width: 192,
      height: 192,
      parts: [
        part('bin-sort', 0, 128),
        part('expo-computer', 0, 0),
        part('floor-wood-center', 0, 0),
        part('expo-documents', 0, 64),
      ],
    },
    catalog,
  );
  assert.deepEqual(
    booth.parts.map((p) => p.key),
    ['floor-wood-center', 'bin-sort', 'expo-computer', 'expo-documents'],
  );
  let reordered = reorderBoothPart(booth, catalog, 1, 'front');
  assert.equal(reordered.selected, 3);
  assert.equal(reordered.prefab.parts[3].key, 'bin-sort');
  reordered = reorderBoothPart(reordered.prefab, catalog, 3, 'backward');
  assert.equal(reordered.selected, 2);
  reordered = reorderBoothPart(reordered.prefab, catalog, 2, 'forward');
  assert.equal(reordered.selected, 3);
  reordered = reorderBoothPart(reordered.prefab, catalog, 3, 'back');
  assert.equal(reordered.selected, 1);
  assert.equal(reordered.prefab.parts[0].key, 'floor-wood-center');
  booth.parts[1] = { ...booth.parts[1], x: 80, y: 8, w: 64, h: 48 };
  booth = orderBoothParts(booth, catalog);
  const copy = structuredClone(catalog);
  copy.prefabs.push(booth);
  const map = createBlankMap(30, 20, 0, 'Booth stack', 32);
  addAsset(map, copy, booth.key, 64, 128);
  const world = compileDocument(map, copy.tiles, copy.textures);
  const ordered = world.objects.filter((o) => !o.ground).sort((a, b) => a.depth - b.depth);
  assert.deepEqual(
    ordered.map((o) => o.asset),
    ['bin-sort', 'expo-computer', 'expo-documents'],
  );
  assert.deepEqual(
    { x: ordered[0].x, y: ordered[0].y, w: ordered[0].width, h: ordered[0].height },
    { x: 144, y: 136, w: 64, h: 48 },
  );
  const imported = importBundle(await buildBundle(map, copy));
  assert.deepEqual(
    editableBooth(
      imported.catalog.prefabs.find((p) => p.key === booth.key),
      imported.catalog,
    ).parts.map((p) => p.key),
    booth.parts.map((p) => p.key),
  );
  assert.deepEqual(
    compileDocument(imported.document, imported.catalog.tiles, imported.catalog.textures).objects,
    world.objects,
  );
});

test('Booth floor brush fills 5 by 3 native tiles, clips, replaces cells and leaves other assets intact', () => {
  const brush = boothFloorBrush(catalog, 'floor-wood-center', 8);
  assert(brush);
  const bounds = { width: 192, height: 192 };
  const cells = boothFloorCells(brush, { x: 1, y: 1 }, { x: 129, y: 65 }, bounds);
  assert.equal(cells.length, 15);
  assert.equal(boothFloorCells(brush, { x: 129, y: 65 }, { x: 1, y: 1 }, bounds).length, 15);
  assert.equal(boothFloorCells(brush, { x: 1, y: 1 }, { x: 33, y: 33 }, bounds).length, 4);
  const source = {
    key: 'painted',
    sizing: 'explicit',
    ...bounds,
    parts: [{ key: 'bin-sort', x: 0, y: 0, w: 27, h: 28 }],
  };
  const painted = paintBoothFloor(source, catalog, brush, cells);
  assert.equal(painted.parts.length, 16);
  const replacement = boothFloorBrush(catalog, 'floor-mint-center', 0);
  const repainted = paintBoothFloor(painted, catalog, replacement, cells);
  assert.equal(repainted.parts.length, 16);
  assert.equal(repainted.parts.filter((p) => p.key === 'floor-mint-center').length, 15);
  assert.deepEqual(
    repainted.parts.find((p) => p.key === 'bin-sort'),
    painted.parts.find((p) => p.key === 'bin-sort'),
  );
  assert.equal(source.parts.length, 1);
  assert.equal(
    boothFloorCells(brush, { x: 1, y: 1 }, { x: 8192, y: 8192 }, { width: 8192, height: 8192 })
      .length,
    0,
  );
  assert.equal(
    boothFloorCells(brush, { x: 170, y: 170 }, { x: 190, y: 190 }, { width: 190, height: 190 })
      .length,
    0,
  );
  const small = structuredClone(catalog);
  const tile = small.tiles.find((t) => t.meta.assetKey === 'floor-wood-center');
  tile.imagewidth = 16;
  tile.imageheight = 16;
  const largeBrush = boothFloorBrush(small, 'floor-wood-center', 32);
  assert.equal(boothFloorCells(largeBrush, { x: 1, y: 1 }, { x: 1, y: 1 }, bounds).length, 4);
});

test('shared asset edits and deletion markers persist, reject stale writes and apply over old map catalogs', async () => {
  await updateStudio({ kind: 'assets', catalog }, 'asset-definitions');
  const tile = catalog.tiles.find((tile) => tile.meta.assetKey === 'bin-sort');
  const value = {
    ...assetDefinition(catalog, tile),
    label: 'Shared bin',
    width: 54,
    height: 56,
    colliders: [{ id: 1, bounds: { x: 0.1, y: 0.2, width: 0.5, height: 0.5 } }],
    interaction: {
      kind: 'inspect',
      actionKey: 'open-bin',
      bounds: { x: 0, y: 0, width: 1, height: 1 },
    },
  };
  await updateStudio(
    { kind: 'asset', key: 'bin-sort', value, expectedRevision: 0 },
    'asset-definitions',
  );
  await assert.rejects(
    updateStudio(
      { kind: 'asset', key: 'bin-sort', value, expectedRevision: 0 },
      'asset-definitions',
    ),
    StudioConflict,
  );
  let state = await readStudio('asset-definitions');
  assert.deepEqual(state.assetLibrary['bin-sort'].value, value);
  const applied = applyAssetDefinitions(catalog, state.assetLibrary);
  const changed = applied.tiles.find((t) => t.meta.assetKey === 'bin-sort');
  assert.equal(changed.gid, tile.gid);
  assert.equal(changed.meta.label, 'Shared bin');
  assert.equal(changed.objectgroup.objects[0].width, tile.imagewidth * 0.5);
  assert.deepEqual(applied.defaultSizes['bin-sort'], { width: 54, height: 56 });
  assert.equal(changed.properties.find((p) => p.name === 'interactAction').value, 'open-bin');
  const map = createBlankMap(30, 20, 0, 'Asset definitions', 32);
  addAsset(map, catalog, 'bin-sort', 64, 64);
  const originalObjects = compileDocument(map, catalog.tiles, catalog.textures).objects;
  await updateStudio(
    { kind: 'asset', key: 'bin-sort', value: null, expectedRevision: 1 },
    'asset-definitions',
  );
  const merged = await updateStudio({ kind: 'assets', catalog }, 'asset-definitions');
  assert.equal(
    merged.catalog.tiles.find((t) => t.meta.assetKey === 'bin-sort').meta.editorHidden,
    true,
  );
  state = await readStudio('asset-definitions');
  assert.equal(state.assetLibrary['bin-sort'].revision, 2);
  assert.equal(state.assetLibrary['bin-sort'].value, null);
  assert.equal(state.assetLibrary['bin-sort'].previous.label, 'Shared bin');
  const hidden = applyAssetDefinitions(catalog, state.assetLibrary);
  assert.deepEqual(compileDocument(map, hidden.tiles, hidden.textures).objects, originalObjects);
  assert.equal(
    compileDocument(map, hidden.tiles, hidden.textures).interactions[0].actionKey,
    'open-bin',
  );
  const before = await readFile(studioFile('asset-definitions'), 'utf8');
  await assert.rejects(
    updateStudio(
      {
        kind: 'asset',
        key: 'bin-sort',
        value: { ...value, colliders: [{ id: 1, bounds: { x: 1, y: 0, width: 1, height: 1 } }] },
        expectedRevision: 2,
      },
      'asset-definitions',
    ),
  );
  assert.equal(await readFile(studioFile('asset-definitions'), 'utf8'), before);
});

test('editing one booth retains child IDs, custom actions and logical objects, leaving other booths and recipes unchanged', async () => {
  const copy = structuredClone(catalog);
  const prefab = {
    key: 'instance-template',
    label: 'Template',
    sizing: 'explicit',
    width: 192,
    height: 192,
    parts: [
      { key: 'bin-sort', x: 0, y: 64, w: 27, h: 28 },
      { key: 'expo-computer', x: 32, y: 32, w: 32, h: 36 },
    ],
  };
  copy.prefabs.push(prefab);
  const beforeCatalog = JSON.stringify(copy);
  const map = createBlankMap(40, 26, 0, 'Local booths', 32);
  const first = addAsset(map, copy, prefab.key, 64, 64);
  const second = addAsset(map, copy, prefab.key, 384, 64);
  const group = findNode(map, first);
  const computer = group.layers[0].objects[1];
  group.layers[0].offsetx = 8;
  group.layers[0].offsety = 16;
  group.layers[0].opacity = 0.5;
  computer.properties = [
    { name: 'interactAction', type: 'string', value: 'local-action' },
    { name: 'collisionEnabled', type: 'bool', value: false },
  ];
  const npc = {
    id: map.nextobjectid++,
    name: 'Attendant',
    type: 'Npc',
    x: 96,
    y: 128,
    width: 16,
    height: 16,
    properties: [{ name: 'dialogue', type: 'string', value: 'Keep me' }],
  };
  group.layers[0].objects.push(npc);
  const other = structuredClone(findNode(map, second));
  const originalComputerId = computer.id;
  const extracted = boothInstance(map, copy, first);
  const edited = editableBooth(extracted.prefab, copy);
  edited.label = 'Only this booth';
  edited.parts = edited.parts.filter((part) => part.key !== 'bin-sort');
  edited.parts[0] = { ...edited.parts[0], x: 64, w: 64 };
  edited.parts.push({ key: 'bin-sort', x: 0, y: 96, w: 27, h: 28 });
  replaceBoothInstance(map, copy, first, orderBoothParts(edited, copy));
  assert.equal(findNode(map, first).name, 'Only this booth');
  assert.deepEqual(findNode(map, second), other);
  assert.deepEqual(findNode(map, `object:${npc.id}`), npc);
  const preserved = findNode(map, `object:${originalComputerId}`);
  assert.equal(preserved.x, 56);
  assert.equal(findNode(map, first).layers[0].opacity, 0.5);
  assert.equal(
    findNode(map, first).layers[0].objects.some((node) => node.id === originalComputerId),
    true,
  );
  assert.equal(preserved.width, 64);
  assert.equal(preserved.properties.find((p) => p.name === 'interactAction').value, 'local-action');
  assert.equal(preserved.properties.find((p) => p.name === 'collisionEnabled').value, false);
  assert.equal(JSON.stringify(copy), beforeCatalog);
  const imported = importBundle(await buildBundle(map, copy));
  assert.deepEqual(imported.document.layers, map.layers);
  assert.deepEqual(
    compileDocument(imported.document, imported.catalog.tiles, imported.catalog.textures, {
      editor: true,
    }).objects,
    compileDocument(map, copy.tiles, copy.textures, { editor: true }).objects,
  );
  assert.equal(boothInstance(map, copy, first).prefab.width, 192);
});

test('booth frame uses whole native floor cells, including mixed tile sizes and existing part extents', () => {
  const empty = { key: 'frame', width: 130, height: 129, parts: [] };
  assert.deepEqual(boothTileUnit(empty, catalog), { width: 32, height: 32 });
  assert.deepEqual(fitBoothFrame(empty, catalog), { ...empty, width: 160, height: 160 });
  const four = fitBoothFrame({ ...empty, width: 4 * 32, height: 4 * 32 }, catalog);
  assert.equal(
    boothFloorCells(
      boothFloorBrush(catalog, 'floor-wood-center', 8),
      { x: 0, y: 0 },
      { x: 127, y: 127 },
      four,
    ).length,
    16,
  );
  const small = structuredClone(catalog);
  const tile = small.tiles.find((t) => t.meta.assetKey === 'floor-wood-center');
  tile.imagewidth = 16;
  tile.imageheight = 16;
  const mixed = { ...empty, parts: [{ key: 'floor-mint-center', x: 0, y: 0, w: 32, h: 32 }] };
  assert.deepEqual(boothTileUnit(mixed, small, 'floor-wood-center'), { width: 32, height: 32 });
  assert.equal(
    fitBoothFrame({ ...empty, parts: [{ key: 'bin-sort', x: 140, y: 0, w: 27, h: 28 }] }, catalog)
      .width,
    192,
  );
});
