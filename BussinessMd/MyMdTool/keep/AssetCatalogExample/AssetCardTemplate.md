# Asset card template

ใช้หนึ่ง card ต่อหนึ่งแบบ asset ภาพต้องมีบทบาทชัดเจน อ่านร่วมกับ MapStandard.md และ ReferenceImageGuide.md กรอก unresolved เมื่อยังไม่ทราบ

## [asset-id]

![ภาพที่ใช้เป็นต้นแบบ](images/[filename].png)

| ข้อมูล | ค่า |
|---|---|
| Asset ID | [ชื่อแบบคงที่ ไม่ใช่ instanceId] |
| Profile / version | [profile] |
| Type | [prop / floor / wall / prefab / character] |
| Reference role | [design / style / identity / approved game image] |
| Source image / source size | [ไฟล์, width×height source px] |
| Default display size / uniform scale | [world px หรือ scale] |
| Image bounds ใน tile | [displayWidth ÷ tileSize, displayHeight ÷ tileSize] |
| Blueprint footprint | [width×height world px และ tile; unresolved ได้] |
| Footprint offset / placement anchor | [ตำแหน่งฐาน/anchor จากมุมภาพ source px และวิธีแปลง] |
| Runtime origin | [มุมภาพ / เท้า / custom ตาม loader] |
| Facing | [up/down/left/right/variant] |
| Collision local | [rectangles x,y,w,h source px หรือ none] |
| Depth | [depthY source px หรือกติกาของ renderer] |
| Allowed scale / variants | [presets; ข้อห้ามการยืด; variant IDs] |
| Shadow mode | [none/baked/separate] |
| Repeat / connectors | [ด้านที่ต่อซ้ำได้, doorway size หรือ not applicable] |
| Prefab recipe | [part ID, local position, size หรือ not applicable] |
| Interaction capability | [type/handler ที่รองรับ; ข้อมูลเฉพาะ instance เก็บตอนวางแมป] |
| Visual QA | [draft / visual-approved + หลักฐาน] |
| Runtime QA | [not-tested / runtime-validated + หลักฐาน] |
| Source / revision / overrides | [ข้อมูลต้นทาง, version, override และผลกระทบ] |

## เพิ่มเมื่อเป็น character

| ข้อมูล | ค่า |
|---|---|
| Frame size / sheet layout | [source px; columns×rows] |
| Visible height | [source/world px แยกจาก frameHeight] |
| Feet anchor / padding | [source px] |
| Directions / frame ranges / idle | [รายการที่มีในภาพจริง] |
| Frame rate | [animation frames/second] |
| Physics body / offset | [หน่วยตาม runtime] |
| Movement speed | [world px/second] |

## ภาพกำกับที่ควรแนบ

1. ภาพ asset ที่อนุมัติ พร้อมภาพแสดงที่ขนาดจริงในโลก
2. กรอบภาพและฐาน แสดงแยกกันพร้อม origin/offset
3. Collision และแนว depth ใช้สีและสัญลักษณ์กำกับ
4. ภาพเทียบสัดส่วนกับ character/ประตู/โต๊ะมาตรฐาน
5. ตัวละครใช้ sheet ที่ใส่เลขเฟรมและทิศ รวมถึงหลักฐาน loop

Catalog เป็นเอกสารอ้างอิง ไม่ใช่แมปอีกฉบับ เมื่อมี tool ให้สร้าง card จาก metadata ชุดเดียวกับ TSJ/config เพื่อลดการแก้ข้อมูลซ้ำด้วยมือ
