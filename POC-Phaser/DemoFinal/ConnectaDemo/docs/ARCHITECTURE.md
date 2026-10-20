# สถาปัตยกรรม frontend

## ขอบเขตและเทคโนโลยี

ใช้ npm workspace มี `apps/web` เป็น Next.js 16.4.2 App Router, React 19.3.1, TypeScript strict และ Phaser 4.2.1 dependency ถูกเก็บใน lockfile ไม่ใช้ backend CJS ของต้นแบบแทน NestJS

## การตัดสินใจ

1. **Boundary Discipline:** parse localStorage และ map JSON ด้วย Zod ที่ทางเข้าเพียงครั้งเดียว ภายในใช้ domain types กฎคะแนน/โหวตและ navigation ไม่ import React หรือ Phaser
2. **Model the Domain:** local commands เป็น discriminated union ใน `domain/state.ts` และ Hall commands/events เป็น union ใน `game/bridge.ts` การเปลี่ยนสถานะผ่าน reducer จึงทดสอบกฎได้โดยไม่เปิด UI
3. **Deep modules:** `HallSimulation` ซ่อนเส้นทาง, collision, การเดิน, NPC patrol และ zone detection ไว้หลัง interface เล็ก `update / walkTo / warp / zone` ส่วน `Navigation` เก็บ walking graph ครั้งเดียวแทนคำนวณทั้งแมปทุกเฟรม
4. **Renderer ทิ้งแล้วสร้างใหม่ได้:** `game/renderer.ts` แปลง simulation เป็น Phaser objects เท่านั้น React โหลด renderer ผ่าน dynamic import แบบ `ssr:false` เฉพาะหน้า hall; landing ไม่ต้องโหลด Phaser
5. **React ↔ Phaser seam:** HallBridge สร้างต่อ hall instance ไม่วาง state หรือ callbacks บน `window` ผู้ใช้กด UI → command → simulation และ snapshot เฉพาะที่ HUD ใช้ส่งกลับประมาณ 6 ครั้ง/วินาที การเดินทุกเฟรมอยู่ในเกม
6. **Lifecycle:** abort map fetch, unsubscribe commands, remove media query listener, disconnect ResizeObserver และ `game.destroy(true)` เมื่อ route unmount ไม่ใช้ `Graphics.generateTexture()`
7. **Input ownership:** DOM panels/dialogs รับ input ของตน Phaser รับ pointer ที่มาจาก canvas เท่านั้น และหยุดเดิน/กด E ระหว่างพิมพ์หรือเปิด dialog การเลื่อน panel ใช้ container resize ให้ camera คำนวณใหม่
8. **Frontend phase:** `AppProvider` เป็น local persistence adapter สำหรับทดสอบ flow โดยระบุสถานะทุกหน้าที่จัดการข้อมูล ไม่ใช้ local roles เป็นหลักฐาน authorization และไม่ทำ public API ปลอม

## หน้าที่แต่ละส่วน

| ส่วน | หน้าที่ | ไม่รับผิดชอบ |
|---|---|---|
| app | Route, metadata, framework lifecycle | กฎงาน/การเดิน |
| components | UI primitives, responsive shells, native dialog | transport และ state เกม |
| features | แบบฟอร์ม, มุมมอง, interaction ตาม use case | authoritative permissions |
| domain | Catalogue, local command model, weighted scoring, CSV, validation | framework/rendering |
| game/simulation + navigation | ตำแหน่ง, collision, paths, patrol, zones | DOM/WebGL/network |
| game/renderer | Phaser assets, display objects, input/camera | คะแนน/บัญชี/permissions |
| game/bridge | คำสั่งและเหตุการณ์ระหว่างสองระบบ | singleton global |

Catalogue ปัจจุบันเป็น sample data มี project IDs/slot IDs คงที่ ทั้ง React และ Phaser ใช้ข้อมูลเดียวกัน ข้อมูลที่ผู้ใช้กรอกเก็บแยกจาก sample catalogue เพื่อไม่อ้างว่าเป็นข้อมูลที่ publish จาก server แล้ว

## รอยต่อ backend ที่ต้องเพิ่ม

- NestJS ออก session และอ่าน membership roles จาก DB/cache ไม่ใส่ event role ใน auth JWT
- ค่อยแยก packages/contracts จาก DTO/schema ที่ใช้ร่วมจริง ไม่ re-export Colyseus/LiveKit wire types ออกเป็น domain types
- Colyseus เป็น authority ของการเดิน, collision, booth zone และ permission transitions; local simulation จะกลายเป็น client prediction แล้ว reconcile กับ server snapshots
- LiveKit client รับ token จาก NestJS เท่านั้น หนึ่ง room ต่อ hall; เปลี่ยน selective subscription ตาม proximity/zone และ server publish permissions ห้ามใช้ UI disabled state เป็นมาตรการรักษาสิทธิ์
- Media permission state ต้องรองรับ reconnect, role ถูกถอน, ออก zone, presentation เริ่ม/จบ และการรับ Pass the Mic ก่อนเปิด publish
- PostgreSQL/Prisma/pgvector เก็บ durable data; MinIO signed URLs สำหรับสื่อ; Redis interface เมื่อมี use case; Docker/nginx/TURN เพิ่มใน phase integration ตาม technical.md
- OAuth callback, upload authorization, staff/owner restrictions, private scores/contacts และ audit ต้องทดสอบที่ server เพิ่ม ไม่ใช้การทดสอบ frontend แทน

## ข้อจำกัดที่ตั้งใจระบุให้เห็น

ยังไม่มี live participant, server auth, staff authorization, API หรือฐานข้อมูล รายงานสรุปเฉพาะการใช้งานจาก browser นี้ จำนวน 150–300 คน, latency, NAT/TURN และความพร้อม deploy ยังไม่ได้ยืนยัน NPC ไม่รวมใน visitor count
