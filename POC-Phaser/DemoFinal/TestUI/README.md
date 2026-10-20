# Connecta UI + Phaser demo

ต้นแบบ 21 หน้า พร้อม Phaser 4.2.1 และ LiveKit self-host สำหรับ localhost อ้างอิง `Connecta-virtual-showcase/docs/features.md` และ `docs/technical.md` โดยไม่ได้แก้เอกสารต้นทาง

## เปิดใช้งาน

เปิด Terminal ในโฟลเดอร์นี้:

```powershell
cd D:\A_SIT04\SIT4-TERM1\a_M_CapStone\POC-Phaser\DemoFinal\TestUI
npm install
npm start
```

เปิด `http://localhost:4175` หรือ `http://localhost:4175/overview.html` เพื่อดูภาพรวม 21 หน้า

เปิดอีก Terminal ในโฟลเดอร์เดียวกันสำหรับเสียง กล้อง และแชร์หน้าจอ:

```powershell
npm run media:start
```

คำสั่ง media ดาวน์โหลด LiveKit Server 1.13.9 สำหรับ Windows x64 จาก release ทางการ ตรวจ SHA256 แล้วรันบน localhost พอร์ต 7880 / 7881 / 7882 ไฟล์อยู่ใน `.runtime/livekit` และไม่รวมใน Git การดาวน์โหลดครั้งแรกต้องใช้อินเทอร์เน็ต

Colyseus ต้องใช้ Node.js 22.22 ขึ้นไป ถ้า Node หลักเก่ากว่าและมี bundled runtime ของ Codex ตัว launcher จะใช้ Node 24 ของ bundle อัตโนมัติ เครื่องอื่นให้ติดตั้ง Node 22.22+ หรือกำหนด `CONNECTA_NODE` เป็น path ของ node.exe ที่รองรับ

หยุดด้วย Ctrl+C ในแต่ละ Terminal ไม่มี service เบื้องหลังอัตโนมัติ ฟอนต์และ asset อยู่ในเครื่อง การเปิด index.html แบบ file:// ไม่รองรับ Phaser/media ให้ใช้ local server

## ทดลอง Hall และ media

1. เปิดสองแท็บที่ `http://localhost:4175/#hall`
2. เลือก account ด้านขวาบน แท็บหนึ่งเป็น Presenter booth 02 อีกแท็บเป็น Visitor
3. กด Map แล้วเลือก A07 ทั้งสองแท็บเพื่อไปบูธ 02
4. ไมค์ปิดตอนเข้า กดเปิดเองเมื่อต้องการพูด Visitor เปิดกล้อง/แชร์จอไม่ได้
5. Presenter กดบูธเพื่อเปิดรายละเอียดแล้วกด Start presenting ผู้ชมในบูธจะถูกปิดสิทธิ์ publish ไมค์ที่ LiveKit server
6. Presenter เปิด Camera หรือ Share ได้เฉพาะบูธที่ได้รับมอบหมาย เดินออกแล้วสิทธิ์ภาพถูกถอน ผู้ชมที่ออกจากโซนหยุด subscribe จอ/กล้อง
7. Visitor ยกมือ Presenter เปิด People แล้ว Offer mic ผู้รับต้องกด Accept microphone ก่อนเปิดไมค์ คืนอัตโนมัติเมื่อออกจากบูธหรือหลุด
8. Do not disturb หยุดทั้งการฟังและการส่งเสียง LiveKit ใช้ห้องเดียวต่อ Hall

บัญชีด้านขวาบนเป็น named demo accounts ที่ server กำหนด role และบูธให้ ใช้เพื่อทดลองสิทธิ์ media ยังไม่มี OAuth หรือระบบบัญชี production

## แผนที่และการเดิน

ใช้ `D:/Downloads/map-tiled (2).zip` เป็น source เก็บ TMJ, TSJ, PNG และ prefab ครบใน `assets/maps/exhibition/` ไม่แก้ไฟล์ต้นฉบับ

- แผนที่ 1344×832, tile 32px, 5 booth areas, 204 placed objects
- Collision 45 สี่เหลี่ยม รวม Collision layer กับ footprint ของเฟอร์นิเจอร์
- Phaser ใช้ Tilemap สำหรับ floor atlas จาก PNG เดิม ส่วน image-collection objects โหลดแยกตามตำแหน่ง ขนาด depth และ interaction metadata
- Spawn จากแมป คลิกเพื่อเดินด้วย grid pathfinding หรือ WASD/ลูกศร กด E ในบูธเพื่อเปิดรายละเอียด
- NPC ครบ 14 รายการ หลบ collision สลับพัก ใช้ idle sheet 6 ตัวและ breathing fallback 8 ตัว
- สร้าง runtime และ minimap ซ้ำด้วย `scripts/import-map.py` โดยใช้ Python ที่มี Pillow

ภาพหลัก Landing ใช้ lobby.png ภาพแผนที่ในหน้าอื่นใช้ minimap ที่ประกอบจาก PNG ของ ZIP

## ฟีเจอร์

ส่งผลงาน/CSV, allocation preview, ค้นหาและวาร์ป, ตารางนำเสนอรายบูธ, Poster viewer และ viewport sync, presentation และ Pass the Mic, consent/DND, proximity/public chat, weighted rubric ที่แก้ได้จนปิดรอบ, Feedback/Vote, Moderation/audit, gallery, recap, contact exchange/callback, analytics sample และ Platform Admin preview

AI และ 3D เป็น optional UI workflow ปิดโดย default รายละเอียดสถานะอยู่ใน FEATURES.md และผลทดสอบใน VERIFICATION.md

## ขอบเขต

Phaser, Colyseus presence/chat/poster messages และ LiveKit media ทำงานจริงบน localhost ส่วนงาน/ผลงาน/คะแนน/feedback/vote/report/contact/analytics เป็นข้อมูลตัวอย่างหรือ localStorage

ยังไม่ย้ายเว็บไป Next.js/NestJS และไม่เพิ่ม DB, OAuth, MinIO, LLM/RAG, payment, PDF upload conversion หรือ deployment การจัด Hall เพิ่มจาก CSV เป็น allocation preview ส่วน Hall runtime ใช้ template ที่ให้มาเพียงหนึ่ง Hall Moderation UI ไม่เปลี่ยนสิทธิ์ named media test accounts

ไม่ได้ทดสอบอุปกรณ์เสียงจริง NAT/TURN ต่างเครือข่าย หรือโหลดจำนวนมาก การทดสอบ media ใช้ synthetic audio/video ระหว่างสอง browser contexts

```powershell
npm run build
npm run check
npm test
```
