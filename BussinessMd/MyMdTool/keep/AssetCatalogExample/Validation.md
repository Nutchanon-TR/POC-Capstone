# ผลตรวจตัวอย่าง

ตรวจวันที่ 2026-10-11

- ขนาด PNG ที่ใช้ใน card ตรงกับข้อมูล TSJ และ spritesheet ตรงกับ 6 × 4 เฟรม
- ภาพกำกับ SVG และการคำนวณ scale/collision ใช้ข้อมูลจาก source โดยตรง
- เปิด HTML แบบ offline ด้วย Microsoft Edge ผ่าน Playwright โหลดภาพครบ 6 จุด และลิงก์ไฟล์หลักครบ 3 จุด
- ตรวจหน้า 1360 × 1000 และ 390 × 844 ไม่พบ horizontal overflow ของหน้า
- มี card เฟรม 24 ช่อง ปุ่มเปลี่ยนทิศ เล่น/หยุด และกลับ idle ทำงาน ไม่มี browser error
- ดูภาพ screenshot แล้ว ข้อความไทย รูปภาพ และสีแยก geometry แสดงได้

ภาพตรวจ:

- [หน้า catalog](CatalogPreview.png)
- [รายละเอียด character](CharacterPreview.png)
- [หน้าจอมือถือ](CatalogMobilePreview.png)

การตรวจนี้เป็นการตรวจเอกสารและ preview เท่านั้น ไม่ได้รันเกม ไม่ได้ทดสอบ movement/collision ใน Phaser และไม่ได้รับรอง footprint หรือ artwork ที่ยังเป็น unresolved

สคริปต์ build_catalog.py อ่าน TSJ/TMJ/recipe/config และคัดลอก PNG จาก Editor แล้วเขียนไฟล์เฉพาะใน AssetCatalogExample สคริปต์ verify_catalog.cjs ใช้ browser แยกแบบ headless และเขียน screenshot เฉพาะในโฟลเดอร์นี้ ไม่เปลี่ยนคู่มือเดิมหรือโค้ดเกม
