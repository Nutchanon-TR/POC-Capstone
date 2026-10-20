# Map library

รายการแมปอยู่ทางซ้าย มีรางไอคอนเพียงหนึ่งปุ่มและพับรายการได้ แต่ละรายการแสดงภาพจากข้อมูลแมปจริง ชื่อ จำนวนช่อง Tile size และวันเวลาแก้ไขล่าสุด รวมชั่วโมง นาที และวินาที ค้นหาชื่อแมปได้

- สร้างแมปใหม่: ใส่ชื่อ ความกว้าง/สูงเป็นจำนวนช่อง เลือก Tile size 16 / 32 / 64 / 128 px และพื้นเริ่มต้น แล้วกดสร้าง แมปเดิมยังอยู่
- Save: บันทึกเฉพาะแมปที่กำลังเปิด พร้อมคลัง asset ของแมปนั้นและภาพตัวอย่างใหม่
- Duplicate: ปุ่มข้างแต่ละชื่อคัดลอกแมปและคลัง asset เป็น ID ใหม่ โดยเลือกชื่อสำเนาได้ ถ้าเป็นแมปที่มีฉบับร่างในหน้านี้จะคัดลอกฉบับร่างล่าสุด การแก้สำเนาไม่เปลี่ยนต้นฉบับ
- สลับแมป: ฉบับร่างและ Undo/Redo ของแต่ละแมปอยู่ในหน้านี้จนปิดหรือโหลดหน้าใหม่ ป้ายยังไม่บันทึกแสดงบนรายการ แม้กำลังดูแมปอื่น ต้อง Save แต่ละฉบับก่อนโหลดหน้าใหม่
- เปิดใหม่: กลับมาแมปที่เลือกล่าสุดโดยอ่านจากข้อมูลที่ Save ไว้ในเบราว์เซอร์นี้

Tile size เป็นขนาดจริงของ `tilewidth` / `tileheight` ใน TMJ ส่วนขนาดบล็อกบน toolbar เป็นระยะ Snap ของเครื่องมือ ทั้งสองแยกกัน พื้นและ Ghost ใช้ Tile size ของแมปเป็นหน่วยเล็กที่สุด ส่วนภาพ props คงขนาดพิกเซลเดิม

เมื่อตั้ง Tile size ใหม่ PNG พื้นจัตุรัสถูกปรับด้วย nearest-neighbor ให้มีขนาดตรงกับ TMJ และ TSJ ไฟล์ Export รวม PNG พื้นชุดนี้จริง ไม่ใช้การย่อภาพเฉพาะหน้าจอ การเปลี่ยน Tile size ของแมปใหม่ไม่แก้คลังของแมปเดิม

## Storage and ownership

`mapStorage.ts` owns IndexedDB version 2. `maps` stores a workspace snapshot keyed by map ID, `summaries` stores lightweight list metadata/thumbnail, and `workspace.activeMapId` remembers the selected map. Legacy `workspace.current` is migrated to the map collection without resetting its document, revision or uploaded assets. `api.ts` validates snapshots, performs compatible starter upgrades and guards saves by the persisted revision of that map ID. Snapshot and summary writes are one transaction, so failed or conflicting saves never update only one side.

`MapEditor.tsx` keeps per-map session drafts and history. `MapLibrary.tsx` owns sidebar and creation/duplication controls. `mapImages.ts` prepares native floor variants and map thumbnails. `shared/map/studio.ts`, `grid.ts`, and `compile.mjs` share actual tile-size geometry for editing and export.

Switching maps destroys the old Phaser game. `EditorScene.dispose()` synchronously releases global input/resize listeners and blocks further rendering; both SHUTDOWN and DESTROY also call it. Phaser defers game destruction and emits DESTROY without SHUTDOWN, so relying only on SHUTDOWN leaves old keyboard handlers active.

Browser checks cover collection migration, isolated drafts/undo, duplicate independence, save/reload, floor painting and native PNG/TMJ dimensions at 16/64/128px, mobile sidebar layout, and conflicting saves across tabs. The existing 32px starter and interaction/region/placement regression suite remain covered.
