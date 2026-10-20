# สร้าง Map component แบบ modular tileset

Version: 1.1

อ่าน [MapStandard.md](../Standard/MapStandard.md), [ReferenceImageGuide.md](../Standard/ReferenceImageGuide.md) และกติกาเลือกrefใน [ObjectAssetGuide.md](ObjectAssetGuide.md)
คำสั่งผู้ใช้เป็นหลัก ภาพrefแยกบทบาท Style/Design/Layout ห้ามดึง cameraที่ขัด profileมาใช้

หลังสร้างชิ้นงาน ต้องทำ Python cleanup และ Python assembly ตาม [PixelPipelineGuide.md](PythonPipeline/PixelPipelineGuide.md) ด้วย ภาพทดลองต้องต่อจาก native PNG และ anchor ของโมดูลจริง ไม่ใช้ภาพห้องเจนใหม่แทนการตรวจชิ้นต่อ

## ประเภทและการแยกไฟล์

Map component: พื้น กำแพงหน้าบน/หน้าแนวตั้ง กระจก/หน้าต่างติดอาคาร ช่องประตู/วงกบ เสาอาคาร และชิ้นเชื่อม
Asset: เฟอร์นิเจอร์ ต้นไม้/กระถาง และอุปกรณ์วางอิสระ ส่ง PNG คนละแผ่น
ไม่ส่ง Map component เป็นคอลเลกชันประตู/หน้าต่าง/เสาหน้าตรงที่ไม่ต่อกับแนวกำแพง

## Contract ก่อนสร้าง

- PROFILE: Editor32-v1; world tile32x32; high-angle top-down orthographic RPG กล้องหันตรง ไม่ใช้ isometric
- NATIVE TILE / ART UNIT: ระบุหน่วยพิกเซลต้นทางและอัตรา world/source; ไม่เดาจากความใหญ่ช่องใน preview
- ATLAS GRID: จำนวนแถว/คอลัมน์ ขนาดcell spacing margin แยกจากtileโลก
- CONNECTION SOCKETS: ระดับtop trim/bottom trim ความหนากำแพง ตำแหน่งช่องต่อของเสา/กระจก/วงกบ
- MATERIAL FAMILY: floor/wall ramps กับpaletteร่วมตามrefที่เลือก ใช้ hue shift เมื่อcontractเลือก
- DIRECTION: north/south/west/east ตามแกนโลก จุดยึดและedgeคู่ตรงกัน
- SHADOW: ตามprofile; ไม่เติมglow/contact shadowเอง

## ชุดขั้นต่ำที่ต่อเป็นห้องได้

- พื้น3วัสดุ: center, ขอบ4ด้าน, มุม4, รอยต่อ; ลายcenterต้องต่อrepeatได้
- กำแพง: แนวตรง4ด้าน, มุมใน/มุมนอก4ด้าน, end caps, รอยต่อเสา
- กระจก/หน้าต่าง: แนวตรงแนวนอน/แนวตั้ง, frame ends, มุมLซ้าย/ขวา; ความสูงและtrimต่อกำแพงได้
- ช่องประตู: gapที่ตรงtile/snap, วงกบซ้าย/ขวาและtop trim, บานปิด/เปิดแบบเดียวกัน; ไม่วาดแต่ละทิศเป็นdesignใหม่
- เสาอาคาร: shaft/cap/base และรอยต่อแนวกำแพง ตามความหนาที่เลือก
- ภาพตัวอย่างการต่อช่วยตรวจได้ แต่ต้องแยกจากแผ่นmodule ไม่ใช้previewของห้องแทนtilesetที่ตัดตามกริดแล้ว

## กริดและPixel Art

ใช้native pixel unitเดียวทั้งชุด เส้นไม้/ยาแนวไม่ผอมกว่าcontourหลัก
ก้อนสีเรียบ paletteจริง4–5เฉดต่อวัสดุจากpaletteร่วม ไม่ใช้gradient, anti-aliasing, bloomหรือฟิลเตอร์พิกเซล
ใช้binary alphaในงานpixel artเมื่อcontractไม่มีข้อยกเว้น ห้ามรักษาRGB fringeจากrefเป็นลายเส้น
spacing/baselineเป็นจำนวนnative pixelsที่กำหนด ไม่วางcellแบบกะด้วยตา
ความต่างของความสูงเสาและกำแพงต้องตามdesignและconnection contract ไม่บีบทุกmoduleให้สูงเท่ากันในpreview

## QA

- แยกMap componentออกจากAssetแล้ว และinventoryตรงงาน
- วัดcanvas/grid/cell/margin/spacingจากPNGจริง ไม่รับรองจากprompt
- ต่อพื้นcenterอย่างน้อย3x3และต่อmaterial transitionsเพื่อตรวจseam
- ประกอบห้องสี่ด้าน มุมใน/มุมนอก กระจก ช่องประตูและเสาเพื่อตรวจsocket/trim
- ตรวจclosed/openและnorth/south/west/eastว่าเป็นชิ้นแม่แบบเดียวกัน และfootprintไม่เปลี่ยนผิด
- ทดลองกับตัวละครและAssetที่ขนาดworldจริง ไม่อ้างframeตัวละคร256ว่าเป็นvisible height
- alpha/palette/native gridไม่ผ่านให้บอกpendingและระบุdraft; ไม่เรียกgame-readyก่อนfile/runtime validation

