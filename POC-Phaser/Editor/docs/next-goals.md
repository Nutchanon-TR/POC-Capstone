# สถานะเฟส 2 — 2026-10-03

ขอบเขตที่ผู้ใช้ยืนยันและนำมา implementation:

1. จัดแนวเฟรม Kaguya และลดความเร็ว animation: จุดกึ่งกลางศีรษะเดิมเหลื่อม 11 source pixels ต่อแถว หลังจัดตำแหน่งเหลื่อม 0 ในตัวตรวจวัด ใช้ 6 fps และ anchor เท้าเดียวกัน
2. Interaction เฉพาะบูธที่มี NPC หนึ่งจุด: กด E หรือปุ่ม เปิดบทสนทนา/ข้อมูลบูธ ไม่มีลิงก์ภายนอก
3. NPC InternWitch หนึ่งตัว เดินกลับไปมาหน้าบูธ booth3-4 หยุดขณะคุย ใช้ตัวเดียวกันเป็นผู้ดูแลและสัญญาณว่าบูธนี้คุยได้
4. สลับผู้เล่น Kaguya / InternWitch โดยคงพิกัดเท้าและ hitbox
5. Web editor: เพิ่ม/ย้าย/ลบ prop, ปรับขนาด prop, ย้ายบูธเป็นกลุ่ม, ระบายพื้น, เปลี่ยน spawn, แก้บทสนทนา, Undo/Redo, preview, Import/Export TMJ และ ZIP สำหรับ Tiled
6. NestJS 11.2.7 บน Node 20; PostgreSQL 16 ใน Docker เดิม สร้าง DB ใหม่ connecta_editor และ role เฉพาะ ไม่เปลี่ยนฐานข้อมูลอื่น
7. แมปหลักเก็บ JSONB; compiler ชุดเดียวแปลงเป็น runtime ให้ editor/API/CLI; validation และ revision ป้องกันการเขียนทับฉบับใหม่กว่า

Editor รองรับ blueprint และ PNG asset ใหม่แล้ว ดู docs/map-studio.md ส่วน login, multi-user permissions, ร่วมแก้แมปแบบ realtime, ZIP import และ character spritesheet import ยังไม่มี

การแก้จาก Tiled: ZIP → แตกไฟล์ → เปิด exhibition.tmj → แก้/บันทึก → Import TMJ ในเว็บ → ทดลองเดิน → บันทึก DB

# เฟส 3 — ผู้เล่นหลายคนและเสียง, 2026-10-05

ตามคำขอให้ทดลองสองตัวละครคุยผ่านไมค์:

1. แยกตัวตนผู้เล่นต่อหน้าต่าง เห็นตำแหน่ง ทิศทาง แอนิเมชัน และตัวละครที่อีกคนเลือก ผ่าน NestJS Socket.IO
2. LiveKit self-hosted ใน Docker ไม่ต้องสมัคร Cloud; NestJS ออก token ให้เอง
3. ห้องเสียงรวมของแมป/ฉบับเดียวกัน: เข้าร่วมแบบปิดไมค์, เปิด/ปิดไมค์, รายชื่อและสถานะผู้พูด, ออกจากห้อง
4. ปิดการจับเสียงและการเชื่อมต่อเมื่อออกจากหน้าสำรวจ; editor preview ไม่เข้าห้องเสียง
5. รอบนี้ทดลองสองหน้าต่างในเครื่องเดียว ยังไม่มี proximity voice, ห้องแยกบูธ, login, บันทึกเสียง หรือ NPC พูดด้วยเสียง

รายละเอียดการรันและขอบเขตอยู่ [voice-architecture.md](voice-architecture.md)
