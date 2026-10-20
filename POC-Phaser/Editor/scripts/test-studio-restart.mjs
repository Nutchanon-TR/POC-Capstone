import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { catalogFromTileset } from '../shared/map/bundle.ts';
import { createBlankMap } from '../shared/map/studio.ts';
import { addAsset } from '../shared/map/editor.ts';
import { assetDefinition } from '../shared/map/asset-definitions.ts';

const dataRoot = await mkdtemp(path.join(tmpdir(), 'map-studio-restart-'));
const port = 3006,
  namespace = 'restart-smoke';
const headers = { 'Content-Type': 'application/json', 'x-studio-test-workspace': namespace };
const endpoint = `http://127.0.0.1:${port}/api/studio/workspace`;
let server;
async function start() {
  let log = '';
  server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, MAP_STUDIO_TEST_MODE: '1', MAP_STUDIO_DATA_DIR: dataRoot },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  server.stdout.on('data', (chunk) => {
    log += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    log += chunk.toString();
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw Error(`Test server exited: ${log.slice(-1500)}`);
    try {
      if ((await fetch(endpoint, { headers })).ok) return;
    } catch {
      /* Wait for this child server to listen. */
    }
    await delay(100);
  }
  throw Error(`Test server did not start: ${log.slice(-1500)}`);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const process = server;
  const exited = new Promise((resolve) => process.once('exit', resolve));
  process.kill();
  await Promise.race([
    exited,
    delay(5000).then(() => {
      if (process.exitCode === null) process.kill('SIGKILL');
    }),
  ]);
  server = undefined;
}
async function post(value, status = 200) {
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(value) });
  assert.equal(response.status, status, await response.text());
}
try {
  await start();
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
  await post({ kind: 'assets', catalog });
  const document = createBlankMap(20, 16, 0, 'Restart verification', 32);
  const snapshot = {
    record: {
      id: 'restart-map',
      name: 'Restart verification',
      revision: 1,
      updatedAt: new Date().toISOString(),
      document,
    },
    catalog,
  };
  const summary = {
    id: snapshot.record.id,
    name: snapshot.record.name,
    revision: 1,
    updatedAt: snapshot.record.updatedAt,
    width: 20,
    height: 16,
    tileSize: 32,
  };
  await post({ kind: 'map', snapshot, summary, mode: { kind: 'seed' } });
  addAsset(document, catalog, 'bin-sort', 96, 128);
  snapshot.record.revision = summary.revision = 2;
  await post({ kind: 'map', snapshot, summary, mode: { kind: 'save', expectedRevision: 1 } });
  const booth = {
    key: 'restart-booth',
    label: 'Restart booth',
    sizing: 'explicit',
    width: 128,
    height: 128,
    parts: [{ key: 'bin-sort', x: 0, y: 0, w: 27, h: 28 }],
  };
  await post({ kind: 'booth', key: booth.key, value: booth, expectedRevision: 0 });
  const definition = {
    ...assetDefinition(
      catalog,
      catalog.tiles.find((tile) => tile.meta.assetKey === 'bin-sort'),
    ),
    label: 'Restart asset',
    width: 54,
    height: 56,
  };
  await post({ kind: 'asset', key: 'bin-sort', value: definition, expectedRevision: 0 });
  console.log(
    'Saved map revision 2, PNGs, Booth recipe and asset settings to the isolated disk workspace.',
  );
  await stop();
  await start();
  const state = await (await fetch(endpoint, { headers })).json();
  assert.equal(state.maps[0].record.revision, 2);
  assert.equal(
    state.maps[0].record.document.layers
      .flatMap((layer) => layer.objects ?? [])
      .find((object) => object.gid).x,
    96,
  );
  assert.equal(state.booths[booth.key].value.label, booth.label);
  assert.deepEqual(state.assetLibrary['bin-sort'].value, definition);
  assert.equal(
    state.catalog.tiles.find((tile) => tile.meta.assetKey === 'bin-sort').meta.label,
    'Restart asset',
  );
  await post({ kind: 'asset', key: 'bin-sort', value: definition, expectedRevision: 0 }, 409);
  assert(
    state.catalog.textures.every((texture) => texture.url.startsWith('data:image/png;base64,')),
  );
  await post({ kind: 'map', snapshot, summary, mode: { kind: 'save', expectedRevision: 1 } }, 409);
  const disk = JSON.parse(await readFile(path.join(dataRoot, `${namespace}.json`), 'utf8'));
  assert.equal(disk.maps[0].record.revision, 2);
  console.log(
    'PASS: real server restart restored the edited map, images, Booth and asset settings; stale writes remain blocked.',
  );
} finally {
  await stop();
}
