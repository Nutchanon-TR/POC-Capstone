# สร้างตัวละครและเตรียม animation

Version: 1.1

อ่าน [MapStandard.md](../Standard/MapStandard.md) และ [ReferenceImageGuide.md](../Standard/ReferenceImageGuide.md) ก่อน ใช้คู่มือนี้กับตัวละครเดี่ยว turnaround หรือ spritesheet เปิดเฉพาะขั้นที่งานต้องใช้

## 1. เลือกโหมดตัวละคร

| โหมด | สิ่งที่ต้องทำ |
|---|---|
| concept | ออกแบบ/เลือกตัวตนและสไตล์ ยังไม่ต้องมีเฟรมเดิน |
| turnaround | มุมที่กำหนดพร้อม scale และ anchor ร่วม |
| animation-source | ท่า/ลำดับภาพต้นทางก่อนจัดช่อง |
| game-ready spritesheet | จัดช่องและตรวจ animation กับ runtime แล้ว |

ไม่สร้างท่า animation หรืออุปกรณ์เพิ่มให้เองหากงานขอเพียงตัวละครเดี่ยว

## 1.1. เลือกภาพ reference จากโฟลเดอร์นี้

REFERENCE FOLDER คือโฟลเดอร์เดียวกับ CharacterAssetGuide.md ปัจจุบันคือ BussinessMd/MyMdTool/ImageGenerate/CharacterGenerate ใช้ตำแหน่งของ MD เป็นหลักเมื่อย้ายชุดคู่มือ

1. ถ้าผู้ใช้ระบุชื่อไฟล์ภาพ ให้ใช้เฉพาะชื่อที่ระบุเป็น local reference ระบุได้หนึ่งไฟล์หรือหลายไฟล์พร้อมนามสกุล
2. ถ้าไม่ระบุชื่อ หรือใช้ค่า auto ให้ใช้ไฟล์ภาพทั้งหมดในโฟลเดอร์ระดับเดียวกับ MD เช่น PNG, JPG, JPEG, WEBP, BMP, GIF, TIF และ TIFF ไม่เลือกเฉพาะภาพแรกและไม่รวม subfolder โดยอัตโนมัติ
3. ตรวจว่าไฟล์มีอยู่จริงและเปิดดูภาพก่อนสร้าง รายงานชื่อไฟล์ที่ใช้ทุกใบ กรณีระบุชื่อแต่ไม่พบให้แจ้งชื่อที่หาไม่พบ ห้ามเปลี่ยนไปใช้ภาพอื่นเงียบ ๆ
4. ถ้าไม่มีภาพหรือเครื่องมือเปิดภาพไม่ได้ ให้แจ้งข้อที่ขาดก่อนอ้างว่าทำตาม reference แล้ว ห้ามเดาจากชื่อไฟล์
5. ภาพ local ที่ไม่ได้กำหนดบทบาทเพิ่มเติมใช้เป็น Proportion Reference และ Visual Style Reference ตามกติกาคู่มือนี้ ไม่ใช้เป็น identity, จำนวนตัวละคร หรือ sheet layout โดยอัตโนมัติ
6. หากผู้ใช้กำหนดบทบาทเฉพาะให้ภาพใด ใช้บทบาทนั้นและระบุภาพที่ใช้ยึดสัดส่วนหัวกับตัวให้ชัด หากขัดกับข้อกำหนดสัดส่วน ให้รายงานความขัดแย้ง
7. เมื่อใช้หลายภาพ อ่านทุกภาพและยึดลักษณะสัดส่วน/วิธีวาดที่ร่วมกัน ไม่ผสมใบหน้า ชุด หรืออุปกรณ์ของคนหลายคนเป็นตัวตนใหม่เอง หากภาพขัดกันมากจนไม่มีมาตรฐานร่วม ให้ระบุจุดขัดแย้งแทนการเลือกจากลำดับไฟล์

ตอนนี้มี [Example.webp](Example.webp) เป็นตัวอย่าง หากเพิ่มภาพอื่นในโฟลเดอร์ ค่า auto จะรวมภาพใหม่ด้วย ชื่อ Example.webp เป็นตัวอย่างปัจจุบัน ไม่ใช่ชื่อ fallback ที่ล็อกตายตัว

ตัวอย่างการเลือก:

```text
LOCAL REFERENCE FILES: MyCharacterReference.webp
LOCAL REFERENCE FILES: Example.webp, AnotherReference.png
LOCAL REFERENCE FILES: auto
```

ชื่อสองตัวแรกในตัวอย่างต้องเปลี่ยนเป็นไฟล์ที่มีอยู่จริง ค่า auto หรือช่องที่ไม่กรอกหมายถึงภาพทั้งหมดในโฟลเดอร์

## 1.2. สัดส่วนหัวกับตัวที่ต้องรักษา

ตัวละครมีหัวเด่นและใหญ่กว่าช่วงลำตัวเล็กน้อย ลำตัวและแขนขากะทัดรัดตามภาพ local reference ที่เลือก ให้ยึดความสัมพันธ์หัวกับตัวของภาพตัวอย่างเป็นหลักทุกครั้ง

- ตรวจทั้งความกว้างหัวเทียบไหล่ และความสูงหัวเทียบช่วงตัว/ขา ไม่ตั้งเปอร์เซ็นต์หรืออัตราส่วนขึ้นเอง
- แยกขอบศีรษะ/ใบหน้าจากผมยาว หมวก และอุปกรณ์ เพื่อไม่ให้ขนาดผมหรือของตกแต่งทำให้ตีความหัวใหญ่เกินจริง
- รักษาหัวที่ใหญ่กว่าตัวเล็กน้อยตามตัวอย่าง ไม่ลดเป็นสัดส่วนผู้ใหญ่สมจริงหรือขยายเป็นหัวโตเกิน reference
- Identity reference ใช้ใบหน้า ผม สี และชุด ส่วนสัดส่วนหัวกับตัวใช้ local proportion reference ตามที่เลือก การแปลงสัดส่วนนี้เป็นข้อกำหนดของงาน ไม่ถือเป็นการเปลี่ยนรูปร่างเอง
- ทุกมุมและเฟรมคงสัดส่วนชุดเดียวกัน การเปลี่ยนท่าไม่ทำให้ขนาดหัวหรือลำตัวเปลี่ยน
- ขนาด frame/padding เป็นข้อกำหนดไฟล์ ไม่ใช้การยืดตัวคนหรือขยายหัวเพิ่มเพื่อเติมช่อง

## 2. ข้อมูลก่อนสร้าง

```text
CHARACTER ID: [ชื่อคงที่]
TASK / MODE: [create / edit / restyle / turnaround / animation]
DELIVERY STAGE: [concept / production-source / game-ready]
PROFILE: [profile/version หรือ none]
REFERENCE FOLDER: [โฟลเดอร์เดียวกับ MD นี้]
LOCAL REFERENCE FILES: [ชื่อไฟล์พร้อมนามสกุล คั่นด้วย comma / auto; ไม่กรอก = ภาพทั้งหมด]
RESOLVED LOCAL REFERENCES: [รายชื่อไฟล์จริงทุกใบที่เปิดดูแล้ว]
PROPORTION REFERENCE: [ไฟล์/ตัวอย่างที่ยึด; ค่า auto ใช้แนวร่วมจากภาพทั้งหมด]
HEAD-TO-BODY PROPORTION: [หัวใหญ่กว่าช่วงลำตัวเล็กน้อยตาม local references]
IDENTITY REFERENCE: [ภาพและคุณสมบัติที่รักษา]
STYLE REFERENCE: [ภาพและวิธีวาด]
IDENTITY LOCK: [ใบหน้า ผม สีผิว รูปร่าง ชุด รองเท้า อุปกรณ์ บทบาท]
ALLOWED CHANGES: [รายการ]
REQUIRED DIRECTIONS: [ordered list]
ANIMATIONS: [ชื่อท่า จำนวนเฟรม idle/repeat]
FRAME SIZE: [source pixels รวม padding]
VISIBLE CHARACTER SCALE: [approved reference หรือ pixel height]
FOOT ANCHOR / ORIGIN: [source pixels และ normalized origin]
DISPLAY SCALE: [อัตราส่วน]
PHYSICS BODY: [size และ offset ก่อน scale]
SHEET LAYOUT / FRAME ORDER: [columns, rows, direction sequence]
BACKGROUND / SHADOW MODE: [ตาม profile]
```

frameRate เป็นความถี่เปลี่ยนภาพ velocity เป็นความเร็วเคลื่อนที่ FPS เป็นอัตราวาด/อัปเดตเกม ต้องระบุแยกกัน การเจนภาพไม่สร้างโค้ดควบคุมการเดินให้อัตโนมัติ

## 3. ล็อกตัวตนและสไตล์

รักษาใบหน้า สี/ทรงผม สีผิว รูปร่าง เสื้อผ้า รองเท้า อุปกรณ์ และบทบาทตาม identity reference ทุกทิศและทุกเฟรม

ใช้สัดส่วนหัวกับตัวจากส่วน 1.2 ร่วมกับ identity lock หากภาพตัวตนมีสัดส่วนสมจริง ให้รักษาตัวตนแล้วปรับสัดส่วนตาม local reference ไม่คัดลอกสัดส่วนสมจริงโดยอัตโนมัติ

- อ่านหน้าและ silhouette ออกที่ขนาดแสดงจริง
- ไม่เปลี่ยนอายุ รูปร่าง gender presentation หรือเพิ่มลักษณะ fantasy เอง
- การ restyle เปลี่ยนรายละเอียดได้เฉพาะที่อนุญาต
- ไม่มีอุปกรณ์หาย เพิ่ม สลับมือ หรือเปลี่ยนสีระหว่างเฟรมโดยไม่ตั้งใจ
- ความไม่สมมาตร เช่นกระเป๋าข้างเดียว ต้องคงตามตัวตนเมื่อเปลี่ยนมุม
- การ flip ภาพใช้ได้เมื่อ runtime และดีไซน์รองรับ ห้ามใช้แทนมุมอีกด้านโดยอัตโนมัติ
- ทุกเฟรมใช้ art scale เดียวกัน ไม่ resize รูปแต่ละเฟรมแยกเพื่อเติมช่อง

## 4. ลำดับสร้าง

1. เลือกไฟล์ตามส่วน 1.1 เปิดดู reference ทุกใบที่เลือก และบันทึกสัดส่วนหัวกับตัวก่อนสร้างต้นแบบเต็มตัว ตรวจตัวตน กล้อง และความสูงเทียบ asset มาตรฐาน
2. ทำมุมที่ต้องใช้ ตรวจด้านหลัง เสื้อผ้า และอุปกรณ์ที่ reference ไม่ได้แสดง ระบุสมมติฐานแทนการอ้างว่าตรงต้นฉบับ
3. ทำเดินหนึ่งทิศทาง ทดสอบจังหวะ การวน loop และ identity drift
4. ทำทิศอื่นเมื่อวิธีจัดเฟรมผ่านแล้ว ใช้ต้นแบบและกติกาเดียวกัน
5. ตัด/จัดแต่ละเฟรมลง canvas เท่ากัน วาง anchor ร่วมและตรวจลำดับ
6. ทดลองในเกมพร้อม physics body ก่อนให้สถานะ runtime-validated

งานที่ผู้ใช้ระบุให้ทำครบในรอบเดียวทำได้ แต่ต้องตรวจตามลำดับและรายงานส่วนที่ยังไม่ผ่าน ไม่อ้างว่าทุกขั้นผ่านเพราะได้ภาพครบแล้ว

## 5. Layout สำหรับ Editor32-v1

ใช้ค่าจาก [มาตรฐานกลาง](../Standard/MapStandard.md) หากเปลี่ยนให้บันทึก override ที่นั่น:

| แถว | ทิศ | เลขเฟรม | Idle |
|---|---|---|---|
| 0 | up | 0–5 | 0 |
| 1 | down | 6–11 | 6 |
| 2 | left | 12–17 | 12 |
| 3 | right | 18–23 | 18 |

นับช่องจากซ้ายไปขวา บนลงล่าง เริ่มที่ 0 มี 6 คอลัมน์ × 4 แถว = 24 เฟรม Frame 288 × 256 ให้ spritesheet หลังเตรียมขนาด 1728 × 1024 source pixels

ระดับ anchor ที่ y = 240 เป็นจุดอ้างอิงการวางเฟรม ไม่ได้หมายความว่า pixel ของเท้าทุกข้างต้องอยู่ตำแหน่งเดียวกันทุกท่า การยกเท้าเป็นส่วนของ animation ได้ แต่ห้ามเลื่อนทั้งตัวหรือเปลี่ยนสเกลจนดูสะดุด

กรอบเฟรมหลัง scale 0.4 คือ 115.2 × 102.4 world pixels รวม padding ส่วน body หลัง scale ประมาณ 25.6 × 12 ความสูงตัวคนที่มองเห็นต้องวัดจากภาพ ไม่เท่ากับกรอบทั้งหมด

Player ปัจจุบันใช้ geometry/body ร่วมกันทั้งสอง character ค่าในไฟล์ config ของ character ใหม่ไม่ได้ทำให้ทุกค่าถูกอ่านแยกให้อัตโนมัติ ต้องตรวจ implementation ก่อนเสนอ geometry ที่ต่างจากเดิม

## 6. พรอมป์ต์เสริมสำหรับตัวละคร

ใช้กับ prompt กลาง เลือกเฉพาะโหมดที่ต้องทำ:

```text
CHARACTER CONTRACT
Character ID: [id]. Mode: [mode]. Profile: [profile].
Selected local reference files: [resolved file list].
If no filenames were specified, use every image file in this guide's folder
as the local proportion and visual-style references.
Inspect the selected images; do not infer their appearance from filenames.
Preserve [identity locks].
Use [style reference] only for construction, edges, colors and shading behavior.
Maintain one visible character scale, consistent outfit details and readable silhouette.

HEAD-TO-BODY PROPORTION LOCK
Follow the selected local reference images for the head-to-body proportions.
Keep the head slightly oversized relative to the compact body, as shown in the examples.
Match the reference relationship between head width, shoulder width and body height.
Do not invent a numeric ratio, exaggerate the head beyond the examples,
or replace the reference proportions with realistic adult anatomy.
Preserve these proportions across every direction and animation frame.
Use identity references for identity and clothing; use the selected local
proportion references for the head-to-body relationship.
Do not copy the example characters, count or sheet arrangement unless requested.

[For a single character]
Pose: [pose]. Expression: [expression].
Do not create animation frames or alternate poses unless requested.

[For turnaround]
Required views: [ordered directions].
Keep height, design details and ground anchor consistent across views.

[For animation]
Animation: [name]. Direction: [direction]. Frames: [count].
Use [approved character] as the identity source for every frame.
Show a coherent movement cycle with a smooth last-to-first transition.
Keep canvas, character scale and ground anchor consistent.
Do not add limbs, remove accessories or shift the entire character between frames.

Target normalized frame size: [source pixels].
Keep [padding] clear and the complete silhouette visible.
Background: [mode]. Shadow: [mode].
Treat exact sheet dimensions and frame alignment as file-preparation targets,
then verify the resulting files before marking them game-ready.
```

## 7. เตรียม spritesheet และ animation data

- วัดกรอบ crop ของแต่ละเฟรมจากภาพจริง หากต้นทางเป็นช่องไม่เท่ากันใช้ crop ที่วัดได้
- รักษาสเกลตัวคนเดียวกัน จัดในช่องโปร่งใสขนาดมาตรฐานและวาง anchor ร่วม
- หากต้อง resize ใช้วิธีตาม style/profile และ transform ตัวเลข crop/body/anchor ที่เกี่ยวข้อง
- Pack ตาม direction/frame order ที่ระบุ ไม่ให้ผู้สร้างภาพเดา layout
- ตรวจจำนวนเฟรม ขนาด sheet, alpha, padding และชื่อไฟล์จริง
- บันทึก frameWidth/frameHeight, frame ranges, idle, frameRate, repeat และ geometry ใน config ที่ runtime รองรับ
- การเพิ่มไฟล์ PNG ไม่ได้ลงทะเบียน character หรือ animation ในเกมให้อัตโนมัติ
- Crop provenance เก็บเพิ่มได้เพื่อทำซ้ำ เป็นบันทึกการเตรียมภาพ ไม่แทน runtime config

Runtime เลือก frame ตามค่าที่ลงทะเบียน ไม่รู้ว่าภาพไหนคือเดินซ้ายจากหน้าตาของรูป หากงานใช้ atlas/เฟรมไม่สม่ำเสมอต้องมี loader รองรับและถือเป็น profile อื่น

## 8. QA เฉพาะตัวละคร

### Visual

- [ ] ตัวตน รูปร่าง ชุด สี และอุปกรณ์ตรงทุกทิศ
- [ ] ใช้ไฟล์ที่ผู้ใช้ระบุ หรือใช้ภาพทุกใบในโฟลเดอร์เมื่อไม่ระบุชื่อ พร้อมรายชื่อไฟล์ที่เปิดดูแล้ว
- [ ] หัวใหญ่กว่าช่วงลำตัวเล็กน้อยตาม reference ที่เลือก ทั้งความกว้างและสัดส่วนความสูง
- [ ] สัดส่วนหัวกับตัวคงที่ทุกทิศ/เฟรม ไม่สมจริงหรือหัวโตเกินภาพตัวอย่าง
- [ ] ไม่คัดลอกตัวตน จำนวนคน หรือ layout จากภาพ local โดยไม่ได้สั่ง
- [ ] สไตล์และกล้องตรง profile
- [ ] ส่วนที่ไม่มี reference ระบุสมมติฐานแล้ว
- [ ] อ่าน silhouette/หน้าออกที่ขนาดแสดงจริง
- [ ] ไม่มี identity drift หรือส่วนร่างกายเกิน/หาย

### File

- [ ] จำนวนช่องและลำดับ up/down/left/right ตรง contract
- [ ] Canvas/frame dimensions และ alpha ตรวจจริง
- [ ] สเกลตัวคนและ anchor คงที่ ไม่มีการตัดผมหรืออุปกรณ์
- [ ] Animation loop ไม่สะดุด ไม่กระโดดทั้งตัว และ idle ถูก
- [ ] Frame config และไฟล์ภาพอ้างอิงตรงกัน

### Runtime

- [ ] เดินทุกทิศและหยุดเป็น idle ถูกเฟรม
- [ ] ความเร็วเดินกับจังหวะ animation ใช้งานร่วมกันได้
- [ ] Body อยู่บริเวณเท้าตามดีไซน์ ไม่ชนจากศีรษะ
- [ ] ขนาดเทียบสิ่งของ กล้อง/zoom และ depth ถูก
- [ ] Spawn/reset และการเปลี่ยน character ไม่ทำให้ตำแหน่งหรือ body เพี้ยน

## 9. สิ่งที่ต้องส่งมอบ

ส่ง spritesheet PNG ที่เตรียมแล้ว ต้นแบบที่ใช้ยึดตัวตน และ animation/geometry config ตาม runtime พร้อมรายชื่อ local reference ที่ใช้ สัดส่วนที่ยึด ผล QA/profile/override ถ้ายังไม่มีการเชื่อม config หรือทดลองเกมให้ระบุสถานะ file-validated หรือต่ำกว่าตามผลจริง

