# kmutt · Job Fair

แมปใหม่สำหรับ Editor ใช้ผัง `D:/Downloads/job-fair-map.webp` เป็น Layout Reference คงตำแหน่งหกโซนและแปลงจากภาพ isometric เป็นกล้อง orthogonal top-down ของโปรเจกต์

- 80 × 56 ช่อง ช่องละ 32 px, โลก 2560 × 1792 px
- ลงทะเบียนล่างซ้าย อาหารซ้ายบน สัมภาษณ์ด้านบน บูธรับสมัครตรงกลาง เวทีขวาบน และ Workshop ขวาล่าง
- 12 บูธบริษัท, 6 จุดสัมภาษณ์, 6 โต๊ะ Workshop พร้อม 24 เก้าอี้, 70 ที่นั่งหน้าเวที, คาเฟ่ 6 โต๊ะ และที่นั่งรอ
- ทางเดินระหว่างแถวบูธ 128 px ช่องว่างระหว่างบูธ 60 px และทางกลางที่นั่งเวที 60 px อ้างกรอบเท้า 26 × 12 px ของตัวละครทดลองเดิน

## Art และ reference

อ่าน MapStandard, ReferenceImageGuide, ObjectAssetGuide, MapComponentGuide, PixelPipelineGuide และ CharacterAssetGuide ก่อนทำงาน ใช้ Example01 เป็น design vocabulary, Example02 เป็น construction reference และ Example03 เป็น style reference เฟอร์นิเจอร์ที่ผ่าน cleanup ใน sample-source และโต๊ะคลุมผ้าเดิมเป็นขนาด/สีสำหรับประกอบจริง

สร้างใหม่ด้วย built-in imagegen จำนวน 5 ชิ้น: เวที, จอเวที, โพเดียม, เคาน์เตอร์อาหาร และฉากบูธ เก็บภาพดิบใน [source/](source/) และข้อความ prompt ครบใน [source/prompts.json](source/prompts.json) ไม่ใช้ CLI/API key และไม่เขียนทับภาพดิบ

Python ทำ alpha 0/255 ลดสีลง palette ร่วม 24 สีโดยไม่มี dithering และย่อแบบ nearest-neighbor โดยรักษาอัตราส่วนจริง ฉากบูธเลือก native width 192 px หลังตรวจ scale เพื่อให้ความสูงภาพ 65 px สอดคล้องกับตัวละครที่มองเห็นสูง 56 px ไม่มีการยืดเฉพาะแกน ของเดิมที่เข้าชุดใช้ PNG ที่เก็บแล้วโดยตรง ส่วนพื้นและขอบห้องใช้ modular geometry ตามข้ออนุญาตใน MapComponentGuide

- [inventory.json](inventory.json): source crop, native size, anchor, alpha/palette audit, SHA256
- [native/props/](native/props/): สิ่งของแยกชิ้น
- [native/structure/](native/structure/): พื้นและขอบห้อง
- [asset-sheet.png](asset-sheet.png) และ [map-components-sheet.png](map-components-sheet.png): ภาพรวมแยกประเภท
- [assembly-native.png](assembly-native.png), [assembly-preview-2x.png](assembly-preview-2x.png), [overview.png](overview.png): ต่อจาก PNG จริงด้วย Python

## สร้างซ้ำ

1. รัน `prepare-assets.py` ที่โฟลเดอร์นี้ด้วย Pillow
2. จาก Editor รัน `node --import tsx scripts/build-kmutt-map.mjs`
3. รัน `assemble-preview.py` ที่โฟลเดอร์นี้

Generator ตรวจ compiler แบบ gameplay รวมถึง Spawn และ flood-fill ด้วยกรอบเท้าจริงบนกริด 8 px ตรวจจุดเข้าถึง 30 จุด ผลใน [design-report.json](design-report.json) การประกอบ Python ใช้ offset ของกลุ่มและ renderDepth เดียวกับ runtime

## ส่งออก

[kmutt-tiled.zip](kmutt-tiled.zip) มี `map.tmj`, `expo.tsj`, PNG ของทุกชิ้น และ prefab recipe เปิดใน Tiled ได้เมื่อเก็บพาธสัมพัทธ์ไว้ครบ ทุกบูธแยกโต๊ะ คอมพิวเตอร์ เอกสาร และฉากหลัง มี Zone, collision และ Interact metadata ให้โปรเจกต์ปลายทางกำหนด action เอง วัตถุบนโต๊ะใช้ `renderDepth` เพื่อเก็บลำดับภาพ

สำเนาสำหรับเว็บอยู่ `Editor/public/maps/kmutt/` Editor เพิ่มรายการชื่อ **kmutt** ครั้งเดียวด้วย ID `preset-kmutt-jobfair-v1` และรักษาแมปที่เปิดอยู่ แมปที่ผู้ใช้แก้/เซฟแล้วจะไม่ถูก seed ทับเมื่อเปิดใหม่
