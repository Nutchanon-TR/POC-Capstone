# ผลทดสอบ · 17 ตุลาคม 2026

## ตรวจโค้ด

- npm run build ผ่าน: Phaser และ LiveKit client bundle จาก TypeScript
- npm run check ผ่าน: JavaScript syntax และ TypeScript strict
- npm test ผ่าน 7/7: map structure/source images, booth membership, publish sources, presentation mic permissions, DND, proximity/hysteresis

## UI และ Hall

- เปิดครบ 21 routes ที่ desktop 1440×1000 และ mobile 390×844 ภาพไม่หาย ไม่มี page overflow ค้างหลังแก้ schedule
- ตรวจภาพ Landing ใช้ lobby.png และ Hall ใช้แผนที่จาก ZIP
- Phaser runtime รายงาน version 4.2.1, map 1344×832, 204 props, 45 collisions และ NPC 14 ตัว
- ค้นหา Pixel/soil, วาร์ปจาก minimap, เปลี่ยน demo account ระหว่างยืนในบูธแล้ว client/server ยังรายงาน booth-02 ตรงกัน
- Poster zoom 1.25 และการเลื่อน, Feedback, visit-before-vote, submission form, CSV quoted fields, module hiding
- Weighted rubric 40/30/20/10 กับคะแนน 10/8/6/4 ได้ 8.0/10 และยังแก้ evaluation ที่บันทึกได้
- ตรวจการคลิกปุ่มคะแนนไม่ส่งต่อไป object ของ Phaser หลัง DOM panel
- Capture desktop ทุกหน้า, mobile หลายหน้า, ภาพรวม 21 หน้าใน screenshots/

## LiveKit integration

ทดสอบ LiveKit Server 1.13.9 native Windows บน localhost, livekit-client 2.23.0 และ server SDK 2.19.1 ร่วมกับ Colyseus ใช้ browser contexts แยกกันและ synthetic audio/video จาก tests/synthetic-media.js ไม่เข้าถึงไมค์/กล้องจริง

| กรณี | ผล |
|---|---|
| ผู้ใช้เข้า Hall | mic/camera/screen ปิด |
| Presenter เปิดไมค์ คนฟังอยู่ใกล้ | มี audio subscription และ audio element 1 track |
| ผู้ชมวาร์ปออกห่าง | subscriptions เหลือ 0 |
| Presenter camera และ screen ใน booth-02 | ผู้ชมได้รับทั้งสอง video tracks |
| ตรวจ decoded video | ทั้งสอง videoWidth 320, videoHeight 180, readyState 4 |
| ผู้ชมออกจากบูธ | video elements หาย และ subscriptions 0 |
| Presenter ออกจากบูธที่ตนรับผิดชอบ | camera และ screen ถูกถอน publish |
| Do not disturb | subscriptions 0 และ server ปิด publish |
| Visitor เปิดกล้อง / เริ่ม presentation | ถูกปฏิเสธ |
| เริ่ม presentation ขณะ Visitor เปิดไมค์อยู่ | audience microphone ถูกปิดโดย server |
| Offer mic | ไมค์ผู้รับยังปิดก่อนกดยอมรับ |
| Accept microphone | server ให้สิทธิ์และผู้รับเปิด synthetic mic ได้ |
| ผู้ถือไมค์ออกบูธ | holdingMic ถูกคืนอัตโนมัติ |
| Presenter ออกจากบูธ | presentation state ถูกล้าง |

## ขอบเขตการรับรอง

ไม่ได้ทดสอบเสียงจากอุปกรณ์จริง, LAN/ต่างเครือข่าย, NAT/TURN/TLS, load 150 คน หรือ production authentication บัญชีสำหรับ media เป็น named demo accounts ที่ผู้ทดสอบเลือกได้ ไม่ใช่ OAuth หรือระบบสิทธิ์ของ product จริง Windows LiveKit build ไม่รองรับ capacity monitoring

ข้อมูลฟีเจอร์ส่วนอื่นยังเป็น localStorage/sample ไม่รับรอง DB, MinIO, PDF upload conversion, LLM/RAG, payment, automated extra Hall generation หรือ moderation enforcement จริง

ระหว่างส่งมอบหยุด preview server และ LiveKit ที่เปิดเพื่อทดสอบ ผู้ใช้รัน npm start และ npm run media:start ตาม README ได้เอง
