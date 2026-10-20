# ภาพต้นทางและชิ้นโปร่งใสของชุด event-starter

ไฟล์ furniture.png, decor.png, structure.png ระดับนี้เป็นภาพต้นทางดิบสำหรับ cleanup

ชิ้นโปร่งใสที่เก็บแล้วแยกตามภาพรวม:

- furniture/individual/: เฟอร์นิเจอร์ 40 ชิ้น
- decor/individual/: ต้นไม้และของตกแต่ง 18 ชิ้น
- structure/individual/: พื้น/กำแพง/กระจก/ประตู/เสา 93 ช่องโมดูล รวมช่องซ้ำ

แต่ละโฟลเดอร์มี sheet.png, sheet-native.png และ inventory.json
inventory.json ระดับนี้รวมทั้งชุด และอ้าง image_path สัมพัทธ์ถึง PNG ชิ้นจริง
ย้ายจาก outputs/event-starter-corrected-v1 แล้ว ตรวจ SHA-256 ครบ 151 ไฟล์ตาม relocation.json

ใช้ ../scripts/build-preview.py --output-dir โฟลเดอร์นี้ เพื่อต่อภาพทดลองจากชิ้นที่ย้ายแล้ว
อ่านขั้นตอนเต็มใน [PixelPipelineGuide.md](../PixelPipelineGuide.md)
