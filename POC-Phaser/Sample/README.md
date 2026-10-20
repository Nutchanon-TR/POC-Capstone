# Connecta Phaser sample

POC สำหรับเดินในแมปจริงและเปิดคอมพิวเตอร์ พร้อมตัวอย่างสถาปัตยกรรมที่อ่านตามได้ ใช้ Next.js 16.4.0 App Router, React, Tailwind CSS, Ant Design และ Phaser 4.2.1

Next.js เป็น framework ของเว็บ ส่วน Phaser รันเฉพาะฝั่ง browser ใน Client Component โดยโหลดผ่าน dynamic import และปิด SSR สำหรับ canvas อ่านรายละเอียดการย้ายรุ่นได้ใน [Architecture](docs/ARCHITECTURE.md)

## เปิดใช้งาน

ต้องมี Node.js 20.9 ขึ้นไป รุ่นที่ใช้ตรวจงานนี้คือ 20.19.2

```powershell
cd D:\A_SIT04\SIT4-TERM1\a_M_CapStone\POC-Phaser\Sample
npm ci
npm run dev
```

เปิด [http://127.0.0.1:3100](http://127.0.0.1:3100)

- คลิกแมป แล้วใช้ WASD หรือปุ่มลูกศรเพื่อเดิน
- เดินเข้าหน้าบูธที่มีคอมพิวเตอร์จนขึ้นกรอบสีเขียว แล้วกด E
- บนมือถือใช้ปุ่มทิศทางและปุ่มเปิดคอม
- ปุ่มลูกศรวนกลับไป `Spawn_Player` เดิม
- เปิด switch เพื่อดู collider สีแดง และกรอบเท้าสีน้ำเงิน
- เปิด "คู่มือโค้ด" เพื่อดู architecture และ syntax ในหน้าเว็บ

คอมพิวเตอร์ 4 เครื่องอ่านจาก metadata ของไฟล์ที่ให้มา การเปิดแผงและปุ่มด้านในเป็นการทดลองใน browser ไม่มี backend หรือการบันทึกข้อมูล

## อ่านจากตรงไหน

1. [Architecture](docs/ARCHITECTURE.md) อธิบายเจ้าของ state, dependency และการตัดสินใจ
2. [Learning](docs/LEARNING.md) อ่าน TypeScript, React และ Phaser ผ่านโค้ดนี้
3. [Assets](docs/ASSETS.md) ระบุพิกัดและ contract ของ editor export
4. [Validation](docs/VALIDATION.md) ระบุสิ่งที่ทดสอบจริงและข้อจำกัด

```text
src/
  app/                       Next.js route, layout และ CSS
  features/playground/       UI, AntD และ lifecycle ที่ mount เกม
  game/
    bridge.ts                command/snapshot interface
    domain/                  ข้อมูลโลก, movement, interaction
    tiled/                   validation และแปลง editor export
    phaser/                  Scene, input, camera, asset manifest
public/assets/
  map/                       ไฟล์ ZIP เดิม
  characters/               ไฟล์ต้นฉบับ + spritesheet ที่จัดเฟรมแล้ว
scripts/                     จัดเฟรมตัวละครซ้ำได้
tests/                       กติกาและ browser integration
docs/                        คู่มือภาษาไทย
```

## ตรวจงาน

```powershell
npm run typecheck
npm test
npm run build
```

Browser test ใช้ Playwright เลือกอย่างใดอย่างหนึ่ง

```powershell
# ใช้ Chrome ที่ติดตั้งในเครื่อง
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:browser
```

หรือใช้ Chromium ของ Playwright

```powershell
npx playwright install chromium
npm run test:browser
```

สร้าง spritesheet ใหม่จากไฟล์ต้นฉบับที่เก็บใน Sample

```powershell
npm run assets:prepare
```

เปิด production build

```powershell
npm run build
npm start
```

หยุด dev server ก่อน `npm start` เพราะใช้ port 3100 เหมือนกัน dependencies ระบุรุ่นและมี package-lock.json เพื่อให้ `npm ci` ติดตั้งชุดเดียวกัน
