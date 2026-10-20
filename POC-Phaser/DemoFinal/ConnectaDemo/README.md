# Connecta — Frontend + Phaser

เว็บ Next.js App Router / React / TypeScript strict และ Phaser 4 ตาม `Connecta-virtual-showcase/docs/technical.md` ในขอบเขต frontend รอบแรก ใช้ UI จาก TestUI เป็นฐานและแยก implementation ใหม่ ไม่ได้ฝัง HTML ต้นแบบใน iframe

## เริ่มใช้งาน

ใช้ Node.js 20.9 ขึ้นไป และ npm จากโฟลเดอร์นี้:

```powershell
npm ci
npm run dev
```

เปิด http://localhost:3000 ถ้าพอร์ตถูกใช้อยู่ Next จะแจ้งพอร์ตใหม่ใน terminal สำหรับการรัน production build:

```powershell
npm run build
npm run start
```

สร้าง local profile ที่ `/signin` → Discover events → Senior Design Showcase → Register → เลือกตัวละคร → Enter the showcase ปุ่ม preview อุปกรณ์ใน lobby ขอสิทธิ์กล้อง/ไมค์เมื่อผู้ใช้กดเท่านั้น และหยุด track เมื่อออกจากหน้า ไม่มีการส่งสื่อออกจากเครื่อง

**สถานะปัจจุบัน:** frontend ทำงานได้ในเครื่อง ข้อมูลแบบฟอร์มบันทึกใน localStorage ไม่ใช่ระบบ auth/ฐานข้อมูลจริง และยังไม่ได้รองรับผู้ใช้หลายคน การเปิดใช้กับงานจริงต้องทำ backend, authorization และการทดสอบระบบร่วมกันก่อน

## สิ่งที่ใช้งานได้

- Landing ใช้ `lobby.png`, รายการงานพร้อมค้นหา/กรอง, รายละเอียดงาน, ตารางและบันทึก agenda, แกลเลอรีและรายละเอียดผลงาน
- Local profile แยก public/private, consent ลงทะเบียนแยกจากบัญชี, ตัวละคร 14 ตัว, device preview และ character lobby
- Phaser โหลดแผนที่จาก Tiled ZIP ที่ให้มา: 1344×832, วัตถุ 204 ชิ้น, collision 45 จุด, 5 booth slots
- เดินด้วย WASD/ลูกศร, คลิกเดินตามเส้นทาง, E เปิดบูธ, ค้นหาผลงาน/วาร์ป, minimap, zoom, กล้องตามตัวละครบนมือถือ, ปุ่มเดินบนจอ
- NPC ตกแต่งทั้ง 14 ตัว, walk animation, idle sheet 6 ตัวและ breathing 8 ตัว, pause และ reduced motion
- Follow, vote สูงสุด 3 ผลงานที่เคยไปถึงบูธ, feedback, report, contact request, personal recap และรายการ saved projects
- Workspace: ตั้ง module, สร้าง event draft, ส่งผลงาน, import CSV แบบ quoted fields, approve/reject ใน local review queue, presenter view, moderation, รายงานและ CSV export
- Judge workspace: rubric ถ่วงน้ำหนักรวม 100%, autosave, ส่ง evaluation, ปิดรอบแล้วแก้ไม่ได้ และแสดงผลเมื่อเปิด publish
- Responsive, keyboard focus, native dialog, loading/error/not-found และ asset URL รองรับ deployment ใต้ path ย่อย

## ส่วนที่รอ backend

OAuth/magic link, สิทธิ์ event roles แบบ array, invite enforcement, CRUD/API, project publishing/slot allocation/หลาย hall, upload MinIO, live chat/presence/queue, reactions ระหว่างผู้ใช้, mute/kick/ban/audit, mutual contacts จริง, analytics หลายคน, AI/RAG, 3D และ billing

ปุ่ม mic/camera/share ใน hall ปิดไว้ชัดเจน ไม่สร้าง token หรือเปิดสิทธิ์เองจาก browser จะต่อ **NestJS + Colyseus + self-hosted LiveKit** ตาม docs: หนึ่ง room ต่อ hall, proximity subscription แบบ hysteresis, สิทธิ์ camera/screen เฉพาะ Presenter ในบูธตนเอง, presentation ปิดไมค์ผู้ฟังที่ server, Pass the Mic ต้องยอมรับก่อน และถอนสิทธิ์เมื่อออกจาก zone/disconnect

แผนที่มี 5 slots แต่ตัวอย่างมี 6 projects จึงแสดง Open Notes เป็น unassigned ไม่วาร์ปไปทับบูธอื่น การ approve submission ใน preview เปลี่ยนสถานะ review เท่านั้น ยังไม่เผยแพร่เข้าฮอลล์

## โครงสร้าง

```text
apps/web/src/app/           App Router, metadata, loading/error boundaries
apps/web/src/components/    UI, site/workspace shell, accessible dialog
apps/web/src/domain/        Models, rules, reducer, storage schema, CSV parser
apps/web/src/features/      Events, projects, session, hall, judging, workspace
apps/web/src/game/          World schema, navigation, simulation, bridge, renderer
apps/web/public/assets/    Local fonts, supplied character sprites and Tiled source
apps/web/tests/             Domain/game tests and Playwright browser journeys
scripts/compile-map.py      Rebuild runtime JSON, floor atlas and minimap from Tiled
docs/ARCHITECTURE.md        Ownership and integration decisions
docs/VERIFICATION.md        What was actually verified and known limits
```

ไม่สร้าง backend เปล่าหรือ HTTP adapter ที่แสร้งว่าพร้อมใช้งาน การเพิ่ม `apps/server` (NestJS) และ shared transport contracts ทำใน backend phase เมื่อมี implementation และ API schema จริง

## ตรวจงาน

```powershell
npm run check
npm test
npm run format:check
npm run build
npm run test:e2e
```

Playwright ใช้ Microsoft Edge ที่ติดตั้งในเครื่อง เปิด production server พอร์ต 3110 ชั่วคราวและปิดเมื่อทดสอบจบ ถ้าไม่มี Edge เปลี่ยน channel ใน `playwright.config.ts` และติดตั้ง Chromium ตาม Playwright การทดสอบไม่เรียกกล้อง/ไมค์จริง

## แก้แผนที่

เปิด `apps/web/public/assets/maps/exhibition/map.tmj` ใน Tiled แก้ต้นทางแล้วรัน compiler ด้วย Python + Pillow:

```powershell
python scripts/compile-map.py
# นำเข้า ZIP ใหม่ได้ถ้าต้องการ
python scripts/compile-map.py --import-zip "D:\Downloads\map-tiled (2).zip"
```

อย่าแก้ `runtime.json`, `floor-atlas.png`, `minimap.png` แยกจากต้นทาง Compiler คงตำแหน่ง, depth, TSJ footprint และ object properties เดิม

## Base path

คัดลอก `apps/web/.env.example` เป็น `.env.local` ในโฟลเดอร์เดียวกัน ถ้าขึ้นมหาวิทยาลัยให้ตั้ง `NEXT_PUBLIC_BASE_PATH=/capstone26/CP26SSI3` **ก่อน build** แล้ว build ใหม่ Next Link จัด prefix ให้ route ส่วน public assets ใช้ `lib/assets.ts` สื่อภายนอกและ server URLs จะกำหนดเพิ่มเมื่อทำ integration

ฟอนต์เก็บในโปรเจกต์พร้อม OFL และโหลดผ่าน next/font/local; ไม่มี Google Fonts request ระหว่างรัน Asset ต้นฉบับใน TestUI และ docs ต้นทางไม่ได้ถูกแก้
