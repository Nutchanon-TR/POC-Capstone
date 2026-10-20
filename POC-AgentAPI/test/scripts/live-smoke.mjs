// Manual integration check. Calls a real free API and writes actual website snapshots.
import { readSettings } from '../server.mjs';
import { assertFreeModel, generate, Store, FILENAMES } from '../lib.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const settings = await readSettings(root);
if (!settings.key) throw new Error('ใส่ key ใน .env ก่อนทดสอบ');
const model = process.argv[2] || settings.model;
const catalogue = await (await fetch('https://openrouter.ai/api/v1/models')).json();
const spec = assertFreeModel(catalogue.data.find(m => m.id === model), model, settings.maxTokens);
const store = new Store(path.join(root, 'data'));
let site;
for (const [index, prompt] of [
  'สร้างเว็บร้านอาหารไทยชื่อ ครัวบ้านเรา POC โทนครีมและเขียว มีเมนูอาหาร 3 รายการและเครื่องดื่ม 1 รายการพร้อมราคา เวลาเปิดและปุ่มติดต่อ LINE https://line.me/ ให้ปุ่มกรองอาหารกับเครื่องดื่มใช้งานได้ ใช้ CSS เป็นภาพประกอบ ทำให้สั้นและครบ ไม่เกินประมาณ 3500 output tokens',
  'แก้เว็บเดิม เปลี่ยนสีหลักจากเขียวเป็นส้ม เพิ่มเมนู ข้าวกะเพราไก่ ราคา 65 บาท โดยยังกรองเมนูอาหารและเครื่องดื่มได้ คงชื่อร้านและรายละเอียดเดิม ทำโค้ดให้สั้นและครบ'
].entries()) {
  const previous = site ? await store.version(site.id, site.currentVersion) : null;
  console.log(`${index ? 'EDIT' : 'CREATE'} ${model}`);
  const result = await generate({ apiKey: settings.key, model, modelSpec: spec, prompt, previous, maxTokens: settings.maxTokens, onStage: (stage, info) => console.log(`  ${stage}${info?.validationError ? ': ' + info.validationError : ''}`) });
  const saved = await store.save({ id: site?.id, baseVersion: site?.currentVersion, output: result.output, metadata: { ...result.metadata, verifiedPricing: spec.pricing } });
  site = saved.site;
  console.log(JSON.stringify({ id: site.id, version: site.currentVersion, elapsedMs: result.metadata.elapsedMs, files: Object.fromEntries(FILENAMES.map(name => [name, Buffer.byteLength(result.output.files[name])])), attempts: result.metadata.attempts }, null, 2));
}
console.log(`SAVED ${site.id} (${site.versions.length} immutable versions)`);
