# ข้อตกลงของ assets

## แหล่งไฟล์

- แมปมาจาก `D:/Downloads/map-tiled (1).zip` แตกไฟล์ลง `public/assets/map/` โดยรักษาชื่อและเนื้อหาของไฟล์ต้นฉบับ
- ตัวละครมาจาก `Student02.png` ที่ผู้ใช้ให้มา เก็บสำเนาเดิมใน `public/assets/characters/source/Student02.png`
- ไฟล์รันจริงเป็น `student-walk.png` ขนาด 256 × 256 มี 16 เฟรม ขนาดเฟรม 64 × 64

## Map contract

แมปมี 42 × 26 ช่อง ช่องละ 32px โลกมีขนาด 1344 × 832px จุดเกิด `Spawn_Player` คือ x=160, y=736

`tilesets/map.tsj` เป็น image collection มีภาพ PNG แยก 28 รูป Floor อ่านจาก gid และเฟอร์นิเจอร์อ่านจาก object layer จึงวาดผ่าน `Phaser.GameObjects.Image` ไม่ต้องประกอบ texture atlas ก่อน และไม่ใช้ tilemap parser เพื่อเดาพิกัด

ไฟล์นี้เป็น export ของ editor profile `ProjectExpo32-v1` วาง tile objects แบบ top-left ต่างจาก tile object ของ Tiled มาตรฐานที่มักใช้ bottom-left ตัว parser ตรวจ profile เพื่อไม่เอาแมปมาตรฐานมา render ผิดพิกัด ถ้าจะรับ export แบบอื่นต้องเพิ่ม adapter และ tests ให้ชัดเจน

อ่าน metadata จาก TSJ เป็น default แล้วให้ properties ของ TMJ object override

| Metadata                   | วิธีใช้                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `assetKey`                 | ระบุว่าเป็น furniture ชนิดไหน                                                 |
| `depthY`                   | ระยะ depth ใน native image pixels คูณ scale แล้วบวก object.y                  |
| `renderDepth`              | กำหนด depth ของ object โดยตรง                                                 |
| `interactable`             | ค่า default จาก tileset                                                       |
| `interactEnabled`          | เปิด/ปิด interaction ต่อ object มีสิทธิ์เหนือ default                         |
| `interactKind`             | ใช้เลือกชนิด interaction; POC เปิดเฉพาะ computer                              |
| `interactAction`           | เก็บคำสั่งจากข้อมูล; Sample ใช้แผง inspect เดียว ไม่ execute string เป็น code |
| `interactX/Y/Width/Height` | กรอบใน native image pixels แปลงตามขนาด object                                 |
| `counterTableId`           | Prop บนโต๊ะ ใช้ collision ของโต๊ะ                                             |
| `areaId`                   | บูธที่คอมพิวเตอร์สังกัด                                                       |

Collision layer ให้กำแพง 21 กรอบ รวมกับ TSJ footprints ของ furniture เป็น 52 กรอบ ไม่สร้าง collider ซ้ำให้ structure และไม่ให้ prop ที่อยู่บนโต๊ะขวางทางเพิ่ม

ชื่อแสดงคอมใช้ `kind` และ `areaId` ให้สม่ำเสมอ โดยเก็บ object ID เดิม ตัวอย่าง object 229 คือคอมที่บูธ 01 ตำแหน่ง top-left x=688, y=224 การอ่านข้อมูลไม่ได้อาศัยการสะกดชื่อภาษาไทย

ไม่รองรับ rotated/flipped objects, polygon collisions, infinite/chunked maps, multiple tilesets หรือ map transition ใน Sample นี้

## Sprite contract

ภาพต้นฉบับมีขนาด 1263 × 1246px จึงไม่ควรสั่ง Phaser slice เป็น 320 × 320 โดยตรง สคริปต์ `scripts/prepare-character.mjs` แบ่งช่องจากเส้นที่ตรวจภาพแล้ว, หา alpha bounds, crop และ resize ด้วย scale เดียวทั้ง 16 เฟรม

แถวเรียงเป็น down, up, left, right แถวละ 4 เฟรม ใช้ nearest-neighbor เพื่อไม่เบลอ และวางเท้ากึ่งกลางที่ x=32, y=62 ทุกเฟรม Phaser จึงใช้ origin `(0.5, 62/64)` และ frame rate 8fps

Alpha threshold ใช้หาขอบที่มองเห็น ไม่ได้เปลี่ยนรูปหรือสร้างท่าทางใหม่ รูปต้นฉบับและ source map คงเดิม ตรวจ animation ใน browser เสมอ เพราะ artwork มีการเปลี่ยนท่าและรูปทรงระหว่างเฟรมอยู่แล้ว

เปลี่ยนตัวละครใหม่ที่มี layout ต่างกันต้องปรับ split coordinates ในสคริปต์และ metadata ไม่ควรใช้พิกัดชุดนี้กับทุก sprite sheet
