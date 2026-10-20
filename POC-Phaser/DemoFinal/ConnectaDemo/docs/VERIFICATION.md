# ผลตรวจ frontend + Phaser

ตรวจใน Windows วันที่ 17 ตุลาคม 2026 ด้วย Node.js 20.19.2, Next.js 16.4.2, Phaser 4.2.1 และ Edge ผ่าน Playwright

ผลรอบสุดท้าย: typecheck, format และ production build ผ่าน; domain/game tests 11/11; browser journeys 3/3 ผ่านใน 38.8 วินาที รวม regression เรื่อง panel resize เมื่อเปิด reduced motion ปิด server ทดสอบพอร์ต 3100, 3110 และ 3120 หลังตรวจเสร็จ

## การตรวจอัตโนมัติ

- `npm run check`: TypeScript strict, no unused locals/parameters สำหรับ source ของเรา แยก `tsconfig.check.json` เพื่อไม่ตรวจ unused imports ที่ Next สร้างเองใน `.next/dev/types/validator.ts`
- `npm run format:check`: รูปแบบ source และ tests
- `npm test`: 11 ข้อ ครอบคลุม scoring weights, closed rounds, visit-before-vote/ขีดจำกัด 3 votes, search, quoted CSV, persisted schema, asset completeness, booth reachability, collision, NPC pause และ bridge cleanup
- `npm run build`: production build ของ App Router
- `npm run test:e2e`: 3 journeys ใช้ production server พอร์ต 3110 ชั่วคราว
  - สมัคร local profile → ลงทะเบียน consent → เลือก Prae → เดิน → วาร์ป booth-02 → กรอกคะแนน → พิมพ์ chat โดยไม่เดิน → reload คะแนน → เข้าออก hall 3 รอบ canvas ไม่ค้าง
  - ส่งผลงาน → approve → reload สถานะยังอยู่ → สร้าง event draft → เห็นใน discovery → ปิด judging module แล้วลิงก์หายและคงสถานะหลัง reload
  - 19 URLs ที่ viewport 1440 และ 390px: HTTP 200, รูปโหลดครบ, document ไม่ล้นแนวนอน

## ตรวจผ่าน browser เพิ่มเติม

- ตรวจภาพ Landing, Lobby, Hall, Workspace ที่ desktop/mobile ใน `screenshots/`
- Hall เปิดด้วย Phaser จริง มี canvas เดียว แผนที่ 1344×832, 204 objects และ 45 collision rectangles
- Keyboard เดินแล้วตำแหน่งเปลี่ยน, warp อยู่ใน slot ที่เลือก, กดคะแนนในแผงไม่เปลี่ยน project และพิมพ์ใน chat แล้วตำแหน่งไม่ขยับ
- เปิด Next dev ใต้ `/capstone26/CP26SSI3`: Link, lobby.png, map JSON, texture และ Phaser hall โหลดสำเร็จ วาร์ป booth-01 ได้ เป็นการตรวจ subpath ในเครื่อง ไม่ใช่การยืนยัน reverse proxy บน VM จริง
- Compiler รันจาก TMJ/TSJ/PNG ที่เก็บในโปรเจกต์ได้ โดยไม่ต้องมี ZIP ใน Downloads
- `npm audit --omit=dev`: ไม่พบ known vulnerabilities ณ เวลาตรวจ ไม่ใช่การรับรอง security ของระบบทั้งหมด

## Regression ที่แก้

- ลดภาพรวมกล้องมือถือให้เป็นกล้องตามผู้เล่น ขนาดตัวละครอ่านได้ และมีปุ่มเดินบนจอ
- เอา margin ของ `.surface + .surface` ที่ไปทำให้การ์ดใน stats grid สูงเหลื่อมกันออก
- การเปิด panel เมื่อเปิด reduced motion ทำให้ native canvas ยังกว้าง 1440px แต่แสดงผล 1070px: `ScaleManager.resize()` ใน RESIZE mode อ่าน parentSize เดิมก่อนอัปเดต bounds แก้เป็นอ่าน `getParentBounds()` แล้ว `refresh()` ใน ResizeObserver ตรวจว่า canvas.width เท่ากับ clientWidth และเพิ่มเงื่อนไขนี้ใน browser journey ที่เปิด reduced motion
- จัดการ abort fetch, scene subscriptions และ destroy เมื่อ unmount; browser ตรวจว่าไม่มี canvas หลังกลับ event page

## ยังไม่ยืนยัน

ยังไม่ได้เชื่อม NestJS, Colyseus, LiveKit, PostgreSQL หรือ MinIO จึงยังไม่ยืนยัน real login, multi-user permissions, audience counts, realtime chat/media, physical camera/microphone, mutual contact exchange, server audit, NAT/TURN, bandwidth, load 150–300 คน และ deployment บนมหาวิทยาลัย ชุดทดสอบนี้ไม่ได้เรียกอุปกรณ์กล้อง/ไมค์จริง

ข้อมูลสาธิต, local records และ NPC ถูกระบุแยกใน UI ปุ่มที่ต้องใช้ realtime backend ปิดอยู่ รายงานและคะแนนเป็นข้อมูลจาก browser นี้เท่านั้น
