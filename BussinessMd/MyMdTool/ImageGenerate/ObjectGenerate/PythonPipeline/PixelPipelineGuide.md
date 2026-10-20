# Flow สร้าง Asset และ Map component แล้วต่อภาพทดลองด้วย Python

Version: 1.1
อัปเดต: 2026-10-12

คู่มือนี้เก็บ flow ที่ผู้ใช้เลือก: ใช้ image generation สร้างภาพต้นทางตาม ref แล้วใช้ Python เก็บพิกเซล สี สเกล กริด และประกอบภาพทดลองจากชิ้นจริง
เมื่อผู้ใช้สั่งให้ทำตาม flow นี้ ให้ทำ Python cleanup และ Python assembly เป็นส่วนของงาน ไม่จบที่ภาพเจนดิบ และไม่ถามใหม่ว่าจะให้ใช้ Python หรือไม่ เว้นแต่ผู้ใช้เปลี่ยนคำสั่ง
คำสั่งล่าสุดของผู้ใช้ยังมีลำดับความสำคัญสูงกว่าค่าเริ่มต้นในคู่มือนี้

## เริ่มแชทใหม่จากไฟล์

ต้องอ่าน [ObjectAssetGuide.md](../ObjectAssetGuide.md), [MapComponentGuide.md](../MapComponentGuide.md), [MapStandard.md](../../Standard/MapStandard.md), [ReferenceImageGuide.md](../../Standard/ReferenceImageGuide.md) และ MD ที่เกี่ยวข้องใน CharacterGenerate ก่อน
ใช้ไฟล์จริงเป็นหลัก ไม่ต้องมีประวัติแชทเดิม ไม่เดา scale จาก frame ที่มีพื้นที่ว่าง

ตำแหน่งชุด Python ถาวร:
`D:/A_SIT04/SIT4-TERM1/a_M_CapStone/BussinessMd/MyMdTool/ImageGenerate/ObjectGenerate/PythonPipeline/`

- [run-pipeline.py](run-pipeline.py): รันเก็บภาพ ตรวจไฟล์ และต่อภาพทดลองด้วย Python ในคำสั่งเดียว
- [scripts/prepare-pixels.py](scripts/prepare-pixels.py): แยกชิ้น ลดสี เก็บ alpha ปรับขนาดคงอัตราส่วน จัด atlas วาดชิ้นโครงสร้างบนกริด และออก inventory/audit
- [scripts/build-preview.py](scripts/build-preview.py): อ่าน PNG ที่เตรียมแล้วกับ inventory วางบนพื้นตาม ground origin/foot anchor และลำดับการบัง ไม่เรียก image generation
- [requirements.txt](requirements.txt): ต้องมี Pillow กับ NumPy
- sample-source/: ภาพต้นทางเก่าของชุด event-starter สำหรับรันทวน flow ไม่ใช่ style ref อัตโนมัติของงานใหม่; structure.png เก็บเป็นต้นทางอ้างอิง แต่สคริปต์ปัจจุบันวาดโครงสร้างด้วย geometry ไม่อ่านรูปนี้เพื่อสร้าง atlas

สำเนาสคริปต์เดิมและผลชุดก่อนอยู่ที่:
`D:/A_SIT04/SIT4-TERM1/a_M_CapStone/POC-Phaser/Editor/outputs/event-starter-corrected-v1/`

ไฟล์เหล่านี้เก็บบนดิสก์ ไม่อยู่เฉพาะในหน่วยความจำของแชท การออกจากแชทไม่ลบไฟล์ อย่าลบ PythonPipeline เมื่อเก็บกวาด outputs

## ชิ้นโปร่งใสแยกตามภาพรวม

ย้ายชิ้นที่เตรียมแล้วของ event-starter-corrected-v1 มาไว้ใน sample-source แล้ว:

| โฟลเดอร์ | ภาพรวมหลังเก็บ | ชิ้นโปร่งใส |
|---|---|---|
| sample-source/furniture/ | sheet.png และ sheet-native.png | individual/ จำนวน 40 ชิ้น |
| sample-source/decor/ | sheet.png และ sheet-native.png | individual/ จำนวน 18 ชิ้น |
| sample-source/structure/ | sheet.png และ sheet-native.png | individual/ จำนวน 93 ชิ้น |

แต่ละโฟลเดอร์มี inventory.json ของตัวเอง และ sample-source/inventory.json รวมทั้งชุด โดย image_path เป็นพาธสัมพัทธ์จาก sample-source
ไฟล์ furniture.png, decor.png และ structure.png ที่ระดับ sample-source ยังคงเป็นภาพต้นทางดิบ ใช้กับ cleanup เหมือนเดิม ชิ้นในโฟลเดอร์ individual เป็นผลหลัง cleanup อย่าป้อนภาพรวมที่เก็บแล้วแทน raw input โดยไม่ตรวจ layout
relocation.json บันทึกตำแหน่งเดิม ตำแหน่งใหม่ และ SHA-256 ของชิ้นที่ย้ายครบ 151 ชิ้น
inventory ของผลชุดเดิมอ้างชิ้นที่ย้ายแล้วผ่าน image_path และ build-preview.py อ่านพาธนี้ได้ ไม่ต้องสร้างชิ้นซ้ำในตำแหน่งเก่า
เมื่อจัดเก็บชุดอื่น ให้ใช้โฟลเดอร์ชื่อภาพรวม/ชุดนั้น และเก็บ PNG ชิ้นแยกคู่กับ inventory อย่าเขียนทับชุดที่มีอยู่

ต่อภาพทดลองจากชิ้นใน sample-source โดยตรง:

```powershell
& $pixelPython "$pixelPipeline/scripts/build-preview.py" --output-dir "$pixelPipeline/sample-source"
```

ผลจะอยู่ใน sample-source/assembly-preview.png และภาพพื้นต่อซ้ำใน sample-source/structure/

## Flow ที่ต้องทำ

1. เลือก ref จากไฟล์จริงตามกติกา named-only/all-in-directory ใน ObjectAssetGuide แยกบทบาท style, design, layout และ edit target ภาพตัวอย่างใน PythonPipeline ไม่ถูกเพิ่มเป็น ref เอง
2. อ่านสเกลจากคู่มือกลางกับ CharacterGenerate แล้วประกาศ world tile, native pixel unit, ขนาดตัวละครที่มองเห็น, footprint, anchor และความสูงโครงสร้าง ค่า 32 px และตัวละครสูง 64 px ในสคริปต์เป็นค่าของตัวอย่างเดิม ต้องตรวจใหม่เมื่อ profile เปลี่ยน
3. แยกรายการ Asset กับ Map component ก่อนสร้าง แยกไฟล์ผลลัพธ์ ให้ทิศหน้า/หลัง/ซ้าย/ขวาของแบบเดียวกันมีโครงและ footprint สัมพันธ์กัน ห้ามสร้างแบบใหม่เมื่อเปลี่ยนทิศ
4. ใช้ image generation สร้าง/แก้ภาพต้นทางตาม ref และ Top-down view ที่คู่มือกำหนด เก็บต้นฉบับกับ prompt ใน source/ ไม่เขียนทับต้นฉบับ ชิ้นโครงสร้างที่มีแม่แบบเหมาะสมใช้ Python วาดบนกริดได้ โดยรักษา palette/กล้อง/จุดต่อของงานนั้น
5. ใช้ Python ตัดแยกและเก็บภาพจริง ปรับขนาดคงอัตราส่วนตาม footprint คุม native pixel unit เดียว เลือก palette/material ramp ร่วม แก้สีเงาให้ hue shift ตามที่กำหนด ลบ fringe และทำ alpha 0/255 ใช้ integer nearest-neighbor ในภาพขยาย สร้าง atlas กับ individual PNG
6. เขียน inventory ที่มี ID, ประเภท, ทิศ, crop, footprint, foot anchor หรือ ground_origin เพื่อให้ต่อภาพได้ ห้ามใช้พื้นที่ว่างของ cell เป็นขนาดวัตถุ
7. ตรวจ palette/alpha/grid จากไฟล์จริง พื้นต่อซ้ำอย่างน้อย 3x3 กำแพง/กระจก/วงกบต้องต่อขอบและระดับ trim ตรวจทิศจากภาพจริงด้วย การมี blueprint จำนวนชิ้นส่วนเท่ากันไม่รับรอง geometry ของภาพที่เจน
8. ใช้ Python ประกอบภาพทดลองจาก native PNG ที่ผ่านการเก็บแล้ว วางพื้นก่อน โครงสร้างด้านหลัง ของตามตำแหน่งและการบัง แล้วโครงสร้างด้านหน้า ใช้ anchor กับกริดใน inventory ไม่เจนภาพห้องใหม่แทนขั้นนี้ ถ้ารายการหรือชื่อชิ้นเปลี่ยน ให้แก้รายการวางใน build-preview.py ก่อน
9. ตรวจภาพทดลองทั้งขนาด native กับ integer zoom ถ้าขอบต่อ มุมกล้อง ความหนาพื้นผิว หรือสเกลยังผิด ให้แก้ชิ้นต้นทาง/metadata แล้วประกอบใหม่
10. ส่งแผ่น Asset และ Map component แยกกัน พร้อม native PNG, individual PNG, inventory, audit, ภาพทดลอง และสคริปต์ที่ใช้จริง ระบุข้อที่ตรวจแล้วกับข้อที่ยังต้องทดสอบในเกม

## การใช้สคริปต์ตัวอย่าง

สคริปต์นี้เป็น working template ของ event-starter เดิม ไม่ใช่ตัวแยกภาพทุกแบบอัตโนมัติ
prepare-pixels.py คาด furniture.png ที่แยกเป็น 40 ชิ้นใน 5 แถว แถวละ 8 และ decor.png 18 ชิ้นใน 3 แถว แถวละ 6
ชื่อ ID, ขนาด, palette, รูปแบบโครงสร้าง และรายการในภาพทดลองอยู่ในสคริปต์ ต้องปรับให้ตรงงานใหม่ก่อนรัน ห้ามเปลี่ยน assert ให้ผ่านโดยไม่แก้ inventory และตัวตรวจตามงานจริง
หากต้องการทำชุดเดิมซ้ำ ใช้ sample-source ได้ หากผู้ใช้เปลี่ยน ref ให้สร้าง source ชุดใหม่ ไม่ใช้ sample-source แทนภาพตาม ref ใหม่

ใช้ Python ที่มี Pillow และ NumPy ตัวอย่าง PowerShell:

```powershell
$pixelPython = 'C:/Users/USER HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$pixelPipeline = 'D:/A_SIT04/SIT4-TERM1/a_M_CapStone/BussinessMd/MyMdTool/ImageGenerate/ObjectGenerate/PythonPipeline'
$pixelOutput = 'D:/A_SIT04/SIT4-TERM1/a_M_CapStone/POC-Phaser/Editor/outputs/event-starter-next-run'
& $pixelPython "$pixelPipeline/run-pipeline.py" --output-dir $pixelOutput
```

พาธ Python ข้างต้นเป็น runtime ที่ตรวจใช้ได้ในเครื่องนี้ ณ รอบนี้ ถ้าเครื่องอื่นไม่มี ให้ใช้ Python ที่มี dependencies ตาม requirements.txt
เลือก output-dir ใหม่ต่อรอบ สคริปต์จะปฏิเสธการเขียนทับโฟลเดอร์ที่มี inventory.json แล้ว เพื่อรักษาชุดก่อน

ใช้ source ของงานใหม่ที่เตรียมตาม layout ของ template แล้ว:

```powershell
& $pixelPython "$pixelPipeline/run-pipeline.py" --source-dir 'D:/path/to/new-source' --output-dir 'D:/path/to/new-output'
```

ถ้าต้องการแก้การวางห้องแล้วต่อใหม่ โดยไม่ทำ cleanup ซ้ำ:

```powershell
& $pixelPython "$pixelPipeline/scripts/build-preview.py" --output-dir $pixelOutput
```

## การเก็บผลและข้อจำกัด

run-pipeline.py สำรองภาพต้นทางไว้ใน output/source และบันทึก path/hash ของภาพที่ใช้ใน pipeline-run.json เพื่อย้อนตรวจได้
ผล audit เป็นหลักฐานเรื่องไฟล์ภาพ ไม่รับรอง collision, depth sorting หรือ interactive door ใน Phaser หากยังไม่ได้ทดสอบ runtime
อย่ารับรองว่า Python ทำให้ภาพทุกชิ้นตรง ref หรือ geometry ถูกทั้งหมดโดยอัตโนมัติ การตรวจภาพจริงยังเป็นส่วนบังคับของ flow

ข้อความใช้เริ่มแชทใหม่:

> อ่าน ObjectGenerate/ObjectAssetGuide.md และ PythonPipeline/PixelPipelineGuide.md แล้วทำตาม flow นี้ครบ: สร้างภาพตาม ref ที่ระบุ เก็บพิกเซล/สี/สเกล/กริดด้วย Python แยก Asset กับ Map component และใช้ Python ต่อภาพทดลองจากชิ้นจริง พร้อมส่ง native PNG, inventory และผลตรวจ
