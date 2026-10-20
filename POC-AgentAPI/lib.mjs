import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';

export const FILENAMES = ['index.html', 'styles.css', 'script.js'];
export const DEFAULT_MODEL = 'inclusionai/ling-3.0-flash-sante:free';
export const SYSTEM_PROMPT = `You build small business websites for Thai users.
Return ONLY one valid JSON object, without markdown:
{"title":"short Thai title","summary":"brief Thai description of changes and limitations","files":{"index.html":"complete HTML","styles.css":"complete CSS","script.js":"complete JavaScript"}}.
Exactly these three files. Use semantic HTML with lang="th", UTF-8, viewport meta, <link rel="stylesheet" href="styles.css"> and <script src="script.js" defer></script>.
Create a polished responsive site, readable Thai text, accessible labels, keyboard controls, and working client-side interactions when requested. Use system fonts. No external libraries, CDN scripts, external stylesheets, imports, fetch, iframes or inline event handlers. HTTPS image URLs are allowed, but prefer CSS illustrations if no photos were supplied.
Never claim that a contact or booking form sends data or reserves anything on a server. A demo form may validate and show an explicitly local demo confirmation. No real payments or authentication. Clearly explain unavailable backend features in summary.
For edits, preserve the existing site and change only what the user requested, but return all three complete files. Aim for 2500-4500 visible output tokens across all files; avoid large decorative assets and verbose code. Do not return truncated files or ellipses.`;

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function assertFreeModel(model, id, maxTokens) {
  if (!id?.endsWith(':free') || !model || model.id !== id) throw new AppError('เลือกโมเดล :free ที่มีอยู่ในรายการปัจจุบันเท่านั้น');
  const prices = model.pricing;
  if (!prices || !['prompt', 'completion'].every(k => prices[k] != null && Number(prices[k]) === 0) || (prices.request != null && Number(prices.request) !== 0)) {
    throw new AppError('ราคาโมเดลนี้ไม่เป็นศูนย์ ระบบจึงไม่ส่งคำขอ');
  }
  if (model.top_provider?.max_completion_tokens && maxTokens > model.top_provider.max_completion_tokens) {
    throw new AppError('MAX_OUTPUT_TOKENS เกินขีดจำกัดของโมเดลที่เลือก');
  }
  return model;
}

export function validateOutput(content) {
  if (typeof content !== 'string' || !content.trim()) throw new AppError('AI ไม่ส่งข้อความโค้ดกลับมา');
  let clean = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let result;
  try { result = JSON.parse(clean); } catch { throw new AppError('JSON จาก AI ไม่สมบูรณ์หรือถูกตัดกลางทาง'); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new AppError('รูปแบบคำตอบต้องเป็น JSON object');
  const files = result.files;
  if (!files || Object.keys(files).length !== 3 || !FILENAMES.every(name => typeof files[name] === 'string')) {
    throw new AppError('AI ต้องส่งไฟล์ index.html, styles.css และ script.js ให้ครบ');
  }
  if (FILENAMES.some(name => Buffer.byteLength(files[name]) > 500_000)) throw new AppError('ไฟล์ที่ AI ส่งมามีขนาดเกินขอบเขต POC');
  const html = files['index.html'];
  if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html) || !/<\/html>/i.test(html)) throw new AppError('HTML ยังไม่ใช่เอกสารครบหน้า');
  if (!/<link\b[^>]*href=["'](?:\.\/)?styles\.css["']/i.test(html) || !/<script\b[^>]*src=["'](?:\.\/)?script\.js["']/i.test(html)) {
    throw new AppError('HTML ต้องเชื่อม styles.css และ script.js');
  }
  if (/<(?:iframe|object|embed|base)\b/i.test(html) || /\son\w+\s*=/i.test(html)) throw new AppError('HTML มี iframe หรือ inline event handler ที่ POC ไม่รองรับ');
  const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if (scriptTags.some(m => !/^\s*src=["'](?:\.\/)?script\.js["'](?:\s+defer)?\s*$/i.test(m[1]) && !/^\s*defer\s+src=["'](?:\.\/)?script\.js["']\s*$/i.test(m[1]))) {
    throw new AppError('JavaScript ต้องอยู่ใน script.js เท่านั้น');
  }
  try { new vm.Script(files['script.js']); } catch (e) { throw new AppError(`JavaScript syntax ผิด: ${e.message}`); }
  return { title: String(result.title || 'เว็บร้านของคุณ').slice(0, 120), summary: String(result.summary || '').slice(0, 3000), files };
}

export function validSite(id) { return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id); }
export function validVersion(version) { return typeof version === 'string' && /^v\d{3,6}$/.test(version); }
function checkedPath(root, id, version) {
  if (!validSite(id) || (version !== undefined && !validVersion(version))) throw new AppError('ไม่พบเว็บไซต์หรือเวอร์ชัน', 404);
  return path.join(root, 'sites', id, ...(version ? ['versions', version] : []));
}
async function atomicJson(file, object) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(object, null, 2), 'utf8');
  await rename(temp, file);
}
async function jsonFile(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') throw new AppError('ไม่พบข้อมูลนี้', 404); throw e; }
}

export class Store {
  constructor(root) { this.root = root; }
  async list() {
    await mkdir(path.join(this.root, 'sites'), { recursive: true });
    const entries = await readdir(path.join(this.root, 'sites'));
    const results = await Promise.all(entries.filter(validSite).map(id => this.site(id)));
    return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async site(id) { return jsonFile(path.join(checkedPath(this.root, id), 'site.json')); }
  async version(id, version) {
    const directory = checkedPath(this.root, id, version);
    const metadata = await jsonFile(path.join(directory, 'metadata.json'));
    const files = Object.fromEntries(await Promise.all(FILENAMES.map(async name => [name, await readFile(path.join(directory, name), 'utf8')])));
    return { ...metadata, files };
  }
  async save({ id, baseVersion, output, metadata }) {
    const siteId = id || randomUUID();
    const current = id ? await this.site(id) : { id: siteId, versions: [] };
    if (id && current.currentVersion !== baseVersion) throw new AppError('เวอร์ชันปัจจุบันเปลี่ยนไปแล้ว กรุณาโหลดเว็บใหม่ก่อนแก้', 409);
    const version = `v${String(current.versions.length + 1).padStart(3, '0')}`;
    const directory = checkedPath(this.root, siteId, version);
    await mkdir(directory, { recursive: true });
    await Promise.all(FILENAMES.map(name => writeFile(path.join(directory, name), output.files[name], 'utf8')));
    const createdAt = new Date().toISOString();
    const record = { ...metadata, id: siteId, version, baseVersion: baseVersion || null, title: output.title, summary: output.summary, createdAt };
    await atomicJson(path.join(directory, 'metadata.json'), record);
    const site = { ...current, title: output.title, currentVersion: version, updatedAt: createdAt, versions: [...current.versions, { version, title: output.title, createdAt }] };
    await atomicJson(path.join(checkedPath(this.root, siteId), 'site.json'), site);
    return { site, version: { ...record, files: output.files } };
  }
  async restore(id, version) {
    const snapshot = await this.version(id, version);
    const site = await this.site(id);
    if (!site.versions.some(item => item.version === version)) throw new AppError('ไม่พบเวอร์ชันนี้', 404);
    const updated = { ...site, currentVersion: version, title: snapshot.title, updatedAt: new Date().toISOString() };
    await atomicJson(path.join(checkedPath(this.root, id), 'site.json'), updated);
    return updated;
  }
}

export async function generate({ apiKey, model, prompt, previous, maxTokens = 20000, modelSpec, fetchImpl = fetch, onStage = () => {} }) {
  const start = Date.now();
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ request: prompt, existingFiles: previous?.files || null }) }];
  const attempts = [];
  let validationError;
  const requestOptions = {};
  // Disable optional thinking for a small site, leaving more output budget for code.
  if (modelSpec?.reasoning?.mandatory === false) requestOptions.reasoning = { effort: 'none' };
  if (modelSpec?.supported_parameters?.includes('response_format')) requestOptions.response_format = { type: 'json_object' };
  for (let attempt = 1; attempt <= 2; attempt++) {
    onStage(attempt === 1 ? 'requesting' : 'repairing', { attempt, validationError });
    let response;
    try {
      response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'Thai website local POC' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3, stream: false, ...requestOptions, provider: { max_price: { prompt: 0, completion: 0 } } }),
        signal: AbortSignal.timeout(180000)
      });
    } catch (e) { throw new AppError(e.name === 'TimeoutError' ? 'OpenRouter ใช้เวลาเกิน 180 วินาที ลองใหม่หรือเลือกโมเดลฟรีตัวอื่น' : 'เชื่อมต่อ OpenRouter ไม่สำเร็จ', 502); }
    let body;
    try { body = await response.json(); } catch (e) {
      const error = new AppError(e.name === 'TimeoutError' || e.name === 'AbortError' ? 'OpenRouter ใช้เวลาเกิน 180 วินาทีระหว่างส่งคำตอบ ลองเลือกโมเดลฟรีตัวอื่น' : `OpenRouter ส่งคำตอบที่อ่านไม่ได้ (HTTP ${response.status})`, 502);
      error.attempts = attempts; throw error;
    }
    if (!response.ok || body.error) {
      const code = body.error?.code || response.status;
      const descriptions = { 401: 'API key ไม่ถูกต้องหรือถูกยกเลิก', 402: 'บัญชีหรือผู้ให้บริการไม่อนุญาตคำขอนี้ ตรวจเครดิตและเงื่อนไขใน OpenRouter', 429: 'ถึงโควตาหรือ rate limit ของโมเดลฟรี กรุณารอแล้วลองใหม่', 503: 'โมเดลฟรีไม่พร้อมให้บริการตอนนี้ เลือกโมเดลฟรีตัวอื่นแล้วลองใหม่' };
      const detail = String(body.error?.message || '').replaceAll(apiKey, '[hidden]').slice(0, 300);
      const provider = typeof body.error?.metadata?.provider_name === 'string' ? body.error.metadata.provider_name.slice(0, 80) : '';
      const error = new AppError(`OpenRouter ${code}: ${descriptions[code] || 'เรียก API ไม่สำเร็จ'}${detail ? ` · ${detail}` : ''}${provider ? ` (${provider})` : ''}`, 502);
      error.attempts = attempts; throw error;
    }
    const choice = body.choices?.[0];
    const content = choice?.message?.content;
    attempts.push({ requestId: body.id || null, model: body.model || model, usage: body.usage || null, finishReason: choice?.finish_reason || null });
    onStage('checking');
    try {
      if (choice?.finish_reason === 'length') throw new AppError('คำตอบถูกตัดเพราะ output token ไม่พอ');
      const output = validateOutput(content);
      return { output, metadata: { model, requestOptions, attempts, elapsedMs: Date.now() - start, prompt, checks: ['three-files', 'html-document', 'local-assets', 'javascript-syntax'] } };
    } catch (e) {
      validationError = e.message;
      if (attempt === 2) { const error = new AppError(`AI สร้างไฟล์ที่ตรวจผ่านไม่ได้หลังลอง 2 ครั้ง: ${e.message}`, 502); error.attempts = attempts; throw error; }
      messages.push({ role: 'assistant', content: typeof content === 'string' ? content : '' }, { role: 'user', content: `Validation failed: ${e.message}. Return corrected complete JSON. Make the site smaller if necessary. All three complete files required.` });
    }
  }
}

// ZIP using the standard uncompressed format, sufficient for three small text files.
export function createZip(files) {
  let offset = 0; const chunks = []; const central = [];
  for (const name of FILENAMES) {
    const filename = Buffer.from(name); const data = Buffer.from(files[name], 'utf8');
    let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(data.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42);
    chunks.push(local, filename, data); central.push(entry, filename); offset += local.length + filename.length + data.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(FILENAMES.length, 8); end.writeUInt16LE(FILENAMES.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}
