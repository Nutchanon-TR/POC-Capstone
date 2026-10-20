# Asset Catalog Example

เริ่มที่ [Catalog.html](Catalog.html) สำหรับดูภาพกำกับและสัดส่วน หรือ [AssetCatalog.md](AssetCatalog.md) สำหรับอ่านข้อมูลที่นำไปทำ card ได้

- [AssetCardTemplate.md](AssetCardTemplate.md): แม่แบบสำหรับสิ่งของและ character ใหม่
- images/: สำเนา PNG เดิม ไม่มีแก้ artwork
- diagrams/: SVG เอกสารที่แสดงกรอบภาพ collision และ depth ด้วยข้อมูลจริง
- build_catalog.py: สร้างตัวอย่างจาก source ใน Editor เขียนเฉพาะโฟลเดอร์นี้ การรันใหม่เขียนทับเอกสารตัวอย่าง

Profile ใช้ Editor32-v1 จาก [MapStandard.md](../MapStandard.md) ค่าที่ขาดระบุ unresolved ชุดนี้ไม่เพิ่มหรือแก้ TMJ, TSJ, asset catalog หรือ config ที่เกมใช้

ตรวจขนาด PNG, geometry และ link ภายในก่อนส่งมอบ การทดสอบภาพ/physics ในเกมต้องทำอีกขั้นก่อนใช้สถานะ runtime-validated
