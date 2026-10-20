# ผลการตรวจ Sample

ตรวจเมื่อ 14 ตุลาคม 2026 หลังย้ายเป็น Phaser 4.2.1 บน Next.js 16.4.0 App Router, Windows, Node.js 20.19.2 และ Chrome ผ่าน Playwright

## ตรวจโค้ดและ build

- `npm run typecheck` ผ่าน
- `npm test` ผ่าน 7 กรณี
- `npm run build` ผ่าน สร้าง route หน้าแรกและ icon ได้
- npm audit ตอนติดตั้ง dependencies ไม่พบ vulnerabilities ในชุดที่ติดตั้ง

## Domain และ asset contract ที่ทดสอบ

1. อ่านแมปจริง ได้ 1344 × 832px, spawn 160/736, objects 212, คอม 4 เครื่อง และพิกัด top-left/depth ตาม export
2. ความเร็วทแยงเท่ากับเดินตรง และไม่ mutate state ของ caller
3. ชนกำแพงบางแล้วไม่ทะลุ แต่ยังเลื่อนตามขอบได้
4. เปิดคอมบูธ 01 จากหน้าโต๊ะได้ และจุดเกิดอยู่นอกระยะเปิดคอม
5. `interactEnabled=false` ถอนเฉพาะ interaction ไม่ถอนรูป
6. scaled interaction bounds และ layer offsets คำนวณหนึ่งครั้ง
7. unsupported orientation/profile ถูกปฏิเสธที่ parser

## Browser integration ที่ทดสอบ

`PLAYWRIGHT_CHANNEL=chrome npm run test:browser` ผ่าน 5 กรณี

ก่อนทดสอบเกม ตรวจ `data-phaser-version` ที่อ่านจาก `Phaser.VERSION` ว่ารัน 4.2.1 จริง ไม่ได้โหลด bundle ของ Phaser 3 ที่ค้างอยู่

1. ใช้ keyboard เดินจาก spawn ไปคอมบูธ 01 จริง กด E เปิด Modal, เกมหยุดเดิน, กดปุ่ม React, ปิดคืน focus และ reset
2. เปิด debug/คู่มือ, สลับบทอ่าน, หยุด keyboard ระหว่างเปิด, ปิดและ reload แล้วยังมี canvas เดียว
3. หน้าจอ 390 × 844px ไม่มี horizontal overflow ปุ่มมือถือเดินและหยุดเมื่อปล่อย
4. จำลอง map.tmj ตอบ 404 แล้วแสดง retry และกลับมาเล่นได้หลัง reload
5. เปิดคู่มือขณะแมปยังโหลด เมื่อเกมพร้อมยังคง pause

ตรวจภาพ desktop 1440 × 1000px, mobile 390 × 844px และ normalized sprite sheet เพิ่มเติมผ่าน screenshot เปิด/ปิด fullscreen แล้วมี canvas เดียวและ camera ปรับตามขนาด

เปิด production build ด้วย `next start` และทดลองโหลดโลก เดิน reset เปิด debug และเปิด/ปิดคู่มือ พบ canvas เดียวและไม่พบ JavaScript runtime exception ตรวจไฟล์ทั้ง 32 entries ใน ZIP และ sprite source แล้วเนื้อหาเหมือนต้นฉบับทุกไฟล์

## ขอบเขตของผลนี้

- เป็น single-player local POC ไม่มี backend, account, multiplayer, voice หรือ persistence
- Browser test เดินเปิดคอมที่บูธ 01 ส่วน parser ตรวจว่าข้อมูลคอม 4 เครื่องถูกอ่าน ไม่ได้ทดสอบเดินทุกเส้นทางไปทุกบูธ
- ยังไม่ได้ทำ performance benchmark บนอุปกรณ์จริง หรือทดสอบ session ยาวหลายชั่วโมง
- ยังไม่ได้ทดสอบ touch บนโทรศัพท์จริง การทดสอบ mobile ใช้ viewport และ pointer events ใน Chrome
- จุดชนเป็น rectangle, input เป็น keyboard/ปุ่มทิศทาง ไม่มี click-to-walk หรือ pathfinding
- Assets รองรับ editor profile ที่ให้มา อ่าน docs/ASSETS.md ก่อนเปลี่ยนไฟล์แมป

Tests เป็นหลักฐานของพฤติกรรมที่ระบุ ไม่ใช่คำยืนยันว่า implementation นี้พร้อม production ทุกกรณี
