# ประกอบ base map จาก blueprint

Version: 1.0

อ่าน [MapStandard.md](MapStandard.md) ก่อน ใช้ [ReferenceImageGuide.md](ReferenceImageGuide.md) เพิ่มเมื่อ blueprint หรือภาพแนบมีหลายบทบาท การสร้าง asset ที่ขาดให้ใช้ [ObjectAssetGuide.md](ObjectAssetGuide.md) หรือ [CharacterAssetGuide.md](CharacterAssetGuide.md)

คู่มือนี้กำหนดขั้นอ่านภาพ วางแผน ประกอบ และตรวจแมป การได้ preview จาก image generator ยังไม่ใช่การได้เอกสารแมปที่แก้ไขได้ ต้องมีขั้นประกอบข้อมูลตาม schema และภาพที่อ้างอิงจริง

## 1. ข้อมูลนำเข้า

```text
MAP NAME: [ชื่อ]
PROFILE: [profile/version]
BLUEPRINT FILE: [JPG/PNG]
BLUEPRINT ROLE: [layout only / layout + ระบุบทบาทเพิ่มเติม]
MAP SIZE: [width x height, tiles]
TILE SIZE: [world pixels ตาม profile]
IMAGE MAP BOUNDS: [left, top, width, height ใน blueprint pixels]
LEGEND: [สัญลักษณ์ → ประเภท/assetId]
APPROVED CATALOG: [TSJ + PNG / catalog ที่เกมรองรับ]
REQUIRED COUNTS: [ชนิด → จำนวน]
LOCKED AREAS: [ตำแหน่งหรือสิ่งที่ต้องรักษา]
SPAWN / ENTRANCES: [ตำแหน่งที่ระบุ]
MINIMUM WALKWAY: [world pixels หรือ tiles จากขนาด body ที่ใช้]
DECORATION POLICY: [none / เฉพาะพื้นที่ที่ระบุ]
INTERACTIONS: [พฤติกรรมที่ runtime มี handler]
EXPORT TARGET: [generic Tiled bundle / Editor32-v1]
```

Blueprint ใช้ JPG ได้ Asset ที่ต้องโปร่งใสใช้ PNG ตาม contract ภาพ blueprint ไม่กำหนดสี สไตล์ หรือกล้องของ asset เว้นแต่ได้รับบทบาทนั้น

หากไม่ระบุขนาดโลกหรือขอบแมป ให้เสนอค่าพร้อมเหตุผลและระบุว่ายังเป็นร่าง ไม่อ้างพิกัดแม่นยำจากภาพที่ไม่มี scale

## 2. อ่านภาพและเสนอผัง

1. ระบุกรอบแมปในภาพ หากเป็นรูปถ่ายกระดาษที่เอียงให้ตรวจ/แก้การฉายก่อนคำนวณพิกัด
2. อ่าน legend, ชื่อพื้นที่ จำนวนบูธ ประตู ทางเข้า ทางเดิน และ spawn
3. แยกสิ่งที่ภาพระบุชัดจากสิ่งที่อนุมาน ระบุ unknown/ความไม่แน่ใจเป็นรายการ
4. จับคู่แต่ละสิ่งกับ assetId ใน catalog ถ้าไม่มีให้รายงาน missing asset
5. เสนอ overlay มีขอบแมป grid ชื่อ object, footprint, ทางเดิน และ spawn
6. ตรวจผังกับผู้ใช้หรือข้อกำหนดที่ชัดเจนอยู่แล้ว ก่อนรับรอง final layout

ไม่เปลี่ยนจำนวน ตำแหน่งหลัก หรือรูปทรงพื้นที่เพียงเพื่อให้ภาพสวยขึ้น หากองค์ประกอบทับกันหรือทางเดินแคบ ให้เสนอจุดแก้ ไม่ย้ายสิ่งสำคัญเงียบ ๆ

ตารางผังที่ใช้ตรวจ:

| Instance/area | หลักฐานจาก blueprint | Asset/type | x,y ในโลก | ขนาดในโลก | ข้อจำกัด/สถานะ |
|---|---|---|---|---|---|
| [id] | [label/region] | [assetId/Spawn/Zone/Collider] | [x,y] | [w,h] | [known/unresolved] |

ตารางหรือ overlay เป็นร่างประกอบการตรวจ เมื่อประกอบแล้ว TMJ เป็นเอกสารแมปหลัก ไม่เก็บตารางเป็นอีกฉบับที่ต้องแก้คู่กัน

## 3. แปลงพิกัด

สำหรับ blueprint ที่ปรับให้เป็นสี่เหลี่ยมตรงแล้ว:

```text
worldWidth = mapWidthTiles × tileWidth
worldHeight = mapHeightTiles × tileHeight
worldX = (imageX - boundsLeft) / boundsWidth × worldWidth
worldY = (imageY - boundsTop) / boundsHeight × worldHeight
```

เช่นพื้นที่แมปในภาพมีขนาด 800 × 600 pixels และโลก 80 × 60 ช่อง ช่องละ 32 ตำแหน่งภาพ 100,80 จากขอบแมปจะเป็นตำแหน่งโลก 320,256

- ระบุว่าพิกัดที่อ่านเป็นมุมซ้ายบน จุดกึ่งกลาง หรือเท้า แล้วแปลงเป็น origin ของ object ตาม profile
- ตำแหน่ง slot ใน blueprint อาจแทน footprint ไม่ใช่กรอบภาพ รวมส่วนสูงและ padding เมื่อวาง asset
- Snap ตาม profile หลังแปลง ตรวจว่าไม่ทำให้ประตูหรือทางเดินหาย
- Tile floor ใช้ช่องเต็มตาม tile size ส่วน object ใช้ world pixels
- Group ใช้ offset และ local positions ห้ามบวก offset ซ้ำสองครั้ง

## 4. เลือกและประกอบ asset

ใช้ catalog ที่ผ่านแล้วก่อน สร้างแบบใหม่เมื่อไม่มีในรายการและงานอนุญาต

- เลือก variant/preset ที่ขนาดเหมาะกับ slot และรักษาอัตราส่วน
- สร้างบูธ/ห้องจาก prefab recipe หากมี ตรวจการประกอบและรอยต่อ
- ใส่ tile IDs จาก TSJ จริง อย่าประดิษฐ์ gid ที่ไม่มี asset
- instance.id และ layer.id ต้องไม่ซ้ำ nextobjectid/nextlayerid ต้องมากกว่า ID ที่ใช้
- gid = firstgid + tile.id เปลี่ยน catalog ต้องคงความหมายของ ID เดิมหรือทำ remap ทั้งแมป
- Missing asset ใช้ marker ที่ระบุชัดใน draft ได้ แต่ห้ามแอบใช้ placeholder ใน final bundle
- การนำตัวละครมาใส่เป็นภาพ object ไม่สร้าง Player/NPC ให้เอง ต้องใช้ spawn/Npc contract ของเกม

## 5. โครงสร้างแมป

ใช้ layer ตามงานและ compiler ที่เลือก ตัวอย่าง:

| Layer | ข้อมูล |
|---|---|
| Floor | tilelayer, ขนาดและ data ตามช่องโลก |
| Ground decoration | ภาพบนพื้น เช่นลาย/พรมที่ไม่ควรบังตัวละคร |
| Structures/props | objectgroup หรือ prefab groups |
| Collision | Collider rectangles สำหรับกำแพงและขอบเขต |
| Markers | Spawn, Npc และ Zone ตามชนิดที่เกมอ่าน |

ชื่อ layer เปลี่ยนได้เมื่อ runtime ไม่ใช้ชื่อเป็นเงื่อนไข ประเภท object และ properties ต้องตรง parser ที่ใช้

- Floor data มีจำนวนรายการเท่ากับ layer.width × layer.height และอ้าง gid ถูก
- Object x,y,width,height ระบุ world pixels; rotation/flip ตามความสามารถ profile
- Spawn ใช้ point และชนิด Spawn ต้องมีจำนวนและตำแหน่งตาม profile
- Zone เป็นกรอบชื่อพื้นที่ ไม่สร้าง collision ให้อัตโนมัติ
- Npc ต้องมี character, boothId, title/dialogue และ movement/interaction properties ที่ parser รองรับ
- Collision ของ props มาจาก TSJ และแปลงสเกล ไม่วาด collider อิสระซ้ำโดยไม่มีเหตุผล

Interaction เป็นข้อมูลประกอบที่ต้องมี handler ใน runtime อย่ารับรองว่าปุ่ม E จะทำงานจากการใส่ property ใหม่เพียงอย่างเดียว

## 6. ตรวจผังและการเดิน

ตรวจทั้งเอกสารและเกม:

1. จำนวน ตำแหน่งหลัก และ locked areas ตรง blueprint ที่ตรวจแล้ว
2. ทุก assetId/gid/image path อ้างสิ่งที่มีจริง ขนาด layer/data ถูก
3. Spawn อยู่ใน bounds ไม่ทับ collision และมีพื้นที่สำหรับ body ผู้เล่น
4. ทางเดินและประตูกว้างพอกับ body ที่ใช้ มีทางจาก spawn ถึงจุดสำคัญ
5. ตรวจความเชื่อมต่อโดยคำนึงถึงขนาด body การตรวจเฉพาะจุดกึ่งกลางอาจยืนยันทางแคบผิดได้
6. NPC มีพื้นที่เดินวนและชนตามข้อกำหนด profile
7. เดินรอบสิ่งของ/ประตูจริง ตรวจ collision, depth และ interaction
8. Preview ที่เห็นสวยไม่แทนการทดสอบ physics

เมื่อ resize แมป ต้องปรับ map dimensions, floor layer/data, ขอบ Collider และพิกัดที่เกี่ยวข้องร่วมกัน เปลี่ยน width/height อย่างเดียวไม่พอ

## 7. แก้แมปหลังประกอบ

แก้เอกสาร TMJ โครงสร้างเดิมใน tool ลบ/เพิ่ม/move object หรือ group ตามข้อมูลที่ใช้เป็นหลัก

- Web tool เก็บเอกสารล่าสุดในฐานข้อมูลแล้ว export เป็น TMJ
- File tool บันทึกฉบับแก้ไขเป็น TMJ
- Template เก็บแยกเพื่อเริ่มงานใหม่ แมปที่แก้แล้วใช้ฉบับปัจจุบันเป็นหลัก
- การ regenerate ใช้ฉบับล่าสุดเป็นฐาน ระบุพื้นที่และรายการที่อนุญาตให้แก้
- รักษา ID ของสิ่งที่ไม่เปลี่ยน และรายงาน diff ของตำแหน่ง/จำนวน
- ตรวจ approved regions หากต้องรักษาตรงพิกเซล ให้แยกการประกอบเฉพาะชิ้นหรือใช้เครื่องมือที่รองรับการล็อก
- AI ไม่ควรวาดทั้งแมปใหม่ทุกครั้งที่ย้ายสิ่งของหนึ่งตัว

Runtime JSON/WorldData สร้างจากเอกสารล่าสุด ไม่เก็บเป็นแมปอีกฉบับที่แก้แยก

## 8. ส่งออก

Generic Tiled bundle:

```text
map-bundle/
  map.tmj
  tilesets/environment.tsj
  images/*.png
  preview.png              # optional
  blueprint.jpg            # optional
```

Editor32-v1 ใช้ชื่อและ catalog ตามระบบเดิม:

```text
editor-bundle/
  exhibition.tmj
  tilesets/exhibition.tsj
  pieces/*.png
```

- TMJ อ้าง TSJ ด้วย relative path และ TSJ อ้าง PNG ด้วย relative path จากตำแหน่ง TSJ
- รวมภาพที่อ้างอิงครบ ห้ามติด absolute paths ของเครื่องผู้สร้าง
- Prefab recipe เพิ่มเมื่อ tool ต้องใช้ในการวางชุดใหม่ Runtime ใช้กลุ่มที่ประกอบไว้ใน TMJ ได้
- Character PNG/config เพิ่มเฉพาะเมื่อส่ง character pack ด้วย bundle สิ่งของปกติไม่แทนการลงทะเบียน character
- ส่ง preview/blueprint เป็นข้อมูลประกอบได้ ไม่ใช่แหล่ง collision หรือพิกัดหลัก
- Generic TMJ ที่ถูก schema ไม่เท่ากับ Editor-compatible ต้องผ่านข้อจำกัดใน MapStandard.md และ compiler
- Catalog ใหม่ต้องมีขั้นติดตั้ง/รองรับในเกม การ export ZIP ไม่ได้เปลี่ยน catalog ของ Editor เดิมเอง

รูปแบบอ้างอิง: [Tiled JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/) และ [Tiled objects](https://doc.mapeditor.org/en/stable/manual/objects/)

## 9. พรอมป์ต์เริ่มงานและรายงานผล

```text
Read MapStandard.md and BlueprintToMapGuide.md.
Use [profile] and [approved catalog].
Treat [blueprint] as layout reference only.
Preserve [counts, entrances, locked areas].
Map image bounds [bounds] to a [width x height] tile world.
First produce an annotated layout with object IDs, world positions,
footprints, walkways and unresolved items.
Assemble the checked layout as editable Tiled data using existing assets.
Validate references, IDs, tile arrays, spawn, collision, routes and depth.
Export the latest TMJ, TSJ and referenced PNGs with relative paths.
Report which checks actually ran and which remain pending.
```

ท้ายงานรายงาน input/profile, assumptions/overrides, จำนวนและไฟล์ output, การเปลี่ยนจาก blueprint, ผล schema/asset checks และผลทดลองเกม ถ้ายังสร้างไฟล์หรือรัน compiler ไม่ได้ ให้ส่งผัง draft พร้อมงานที่ค้าง ห้ามอ้างว่าส่งแมปพร้อมใช้แล้ว

