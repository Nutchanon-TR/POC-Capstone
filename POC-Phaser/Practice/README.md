# Phaser Practice

ชุดฝึก Next.js + TypeScript + Phaser โดยค่อย ๆ เขียนตามในแชต

สถานะปัจจุบันคือ **บทที่ 0** มีหน้าเว็บและไฟล์ภาพพร้อมแล้ว แต่ยังไม่มีโค้ด Phaser
ติดตั้ง Phaser 3.90.0 ไว้ให้ตรงกับ `../Project` ส่วน `../Sample` ใช้ Phaser 4 จึงไม่ควรคัดลอก API ข้ามกัน

## เปิดโปรเจกต์

เปิด Terminal ในโฟลเดอร์ Practice แล้วรัน:

```powershell
npm run dev
```

เปิด <http://127.0.0.1:3200> ต้องเห็นข้อความ “รอ canvas แรกของเรา”
พื้นที่สีเทายังเป็น HTML ไม่ใช่ canvas และยังไม่มีเกมทำงาน

ติดตั้ง dependencies ไว้แล้ว หากย้ายเครื่องหรือไม่มี node_modules ให้รัน `npm ci` ก่อน
ใช้ Node.js ตั้งแต่ 20.9 ขึ้นไป ตรวจเครื่องนี้ตอนเตรียมได้ 20.19.2

```powershell
npm run typecheck
npm run build
```

`typecheck` ตรวจชนิดข้อมูล ส่วน `build` ตรวจว่าสร้างเว็บได้ ไม่ต้องรันใหม่ทุกครั้งที่วางโค้ด
ระหว่างฝึกใช้ dev server และดูผลในเบราว์เซอร์ก่อน

## ไฟล์ที่เตรียมไว้

```text
Practice/
  src/
    app/
      layout.tsx          โครง HTML และข้อมูลชื่อเว็บ
      page.tsx            หน้าเริ่มต้นที่แสดงพื้นที่ทดลอง
      globals.css         รูปแบบหน้าตาเว็บ
    components/
      GameHost.tsx        พื้นที่ HTML ที่จะเริ่มต่อ Phaser ในบทแรก
  public/assets/
    expo/                 TMJ + TSJ + รูปจาก Project
    characters/           ภาพตัวละครจาก Sample สำหรับบทถัดไป
  docs/
    LEARNING.md           ลำดับฝึกและรูปแบบการสอน
    ASSETS.md             เส้นทางไฟล์และข้อมูลจริงในแผนที่
```

ตอนนี้ยังไม่สร้าง `src/game` หรือเขียนตัวโหลดแผนที่ให้ล่วงหน้า
เราจะเพิ่มไฟล์เมื่อถึงบทที่ใช้ เพื่อให้ตามได้ว่าทุกไฟล์เกิดขึ้นมาเพราะอะไร

## วิธีฝึก

แต่ละรอบจะมีเป้าหมายเล็ก ๆ จุดที่ต้องวางโค้ด คำอธิบาย และผลที่ต้องเห็น
ผู้เรียนวางและรันเอง จากนั้นบอกผลหรือส่ง error ก่อนเริ่มส่วนถัดไป
อ่านแนวทางต่อใน [docs/LEARNING.md](docs/LEARNING.md)

## แหล่งอ้างอิง

- ต้นฉบับที่ใช้อ้างอิงหลัก: `../Project` อ่านอย่างเดียว ไม่ลบหรือแก้
- รายละเอียดและที่มาของ assets: [docs/ASSETS.md](docs/ASSETS.md)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js server/client components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Phaser scenes](https://docs.phaser.io/phaser/concepts/scenes)
- [Tiled JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)

package.json ล็อกเวอร์ชันและ package-lock.json บันทึก dependency tree เพื่อให้รอบฝึกใช้ชุดเดียวกัน
