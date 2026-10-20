const $ = id => document.getElementById(id);
const state = { config: null, models: [], sites: [], site: null, snapshot: null, busy: false, jobId: null };
const stages = {
  starting: ['เริ่มงาน', 'กำลังเตรียมคำสั่ง'], models: ['ตรวจโมเดลฟรี', 'เช็กราคาและโหลดเว็บฉบับเดิมถ้ามี'],
  requesting: ['AI กำลังเขียนเว็บ', 'ส่งคำสั่งไป OpenRouter แล้ว กำลังรอไฟล์กลับมา'], repairing: ['AI กำลังแก้ไฟล์', 'คำตอบแรกตรวจไม่ผ่าน กำลังขอให้แก้ อีก 1 ครั้ง'],
  checking: ['กำลังตรวจไฟล์', 'ตรวจ HTML ไฟล์ที่เชื่อมต่อ และ JavaScript syntax'], saving: ['กำลังบันทึก', 'เก็บไฟล์จริงเป็นเวอร์ชันใหม่บนเครื่อง']
};
const examples = {
  restaurant: 'สร้างเว็บร้านอาหารชื่อ ครัวบ้านเรา โทนสีครีมและเขียวเข้ม มีเมนูอาหารไทย 6 รายการพร้อมราคา เวลาเปิด 10:00–20:00 ที่อยู่บางมด และปุ่มติดต่อ LINE ใช้ภาพประกอบ CSS และให้กรองเมนูอาหารกับเครื่องดื่มได้',
  nails: 'สร้างเว็บร้านทำเล็บชื่อ Nail Sunday โทนชมพูอ่อน เรียบสะอาด มีบริการทำเล็บ 4 แบบพร้อมราคา ตัวอย่างลายเล็บด้วยสี CSS และฟอร์มเลือกบริการ วัน เวลา เป็นเดโมบนเครื่อง ให้แจ้งชัดเจนว่ายังไม่ใช่การจองจริง',
  tutor: 'สร้างเว็บติวเตอร์ชื่อ พี่มินติวคณิต โทนสีกรมท่าและเหลือง มีคอร์ส ม.ต้น และ ม.ปลาย พร้อมราคา แนะนำผู้สอน ตารางเรียน และปุ่มติดต่อ ให้กดดูรายละเอียดคอร์สได้'
};
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', 'X-POC-Request': '1', ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'เรียกข้อมูลไม่สำเร็จ');
  return result;
}
function status(title, detail, error = false) {
  $('status-title').textContent = title; $('status-detail').textContent = detail;
  $('status-indicator').className = `dot${error ? ' error' : state.busy ? ' working' : ''}`;
}
function setBusy(busy) {
  state.busy = busy;
  $('status-indicator').classList.toggle('working', busy);
  for (const id of ['generate', 'new-site', 'model', 'refresh-sites']) $(id).disabled = busy;
  for (const button of document.querySelectorAll('#history-list button, #sites-list button')) button.disabled = busy;
  $('prompt').disabled = busy;
  $('generate').textContent = busy ? 'กำลังทำงาน…' : state.site ? 'แก้เว็บไซต์ ↗' : 'สร้างเว็บไซต์ ↗';
}
function modelInfo() {
  const selected = state.models.find(model => model.id === $('model').value);
  $('model-info').textContent = selected ? `Context ${selected.contextLength.toLocaleString()} · เพดาน output ${state.config.maxTokens.toLocaleString()} tokens/ครั้ง` : 'เลือกโมเดลฟรีเพื่อเริ่ม';
}
function selectTab(button) {
  document.querySelectorAll('.tab').forEach(tab => {
    const selected = tab === button;
    tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    $(tab.dataset.panel).hidden = !selected;
  });
  $('desktop').parentElement.hidden = button.dataset.panel !== 'preview-panel';
}
function renderCode() { $('code-content').textContent = state.snapshot?.files[$('file-select').value] || 'สร้างเว็บก่อน แล้วโค้ดจะปรากฏตรงนี้'; }
function formatDate(date) { return new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }); }
function renderSites() {
  $('sites-list').replaceChildren();
  if (!state.sites.length) { const p = document.createElement('p'); p.className = 'field-note'; p.textContent = 'ยังไม่มีเว็บที่สร้าง'; $('sites-list').append(p); }
  for (const site of state.sites) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `saved-site${state.site?.id === site.id ? ' selected' : ''}`; button.disabled = state.busy;
    const name = document.createElement('strong'); name.textContent = site.title;
    const detail = document.createElement('small'); detail.textContent = `${site.versions.length} เวอร์ชัน · ${formatDate(site.updatedAt)}`;
    button.append(name, detail); button.addEventListener('click', () => loadSite(site).catch(showError)); $('sites-list').append(button);
  }
}
async function refreshSites() { state.sites = await api('/api/sites'); renderSites(); }
function showError(error) { status('ทำงานไม่สำเร็จ', error.message, true); }
async function loadSite(site, version = site.currentVersion) {
  const snapshot = await api(`/api/sites/${site.id}/versions/${version}`);
  state.site = site; renderSnapshot(snapshot); renderSites();
}
function renderHistory() {
  $('history-list').replaceChildren();
  if (!state.site) { $('history-list').textContent = 'ยังไม่มีประวัติ'; return; }
  for (const entry of [...state.site.versions].reverse()) {
    const row = document.createElement('div'); row.className = 'history-row';
    const text = document.createElement('div'); const title = document.createElement('strong');
    title.textContent = `${entry.version}${entry.version === state.site.currentVersion ? ' · ฉบับปัจจุบัน' : ''}${entry.version === state.snapshot.version ? ' · กำลังดู' : ''}`;
    const date = document.createElement('small'); date.textContent = `${entry.title} · ${formatDate(entry.createdAt)}`; text.append(title, date);
    const actions = document.createElement('div'); const view = document.createElement('button'); view.type = 'button'; view.className = 'outline-button'; view.textContent = 'ดู'; view.disabled = state.busy;
    view.addEventListener('click', () => loadSite(state.site, entry.version).catch(showError)); actions.append(view);
    if (entry.version !== state.site.currentVersion) {
      const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'outline-button'; restore.textContent = 'ใช้ฉบับนี้'; restore.disabled = state.busy;
      restore.addEventListener('click', async () => {
        setBusy(true);
        try { const site = await api(`/api/sites/${state.site.id}/restore`, { method: 'POST', body: JSON.stringify({ version: entry.version }) }); await refreshSites(); await loadSite(site); status('เลือกเวอร์ชันแล้ว', `สั่งแก้ต่อจาก ${entry.version} ได้เลย`); }
        catch (error) { showError(error); } finally { setBusy(false); }
      }); actions.append(restore);
    }
    row.append(text, actions); $('history-list').append(row);
  }
}
function renderSnapshot(snapshot) {
  state.snapshot = snapshot;
  $('site-title').textContent = `${snapshot.title} · ${snapshot.version}`;
  $('mode-label').textContent = `แก้เว็บ · ${state.site.currentVersion}`;
  $('new-site').hidden = false;
  $('prompt').placeholder = 'เช่น เปลี่ยนสีหลักเป็นส้ม เพิ่มเมนูข้าวกะเพรา ราคา 65 บาท และทำปุ่ม LINE ให้เด่นขึ้น';
  $('empty-state').hidden = true; $('preview').hidden = false;
  $('preview').src = `${state.config.previewOrigin}/sites/${snapshot.id}/${snapshot.version}/index.html`;
  $('download').hidden = false; $('download').href = `/api/sites/${snapshot.id}/versions/${snapshot.version}/download`;
  $('result-summary').textContent = snapshot.summary || 'บันทึกไฟล์แล้ว';
  $('metrics').replaceChildren();
  const attempts = snapshot.attempts || []; const tokens = attempts.reduce((sum, attempt) => sum + (attempt.usage?.total_tokens || 0), 0);
  const costKnown = attempts.length && attempts.every(attempt => typeof attempt.usage?.cost === 'number');
  const cost = attempts.reduce((sum, attempt) => sum + (attempt.usage?.cost || 0), 0);
  const metrics = [`${(snapshot.elapsedMs / 1000).toFixed(1)} วินาที`, attempts.length && attempts.every(a => typeof a.usage?.total_tokens === 'number') ? `${tokens.toLocaleString()} tokens` : 'API ไม่รายงาน token ครบ', `${attempts.length} API calls`, costKnown ? `$${cost.toFixed(6)}` : 'API ไม่รายงานค่าใช้จ่าย', snapshot.model];
  for (const metric of metrics) { const span = document.createElement('span'); span.textContent = metric; $('metrics').append(span); }
  $('check-note').hidden = false; renderCode(); renderHistory(); setBusy(state.busy);
}
function reset() {
  state.site = null; state.snapshot = null; $('mode-label').textContent = 'สร้างเว็บใหม่'; $('new-site').hidden = true;
  $('site-title').textContent = 'เว็บไซต์ของคุณจะอยู่ตรงนี้'; $('prompt').value = ''; $('prompt').placeholder = 'บอกชื่อร้าน สิ่งที่ขาย สีที่ชอบ และสิ่งที่อยากให้ลูกค้าทำ';
  $('preview').hidden = true; $('preview').removeAttribute('src'); $('empty-state').hidden = false; $('download').hidden = true; $('check-note').hidden = true;
  $('result-summary').textContent = 'ผลลัพธ์จริงจาก API จะปรากฏเมื่อสั่งสร้าง'; $('metrics').replaceChildren(); $('clock').textContent = '';
  renderSites(); renderCode(); renderHistory(); selectTab($('preview-tab')); status('พร้อมเริ่มทดลอง', 'เว็บเดิมยังเก็บอยู่ในรายการด้านซ้าย'); setBusy(false); $('prompt').focus();
}
async function trackJob(id, start) {
  while (true) {
    const job = await api(`/api/jobs/${id}`);
    $('clock').textContent = `${Math.round((Date.now() - start) / 1000)}s`;
    if (job.status === 'done') return job.result;
    if (job.status === 'error') {
      const attempts = job.attempts || [];
      const tokens = attempts.reduce((sum, attempt) => sum + (attempt.usage?.total_tokens || 0), 0);
      const reasoning = attempts.reduce((sum, attempt) => sum + (attempt.usage?.completion_tokens_details?.reasoning_tokens || 0), 0);
      throw new Error(`${job.error}${attempts.length ? ` · API ส่งคำตอบ ${attempts.length} ครั้ง รายงาน ${tokens.toLocaleString()} tokens รวม reasoning ${reasoning.toLocaleString()}` : ''}`);
    }
    const stage = stages[job.stage]; if (stage) status(stage[0], job.stage === 'repairing' && job.repairReason ? `${job.repairReason} · ขอให้ AI แก้ อีก 1 ครั้ง` : stage[1]);
    await new Promise(resolve => setTimeout(resolve, 800));
  }
}
$('prompt-form').addEventListener('submit', async event => {
  event.preventDefault(); if (state.busy) return;
  if (!$('model').value) return showError(new Error('ยังไม่มีโมเดลฟรีให้เลือก ลองรีเฟรชรายการ'));
  setBusy(true); const start = Date.now(); status('เริ่มงาน', 'กำลังส่งคำสั่ง');
  try {
    const job = await api('/api/generate', { method: 'POST', body: JSON.stringify({ prompt: $('prompt').value, model: $('model').value, ...(state.site ? { siteId: state.site.id, baseVersion: state.site.currentVersion } : {}) }) });
    state.jobId = job.jobId;
    const result = await trackJob(job.jobId, start);
    await refreshSites(); state.site = result.site; renderSnapshot(result.version); renderSites(); selectTab($('preview-tab'));
    $('prompt').value = ''; status('สร้างและบันทึกแล้ว', `ดู ${result.version.version} ได้เลย พิมพ์คำสั่งใหม่เพื่อแก้ต่อ`);
  } catch (error) { showError(error); }
  finally { state.jobId = null; setBusy(false); $('status-indicator').classList.remove('working'); }
});
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => { if (!state.busy) { $('prompt').value = examples[button.dataset.example]; $('prompt').focus(); } }));
const tabs = [...document.querySelectorAll('.tab')];
tabs.forEach((button, index) => {
  button.addEventListener('click', () => selectTab(button));
  button.addEventListener('keydown', event => {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next !== null) { event.preventDefault(); selectTab(tabs[next]); tabs[next].focus(); }
  });
});
$('new-site').addEventListener('click', reset); $('refresh-sites').addEventListener('click', () => refreshSites().catch(showError)); $('model').addEventListener('change', modelInfo); $('file-select').addEventListener('change', renderCode);
$('copy-code').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('code-content').textContent); $('copy-code').textContent = 'คัดลอกแล้ว'; setTimeout(() => { $('copy-code').textContent = 'คัดลอก'; }, 1200); } catch { showError(new Error('คัดลอกไม่สำเร็จ เลือกข้อความในช่องโค้ดได้')); } });
for (const mode of ['desktop', 'mobile']) $(mode).addEventListener('click', () => {
  $('preview-panel').classList.toggle('mobile', mode === 'mobile');
  for (const button of ['desktop', 'mobile']) { $(button).classList.toggle('selected', button === mode); $(button).setAttribute('aria-pressed', String(button === mode)); }
});
async function init() {
  try {
    state.config = await api('/api/config');
    $('key-status').textContent = state.config.keyConfigured ? 'API key พร้อมใช้ · เก็บไว้ฝั่ง server' : 'ยังไม่มี key · ใส่ในไฟล์ .env แล้วรีเฟรช'; $('key-status').classList.toggle('ready', state.config.keyConfigured);
    await refreshSites();
    state.models = await api('/api/models');
    state.models.sort((a, b) => Number(b.id === state.config.defaultModel) - Number(a.id === state.config.defaultModel));
    $('model').replaceChildren();
    for (const model of state.models) { const option = document.createElement('option'); option.value = model.id; option.textContent = model.id; $('model').append(option); }
    if (!state.models.length) throw new Error('ตอนนี้ OpenRouter ไม่มีโมเดลฟรีที่ใช้งานได้');
    modelInfo();
    if (state.sites.length) await loadSite(state.sites[0]);
  } catch (error) { showError(error); }
}
void init();
