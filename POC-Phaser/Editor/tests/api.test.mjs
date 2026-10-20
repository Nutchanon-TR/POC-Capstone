import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.API_TEST_URL || 'http://127.0.0.1:3102';
test('PostgreSQL persistence, validation and competing revision updates', async () => {
  const original = await fetch(`${base}/maps/default`).then((r) => r.json());
  const put = (body) =>
    fetch(`${base}/maps/${original.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const invalid = structuredClone(original);
  invalid.document.width = 0;
  assert.equal((await put(invalid)).status, 400);
  const draft = structuredClone(original);
  draft.document.properties.find((p) => p.name === 'title').value = 'Integration verification';
  const responses = await Promise.all([put(draft), put(draft)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const saved = await responses.find((r) => r.ok).json();
  try {
    assert.equal(saved.revision, original.revision + 1);
    const world = await fetch(`${base}/maps/default/runtime`).then((r) => r.json());
    assert.equal(world.title, 'Integration verification');
    const loaded = await fetch(`${base}/maps/default`).then((r) => r.json());
    assert.deepEqual(loaded.document, draft.document);
  } finally {
    // Restore only our own revision; never overwrite somebody else's later save.
    assert.equal((await put({ ...original, revision: saved.revision })).status, 200);
  }
});
