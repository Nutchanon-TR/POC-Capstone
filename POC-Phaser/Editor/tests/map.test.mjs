import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { compileMap, mergeFloorTiles } from '../scripts/lib/compile-map.mjs';

const mapPath = path.resolve('maps/exhibition.tmj');
const publicRoot = path.resolve('public');
const world = await compileMap(mapPath, publicRoot);

test('every booth variant, prop and architecture design is placed', async () => {
  assert.equal(world.summary.booths, 24);
  assert.equal(world.summary.propDesigns, 12);
  const tiles = JSON.parse(await readFile('maps/tilesets/exhibition.tsj', 'utf8')).tiles;
  const used = new Set(world.summary.assets);
  for (const t of tiles)
    assert.ok(
      used.has(t.properties.find((p) => p.name === 'assetKey').value),
      `Unused tile ${t.image}`,
    );
});

test('source PNGs retain their recorded SHA256; all artwork is derived from those sources', async () => {
  const provenance = JSON.parse(await readFile('assets/provenance.json', 'utf8'));
  for (const [file, expected] of Object.entries(provenance.hashes))
    assert.equal(
      createHash('sha256')
        .update(await readFile(`asset/${file}`))
        .digest('hex'),
      expected,
      file,
    );
  assert.ok(provenance.pieces.length > 350);
  for (const p of provenance.pieces)
    assert.ok(provenance.hashes[path.basename(p.source)], `Unknown source ${p.source}`);
});

test('floor compaction preserves painted areas, including holes and changed row widths', () => {
  const data = [1, 1, 0, 2, 1, 1, 2, 2, 1, 0, 2, 2];
  const result = mergeFloorTiles({ data, width: 4, height: 3 }, 32, 32, 10, 20);
  const reconstructed = new Array(12).fill(0);
  for (const r of result)
    for (let y = (r.y - 20) / 32; y < (r.y - 20 + r.height) / 32; y++)
      for (let x = (r.x - 10) / 32; x < (r.x - 10 + r.width) / 32; x++)
        reconstructed[y * 4 + x] = r.gid;
  assert.deepEqual(reconstructed, data);
  assert.ok(result.length < data.filter(Boolean).length);
});

test('Tiled group offsets move the images, depth anchor and collisions together', async () => {
  const source = JSON.parse(await readFile(mapPath, 'utf8'));
  const group = source.layers.find((layer) => layer.type === 'group');
  const ids = group.layers[0].objects.map((o) => o.id);
  group.offsetx += 57;
  group.offsety += 33;
  const file = path.resolve('maps/.roundtrip-test.tmj');
  try {
    await writeFile(file, JSON.stringify(source));
    const edited = await compileMap(file, publicRoot);
    for (const id of ids) {
      const a = world.objects.find((o) => o.id === id),
        b = edited.objects.find((o) => o.id === id);
      assert.equal(b.x, a.x + 57);
      assert.equal(b.y, a.y + 33);
      assert.equal(b.depth, a.depth + 33);
    }
    for (const a of world.colliders.filter((c) => ids.includes(Number(c.id.split(':')[0])))) {
      const b = edited.colliders.find((c) => c.id === a.id);
      assert.equal(b.x, a.x + 57);
      assert.equal(b.y, a.y + 33);
    }
    source.layers
      .find((l) => l.name === 'Spawn and zones')
      .objects.find((o) => o.type === 'Spawn').x = -10;
    await writeFile(file, JSON.stringify(source));
    await assert.rejects(compileMap(file, publicRoot), /spawn must be inside/);
  } finally {
    await unlink(file);
  }
});

test('all original XML tilesets resolve their image relative to their own file', async () => {
  for (const name of ['Layout', 'Prop', 'Booth1', 'Booth2', 'Booth3']) {
    const xml = await readFile(`asset/${name}.tsx`, 'utf8');
    const image = xml.match(/<image source="([^"]+)"/)[1];
    assert.ok((await readFile(path.resolve('asset', image))).length > 0);
  }
});
