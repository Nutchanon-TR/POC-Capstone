# Dynamic Reference-Accurate Character and Object Asset Prompt

แม่แบบนี้ใช้สำหรับสร้างหรือแก้ไข **ตัวละคร วัตถุ ไอเทม Prop เฟอร์นิเจอร์ สิ่งปลูกสร้าง ไอคอน และชุด Asset** จากภาพอ้างอิงหลายรูป โดยไม่บังคับว่างานต้องเป็น Pixel Art หรือต้องตัดพื้นหลัง

หลักสำคัญคือ **ผู้ใช้เป็นคนกำหนดหน้าที่ของภาพแต่ละใบ** ห้ามเดาหน้าที่ของภาพจากลำดับไฟล์หรือจากลักษณะภาพเอง

> ไม่มีพรอมป์ต์ใดรับประกันความตรง 100% ในครั้งเดียว งานที่นำไปใช้จริงควรสร้างร่าง ตรวจด้วย Checklist และแก้เฉพาะจุดที่ผิดในรอบถัดไป

---

## 1. กำหนด Reference Map ก่อนสร้างภาพ

กรอกตารางนี้ทุกครั้งที่ใช้ภาพอ้างอิง จะใช้บทบาทซ้ำกันหรือไม่ใช้บางบทบาทก็ได้

| ภาพ | บทบาทที่ผู้ใช้กำหนด | สิ่งที่ต้องนำมาใช้ | สิ่งที่ห้ามนำมาใช้ | ความสำคัญ |
|---|---|---|---|---|
| Image 1 | `[เช่น Target / Identity]` | `[รูปทรง สี ชุด ชิ้นส่วน]` | `[พื้นหลัง ท่าทาง สไตล์]` | สูง |
| Image 2 | `[เช่น Visual Style]` | `[เส้น สี เงา ระดับรายละเอียด]` | `[ตัวละครหรือวัตถุในภาพ]` | กลาง |
| Image 3 | `[เช่น Material / Lighting]` | `[วัสดุและทิศทางแสง]` | `[รูปทรงและองค์ประกอบ]` | ต่ำ |

### บทบาทที่เลือกใช้ได้

- **Target / Edit Source** — ภาพที่จะถูกแก้โดยตรง
- **Identity Reference** — ตัวตน ใบหน้า ทรงผม ชุด หรือรูปลักษณ์ของตัวละคร
- **Object Design Reference** — รูปทรง ชิ้นส่วน และหน้าที่ของวัตถุ
- **Visual Style Reference** — วิธีวาด เส้น พิกเซล พู่กัน หรือการเรนเดอร์
- **Construction Reference** — วิธีประกอบรูปทรง ขนาดพิกเซล ความหนาเส้น หรือ topology ทางภาพ
- **Proportion Reference** — สัดส่วนหัวต่อตัว ความยาวแขนขา หรืออัตราส่วนของวัตถุ
- **Pose / View Reference** — ท่าทาง มุมหน้า มุมข้าง มุมหลัง Isometric หรือ Top-down
- **Composition Reference** — ตำแหน่ง จำนวนช่อง ระยะห่าง และการจัดวาง
- **Palette Reference** — ชุดสีและความสัมพันธ์ของสี
- **Material Reference** — ผ้า โลหะ ไม้ แก้ว พลาสติก หิน หรือพื้นผิวอื่น
- **Lighting Reference** — ทิศทางแสง ความแข็งของเงา และบรรยากาศ
- **Background Reference** — ฉาก สีพื้น หรือสภาพแวดล้อม
- **Technical Output Reference** — ขนาดเฟรม ความโปร่งใส ขอบตัด เส้นรอบนอก หรือรูปแบบ Sheet

### กฎการตีความ Reference

1. ใช้แต่ละภาพเฉพาะบทบาทที่ผู้ใช้กำหนด
2. หากสองภาพขัดกัน ให้ทำตามภาพที่มีความสำคัญสูงกว่า
3. ห้ามคัดลอกสิ่งที่อยู่นอกบทบาท เช่น ใช้ภาพเป็น Style Reference แล้วนำชุดของตัวละครในภาพมาด้วย
4. หากผู้ใช้ไม่ได้กำหนดบทบาทของภาพ ให้ถามหรือบันทึกสมมติฐานก่อนสร้าง
5. ห้ามสมมติว่า Image 1 ต้องเป็นภาพตัวละคร หรือ Image 2 ต้องเป็นภาพสไตล์

---

## 2. กำหนดงานและรูปแบบผลลัพธ์

กรอกเฉพาะหัวข้อที่เกี่ยวข้อง

```text
ASSET TYPE: [character / object / prop / item / furniture / building / icon / environment / mixed asset set]
TASK: [create / edit / restyle / simplify / create variants / create a sheet]
OUTPUT MODE: [single asset / concept board / asset pack / sprite sheet / turnaround / icon set / tileset]
COUNT: [จำนวน Asset]
ARRANGEMENT: [เช่น 4 columns x 3 rows หรือ isolated single asset]
VIEW: [top-down RPG map view by default for object assets / another view only when explicitly requested]
STYLE: [กำหนดเอง หรือ follow Image X]
BACKGROUND: [transparent / flat color / preserve target / follow Image X / described scene]
EDGE TREATMENT: [hard cutout / no outline / colored outline / dark outline / soft natural edge / preserve target]
RESOLUTION: [ขนาดภาพหรือขนาด Asset หากมี]
INTENDED USE: [Phaser / game map / UI / print / concept selection / other]
```

---

## 3. พรอมป์ต์หลักแบบ Dynamic

คัดลอกส่วนนี้แล้วกรอก `[ ]` ตามงาน

```text
Use case: [create / edit / style-transfer / asset-pack].
Asset type: [character / object / mixed assets] for [intended use].

USER-DEFINED REFERENCE MAP
[วาง Reference Map ที่กรอกไว้ตรงนี้]

The user-defined reference roles are authoritative.
Use every image only for its assigned role.
Do not infer reference roles from image order, file name, or visual content.
Do not transfer unrequested characters, objects, clothing, backgrounds,
materials, poses, colors, borders, textures, or rendering traits between references.

PRIMARY REQUEST
[อธิบายสิ่งที่ต้องการสร้างหรือแก้]

IDENTITY AND DESIGN INVARIANTS
Preserve these features exactly unless the request explicitly changes them:
- [รูปทรงหลักหรือ silhouette]
- [สีหลัก]
- [ใบหน้า ทรงผม หรือเอกลักษณ์ตัวละคร]
- [ชุด อุปกรณ์ หรือชิ้นส่วนของวัตถุ]
- [จำนวน ตำแหน่ง และลำดับ]
- [คุณสมบัติอื่นที่ห้ามเปลี่ยน]

STYLE AND CONSTRUCTION
Follow [Image X / written specification] for:
- shape construction;
- line or edge behavior;
- detail density;
- color treatment;
- shading method;
- material rendering;
- visual proportions.

Match the requested style as a complete drawing system.
Do not apply a superficial texture or filter over a differently constructed image.
Keep shape language, edge treatment, detail density, palette logic,
and shading logic consistent across every asset.

COMPOSITION
- Create exactly [COUNT] assets.
- Arrange them as [ARRANGEMENT].
- Use [VIEW] view.
- Keep [spacing / scale / baseline / cell size] consistent.
- Keep every asset complete and unobstructed.

BACKGROUND AND EDGES
Use [BACKGROUND requirement].
Use [EDGE TREATMENT requirement].
If transparency is requested, output genuine alpha transparency and no baked checkerboard.
If a background is requested, preserve or construct it as specified.
Do not automatically remove a background, add an outline, add a drop shadow,
or create a cutout unless the request explicitly requires it.

TECHNICAL OUTPUT
- Canvas or asset size: [SIZE].
- Output mode: [single asset / board / sheet / pack].
- Intended use: [USE].
- Additional constraints: [CONSTRAINTS].

AVOID
[ใส่ข้อห้ามเฉพาะงาน]
unrequested redesigns, identity drift, changed colors, changed materials,
missing parts, duplicated parts, extra characters, extra objects,
cropped assets, merged silhouettes, inconsistent style, inconsistent scale,
unrequested text, logos, signatures, and watermarks.
```

---

## 4. ส่วนเสริมสำหรับ Character Asset

เพิ่มส่วนนี้เมื่อสร้างตัวละคร

```text
CHARACTER LOCK
Preserve the character's face identity, hair color, main hairstyle silhouette,
skin tone, body type, outfit, footwear, accessories, and role.

Keep the face readable at the intended display size.
Simplify or preserve details according to the assigned style reference.
Do not beautify, age, change gender presentation, change body proportions,
or add fantasy features unless explicitly requested.

POSE AND EXPRESSION
Use [neutral standing / specified pose / follow Image X].
Expression: [expression].
Do not create animation frames or alternate poses unless explicitly requested.
```

---

## 5. ส่วนเสริมสำหรับ Object / Prop / Item Asset

เพิ่มส่วนนี้เมื่อสร้างวัตถุ ไอเทม หรือฉากประกอบ

**ค่าเริ่มต้นของ Object Asset คือ Top-down RPG map view แบบกล้องอยู่สูง** ตามเกมแผนที่ 2D เห็นพื้นผิวด้านบนและด้านหน้าของวัตถุในอัตราส่วนคงที่ ไม่มีเส้นขอบฟ้าหรือจุดรวมสายตา ไม่ใช่มุมตรงด้านหน้า ไม่ใช่มุมข้าง และไม่ใช่ภาพสามส่วนสี่ที่หมุนวัตถุไปทางซ้ายหรือขวา ห้ามใช้ Front view, Side view, Three-quarter perspective หรือ Isometric เว้นแต่ผู้ใช้ระบุมุมนั้นโดยตรง

```text
OBJECT DESIGN LOCK
Preserve the object's:
- main silhouette and proportions;
- functional parts and their placement;
- openings, handles, buttons, legs, hinges, screens, wheels, or attachments;
- material identity;
- main colors and markings;
- orientation and intended use.

The object must remain structurally believable and immediately recognizable.
Do not invent extra controls, decorations, seams, holes, handles, or mechanisms.
Do not remove functional parts to simplify the design.

MATERIALS
Render each material according to [Image X / written specification].
Clearly distinguish [wood / metal / glass / fabric / plastic / stone / other]
using the requested shape, edge, color, texture, reflection, and shading rules.

SCALE AND VIEW
Use a high-angle top-down RPG map view by default.
This is a 2D game-map projection: show the object's top plane and its front-facing
vertical plane with one consistent compressed depth ratio.
Do not use a straight front view, side view, rotated three-quarter perspective,
cinematic perspective, or isometric diamond projection unless explicitly requested.
Use no horizon line, no vanishing point, and no perspective convergence.
Keep parallel edges parallel in screen space. Keep the object centered without
turning its left or right side toward the camera.
Maintain one shared top-plane-to-front-plane ratio across the complete asset set.
Keep all related objects at a believable relative scale.
Use one consistent camera angle and horizon logic across the complete asset set.

STRUCTURAL LOGIC
- Align the roof, posts, counter, cabinet, and base to one shared centerline and grid.
- Every load-bearing post must visibly connect the supported upper part to the base.
- The base must be wide and deep enough to support the upper structure.
- Repeated parts must share the same size, construction, and attachment method.
- Left and right components must mirror correctly unless an asymmetry is intentional.
- Do not hide impossible connections behind decoration or shadow.

SURFACE PATTERNS
- Stripes, panels, trims, seams, and fabric scallops must follow the parent surface.
- Pattern spacing must remain consistent and align with structural divisions.
- A roof stripe must connect logically from the top to the matching lower edge.
- Decorative borders must use one repeatable rhythm instead of changing spacing randomly.

SMALL COMPONENTS
- Screens, brochure holders, handles, buttons, and storage doors need a clear silhouette,
  a visible attachment point, and the same pixel scale as the main object.
- Simplify a small part if it cannot be drawn clearly at the target resolution.
- Do not represent functional parts as floating color blocks or scattered pixels.

LIGHTING AND GROUNDING
- Use one declared light direction consistently across every surface.
- Separate lit planes and shadow planes with deliberate value steps.
- Add a simple contact shadow only when the selected background mode allows it.
- The ground footprint must align to the map tile plane.
- If a contact shadow is allowed, place it directly beneath the lower/rear footprint
  using the same top-down projection; do not use a front-view floor shadow.

GAME-ASSET REQUIREMENTS, IF APPLICABLE
- Pivot or ground contact: [center / bottom-center / custom].
- Collision silhouette: [simple / follow visible shape].
- Required empty padding: [value].
- Variants or states: [closed/open, on/off, damaged/normal, empty/full].
- Tile or frame size: [value].
```

### ตัวอย่าง Object Asset

```text
ASSET TYPE: furniture object set
TASK: create six event-booth objects
OUTPUT MODE: asset board
COUNT: 6
ARRANGEMENT: 3 columns x 2 rows
VIEW: top-down RPG map view
STYLE: follow Image 2
BACKGROUND: transparent
EDGE TREATMENT: preserve the colored outline behavior from Image 2

Objects: registration desk, information kiosk, standing banner,
two-seat sofa, potted plant, and recycling bin.

Keep every object structurally readable, at a believable relative scale,
centered, and grounded on the same top-down tile plane.
Show the required top surfaces and front vertical surfaces with one consistent
compressed depth ratio. Do not rotate objects toward the left or right.
Do not add people or text.
```

---

## 6. โมดูลสไตล์แบบเลือกใช้

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

## 7. พื้นหลังและการตัดขอบแบบ Dynamic

เลือกคำสั่งเดียวที่ตรงกับงาน

### พื้นหลังโปร่งใส

```text
Use genuine transparent alpha in every empty area.
Preserve clean edge pixels appropriate to the requested style.
Do not bake a checkerboard, matte color, halo, or drop shadow into the image.
```

### พื้นหลังสีเรียบ

```text
Use one flat [COLOR] background with no texture, gradient, grid, or decoration.
Keep the asset edges appropriate to the requested style.
```

### คงพื้นหลังเดิม

```text
Preserve the target image's background, composition, lighting,
perspective, and contact shadows. Modify only the requested asset.
```

### ใช้ฉากจาก Reference

```text
Follow Image [X] only for background environment, perspective,
lighting, and atmosphere. Do not copy its foreground subject.
```

### ไม่ตัดขอบและไม่ใส่เส้นรอบนอก

```text
Integrate the asset naturally into the background.
Use the requested natural edge softness and lighting transition.
Do not add a sticker border, cutout outline, halo, or artificial drop shadow.
```

---

## 8. พรอมป์ต์แก้รอบสอง

เมื่อผลลัพธ์ส่วนใหญ่ถูกแล้ว ให้แก้เฉพาะปัญหาที่พบ

```text
Edit the current result. Preserve every approved asset, identity,
shape, material, color, position, background, and style rule unchanged.

Correct ONLY these problems:
1. [จุดผิด]
2. [จุดผิด]
3. [จุดผิด]

Use the same construction, scale, palette, line or edge treatment,
camera, light direction, and detail density as the approved areas.
Do not redraw or reinterpret unaffected content.
```

### ตัวอย่างแก้ตัวละคร

```text
Change only character 8, second row fourth column.
Restore her rectangular glasses, black low ponytail, lavender cardigan,
long skirt, notebook, and shoulder bag from Image 1.
Follow Image 2 only for line weight and color simplification.
Keep all other characters and the background unchanged.
```

### ตัวอย่างแก้วัตถุ

```text
Change only the information kiosk in the top-center cell.
Restore the screen shape, lower cabinet, side vents, and blue-gray palette
from Image 1. Follow Image 3 only for brushed-metal material rendering.
Keep the camera, size, background, and every other object unchanged.
```

---

## 9. Dynamic QA Checklist

ตรวจเฉพาะหัวข้อที่เกี่ยวข้องกับงาน ไม่ควรบังคับเกณฑ์ Pixel Art กับงานสไตล์อื่น

### Reference และความถูกต้อง

- [ ] ระบุหน้าที่ของภาพทุกใบแล้ว
- [ ] ไม่มีองค์ประกอบจาก Reference หลุดข้ามบทบาท
- [ ] คุณสมบัติที่ล็อกไว้ยังครบ
- [ ] จำนวน ลำดับ และตำแหน่งถูกต้อง
- [ ] ไม่มี Asset เพิ่ม หาย ซ้ำ หรือรวมกัน

### Character

- [ ] ใบหน้า สีผม ทรงผม ชุด และอุปกรณ์ยังตรงต้นฉบับ
- [ ] สัดส่วนและท่าทางตรงตาม Reference ที่กำหนด
- [ ] แต่ละคนยังแยกออกจากกันได้เมื่อย่อภาพ

### Object / Prop

- [ ] Silhouette และสัดส่วนของวัตถุถูกต้อง
- [ ] ชิ้นส่วนที่มีหน้าที่ใช้งานครบและอยู่ถูกตำแหน่ง
- [ ] วัสดุอ่านออกและไม่ปะปนกัน
- [ ] Object Asset ใช้ Top-down RPG map view หากผู้ใช้ไม่ได้สั่งมุมอื่น
- [ ] เห็นพื้นผิวด้านบนและด้านหน้าด้วยอัตราความลึกที่คงที่ทั้งชิ้น
- [ ] ไม่มีการหมุนวัตถุไปทางซ้ายหรือขวาแบบ Three-quarter view
- [ ] ไม่มีเส้นขอบฟ้า จุดรวมสายตา หรือเส้นขนานที่บีบเข้าหากัน
- [ ] เส้นที่ขนานกันยังขนานกันในภาพ และชิ้นส่วนซ้ายขวาจัดตำแหน่งสัมพันธ์กัน
- [ ] อัตราส่วน Top plane ต่อ Front plane ตรงกันกับ Asset อื่นในชุด
- [ ] Footprint ของวัตถุวางบนระนาบ Tile map และไม่ลอยจากพื้น
- [ ] หลังคา เสา เคาน์เตอร์ ตู้ และฐานอยู่บน Centerline/Grid เดียวกัน
- [ ] เสารับน้ำหนักเชื่อมหลังคากับฐานจริง และฐานรองรับขนาดส่วนบนได้สมเหตุสมผล
- [ ] ชิ้นส่วนซ้ำ เช่น เสา ปลอก ขา มือจับ และช่องใส่ของ มีขนาดและระดับเท่ากัน
- [ ] ลายผ้า แถบสี ขอบตกแต่ง และรอยต่อวิ่งตามรูปทรงของพื้นผิว
- [ ] จอ ช่องแผ่นพับ มือจับ และของชิ้นเล็กมีโครงกับจุดยึดชัดเจน ไม่ใช่ก้อนสีลอย
- [ ] ภายในตู้หรือเคาน์เตอร์มีเส้นขอบ ความหนา และการแบ่งบานสม่ำเสมอ
- [ ] มุมกล้อง ระนาบ และขนาดสัมพัทธ์สอดคล้องกัน
- [ ] สถานะหรือ Variant ครบตามที่ขอ

### Style

- [ ] วิธีสร้างรูปทรงตรงกับ Style Reference
- [ ] เส้นหรือขอบมีพฤติกรรมสม่ำเสมอ
- [ ] เส้นทแยงแบบ Pixel ใช้ Step ratio ที่คงที่ เช่น 2:1 หรือ 3:1 ตลอดช่วงเดียวกัน
- [ ] ไม่มีขอบแบบขั้นบันไดที่เปลี่ยนความยาวแบบสุ่มจนเส้นดูสั่น
- [ ] ทุกส่วนใช้หน่วยพิกเซลและความละเอียดเดียวกัน
- [ ] จำนวนสี เงา Texture และรายละเอียดอยู่ในระดับเดียวกัน
- [ ] ไม่มีบริเวณที่ดูเหมือนใช้คนละเทคนิคหรือคนละความละเอียด
- [ ] ไม่มี Artifact ที่เกิดจากการเลียนแบบสไตล์ด้วย Filter อย่างเดียว

### Background และขอบภาพ

- [ ] พื้นหลังตรงกับโหมดที่เลือก
- [ ] ถ้าขอโปร่งใส ค่า Alpha โปร่งใสจริง
- [ ] ถ้าเป็น Pixel Art ขอบ Alpha เป็นพิกเซลแข็ง ไม่มีขอบนุ่มหรือ Halo กึ่งโปร่งใส
- [ ] ถ้าไม่ขอตัดขอบ ไม่มีขอบ Sticker หรือ Halo เพิ่มมา
- [ ] ถ้าคงฉากเดิม แสง มุม และเงาสัมผัสยังต่อเนื่อง
- [ ] ทิศแสงเดียวกันทั้งชิ้น และฐานสัมผัสพื้นหรือ Baseline ชัดเจน
- [ ] ไม่มี Grid, Checkerboard, Texture หรือเงาที่ไม่ได้สั่ง

### Technical Output

- [ ] ขนาด Canvas และ Asset ถูกต้อง
- [ ] Sheet แบ่งช่องได้ลงตัว หากเป็น Sprite Sheet หรือ Tileset
- [ ] ไม่มีส่วนสำคัญถูกตัดขอบ
- [ ] Padding และจุดวางฐานเหมาะกับการนำไปใช้
- [ ] ไม่มีข้อความ โลโก้ ลายเซ็น หรือลายน้ำที่ไม่ได้สั่ง

---

## 10. ขั้นตอนใช้งานที่แนะนำ

1. ระบุประเภท Asset และ Intended Use
2. กรอก Reference Map โดยกำหนดหน้าที่ของทุกภาพ
3. ระบุสิ่งที่ต้องรักษาและสิ่งที่อนุญาตให้เปลี่ยน
4. เลือกโมดูลสไตล์เพียงแบบเดียว หรือเขียนสไตล์จาก Reference โดยตรง
5. เลือกพื้นหลังและวิธีจัดการขอบภาพ
6. สร้างร่างหนึ่งรอบแล้วตรวจด้วย Dynamic QA Checklist
7. แก้เฉพาะ 1–3 ปัญหาในแต่ละรอบ
8. เมื่อภาพผ่านแล้วจึงแยกไฟล์ จัดช่องเฟรม ทำ Alpha cleanup หรือเชื่อมเข้าโปรเจกต์

