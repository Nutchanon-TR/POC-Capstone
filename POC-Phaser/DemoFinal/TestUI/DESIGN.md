# Connecta UI

## ภาพรวม

ใช้สีและลำดับตัวอักษรจาก handoff: primary #1d5cf5, ink #0f1a3a, background #f6f7fb, white, lavender #e6dcfb และ orange #ff6a1a ตัวอักษร Plus Jakarta Sans พร้อม Noto Sans Thai fallback ฟอนต์อยู่ใน assets/fonts

Landing ใช้ lobby.png ของ handoff พร้อมหน้า event discovery และตัวละครตกแต่งในส่วนอื่น Hall ใช้ Phaser 4.2.1 โหลดแผนที่จาก map-tiled (2).zip วาง UI ด้วย HTML รอบขอบจอ รายละเอียดเปิดในแผงข้าง ไม่บังกลางแผนที่โดย default

## หน้าจอ

home, events, signup, signin, event, avatar, hall, judge, schedule, presenter, organizer, create-event, analytics, profile, submission, submissions, judging-setup, moderation, gallery, recap, platform

All screens เปิดหน้าจอสำหรับ review บทบาทต่าง ๆ ได้ Module judging ที่ปิดจะซ่อนลิงก์ Judge และ Judging setup ส่วน Feedback, Popular Vote, AI และ 3D ซ่อน UI ที่เกี่ยวข้องเมื่อปิด

## Hall

- แผนที่ 1344×832, floor tile 32px, ช่องบูธ 5 ช่อง, วัตถุ 204 ชิ้น และ collision 45 สี่เหลี่ยม
- เก็บ TMJ/TSJ/PNG/prefab ต้นทางครบ ใช้ floor atlas ที่สร้างจาก PNG เดิมเพื่อ render Tilemap ส่วนวัตถุ image collection ใช้ข้อมูลตำแหน่งและ depth จาก source
- Spawn จากแมป, keyboard/คลิกเดิน, pathfinding, minimap และวาร์ปไปบูธ
- ตัวละคร 14 รายการจาก Example01/02, idle sheet 6 รายการ, breathing fallback 8 รายการ
- NPC เป็นของตกแต่ง แยกตัวนับออกจาก real participants ของ Colyseus
- เลขบูธและสถานะ Presenter/occupancy แสดงบนแผนที่
- DOM panel รับ input แยกจาก Phaser เพื่อป้องกันคลิกทะลุลงแมป

## Motion และ accessibility

Page reveal, panel/modal transition และ button feedback ใช้ transform/opacity มี pause และ prefers-reduced-motion NPC หยุดเดินเมื่อปิด motion และมี keyboard navigation / focus ใน HTML UI

## ขอบเขต

Feature forms, คะแนน, Feedback, Vote, report และ contact เป็น local/sample ตามขอบเขตต้นแบบ Media และ Hall เป็น runtime ที่ทดสอบจริง รายละเอียดอยู่ใน FEATURES.md และ VERIFICATION.md ยังไม่มี migration ทั้งเว็บหรือ backend product stack เพิ่มเติม
