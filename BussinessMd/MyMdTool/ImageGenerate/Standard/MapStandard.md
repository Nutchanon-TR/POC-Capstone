# มาตรฐานภาพและข้อมูลแมป

Version: 1.1

อ่านร่วมกับ [ReferenceImageGuide.md](ReferenceImageGuide.md), [ObjectAssetGuide.md](ObjectAssetGuide.md), [CharacterAssetGuide.md](CharacterAssetGuide.md) และ [BlueprintToMapGuide.md](BlueprintToMapGuide.md)

Profile คือชุดกติกาของหนึ่งโปรเจกต์ เลือก profile ก่อนสร้าง asset หรือประกอบแมป สไตล์และรายละเอียดเปลี่ยนตามงานได้ภายในกติกาที่เลือก งานที่ใช้กล้องหรือระบบเฟรมต่างกันให้ระบุ profile/override แยก

## 0. แยกประเภทภาพที่จะสร้าง

- Asset: ของวางอิสระ ใช้ [ObjectAssetGuide.md](../ObjectGenerate/ObjectAssetGuide.md) และตรวจ footprint/anchor/depth
- Map component: พื้น กำแพง กระจก/วงกบ/เสาอาคารที่ต่อเป็นโครงสร้าง ใช้ [MapComponentGuide.md](../ObjectGenerate/MapComponentGuide.md) และตรวจ tile edge/connection sockets
- ส่งคนละPNG/catalog group แม้ใช้styleและpaletteร่วมกัน ไม่รวมสองประเภทเป็นแผ่นไอคอนเพื่อเพิ่มจำนวน
- สเกลตัวละคร64 world pixelsในชุดประมาณเป็น draftเฉพาะงาน ไม่แก้ Character geometryของ Editor32-v1 และไม่รับรองการนำเข้าเกม

## 1. ใบกำหนด profile

```text
PROFILE ID: [ชื่อและ version]
TARGET RUNTIME: [เกม/loader/compiler ที่ต้องใช้]
MAP ORIENTATION: [orthogonal / อื่นตาม runtime]
TILE SIZE: [world pixels ต่อช่อง]
EDIT SNAP: [world pixels, เป็นคนละค่ากับ tile size]
CAMERA / PROJECTION: [คำอธิบายและ reference ที่ยึด]
STYLE MODULE: [เลือกจากคู่มือกลาง]
APPROVED STYLE REFERENCE: [ไฟล์/ภาพ]
PALETTE / LIGHTING: [reference หรือค่าที่ระบุ]
SHADOW MODE: [none / baked / separate]
SCALE REFERENCE: [ตัวละครหรือสิ่งของมาตรฐานที่ผ่านแล้ว]
OBJECT SIZE PRESETS: [asset/type → display size หรือ uniform scale]
CHARACTER GEOMETRY: [frame, origin, scale, body]
ANIMATION LAYOUT: [ลำดับทิศ จำนวนเฟรม idle]
EXPORT CONTRACT: [TMJ/TSJ/PNG และข้อมูลที่ runtime ต้องใช้]
OVERRIDES: [none หรือรายการพร้อมผลกระทบ]
```

ค่าที่ยังไม่ทราบใช้ unresolved ห้ามสร้างความแม่นยำด้วยตัวเลขที่ไม่มี reference หรือการตรวจรองรับ เมื่อผู้ใช้ระบุเปลี่ยนมาตรฐาน ให้บันทึก override และตรวจ runtime ใหม่

## 2. Profile เริ่มต้น Editor32-v1

Profile นี้อ้างอิง POC-Phaser/Editor ที่ตรวจวันที่ 2026-10-11 เป็นจุดเริ่มสำหรับความเข้ากันได้ ต้องตรวจ source อีกครั้งเมื่อเกมเปลี่ยน

| ค่า | ข้อกำหนด |
|---|---|
| โลก | finite orthogonal map |
| Tile | 32 × 32 world pixels |
| ขนาดแมป | width/height เป็นจำนวนช่อง แต่ละด้าน 1–256 |
| กล้องสิ่งของ | high-angle top-down RPG เห็น top plane และ front plane กล้องหันตรง ไม่มี vanishing point หรือการหมุนสามส่วนสี่ |
| กล้องตัวละคร | ทิศขึ้น/ลง/ซ้าย/ขวาในโลกเดียวกัน อัตราความสูงและระยะเท้าตรง scale reference |
| Object origin | มุมซ้ายบนของกรอบภาพ, 0,0 |
| Character frame | 288 × 256 source pixels รวม padding |
| Character scale | 0.4 |
| Character origin | x = 0.5, y = 240/256 |
| Character body | 64 × 30 source pixels, offset 112,210 ก่อน scale |
| Animation | 4 แถว × 6 คอลัมน์, up/down/left/right, frameRate 6 |
| Collision | สี่เหลี่ยม axis-aligned |
| Object rotation | 0, GID ไม่มี flip/rotation flags |
| Shadow สำหรับ asset ใหม่ | none เป็นค่าตั้งต้น ปรับได้เมื่อระบุและตรวจร่วมกับชุดเดิม |
| Style | unresolved จนเลือก reference; ไม่บังคับ Pixel Art ให้ทุกงาน |

Editor เดิมมี snap ตั้งต้น 16 world pixels ช่องพื้นยังเป็น 32 ค่า snap เป็นการช่วยวาง ไม่ได้เปลี่ยนขนาด tile

ตัวเลข frame เป็นกรอบที่รวมพื้นที่โปร่งใส ต้องกำหนด visible character height จากตัวอย่างที่ผ่านแล้วด้วย ไม่ใช้ 256 เป็นความสูงของตัวคน และไม่ใช้ tile size เป็นขนาดภาพของสิ่งของทุกชนิด

แหล่งตรวจ:

- [character/game config](../../POC-Phaser/Editor/src/game/config.ts)
- [map compiler](../../POC-Phaser/Editor/shared/map/compile.mjs)
- [backend map contract](../../POC-Phaser/Editor/server/maps.ts)
- [tileset ตั้งต้น](../../POC-Phaser/Editor/maps/tilesets/exhibition.tsj)

## 3. หน่วยพิกัดและขนาด

| ค่า | หน่วย/จุดอ้างอิง |
|---|---|
| Canvas, frame, padding | source pixels ใน PNG |
| Map width/height | จำนวนช่อง |
| Map tilewidth/tileheight | world pixels ต่อช่อง |
| Object x/y/width/height | world pixels, origin ตาม profile |
| Tileset collision x/y/width/height | source pixels ภายในภาพ asset |
| Collider ที่วางในแมป | world pixels |
| depthY ของ asset | source pixels จากขอบบน |

โลกเริ่มซ้ายบน x เพิ่มขวา y เพิ่มลง Group มี offset; ตำแหน่งโลกเท่ากับตำแหน่งภายในบวก offset ทุก group/layer ที่ครอบอยู่

```text
worldWidth  = map.width  × map.tilewidth
worldHeight = map.height × map.tileheight
scaleX = object.width  / imagewidth
scaleY = object.height / imageheight
colliderX = objectWorldX + localColliderX × scaleX
colliderY = objectWorldY + localColliderY × scaleY
objectDepth = objectWorldY + depthY × scaleY
```

ข้อกำหนดสำหรับ asset ใหม่คือรักษาอัตราส่วนด้วย uniform scale หากต้องการกว้างต่างกันให้สร้าง variant/prefab ตามขนาด ไม่ยืดเฉพาะแกนจนรูปเสียสัดส่วน กติกานี้เป็นข้อกำหนดของ workflow/tool เป้าหมาย ปัจจุบัน Editor ยังรับ width/height แยกกันได้

Pixel Art ต้องตรวจการย่อ ขยาย และ zoom ที่ใช้จริง Fractional scale อาจทำให้รายละเอียดไม่คงที่บนจอ หากต้องเปลี่ยน scale ให้ถือเป็น override และปรับ body/การทดสอบร่วมกัน

## 4. กล้องและสไตล์ร่วม

- ใช้ภาพมาตรฐานหนึ่งชุดสำหรับกล้อง top/front ratio, palette, lighting และ detail density
- Design reference ใช้รูปทรงได้แม้ถ่ายคนละมุม ต้องวาดใหม่ด้วยกล้องของ profile
- วัตถุที่มีด้านซ้าย/ขวาไม่ต้อง mirror หากดีไซน์ตั้งใจไม่สมมาตร
- กำหนดแสงก่อนสร้างชุดใหม่ ไม่เพิ่ม contact shadow โดยขัด shadow mode
- เปรียบเทียบ asset และตัวละครใน preview เดียวกันที่ขนาดแสดงจริง
- ขนาด preset ต้องได้จากตัวอย่างที่ผ่านแล้ว เก็บ approved preview ไว้เป็น reference

## 5. ภาพ กรอบชน และ interaction

ภาพกำหนดหน้าตา Collision กำหนดพื้นที่ชน Depth กำหนดลำดับวาด Interaction กำหนดพฤติกรรม ทั้งสี่ต้องตรวจแยก

- กำหนด footprint บริเวณฐานที่สิ่งของใช้พื้นที่จริง ไม่อนุมาน collision จาก alpha
- TSJ เก็บกรอบชนที่ใช้ซ้ำตามแบบ asset ส่วน TMJ เก็บตำแหน่งแต่ละ instance และ Collider อิสระ
- ของไม่มี collision ใช้ objectgroup ว่างหรือไม่ใส่ collision ตาม contract
- Interaction properties ต้องมี handler ในเกมรับรอง การเพิ่ม property อย่างเดียวไม่ได้สร้างพฤติกรรม
- Character ใช้ตำแหน่งเท้าเป็น depth; floor/ground objects ใช้กติกาพื้นของ renderer
- บูธที่ต้องบังตัวละครหลายระดับแยกชิ้นเพื่อจัด depth ไม่ flatten เป็นภาพเดียวโดยอัตโนมัติ

## 6. รูปแบบเอกสารที่ใช้เป็นหลัก

TMJ และ TSJ เป็น JSON ตามโครงสร้าง Tiled:

- TMJ เก็บขนาดโลก layers, object instances, Spawn, Npc, Collider และ Zone
- TSJ เก็บภาพ asset, native size, metadata และ local collision rectangles
- PNG เก็บภาพจริง ชิ้นที่ต้องโปร่งใสใช้ alpha
- Prefab recipe/character config เพิ่มเฉพาะเมื่อ tool หรือเกมต้องใช้ เป็นข้อมูลคนละหน้าที่กับเอกสารแมป
- Runtime WorldData สร้างจากเอกสารต้นทาง ไม่แก้เป็นฉบับหลักอีกชุด
- ข้อมูลแมปในฐานข้อมูลใช้เอกสารโครงสร้างเดียวกับ TMJ; export ล่าสุดจากแหล่งหลักนั้น

object.id ระบุ instance; gid อ้างแบบ tile โดย gid = firstgid + tileset tile.id อย่าใช้สองค่านี้แทนกัน

Profile นี้ใช้ tileset objectalignment: topleft; ตรวจให้ตรงกับ renderer เพราะจุดอ้างอิงของ tile object อาจต่างกันเมื่อใช้ tileset อื่น

## 7. ขอบเขตความเข้ากันได้กับ Editor เดิม

ต้องแยก generic Tiled bundle จาก bundle ที่ผ่าน Editor32-v1:

- Backend/Import ปัจจุบันรับหนึ่ง external tileset ชื่อ exhibition.tsj และ firstgid = 1
- Catalog ภาพผูกกับไฟล์ในโปรเจกต์ การส่ง TSJ/PNG ใหม่เป็น ZIP ไม่ได้ติดตั้ง catalog ใหม่ให้อัตโนมัติ
- ต้องมี Spawn ที่ใช้ได้หนึ่งจุด ตรวจ bounds และไม่ทับ collision
- รองรับ NPC InternWitch สูงสุดหนึ่งตัว; ต้องตรวจ boothId และพื้นที่เดินวนด้วย compiler
- Collision เป็นสี่เหลี่ยม ไม่มี rotation/polygon/ellipse
- ค่า geometry/body ของตัวละครใหม่ต้องตรงระบบเดิม หรือมีการปรับ runtime รองรับก่อน
- ไฟล์ preset TMJ ไม่ใช่หลักฐานว่าตรงแมปที่ Save ล่าสุดในฐานข้อมูล

การเปลี่ยนข้อจำกัดเหล่านี้เป็นงานของ runtime/tool ในอนาคต คู่มือไม่ได้เปิดความสามารถนั้นให้ source ปัจจุบัน

## 8. สถานะและจุดตรวจร่วม

ใช้สถานะ draft → visual-approved → file-validated → runtime-validated ตาม [คู่มือกลาง](ReferenceImageGuide.md)

- [ ] เลือก profile, style reference และ scale reference แล้ว
- [ ] ไม่มีค่า critical unresolved
- [ ] หน่วย origin, frame และ collision ไม่ปะปนกัน
- [ ] ไฟล์และ image paths เปิดได้จาก bundle โดยใช้ relative paths
- [ ] ทดลองร่วมกับตัวละครและ asset อ้างอิงที่ขนาดแสดงจริง
- [ ] ทดลอง collision, depth และ animation ที่ใช้
- [ ] ระบุ profile override และข้อจำกัดที่ยังไม่รองรับ

