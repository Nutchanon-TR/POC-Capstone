# Connecta · Exhibition Hall + Map Studio

## Map Studio ปัจจุบัน

Editor เป็นเครื่องมือสร้างแมปแบบ standalone แล้ว เปิด `/` หรือ `/editor` ได้โดยไม่ต้องเปิด NestJS/PostgreSQL ใช้ `npm run dev -- --port 3001` หรือ build แล้ว start ที่พอร์ต 3001 ภาพจางตามเมาส์และการวางจริงยึดกริด 32/64/128 px ไม่มีโหมดวางอิสระ

ปุ่มบันทึกเก็บแมปและภาพอัปโหลดใน IndexedDB ของเบราว์เซอร์นี้ ใช้ **Export ชุด Tiled ZIP** เพื่อเก็บหรือย้ายงานออกไปเป็น `map.tmj`, `tilesets/map.tsj` และ PNG ครบชุด สามารถนำ ZIP กลับมา import เพื่อแก้ต่อได้ รายละเอียดและข้อจำกัดอยู่ใน [standalone-map-tool.md](docs/standalone-map-tool.md)

เนื้อหาด้านล่างเป็นระบบห้องสำรวจ/เซิร์ฟเวอร์เดิม ซึ่งไม่ได้ใช้ในเส้นทางหลักของเครื่องมือรอบนี้

ใช้ Next.js 16.3.8 + React 19.3.0 + Phaser 4.2.1 + Ant Design 6.6.5 + NestJS 11.2.7 + PostgreSQL 16 เริ่มจาก asset ที่ให้มา และรองรับการนำเข้า PNG ของตัวเองใน Map Studio

## เปิดใช้งาน

ตรวจสอบด้วย Node.js 20.19.2 และ Docker container `engram-postgres`

```powershell
npm install
docker start engram-postgres
npm run db:setup
npm run voice:setup
npm run voice:up
npm run api:dev
```

เปิดอีก terminal:

```powershell
npm run dev -- --port 3100
```

- สำรวจ: http://127.0.0.1:3100
- Editor: http://127.0.0.1:3100/editor
- API: localhost:3102 ผ่าน Next proxy `/api/backend/*`

`db:setup` สร้าง DB ใหม่ **connecta_editor** และ role เฉพาะใน container เดิม ไม่เปลี่ยนฐานข้อมูลอื่น Credentials อยู่ `server/.env.local` (ไม่เข้า Git) หากมี configuration แล้วจะไม่สร้างซ้ำ เปลี่ยน container ด้วย `POSTGRES_CONTAINER` ได้ NestJS รัน SQL migrations และ seed เฉพาะตอน DB ยังว่าง

เปลี่ยนพอร์ต API ผ่าน `API_PORT` ในไฟล์ env และ `API_URL` ฝั่ง Next เรียกคำสั่งจาก project root เสมอ

## ทดลองสองผู้เล่นและเปิดไมค์

1. เปิด http://127.0.0.1:3100 ใน **สองหน้าต่าง** จะได้รับชื่อผู้เล่นคนละชื่อ และเห็นตัวละครของอีกคนเดินในแมป
2. กด **เข้าร่วมห้องเสียง** ทั้งสองหน้าต่าง เริ่มต้นปิดไมค์อยู่
3. กด **เปิดไมค์** และอนุญาตไมโครโฟน สามารถ **ปิดไมค์** หรือ **ออกจากห้องเสียง** ได้ตลอด
4. การออกจากหน้าสำรวจ/ไป editor หยุดไมค์และออกจากสายด้วย กลับมาแล้วต้องกดเข้าร่วมใหม่

ใช้หูฟังขณะลองบนเครื่องเดียว เพื่อลดเสียงวนจากลำโพง ไมค์จริงเดียวกันที่เปิดพร้อมกันสองหน้าต่างจะส่งเสียงเดียวกันเข้าทั้งสองผู้เล่น การทดสอบอัตโนมัติใช้ไมค์จำลองแทน

ไม่ต้องสมัคร LiveKit Cloud: `voice:setup` สร้าง key/secret เฉพาะเครื่องใน `server/.env.local` และ `infra/livekit.local.yaml` ซึ่งถูก ignore แล้ว NestJS ออก token อายุสั้นให้ผู้เล่นเอง ไม่ส่ง API secret ให้เว็บ รัน setup ซ้ำใช้ key เดิมได้ ให้ทำก่อนเปิด API; ถ้า API เปิดอยู่แล้วให้ restart หลัง setup

`voice:up` เปิด LiveKit v1.13.7 ใน Docker; `voice:down` ปิดเฉพาะบริการเสียง ไม่แตะ PostgreSQL เสียงเป็นห้องรวมของแมปและ revision เดียวกัน ผู้เล่นที่เข้าห้องเสียงได้ยินกันทุกระยะ **ยังไม่มี proximity voice** หรือการบันทึกเสียง NPC ยังคงเป็นบทสนทนาข้อความ

ชุดนี้ตั้งค่าทดลอง **สองหน้าต่างในเครื่องเดียว**: Next/Nest/LiveKit bind localhost เท่านั้น การใช้สองเครื่อง/อินเทอร์เน็ตต้องเพิ่ม HTTPS, address ที่แต่ละเครื่องเข้าถึงได้ และตั้งค่า WebRTC/TURN ตามเครือข่าย ไม่ใช่แค่เปลี่ยน URL หน้าเว็บ อ่าน [voice architecture](docs/voice-architecture.md) ก่อน deploy

หากเปลี่ยน port/address ของ Nest ให้ตั้ง `NEXT_PUBLIC_REALTIME_URL` ฝั่ง Next ด้วย เพราะ Socket.IO เชื่อมตรงไป Nest ไม่ผ่าน HTTP proxy ของ Next

## เดินสำรวจ

คลิกแมป แล้วใช้ WASD / ลูกศร มีปุ่มสัมผัสบนจอเล็ก

- ติดตามตัวละคร / ดูทั้งห้อง, ซูม, กลับจุดเกิด
- สลับ Kaguya / InternWitch โดยคงพิกัดเท้าและ hitbox เดิม
- InternWitch หนึ่งตัวเดินหน้าบูธ Pavilion สีเหลือง (`booth3-4`) เข้าใกล้แล้วกด E หรือปุ่มพูดคุย NPC หยุดขณะสนทนา
- Interaction ทำเฉพาะบูธนี้ ไม่ทำให้ทุก prop
- บูธครบ 24 แบบ, Prop 12 แบบ, Layout 16 แบบ; 386 ภาพ, 357 collision rectangles
- จัดแนวเฟรมทั้งสองตัวละครและลด animation จาก 9 เป็น 6 fps ยังคงแอนิเมชัน 4 ทิศ ทิศละ 6 เฟรม
- ชนที่เท้าและเรียงภาพหน้า–หลังตามฐาน prop/เท้าตัวละคร พื้นอยู่ด้านล่างเสมอ

## ใช้ editor

เลือก asset ซ้ายแล้วคลิกเพื่อวาง; เครื่องมือเลือก/ย้ายใช้ลากวัตถุ; ด้านขวาปรับชื่อ ตำแหน่งและขนาด prop บูธย้ายเป็นกลุ่มพร้อมภาพ collision และ NPC ที่อยู่ในกลุ่ม ขนาดเริ่มต้นอ้างอิงชิ้นเดิมในแมปต้นแบบ

- Floor: เลือกพื้นแล้วลากระบาย; จุดเกิด: เลือกเครื่องมือแล้วคลิก
- Undo/Redo: เก็บ 50 การแก้ไขล่าสุด
- คลิกขวาค้างแล้วลากเพื่อเลื่อนแมป; หมุนล้อเมาส์เพื่อซูม
- ทดลองเดิน: เล่นฉบับร่างโดยยังไม่บันทึก DB
- บันทึก: ส่งเอกสารให้ NestJS ตรวจข้อมูลแล้ว UPDATE ด้วย revision
- ถ้า revision ชน: ฉบับร่างยังอยู่ ให้ Export TMJ ก่อน reload แล้วรวม/นำเข้างานใหม่ ไม่มีการเขียนทับอัตโนมัติ

DB เก็บ **Tiled document แบบ JSONB** ใน `maps.document` พร้อม revision ภาพชุดเดิมอยู่ `public/world/` ภาพที่อัปโหลดใหม่เก็บ PNG ใน `editor_assets.image` พร้อมนิยามขนาดและกรอบชน หลัง seed แล้ว DB เป็นข้อมูลหลัก ไฟล์ `maps/exhibition.tmj` เป็นแค่ต้นแบบและไฟล์นำเข้า

### Blueprint และภาพของตัวเอง

- **Blueprint / ขนาดแมป**: เริ่มแมปใหม่หรือปรับขนาด 1–256 ช่องต่อด้าน พื้นถูกปรับตามขนาดใหม่ แมปใหม่เป็นฉบับร่างและ Undo กลับได้
- นำเข้า blueprint PNG/JPG/WebP ไม่เกิน 1.5 MB ปรับตำแหน่ง ความทึบ และความกว้างโดยรักษาอัตราส่วน ภาพอ้างอิงเก็บใน custom property `studio.blueprint` พร้อม TMJ และแสดงเฉพาะ editor
- **เพิ่ม asset PNG**: PNG ภาพนิ่งไม่เกิน 2 MB / 2048 × 2048 กำหนดขนาดแสดง แนวหน้าหลัง และกรอบชนในภาพต้นฉบับ ภาพที่เพิ่มถูกเก็บในคลังทันที พื้นต้องเป็น 32 × 32
- Inspector ล็อกสัดส่วนสิ่งของโดยค่าเริ่มต้น คืนขนาดมาตรฐาน เปิด/ปิดกรอบชนของ instance และปรับ `depthY` ได้
- **กรอบชน / พื้นที่**: ลากสี่เหลี่ยมบนแมปเพื่อเพิ่ม Collider หรือ Zone เลือกผ่านขอบกรอบหรือรายการ Inspector เพื่อย้าย/ปรับขนาด/ลบ
- **แสดงกรอบชน**: ดูพื้นที่ที่ physics ใช้จริง แล้วทดลองเดินก่อนบันทึก
- ZIP รวม TMJ, TSJ และ PNG ของชุดเดิมกับภาพที่เพิ่มใหม่ครบ ใช้ relative paths อ่านขั้นตอนและข้อจำกัดใน [Map Studio](docs/map-studio.md)

## แก้ต่อใน Tiled

1. กด **ZIP สำหรับ Tiled** ในเว็บแล้วแตกไฟล์ จะมี `exhibition.tmj`, `tilesets/` และ `pieces/` ครบ
2. เปิด `exhibition.tmj` ด้วย Tiled
3. ย้าย prop ด้วย Select Objects (`S`) หรือย้ายบูธทั้ง Group Layer ด้วย Offset X/Y
4. ระบาย Floor ด้วย tile พื้น; จุดเกิดเป็น point object class `Spawn` ต้องมีจุดเดียว
5. NPC เป็น point class `Npc` ในกลุ่ม `booth3-4` แก้ title/dialogue/speed/patrolRadius/range ผ่าน custom properties ได้
6. บันทึก TMJ → เว็บกด **Import TMJ** → ทดลองเดิน → **บันทึกแมป** → กลับหน้าสำรวจ/รีเฟรช

Export TMJ เดี่ยวต้องวางคู่กับ tileset และภาพที่ตรงกัน จึงแนะนำ ZIP เมื่อย้ายไป Tiled Import ในเว็บรับ TMJ ที่อ้างอิง `exhibition.tsj` และ GID ที่มีอยู่ในคลังของฐานข้อมูลนี้ ยังไม่นำเข้า TSJ/ภาพจาก ZIP ของเครื่องอื่น

ถ้าแก้ฐาน collision/depth ใน Tiled tileset ต้องแก้ไฟล์ `maps/tilesets/exhibition.tsj` ของโปรเจกต์ด้วย (collision เป็น rectangle; `depthY` วัดจากขอบบนถึงฐานบนพื้น) ไม่ได้นำเข้า TSJ ผ่านหน้าเว็บ

เปิด `demo.tiled-project` → `maps/exhibition.tmj` ได้เช่นกัน แต่เป็นฉบับต้นแบบ ไม่ใช่ฉบับล่าสุดจาก DB

`npm run map:sync` ยังใช้ตรวจ/สร้าง `public/world/map.json` จากต้นแบบได้ แต่ **ไม่อัปเดต DB** เกมโหลดผ่าน API ดังนั้นหลังแก้ TMJ ภายนอกต้อง Import + บันทึก

## รูปแบบที่รองรับ

Finite orthogonal, grid 32 px, ไม่เกิน 256×256 tiles, JSON-array tile layers, image collection tileset ที่ Object Alignment = Top Left, group offsets/visibility/opacity, tile objects ย้ายและปรับขนาดได้, collision สี่เหลี่ยม

ไม่รองรับ rotation/flip, polygon collision, infinite map หรือ compressed base64 Compiler ปฏิเสธข้อมูลที่ไม่รองรับ Spawn ต้องไม่ชนสิ่งกีดขวางทั้ง footprint และ NPC ต้องมีเส้นทางเดินที่โล่ง การเพิ่ม catalog ผ่านเว็บรองรับ PNG สิ่งของ/โครงสร้าง/พื้น ส่วนตัวละครยังใช้สองแบบเดิม

รุ่นนี้เป็น POC ในเครื่อง มีผู้เล่นหลายคนและห้องเสียงแบบ guest แต่ editor ยังเป็นการแก้แมปแยกกันพร้อม revision guard ไม่มี login/สิทธิ์หลายผู้ใช้หรือร่วมแก้แมปแบบ realtime

## ภาพต้นฉบับ

`asset/*.png` ไม่ถูกแก้ ใช้ rectangular crop, nearest-neighbour floor resize และ padding โปร่งใสเท่านั้น

- `assets/provenance.json`: source hashes และที่มาชิ้นส่วน
- `assets/characters.json`: crop/offset ทุกเฟรมทั้งสองตัวละคร
- `scripts/prepare-characters.mjs`: จัดเฟรมและคัดลอก RGBA เดิมแบบไม่เปลี่ยนพิกเซล
- `public/world/pieces/`, `public/world/characters/`: ผลลัพธ์สำหรับแสดงผล

ไฟล์ `.tsx` ใน asset เป็น XML tileset ของ Tiled ไม่ใช่ React ชุดที่ใช้ประกอบห้องจริงคือ `maps/tilesets/exhibition.tsj`

`npm run assets:prepare` เขียนทับ tileset/collision/depth ที่ปรับเอง จึงไม่ต้องรันเมื่อแค่แก้ตำแหน่งแมป `scripts/create-initial-map.mjs` ใช้ครั้งแรกเท่านั้น ไม่อยู่ในวงจร dev/build และห้ามใช้ `--replace` กับงานที่แก้แล้ว

## โครงสร้าง

| ตำแหน่ง                         | หน้าที่                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| src/features/hall               | หน้าเดิน, UI, ตัวเลือกตัวละคร, สนทนา                                     |
| src/features/editor             | Palette, Inspector, draft/history, preview, import/export, Phaser editor |
| src/features/social             | HallSession สำหรับผู้เล่น, VoiceController สำหรับเสียง, VoicePanel UI    |
| server/realtime                 | Socket.IO gateway และการออก/จำกัด token LiveKit                          |
| shared/realtime/protocol.d.ts   | สัญญาข้อมูลผู้เล่นและเสียงระหว่างเว็บกับ Nest                            |
| shared/map/editor.ts            | การแก้เอกสาร Tiled ไม่ขึ้นกับ React/DB                                   |
| shared/map/compile.mjs          | compiler เดียวสำหรับ editor, API และ CLI                                 |
| server/maps.ts                  | Nest controller/service, validation และ revision update                  |
| server/catalog.ts               | อ่าน asset/prefab ที่เชื่อถือได้                                         |
| server/database.ts + migrations | Pool และ SQL migrations ใน transaction                                   |
| src/game/config.ts              | ค่าตัวละคร เฟรม ความเร็ว hitbox กล้อง                                    |
| src/game/entities               | Player และ BoothNpc                                                      |
| src/game/scenes/WorldScene.ts   | ประกอบระบบและ lifecycle                                                  |
| src/game/GameBridge.ts          | คำสั่ง/สถานะ React ↔ Phaser แยกต่อ instance                              |
| maps/exhibition.tmj             | ต้นแบบ seed; ไม่เขียนทับแมปที่บันทึกใน DB                                |

อ่านเพิ่มเติมใน [docs/editor-architecture.md](docs/editor-architecture.md) และ [docs/next-goals.md](docs/next-goals.md)

## ตรวจสอบและ production ในเครื่อง

```powershell
npm test
npm run test:api
npm run test:realtime
npm run typecheck
npm run api:build
npm run lint
npm run build
npm run test:e2e
```

`test:api` ต้องเปิด API และใช้ DB จริง คืนเอกสารเดิมด้วย revision check หลังทดสอบ `test:e2e` ใช้ Google Chrome และ debug dev server หากมี dev server ปกติเปิดอยู่ ให้หยุดแล้วเปิดด้วย:

```powershell
$env:NEXT_PUBLIC_GAME_DEBUG='1'
npm run dev -- --port 3100
```

`test:e2e` รวมการทดสอบเสียง จึงต้อง `npm run voice:up` ก่อน หรือใช้ `npm run test:voice` เพื่อทดสอบเฉพาะสองผู้เล่น/WebRTC/ไมค์จำลอง การทดสอบนี้ไม่จับเสียงจากไมค์จริง

Production: `npm run api:build` → `npm run api:start` และอีก terminal `npm run build` → `npm start -- --port 3100` ไม่ตั้ง NEXT_PUBLIC_GAME_DEBUG สำหรับ production

หลักฐานอยู่ `artifacts/` ผลตรวจใน [docs/verification.md](docs/verification.md) `npm audit --omit=dev` ไม่พบช่องโหว่ ส่วน ESLint ของ Next มี advisory ใน braces ที่ upstream ยังไม่แก้ จึงไม่ใช้ audit fix --force ที่ลด dependency ข้าม major
