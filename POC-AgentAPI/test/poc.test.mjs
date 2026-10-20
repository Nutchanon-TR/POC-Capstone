import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store, assertFreeModel, validateOutput, generate, createZip, DEFAULT_MODEL } from '../lib.mjs';
import { startServer, readSettings } from '../server.mjs';

const files = { 'index.html': '<!doctype html><html lang="th"><head><link rel="stylesheet" href="styles.css"><script src="script.js" defer></script></head><body><h1>ร้านทดสอบ</h1></body></html>', 'styles.css': 'body{color:green}', 'script.js': 'document.body.dataset.ready="yes";' };
const output = { title: 'ร้านทดสอบ', summary: 'ข้อมูลจำลองสำหรับ automated tests เท่านั้น', files };
const free = { id: DEFAULT_MODEL, pricing: { prompt: '0', completion: '0' } };
const completion = content => new Response(JSON.stringify({ id: 'test-request', model: DEFAULT_MODEL, choices: [{ message: { content }, finish_reason: 'stop' }], usage: { total_tokens: 100, cost: 0 } }), { headers: { 'Content-Type': 'application/json' } });

test('20,000 output budget loads from config and reaches the API request', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'thai-site-budget-')); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, '.env'), 'MAX_OUTPUT_TOKENS=20000\n');
  const settings = await readSettings(root); assert.equal(settings.maxTokens, 20000);
  let request;
  await generate({ apiKey: 'fake', model: DEFAULT_MODEL, prompt: 'x', maxTokens: settings.maxTokens, fetchImpl: async (_, init) => { request = JSON.parse(init.body); return completion(JSON.stringify(output)); } });
  assert.equal(request.max_tokens, 20000);
  assert.throws(() => assertFreeModel({ ...free, top_provider: { max_completion_tokens: 16000 } }, DEFAULT_MODEL, settings.maxTokens), /เกินขีดจำกัด/);
});

test('reject paid, unknown, and changed-price models before a request', () => {
  assert.equal(assertFreeModel(free, DEFAULT_MODEL, 1000), free);
  assert.throws(() => assertFreeModel(undefined, DEFAULT_MODEL, 1000));
  assert.throws(() => assertFreeModel({ ...free, pricing: { prompt: '0.0001', completion: '0' } }, DEFAULT_MODEL, 1000));
  assert.throws(() => assertFreeModel({ ...free, id: 'paid/model' }, 'paid/model', 1000));
  assert.throws(() => assertFreeModel({ ...free, pricing: { prompt: '0', completion: '0', request: '0.01' } }, DEFAULT_MODEL, 1000));
});

test('validate JSON, complete local files and syntax without executing generated JS', () => {
  assert.deepEqual(validateOutput('```json\n' + JSON.stringify(output) + '\n```'), output);
  assert.throws(() => validateOutput('{"files":'));
  assert.throws(() => validateOutput(JSON.stringify({ ...output, files: { ...files, '../extra.js': '' } })));
  assert.throws(() => validateOutput(JSON.stringify({ ...output, files: { ...files, 'script.js': 'function {' } })));
  assert.throws(() => validateOutput(JSON.stringify({ ...output, files: { ...files, 'index.html': files['index.html'].replace('<body>', '<body onload="alert(1)">') } })));
  globalThis.pocTestExecuted = false;
  validateOutput(JSON.stringify({ ...output, files: { ...files, 'script.js': 'globalThis.pocTestExecuted = true;' } }));
  assert.equal(globalThis.pocTestExecuted, false);
  delete globalThis.pocTestExecuted;
});

test('one repair at most, no paid model switching, report usage for both attempts', async () => {
  const calls = []; const replies = [completion('invalid'), completion(JSON.stringify(output))];
  const result = await generate({ apiKey: 'fake-test-key', model: DEFAULT_MODEL, prompt: 'สร้างเว็บทดสอบ', fetchImpl: async (_, init) => { calls.push(JSON.parse(init.body)); return replies.shift(); } });
  assert.equal(calls.length, 2); assert.equal(result.metadata.attempts.length, 2);
  assert.ok(calls.every(call => call.model === DEFAULT_MODEL && call.provider.max_price.prompt === 0 && call.provider.max_price.completion === 0));
  assert.equal(calls[1].messages.length, 4);
  let failedCalls = 0;
  await assert.rejects(() => generate({ apiKey: 'fake', model: DEFAULT_MODEL, prompt: 'x', fetchImpl: async () => { failedCalls++; return completion('invalid'); } }), /2 ครั้ง/);
  assert.equal(failedCalls, 2);
});

test('rate limit is shown and is not retried or changed to another model', async () => {
  let calls = 0;
  await assert.rejects(() => generate({ apiKey: 'fake', model: DEFAULT_MODEL, prompt: 'x', fetchImpl: async () => { calls++; return new Response(JSON.stringify({ error: { code: 429 } }), { status: 429 }); } }), /429/);
  assert.equal(calls, 1);
});

test('optional reasoning is disabled explicitly and exhaustion retains usage evidence', async () => {
  const requests = [];
  await generate({ apiKey: 'fake', model: DEFAULT_MODEL, modelSpec: { reasoning: { mandatory: false }, supported_parameters: ['response_format'] }, prompt: 'x', fetchImpl: async (_, init) => { requests.push(JSON.parse(init.body)); return completion(JSON.stringify(output)); } });
  assert.deepEqual(requests[0].reasoning, { effort: 'none' });
  assert.deepEqual(requests[0].response_format, { type: 'json_object' });
  let calls = 0;
  await assert.rejects(() => generate({ apiKey: 'fake', model: DEFAULT_MODEL, prompt: 'x', fetchImpl: async () => {
    calls++;
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '' } }], usage: { total_tokens: 10000, completion_tokens_details: { reasoning_tokens: 10000 } } }));
  } }), error => { assert.equal(error.attempts.length, 2); assert.equal(error.attempts[0].usage.total_tokens, 10000); return /token/.test(error.message); });
  assert.equal(calls, 2);
});

test('save, reload, edit, rollback and edit again preserve every old snapshot', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'thai-site-poc-')); t.after(() => rm(root, { recursive: true, force: true }));
  const store = new Store(root);
  const first = await store.save({ output, metadata: { prompt: 'first' } });
  const second = await store.save({ id: first.site.id, baseVersion: 'v001', output: { ...output, files: { ...files, 'styles.css': 'body{color:orange}' } }, metadata: { prompt: 'edit' } });
  assert.equal(second.site.currentVersion, 'v002');
  assert.equal((await new Store(root).version(first.site.id, 'v001')).files['styles.css'], 'body{color:green}');
  await store.restore(first.site.id, 'v001');
  const third = await store.save({ id: first.site.id, baseVersion: 'v001', output, metadata: { prompt: 'third' } });
  assert.equal(third.site.currentVersion, 'v003'); assert.equal((await store.list())[0].versions.length, 3);
  await assert.rejects(() => store.version('../escape', 'v001'));
  await assert.rejects(() => store.version(first.site.id, '../escape'));
  await assert.rejects(() => store.save({ id: first.site.id, baseVersion: 'v001', output, metadata: {} }), /เปลี่ยนไปแล้ว/);
});

test('ZIP contains UTF-8 contents and valid central directory', () => {
  const zip = createZip(files);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
  assert.equal(zip.readUInt16LE(zip.length - 14), 3);
  assert.ok(zip.includes(Buffer.from('ร้านทดสอบ')));
});

test('HTTP workflow, stored preview, ZIP, host/origin guards and key secrecy (stub API)', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'thai-site-http-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'public')); await writeFile(path.join(root, 'public', 'index.html'), '<!doctype html><html></html>');
  await writeFile(path.join(root, '.env'), 'OPENROUTER_API_KEY=fake-secret-not-for-browser\n');
  const app = await startServer({ root, settings: { port: 13030, previewPort: 13031, key: 'fake', model: DEFAULT_MODEL }, fetchImpl: async url => url.endsWith('/models') ? new Response(JSON.stringify({ data: [free] })) : completion(JSON.stringify(output)) });
  t.after(() => app.close());
  const base = 'http://127.0.0.1:13030';
  const configText = await (await fetch(base + '/api/config')).text(); assert.ok(!configText.includes('fake-secret')); assert.ok(JSON.parse(configText).keyConfigured);
  const forbidden = await fetch(base + '/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(forbidden.status, 403);
  const otherOrigin = await fetch(base + '/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-POC-Request': '1', Origin: 'http://evil.example' }, body: '{}' }); assert.equal(otherOrigin.status, 403);
  const response = await fetch(base + '/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-POC-Request': '1' }, body: JSON.stringify({ prompt: 'ทดสอบ', model: DEFAULT_MODEL }) });
  assert.equal(response.status, 202); const { jobId } = await response.json();
  let job;
  for (let count = 0; count < 100; count++) { job = await (await fetch(base + '/api/jobs/' + jobId)).json(); if (job.status !== 'running') break; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal(job.status, 'done');
  const { id, version } = job.result.version;
  const preview = await fetch(`http://127.0.0.1:13031/sites/${id}/${version}/index.html`); assert.equal(preview.status, 200); assert.ok(preview.headers.get('content-security-policy').includes("connect-src 'none'")); assert.equal(await preview.text(), files['index.html']);
  const zip = await fetch(`${base}/api/sites/${id}/versions/${version}/download`); assert.equal(zip.headers.get('content-type'), 'application/zip');
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:13031/sites/${id}/${version}/metadata.json`)).status, 404);
});
