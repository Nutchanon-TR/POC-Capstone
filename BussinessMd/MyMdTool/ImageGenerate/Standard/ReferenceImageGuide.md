# คู่มือกลางสำหรับสร้างภาพจาก reference

Version: 1.0

แม่แบบกลางสำหรับสร้าง แก้ไข และทำ variant ของภาพตัวละคร สิ่งของ ไอคอน หรือภาพประกอบจาก reference ผู้ใช้กำหนดบทบาทของภาพแต่ละใบ และเลือกสไตล์ พื้นหลัง กับประเภทผลลัพธ์ตามงาน

คู่มือนี้ปรับจาก ImageGenerateWithReference.md โดยแยกมาตรฐานเกมและขั้นเตรียมไฟล์ไปยังคู่มือเฉพาะประเภท โมดูลสไตล์ยังเลือกได้ทั้ง Pixel Art, Flat, Soft Raster, Painted และ 3D-style

## 1. เลือกคู่มือที่ใช้กับงาน

| งาน | อ่านร่วมกับไฟล์นี้ |
|---|---|
| ภาพประกอบ UI หรือ concept ทั่วไป | ใช้ไฟล์นี้และข้อกำหนดของผู้ใช้ |
| สิ่งของสำหรับแมป | [MapStandard.md](MapStandard.md) และ [ObjectAssetGuide.md](ObjectAssetGuide.md) |
| ตัวละครสำหรับเกม | [MapStandard.md](MapStandard.md) และ [CharacterAssetGuide.md](CharacterAssetGuide.md) |
| ประกอบแมปจาก blueprint | [BlueprintToMapGuide.md](BlueprintToMapGuide.md) |

Markdown ที่อ้างอิงไม่ได้โหลดเอง ผู้ทำงานหรือ AI ต้องอ่านไฟล์ที่ตรงกับงานและรวมเฉพาะคำสั่งที่เกี่ยวข้องลงใน prompt

กรอกงานก่อนเริ่ม:

```text
ASSET TYPE: [character / object / prop / furniture / building / icon / environment]
TASK: [create / edit / restyle / simplify / create variants]
DELIVERY STAGE: [concept / production-source / game-ready]
TARGET PROFILE: [none / Editor32-v1 / ชื่อ profile ที่กำหนด]
OUTPUT MODE: [single asset / concept board / asset pack / spritesheet / turnaround / tileset]
COUNT: [จำนวนชิ้นหรือจำนวนเฟรม ระบุว่าเป็นอย่างใด]
ARRANGEMENT: [isolated asset / rows and columns / separate files]
VIEW: [มุมมองที่ผู้ใช้กำหนด หรือจาก profile ที่เลือก]
STYLE: [กำหนดเอง หรือ follow Image X]
BACKGROUND: [transparent / flat color / preserve target / reference scene]
EDGE TREATMENT: [ตามสไตล์และ reference ที่เลือก]
SHADOW MODE: [none / baked / separate / preserve-target]
CANVAS SIZE: [width x height, source pixels]
FRAME SIZE: [width x height, source pixels หรือ not-applicable]
DISPLAY SIZE: [world pixels หรือ not-applicable]
PADDING: [source pixels ต่อด้าน หรือ not-applicable]
INTENDED USE: [Phaser / map / UI / print / concept / other]
```

- concept ใช้ตรวจแบบและเลือกทิศทาง ยังไม่ถือว่าพร้อมเข้าเกม
- production-source คือภาพต้นทางสำหรับตัด จัดช่อง หรือประกอบไฟล์ต่อ
- game-ready ต้องผ่านการตรวจภาพ ตรวจไฟล์ และทดลองกับเกมเป้าหมาย
- งานทั่วไปใช้ TARGET PROFILE: none ได้ งานเกมต้องระบุ profile ก่อนรับรองความเข้ากันได้
- ค่าไม่เกี่ยวข้องใช้ not-applicable ค่าที่ต้องใช้แต่ยังไม่ทราบให้เขียน unresolved
- หากข้อมูลที่ขาดเปลี่ยนตัวตน มุมกล้อง หรือความเข้ากันได้ ให้ถามเฉพาะจุดนั้น งาน concept ที่ทำต่อได้ให้ระบุสมมติฐาน

## 2. กำหนด reference map

| ภาพ/ไฟล์ | บทบาท | สิ่งที่นำมาใช้ | สิ่งที่ห้ามนำมาใช้ | ความสำคัญภายในบทบาท |
|---|---|---|---|---|
| Image 1 | [Identity / Object Design / Edit Source] | [ระบุ] | [ระบุ] | [สูง/กลาง/ต่ำ] |
| Image 2 | [Visual Style / Construction] | [ระบุ] | [ระบุ] | [สูง/กลาง/ต่ำ] |
| Image 3 | [Material / Palette / Lighting / View] | [ระบุ] | [ระบุ] | [สูง/กลาง/ต่ำ] |

บทบาทที่เลือกใช้ได้:

- Target / Edit Source: ภาพที่แก้โดยตรง
- Identity: ใบหน้า ทรงผม ชุด รูปร่าง และเอกลักษณ์ตัวละคร
- Object Design: รูปทรง ชิ้นส่วน หน้าที่ และวัสดุของสิ่งของ
- Visual Style: เส้น พู่กัน การลงสี และการเรนเดอร์
- Construction: วิธีประกอบรูปทรง ความหนาเส้น และหน่วยพิกเซล
- Proportion: สัดส่วนหัวต่อตัวหรือสัดส่วนของสิ่งของ
- Pose / View: ท่าและมุมมองที่ต้องใช้
- Composition: ตำแหน่ง จำนวน ช่อง และระยะห่าง
- Palette, Material, Lighting, Background: ใช้เฉพาะคุณสมบัติที่ระบุ
- Technical Output: ขนาดช่อง padding alpha และรูปแบบ sheet

กฎเมื่อข้อมูลขัดกัน:

1. คำสั่งล่าสุดที่ชัดเจนจากผู้ใช้เป็นข้อกำหนดของงาน หากเปลี่ยน profile ให้บันทึก override และผลต่อเกม
2. งานที่เลือก profile ใช้มุมกล้อง หน่วย และโครงสร้างไฟล์จาก profile เป็นหลัก
3. ใช้ภาพแต่ละใบเฉพาะบทบาทที่กำหนด ห้ามเดาจากลำดับ ชื่อไฟล์ หรือเนื้อหาภาพ
4. ความสำคัญของภาพใช้ตัดสินเมื่อ reference ขัดกันในคุณสมบัติเดียวกัน
5. Design Reference ที่ถ่ายด้านหน้าไม่เปลี่ยนกล้องแมป หากไม่ได้รับบทบาท View
6. ห้ามนำชุด พื้นหลัง ท่าทาง หรือสีจาก Style Reference มาเพิ่มเอง
7. ความขัดแย้งที่ไม่มีข้อกำหนดตัดสินต้องระบุให้เห็นก่อนลงงาน final

## 3. ล็อกสิ่งที่ต้องรักษา

ระบุ silhouette สี ตัวตน ชิ้นส่วน จำนวน และสิ่งที่อนุญาตให้เปลี่ยน การ restyle อาจเปลี่ยนวิธีวาดหรือสัดส่วนได้เฉพาะที่ผู้ใช้อนุญาต

แยก DESIGN LOCK จาก VIEW LOCK เพื่อแปลงแบบเดียวกันเป็นกล้องเกมได้โดยไม่สูญเสียชิ้นส่วนสำคัญ

```text
DESIGN LOCK: [สิ่งที่ต้องรักษา]
VIEW LOCK: [กล้อง/ท่า/การวางที่ต้องรักษา]
ALLOWED CHANGES: [รายการ]
PROFILE OVERRIDES: [none หรือค่าที่เปลี่ยน พร้อมเหตุผล]
```

## 4. พรอมป์ต์กลาง

รวมส่วนนี้กับโมดูลสไตล์หนึ่งแบบและคู่มือเฉพาะงาน กรอกค่าและลบบรรทัดที่ไม่เกี่ยวข้องก่อนใช้

```text
Create or edit [asset type] for [intended use].
Delivery stage: [stage]. Target profile: [profile].

REFERENCE MAP
[filled reference map]

Use each reference only for its assigned role.
Do not infer roles from image order or visual content.
Follow the selected profile for camera, coordinate units and technical constraints.
Report unresolved conflicts. Do not silently transfer traits between references.

REQUEST
[exact requested change or creation]

PRESERVE
[design and identity locks]

ALLOWED CHANGES
[explicitly allowed changes]

STYLE
[selected style module and approved style reference]
Keep shape construction, edges, palette, shading and detail density consistent.

COMPOSITION
Create exactly [count] [assets or frames].
Use [view], [arrangement], [relative scale] and [baseline].
Keep complete silhouettes and required empty padding.

BACKGROUND AND SHADOW
Background: [mode]. Edge treatment: [mode]. Shadow mode: [mode].
If transparent, use genuine alpha and no baked checkerboard or matte halo.
Apply only the shadow behavior requested for this job.

TECHNICAL TARGET
Canvas: [source pixels].
Frame/cell: [source pixels or not-applicable].
Display size: [world pixels or not-applicable].
Padding: [source pixels or not-applicable].
[asset-specific or character-specific requirements]

AVOID
[task-specific exclusions]
Unrequested redesigns, missing or duplicated parts, extra subjects,
cropped silhouettes, inconsistent style, text, logos or watermarks unless requested.
```

ภาพที่ AI สร้างต้องตรวจขนาดจริง ขนาดที่ระบุใน prompt เป็นเป้าหมาย ไม่ใช่หลักฐานว่า output ผ่านแล้ว คำสั่งนี้ไม่ได้สร้าง TSJ, animation config หรือไฟล์แมปให้อัตโนมัติ ขั้นเตรียมข้อมูลดูในคู่มือเฉพาะประเภท

6. โมดูลสไตล์แบบเลือกใช้

เลือกเพียงโมดูลที่ตรงกับงาน ห้ามใส่ทุกโมดูลพร้อมกัน

### A. Low-resolution Pixel Art

```text
Use one consistent native pixel grid and one uniform pixel size.
Build contours, curves, shadows, and highlights from deliberate connected pixel clusters.
Use staircase-shaped curves with an intentional repeatable step ratio,
such as 1:1, 2:1, or 3:1. Select the ratio that fits the slope and keep it stable
along that continuous edge. Change the ratio only at a deliberate geometric transition.
Keep outline thickness, corner treatment, and diagonal rhythm consistent.
Draw every detail on the same native grid; do not mix coarse and fine pixel units.
Use a compact palette. For each material use one base color,
one shadow color, and optionally one highlight color.
Avoid anti-aliasing, subpixel edges, mixed pixel sizes, smooth gradients,
pixel texture overlays, isolated pixel noise, irregular stair-step jitter,
semi-transparent edge halos, and vector-smooth curves.
```

### B. Clean Flat Illustration

```text
Use clean intentional shapes, consistent line weight, flat color regions,
and a limited number of shadow shapes. Keep edges smooth and controlled.
Avoid painterly texture, unnecessary gradients, noisy highlights,
inconsistent outlines, and fake pixelation.
```

### C. Soft Raster Illustration

```text
Use controlled soft brushes and natural anti-aliased edges.
Keep forms readable and avoid muddy blending.
Use a consistent brush language, light direction, and texture density.
Do not add hard pixel edges unless the assigned reference contains them.
```

### D. Painted / Textured Illustration

```text
Match the assigned reference's brush size, edge hierarchy, texture scale,
color transitions, and amount of visible brushwork.
Keep focal areas sharper and secondary areas simpler.
Avoid uniform texture over the entire image and avoid photographic noise.
```

### E. 3D-style Rendered Asset

```text
Match the assigned reference's camera, lens feel, geometry simplification,
material response, light softness, ambient occlusion, and shadow direction.
Keep topology visually clean and materials consistent.
Avoid mixing hand-drawn outlines or pixel clusters unless explicitly requested.
```

---

## 
## 6. พื้นหลัง ขอบภาพ และเงา

เลือกพื้นหลังหนึ่งโหมดและ shadow mode หนึ่งค่า หากขัดกันให้แก้ข้อกำหนดก่อนสร้าง

| พื้นหลัง | คำสั่ง |
|---|---|
| transparent | ใช้ alpha จริง ไม่มี checkerboard หรือสี matte ที่อบติดภาพ |
| flat color | ใช้สีที่กำหนด ไม่มี texture/grid เพิ่มเอง |
| preserve target | รักษาฉาก กล้อง และแสงของ edit target ตามส่วนที่ล็อก |
| reference scene | ใช้ฉากจาก reference เฉพาะบทบาท Background |
| natural integration | ขอบตามสไตล์ ไม่มี sticker border เพิ่มเอง |

| Shadow mode | กติกา |
|---|---|
| none | ไม่อบเงาตกพื้นในภาพ เงาบนผิววัตถุยังทำตามสไตล์ได้ |
| baked | มี contact shadow ตามกล้องและแสงที่เลือก ต้องนับขอบเขตเงาใน padding |
| separate | แยกไฟล์/ชิ้นเงาและตำแหน่งสัมพันธ์ หลังเตรียมไฟล์ต้องตรวจการประกอบ |
| preserve-target | รักษาเงาเดิมเฉพาะงาน edit ที่กำหนดไว้ |

Pixel Art ใช้ขอบและ alpha ตาม native pixel grid ส่วนสไตล์ anti-aliased อนุญาต alpha กึ่งโปร่งใสตามสไตล์ที่เลือก

## 7. แก้รอบถัดไป

```text
Edit the current result.
Preserve the approved identity, design, camera, palette, size and composition.

Correct ONLY:
1. [specific defect]
2. [specific defect]

Use the same profile and style as the approved areas.
Keep unaffected content unchanged.
```

หากต้องรักษาส่วนที่ผ่านแล้วแบบตรงพิกเซล ให้ตรวจ diff หลังแก้ และใช้การประกอบเฉพาะชิ้นที่อนุญาตให้เปลี่ยนเมื่อเครื่องมือรองรับ คำสั่ง preserve อย่างเดียวไม่รับประกันว่าบริเวณอื่นจะไม่เปลี่ยน

## 8. ตรวจและส่งมอบ

### Visual QA

- [ ] บทบาท reference ครบและไม่มีคุณสมบัติหลุดข้ามบทบาท
- [ ] Design/identity lock และจำนวนครบ
- [ ] กล้อง สัดส่วน สี และรายละเอียดตรงงาน/profile
- [ ] พื้นหลัง edge และ shadow mode ไม่ขัดกัน
- [ ] Pixel Art only: pixel size, outline และ staircase ต่อเนื่อง ไม่มีขอบสุ่มหรือ halo
- [ ] สไตล์อื่น: ตรวจเส้น/พู่กัน/texture ตามโมดูลที่เลือก
- [ ] ไม่มีข้อความหรือองค์ประกอบที่ไม่ได้สั่ง

### File QA

- [ ] วัด canvas, alpha และ padding จากไฟล์จริง
- [ ] ตัดแยกชิ้นหรือจัดช่องตาม output contract แล้ว
- [ ] ชื่อไฟล์และข้อมูลอ้างอิงครบ
- [ ] งาน sheet มีจำนวน ลำดับ และช่องที่ตรวจแล้ว

### Runtime QA

งานทั่วไปใช้ not-applicable งานเกมใช้รายการใน ObjectAssetGuide.md หรือ CharacterAssetGuide.md และทดสอบในเกมเป้าหมาย

สถานะที่รายงานได้:

- draft: ยังมีข้อผิดพลาดหรือข้อมูล unresolved
- visual-approved: ผ่านการตรวจภาพแล้ว
- file-validated: ผ่านภาพและตรวจไฟล์จริงแล้ว
- runtime-validated: ผ่านการทดลองกับเกมและ profile เป้าหมายแล้ว

ท้ายงานรายงานไฟล์จริง profile/override ผล QA และข้อที่ยังไม่ผ่าน ห้ามรับรอง game-ready จากภาพ preview หรือ alpha อย่างเดียว
