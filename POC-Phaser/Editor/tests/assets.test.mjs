import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEnvFile } from 'node:process';
import sharp from 'sharp';
import { Pool } from 'pg';
loadEnvFile('server/.env.local');
const base = process.env.API_TEST_URL || 'http://127.0.0.1:3102';
test('custom PNG assets validate, persist, deduplicate and resolve through the runtime catalog', async () => {
  const png = await sharp({ create: { width: 64, height: 96, channels: 4, background: '#617a8c' } })
    .png()
    .toBuffer();
  const payload = {
    name: `Asset API test ${Date.now()}`,
    family: 'Prop',
    image: `data:image/png;base64,${png.toString('base64')}`,
    displayWidth: 32,
    depthY: 80,
    collision: { x: 4, y: 80, width: 56, height: 12 },
  };
  const post = (body) =>
    fetch(`${base}/assets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  assert.equal((await post({ ...payload, image: 'data:image/png;base64,YQ==' })).status, 400);
  assert.equal(
    (await post({ ...payload, collision: { x: 60, y: 0, width: 20, height: 12 } })).status,
    400,
  );
  assert.equal((await post({ ...payload, family: 'Floor' })).status, 400);
  let key;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const added = await post(payload);
    assert.equal(added.status, 201);
    key = (await added.json()).key;
    assert.equal((await (await post(payload)).json()).key, key);
    const catalog = await fetch(`${base}/catalog`).then((r) => r.json());
    const tile = catalog.tiles.find((t) => t.meta.assetKey === key);
    assert.equal(tile.imagewidth, 64);
    assert.equal(catalog.defaultSizes[key].height, 48);
    const response = await fetch(`${base}/assets/${key.slice(7)}/image`);
    assert.equal(response.headers.get('content-type'), 'image/png');
    const image = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.equal(image.height, 96);
  } finally {
    if (key)
      await pool.query('DELETE FROM editor_assets WHERE id=$1 AND name=$2', [
        Number(key.slice(7)),
        payload.name,
      ]);
    await pool.end();
  }
});
