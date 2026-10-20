# สถานะฟีเจอร์ของต้นแบบ

อ่าน features.md และ technical.md จาก `Connecta-virtual-showcase/docs` เพื่อกำหนด UI และเลือก Phaser 4 / LiveKit ให้ตรงโปรเจกต์ เอกสารต้นทางทั้งสองไฟล์ไม่ได้ถูกแก้

| ส่วน | สิ่งที่อยู่ใน demo | ขอบเขต |
|---|---|---|
| Account / registration | แยกบัญชีกับลงทะเบียน, public consent, องค์กร/ตำแหน่ง/ความสนใจ/ประเภท/จังหวัด | ฟอร์ม local ไม่ใช่ OAuth |
| Submission | ส่งผลงาน, สมาชิก/อีเมล, CSV, หมวด, allocation | localStorage, ไม่ออก role จริง |
| Staff | modules, rubric weights, assignments, role UI, ตารางนำเสนอ | named accounts แยกทดสอบ media |
| Hall | TMJ/TSJ, floor tilemap, props, collision, spawn, depth, NPC, คลิกเดิน | Phaser 4.2.1 จริง |
| Search / minimap | ชื่อ/ทีม/keyword, หมวด, วาร์ป 5 บูธ | ผลงานไม่มี slot มีข้อความแจ้ง |
| Booth | รายละเอียด, ทีม, โปสเตอร์, video workflow, callback | sample content |
| Poster viewer | ซูม/เลื่อน follow หรือดูเอง, viewport ไปคนในบูธ | Colyseus จริง, SVG sample |
| Media | ห้องเดียว, microphone off, selective subscribe, hysteresis, volume ตามระยะ | LiveKit self-host จริง |
| Camera / screen | จำกัด Presenter และบูธ, simulcast, หายเมื่อผู้ชมออกโซน | token / server permission + client subscribe |
| Presentation / Pass the Mic | เริ่ม/จบ, ปิดไมค์ audience, ยกมือ/ยื่น/รับ/คืน | LiveKit server permission จริง |
| DND | ไม่ได้ยินและไม่ส่งเสียง | server permission + unsubscribe |
| Text | proximity bubble 6.5 วินาที, public event chat | Colyseus memory ไม่เก็บ DB |
| Judging | weighted score, draft, แก้จนปิดรอบ, publish หลังปิดรอบ | localStorage ไม่ใช่ production authorization |
| Feedback / Vote | anonymous publicly, staff เห็นผู้ส่ง, ซ่อน, จำกัด vote/ต้อง visit | localStorage |
| Moderation | report queue, resolve, mute/kick/ban UI, เหตุผล, audit, emergency | UI sample แยกจาก media test accounts |
| Contact | ขอแลก/การ์ดคำขอ/รับ, callback consent, vCard | sample ไม่มี inbox หรือ DM |
| Analytics | KPI, heatmap, audience/province, no-show, print/CSV | sample ไม่มี analytics backend |
| Post-event | gallery, feedback, presenter/personal recap | local/sample |
| Platform Admin | event list, health placeholder, visible review/audit | UI เท่านั้น |
| AI / 3D | toggle, assistant citations/fallback, feedback summary, shared viewer | ไม่มี LLM/pgvector หรือ GLB asset |

รวม 21 หน้าใน All screens และ overview.html ไม่เพิ่ม technical stack ส่วนอื่น การรับผลงานเกิน 5 ช่องเป็น allocation preview ไม่สร้าง Hall runtime เพิ่มเอง
