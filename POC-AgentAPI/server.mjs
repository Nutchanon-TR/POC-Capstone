import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { AppError, Store, DEFAULT_MODEL, FILENAMES, assertFreeModel, generate, createZip, validSite, validVersion } from './lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export async function readSettings(root = ROOT) {
  let content = '';
  try { content = await readFile(path.join(root, '.env'), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  const setting = (name, fallback) => process.env[name] || values[name] || fallback;
  const numeric = (name, fallback, low, high) => {
    const value = Number(setting(name, fallback));
    if (!Number.isInteger(value) || value < low || value > high) throw new AppError(`${name} ต้องอยู่ระหว่าง ${low} ถึง ${high}`);
    return value;
  };
  return {
    key: setting('OPENROUTER_API_KEY', ''), model: setting('OPENROUTER_MODEL', DEFAULT_MODEL),
    port: numeric('PORT', 3030, 1024, 65535), previewPort: numeric('PREVIEW_PORT', 3031, 1024, 65535),
    maxTokens: numeric('MAX_OUTPUT_TOKENS', 20000, 1000, 20000)
  };
}

export function makeApplication({ root = ROOT, store = new Store(path.join(root, 'data')), settings, fetchImpl = fetch }) {
  const origin = `http://127.0.0.1:${settings.port}`;
  const previewOrigin = `http://127.0.0.1:${settings.previewPort}`;
  const jobs = new Map(); let busy = false; let catalogueCache;
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  async function catalogue(force = false) {
    if (!force && catalogueCache && Date.now() - catalogueCache.at < 300000) return catalogueCache.models;
    let response;
    try { response = await fetchImpl('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(20000) }); }
    catch { throw new AppError('โหลดรายการโมเดลจาก OpenRouter ไม่สำเร็จ', 502); }
    if (!response.ok) throw new AppError('OpenRouter ไม่สามารถส่งรายการโมเดลได้', 502);
    const data = await response.json();
    if (!Array.isArray(data.data)) throw new AppError('รูปแบบรายการโมเดลจาก OpenRouter ไม่ถูกต้อง', 502);
    catalogueCache = { at: Date.now(), models: data.data };
    return data.data;
  }
  function reply(res, body, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
  function protect(req) {
    if (req.headers['x-poc-request'] !== '1' || (req.headers.origin && req.headers.origin !== origin)) throw new AppError('คำขอต้องมาจากหน้าจัดการ POC บนเครื่องนี้', 403);
  }
  async function readJson(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new AppError('ต้องส่ง JSON', 415);
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 20000) throw new AppError('คำขอมีขนาดใหญ่เกินไป', 413); chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError('JSON ไม่ถูกต้อง'); }
  }
  async function runJob(job, input) {
    busy = true;
    try {
      const live = await readSettings(root);
      if (!live.key) throw new AppError('ยังไม่มี API key ใส่ OPENROUTER_API_KEY ในไฟล์ .env แล้วบันทึก');
      job.stage = 'models';
      const models = await catalogue(true);
      const selected = assertFreeModel(models.find(item => item.id === input.model), input.model, live.maxTokens);
      const previous = input.siteId ? await store.version(input.siteId, input.baseVersion) : null;
      if (previous && (await store.site(input.siteId)).currentVersion !== input.baseVersion) throw new AppError('เวอร์ชันปัจจุบันเปลี่ยนแล้ว โหลดเว็บใหม่ก่อนแก้', 409);
      const result = await generate({ apiKey: live.key, model: input.model, prompt: input.prompt, previous, maxTokens: live.maxTokens, modelSpec: selected, fetchImpl, onStage: (stage, info) => { job.stage = stage; if (info?.validationError) job.repairReason = info.validationError; } });
      job.stage = 'saving';
      job.result = await store.save({ id: input.siteId, baseVersion: input.baseVersion, output: result.output, metadata: { ...result.metadata, verifiedPricing: selected.pricing } });
      job.status = 'done'; job.stage = 'done';
    } catch (error) {
      job.status = 'error'; job.stage = 'error';
      job.error = error instanceof AppError ? error.message : 'ระบบบันทึกหรือประมวลผลไม่สำเร็จ ตรวจ terminal แล้วลองใหม่';
      job.attempts = error.attempts || [];
      if (!(error instanceof AppError)) console.error('POC internal error:', error.code || error.name);
    } finally { job.finishedAt = Date.now(); busy = false; }
  }
  async function manager(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      if (req.headers.host !== new URL(origin).host) throw new AppError('เปิดผ่าน 127.0.0.1 เท่านั้น', 403);
      const url = new URL(req.url, origin); const route = url.pathname;
      if (req.method === 'GET' && route === '/api/config') {
        const live = await readSettings(root);
        return reply(res, { keyConfigured: !!live.key, defaultModel: live.model, previewOrigin, maxTokens: live.maxTokens, storage: path.join(root, 'data', 'sites') });
      }
      if (req.method === 'GET' && route === '/api/models') {
        const models = (await catalogue()).filter(m => { try { assertFreeModel(m, m.id, 1000); return !/content-safety/i.test(m.id); } catch { return false; } });
        return reply(res, models.map(m => ({ id: m.id, name: m.name, contextLength: m.context_length, maxCompletionTokens: m.top_provider?.max_completion_tokens || null })));
      }
      if (req.method === 'GET' && route === '/api/sites') return reply(res, await store.list());
      const versionMatch = route.match(/^\/api\/sites\/([^/]+)\/versions\/([^/]+)(\/download)?$/);
      if (req.method === 'GET' && versionMatch) {
        const snapshot = await store.version(versionMatch[1], versionMatch[2]);
        if (versionMatch[3]) { res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="website-${snapshot.version}.zip"`, 'Cache-Control': 'no-store' }); return res.end(createZip(snapshot.files)); }
        return reply(res, snapshot);
      }
      if (req.method === 'POST' && route === '/api/generate') {
        protect(req);
        const input = await readJson(req);
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('ต้องส่งคำขอเป็น JSON object');
        if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 6000) throw new AppError('กรอกคำสั่ง 1 ถึง 6,000 ตัวอักษร');
        if (typeof input.model !== 'string' || !input.model.endsWith(':free')) throw new AppError('รองรับโมเดล :free เท่านั้น');
        if (input.siteId && (!validSite(input.siteId) || !validVersion(input.baseVersion))) throw new AppError('เว็บไซต์หรือเวอร์ชันไม่ถูกต้อง');
        if (busy) throw new AppError('มีงานกำลังสร้างอยู่ กรุณารอให้งานนั้นเสร็จ', 409);
        input.prompt = input.prompt.trim();
        for (const [id, job] of jobs) if (job.finishedAt && Date.now() - job.finishedAt > 3600000) jobs.delete(id);
        const job = { id: randomUUID(), status: 'running', stage: 'starting', startedAt: Date.now() };
        jobs.set(job.id, job);
        // Calling synchronously reserves the single generation slot before any await.
        void runJob(job, input);
        return reply(res, { jobId: job.id }, 202);
      }
      const jobMatch = route.match(/^\/api\/jobs\/([0-9a-f-]+)$/);
      if (req.method === 'GET' && jobMatch) {
        const job = jobs.get(jobMatch[1]); if (!job) throw new AppError('ไม่พบงานนี้ หรือ server เริ่มใหม่แล้ว', 404);
        return reply(res, job);
      }
      const restoreMatch = route.match(/^\/api\/sites\/([^/]+)\/restore$/);
      if (req.method === 'POST' && restoreMatch) {
        protect(req); if (busy) throw new AppError('รอให้ AI ทำงานเสร็จก่อนย้อนเวอร์ชัน', 409);
        const input = await readJson(req); return reply(res, await store.restore(restoreMatch[1], input.version));
      }
      const staticFiles = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
      if (req.method === 'GET' && staticFiles[route]) {
        const filename = staticFiles[route];
        res.writeHead(200, { 'Content-Type': mime[path.extname(filename)], 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self'; frame-src ${previewOrigin}; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'` });
        return res.end(await readFile(path.join(root, 'public', filename)));
      }
      throw new AppError('ไม่พบหน้านี้', 404);
    } catch (error) { reply(res, { error: error instanceof AppError ? error.message : 'เกิดข้อผิดพลาดภายในระบบ' }, error.status || 500); }
  }
  async function preview(req, res) {
    try {
      if (req.headers.host !== new URL(previewOrigin).host) throw new AppError('เปิดผ่าน 127.0.0.1 เท่านั้น', 403);
      const url = new URL(req.url, previewOrigin);
      const match = url.pathname.match(/^\/sites\/([^/]+)\/([^/]+)\/(index\.html|styles\.css|script\.js)$/);
      if (req.method !== 'GET' || !match) throw new AppError('ไม่พบไฟล์', 404);
      const snapshot = await store.version(match[1], match[2]);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(match[3])], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src https: data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors ${origin}`
      });
      res.end(snapshot.files[match[3]]);
    } catch (error) { res.writeHead(error.status || 500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('ไม่พบไฟล์เว็บไซต์'); }
  }
  return { manager, preview, store };
}

export async function startServer(options = {}) {
  const settings = options.settings || await readSettings(options.root || ROOT);
  if (settings.port === settings.previewPort) throw new AppError('PORT และ PREVIEW_PORT ต้องต่างกัน');
  const app = makeApplication({ ...options, settings });
  const managerServer = http.createServer(app.manager); const previewServer = http.createServer(app.preview);
  const listen = (server, port) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  try { await listen(managerServer, settings.port); await listen(previewServer, settings.previewPort); }
  catch (e) { managerServer.close(); previewServer.close(); throw e; }
  console.log(`POC: http://127.0.0.1:${settings.port}`);
  console.log(`Preview: http://127.0.0.1:${settings.previewPort} (separate origin)`);
  console.log(`API key: ${settings.key ? 'configured' : 'not configured; edit .env, save and refresh'}`);
  return { ...app, managerServer, previewServer, close: () => Promise.all([managerServer, previewServer].map(s => new Promise(resolve => s.close(resolve)))) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(error => { console.error(`เริ่ม POC ไม่ได้: ${error.code || error.message}`); process.exitCode = 1; });
}
