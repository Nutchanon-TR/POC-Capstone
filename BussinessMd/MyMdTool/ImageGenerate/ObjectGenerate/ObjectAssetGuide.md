# สร้างและเตรียมสิ่งของสำหรับแมป

Version: 1.6

อ่าน [MapStandard.md](../Standard/MapStandard.md) และ [ReferenceImageGuide.md](../Standard/ReferenceImageGuide.md) ก่อน คู่มือนี้เพิ่มเงื่อนไขของสิ่งของ ไม่คัดลอกกติกา reference/style มาเปลี่ยนเอง

ข้อกำหนดมุมมอง: สิ่งของทุกชิ้นต้องเป็น **Top-down view เท่านั้น** ใช้กล้อง high-angle top-down RPG ของ Editor32-v1 มองจากด้านบน เห็น top plane และ front plane ที่ถูกย่อตามกล้องเดียวกัน ห้ามใช้หน้าตรง ด้านข้าง มุมสามส่วนสี่ที่หมุนด้านข้างเข้ากล้อง หรือ isometric แม้ ref จะใช้มุมนั้น ห้ามสลับกล้องเฉพาะบางชิ้นเพื่อให้อ่านง่าย หากเลือก profile ที่กล้องขัดกับข้อกำหนดนี้ต้องแจ้งข้อขัดแย้งก่อนสร้าง ไม่เปลี่ยนมุมเอง

## 0A. แยก Asset และ Map component

- Asset คือของวางอิสระ: โต๊ะ เก้าอี้ โซฟา ม้านั่ง ชั้น/ตู้ ต้นไม้ในกระถาง โคมไฟ ถังขยะ ป้าย บอร์ด และแนวกั้นคิว ใช้ footprint, foot anchor และ depth ของแต่ละแบบ
- Map component คือชิ้นโครงสร้างที่ต่อเป็นอาคาร: พื้น กำแพง กระจก/หน้าต่างที่แทรกในแนวกำแพง ช่องประตู/วงกบ เสาอาคารและรอยต่อ ใช้ tile edge/socket และความหนา/ความสูงของโครงสร้างร่วมกัน
- Map component เป็นชิ้นย่อยได้ แต่ต้องจัดเป็น modular tileset ที่ต่อแนว/มุมได้ ไม่ใช่แผ่นไอคอนสิ่งของที่ขยายแต่ละชิ้นเต็มช่อง
- แยก PNG และ inventory ของสองประเภทก่อน gen ห้ามรวมประตู/กระจก/เสาอาคารในแผ่นต้นไม้หรือเฟอร์นิเจอร์เพียงเพื่อเพิ่มจำนวนชิ้น
- บานประตูที่เปิด/ปิดมี geometry และจุดบานพับสัมพันธ์กับช่องประตูในชุด Map component หาก runtime ต้องใช้เป็น interactive object ให้แยกบานกับวงกบและ metadata ภายหลัง ไม่เปลี่ยนการจัดประเภทจากภาพ preview
- ใช้ [MapComponentGuide.md](MapComponentGuide.md) สำหรับ tileset; ใช้คู่มือนี้สำหรับของวางอิสระ

### ขั้นตอนเก็บไฟล์หลังสร้าง

- Flow ที่ผู้ใช้เลือกคือสร้างภาพต้นทาง แล้วใช้ Python เก็บ native pixels, palette, alpha, scale และกริด ก่อนใช้ Python ประกอบภาพทดลองจากชิ้นจริง ต้องอ่านและทำตาม [PixelPipelineGuide.md](PythonPipeline/PixelPipelineGuide.md) ต่อด้วย ไม่จบที่ภาพเจนดิบ
- ผู้ใช้กำหนดให้ flow นี้รวม Python cleanup และ Python assembly ไว้แล้ว เมื่อผู้ใช้สั่งทำตาม flow นี้ให้ทำครบ เว้นแต่คำสั่งล่าสุดเปลี่ยนเงื่อนไข แยกภาพต้นทางไว้ก่อน ไม่เขียนทับต้นฉบับ
- ลดสีโดยเลือก material ramp ต่อพื้นผิว ตรวจว่าเฉดสีของหนังสือ/ดอกไม้ไม่หลุดไปเป็นจุดรบกวนบนไม้ หลีกเลี่ยง dithering และการสุ่ม noise แทนลายวัสดุ
- คงอัตราส่วนของชิ้นงานเมื่อปรับขนาด ห้ามยืดกว้าง/สูงแยกกันเพื่อให้เต็มช่อง กำหนดขนาดจาก footprint ของชนิดและทิศนั้น
- ชิ้นสมมาตรใช้ด้านซ้ายเป็นแม่แบบของด้านขวาได้ แต่ต้องตรวจทิศแสงและรายละเอียดที่มีความหมาย เช่นข้อความ/มือจับก่อนกลับภาพ
- แยกข้อที่ตรวจจากไฟล์ได้กับข้อที่ดูด้วยตา: จำนวนชิ้นส่วนใน blueprint ไม่ใช่หลักฐานว่า sprite ทุกทิศตรง geometry นั้นจริง ต้องตรวจภาพผลลัพธ์ด้วย
- ส่ง native PNG, ภาพขยาย integer nearest-neighbor, crop/anchor inventory และรายงานตรวจไฟล์ ระบุชัดว่ายังไม่ได้ทดสอบ collision/depth ในเกมหากไม่มีการทดสอบจริง

### 0A.1 แก้ข้อบกพร่องของชุด Example02

- Native pixel unit ต้องมีค่าเดียวทั้ง contour ลายไม้ seam เบาะ หนังสือและใบไม้ เส้นหนึ่งหน่วยห้ามผอมกว่าหน่วยที่ใช้กับส่วนอื่น ห้ามใช้ texture/filter พิกเซลแทนการจัดก้อนสี
- สำหรับงาน pixel art ขอบต้องเป็นขั้นคมและ alpha0/255 เท่านั้น การขยายเพื่อโชว์ใช้ nearest-neighbor กับ integer factor เดียวทั้งชุด ตรวจจากไฟล์จริงก่อนรับรอง
- ไม้ต้องใช้ material ramp ที่เลือกไว้ เช่นไม้เคลือบอุ่นกับไม้เข้ม/เก่า โดยใช้สีเงาร่วม ไม่ทำทุกชิ้นสีฐานเดียวแล้วสุ่มรอยเพื่อสร้างความต่าง
- งานนี้เลือก hue-shift: เงาเอียงไปม่วง/น้ำเงิน ไฮไลต์อุ่น ใช้4–5ระดับเป็นก้อนสีเรียบตามวัสดุ ไม่ใช่ smooth gradient และไม่สร้างสีใหม่ระหว่างเฉด
- คุมกล้องจากวัตถุแม่แบบเดียว: tabletop/seat/pot top อยู่บน ground plane เดียวกัน กำหนด compressionของความลึกและความสูงตั้งแต่ต้น ไม่แก้กล้องเฉพาะชิ้น
- ล็อกวัตถุแม่แบบก่อนทำทิศ: จำนวนขา ความหนาขา/แขน รูปที่นั่ง พนัก จำนวนเบาะ จุดยึด และขนาด footprint ต้องเดิมทุกทิศ ต่างได้จากการบังตามกล้องเท่านั้น
- ทิศซ้าย/ขวาของโซฟาสองที่นั่งต้องมี footprintยาวแนวตั้งและเบาะสองชิ้น ไม่ย่อเป็นเก้าอี้เดี่ยว ทิศหลังต้องมีโครงหลังของแบบเดียวกัน
- ล็อก canvas, cell size, gutter และ foot baseline เป็นจำนวน native pixels จริง จุดวางภาพลงแผ่นต้อง snapกับกริดที่ประกาศ ความสูงวัตถุต่างชนิดไม่จำเป็นต้องเท่ากัน แต่ scale/foot anchorของแบบเดียวกันต้องคงที่
- ไม่ขยายของเล็กเพื่อเติมช่องเมื่อทำแผ่นรวม ถ้ารักษาขนาดแล้วใส่ไม่พอ ให้เพิ่มแผ่นหรือพื้นที่ว่าง
- พรอมป์ต์ตัวเลขไม่ใช่ผลตรวจ ถ้า grid, palette, alpha, scale หรือ directional geometry ยังไม่ผ่าน ให้ระบุ draftและจุดผิด ไม่รายงานว่าแก้ครบแล้วจาก previewเพียงอย่างเดียว

## 0. เลือก reference จากโฟลเดอร์นี้

โฟลเดอร์ reference คือโฟลเดอร์เดียวกับ MD นี้ `ObjectGenerate/` ให้ค้นและเปิดภาพจริงทุกครั้งก่อนสร้างหรือแก้ภาพ ไม่ถือว่าการอ่านชื่อไฟล์หรือ MD ทำให้เครื่องมือสร้างภาพเห็นรูปแล้ว

### 0.1 กติกาเลือกไฟล์

- หากผู้ใช้ระบุชื่อ ref ให้ใช้เฉพาะภาพที่ระบุ เช่น `Example03` หรือ `Example03.png` ใช้เฉพาะ `Example03.png` หากระบุหลายชื่อให้ใช้เฉพาะรายการนั้น ห้ามเติม ref อื่นจากโฟลเดอร์เอง
- จับคู่ชื่อไฟล์เต็ม หรือชื่อก่อนนามสกุลแบบตรงชื่อ ไม่แยกตัวพิมพ์ใหญ่/เล็ก ห้ามจับคู่บางส่วนจน `Example01` ไปเลือก `Example010` ด้วย
- หากไม่ระบุชื่อ ref ให้ใช้ภาพอ้างอิงทั้งหมดที่เครื่องมืออ่านได้ในโฟลเดอร์เดียวกับ MD เช่น PNG, JPG/JPEG และ WebP ไม่ค้นข้ามไป CharacterGenerate หรือค้นโฟลเดอร์ย่อยโดยอัตโนมัติ
- รายการต้องมาจากไฟล์ที่มีอยู่จริงในรอบนั้น ไม่ล็อกว่ามีเพียงสามไฟล์ตลอดไป ไฟล์ MD, prompt, metadata และภาพผลลัพธ์นอกโฟลเดอร์นี้ไม่ใช่ ref ที่เพิ่มมาเอง
- หากชื่อที่ระบุไม่พบ ชื่อก่อนนามสกุลตรงหลายไฟล์ หรือภาพเปิดไม่ได้ ให้รายงานปัญหาและขอชื่อที่ชัดเจน ห้ามเงียบแล้วสลับไปใช้ทุกภาพ ภาพในรายการที่อ่านไม่ได้ต้องไม่ถูกข้ามโดยไม่แจ้ง
- ภาพที่ผู้ใช้สั่งให้แก้เป็น edit target แยกจากชุด style ref การใช้ target ไม่ได้อนุญาตให้นำสไตล์เก่าของมันกลับมา หากผู้ใช้แนบภาพอ้างอิงเพิ่มเติมให้ใช้ตามบทบาทที่ผู้ใช้กำหนด
- เปิดดูชุดที่เลือกจริง แล้วส่งภาพเหล่านั้นเป็น input ให้เครื่องมือผ่านกลไกที่รองรับ การใส่เพียงชื่อไฟล์ใน prompt ไม่เพียงพอ หากจำนวนเกินข้อจำกัดของเครื่องมือให้แจ้งก่อน ไม่ตัดรายการเอง
- สรุปชื่อไฟล์ที่ใช้ บทบาท และข้อขัดแย้งก่อนสร้าง พร้อมบันทึกใน prompt/ผล QA ชื่อเป็นตัวเลือกไฟล์ ไม่ได้บอกบทบาทหรืออันดับคุณภาพ

ตัวอย่าง:

| คำขอ | ชุด ref จากโฟลเดอร์ |
|---|---|
| ใช้ ref Example03 | Example03.png เท่านั้น |
| ใช้ Example02 กับ Example03 | สองภาพที่ระบุเท่านั้น |
| สร้างโต๊ะ โดยไม่ระบุชื่อ ref | ภาพอ้างอิงที่อ่านได้ทั้งหมดใน ObjectGenerate ณ รอบนั้น |

### 0.2 ใช้ทุกภาพตามบทบาท ไม่ผสมสไตล์เฉลี่ย

คำว่าใช้ทั้งหมดหมายถึงเปิดดูและใช้ทุกภาพในบทบาทที่เหมาะสม ไม่ได้หมายถึงเฉลี่ยกล้อง เส้น หรือวิธีลงสีที่ขัดกัน ผู้ใช้กำหนดบทบาทก่อน หากไม่ได้กำหนดให้วิเคราะห์จากภาพจริงแล้วระบุบทบาทที่เลือก กล้องยังยึด profile ตามคู่มือกลาง

สำหรับชุดไฟล์ที่ตรวจวันที่ 2026-10-11 เมื่อเลือกทั้งหมดและต้องการ Pixel Art ตามตัวอย่าง:

| ภาพ | บทบาทที่ใช้ | สิ่งที่ไม่ถ่ายทอด |
|---|---|---|
| [Example01.png](Example01.png) | Object Design, ประเภทสิ่งของ, silhouette และการเรียงภาพ เมื่อคำขอให้รักษาชุดเดิม | ไล่สี ขอบกึ่งโปร่งใส bevel หนา และกริดที่ยังไม่ผ่านการตรวจ ไม่ใช้เป็นมาตรฐานคุณภาพ Pixel Art |
| [Example02.png](Example02.png) | บริบทการวางในห้อง ความสัมพันธ์ของขนาด และสัดส่วน top/front ที่สอดคล้องกับ profile | ฉากทั้งห้อง พื้น ข้อความ watermark และความนุ่มจากภาพ screenshot ไม่ใช้จำนวนสีทั้งภาพตัดสิน palette ของ sprite |
| [Example03.png](Example03.png) | Visual Style และ Construction หลักสำหรับเส้นบางบน native grid ก้อนสีเรียบ การลดรายละเอียด และความหนาของชิ้นส่วนเฟอร์นิเจอร์ | ข้อความ PIXEL ART ASSET PACK พื้นหลังขาว และสิ่งของที่ผู้ใช้ไม่ได้ขอ |

ตารางนี้ใช้เฉพาะไฟล์ที่ถูกเลือก ไม่เติม Example02/03 เมื่อผู้ใช้เลือก Example01 เพียงชื่อเดียว หากไฟล์เปลี่ยนเนื้อหาหรือมี ref ใหม่ให้ตรวจบทบาทใหม่ ห้ามอาศัยชื่อไฟล์เพื่อเดา

เมื่อ ref หรือ edit target ยังมีข้อบกพร่อง ให้ยึดเฉพาะบทบาทที่จำเป็น รักษาแบบตาม design lock และวาดส่วนที่บกพร่องใหม่ด้วยสไตล์ที่เลือก หาก ref ในชุดที่เลือกขัดกันจนไม่มีเกณฑ์ตัดสิน ให้ถามเฉพาะข้อขัดแย้ง ห้ามใช้ภาพที่ไม่ได้เลือกมาช่วยตัดสินเอง

## 1. เลือกประเภทชิ้นงาน

| ประเภท | ผลลัพธ์และจุดตรวจ |
|---|---|
| single prop | PNG หนึ่งแบบ เช่นโต๊ะ กระถาง ไอเทม |
| object states | แบบเดียวกันหลายสถานะ เช่นประตูเปิด/ปิด จุดอ้างอิงต้องตรงกัน |
| modular structure | ส่วนประกอบบูธ/ห้อง แยกชิ้นพร้อม local offsets |
| repeating tile | พื้น/ผนังที่ต่อกัน ตรวจขอบทั้งด้านและมุม |
| concept board | ใช้เลือกแบบ ต้องตัด/เตรียมใหม่ก่อนนำเข้าเกม |

คำว่า asset pack หมายถึงชุดชิ้นงาน ไม่รับประกันว่าภาพรวมจาก AI มีช่องเท่ากันหรือแยกเป็นไฟล์พร้อมใช้แล้ว

## 2. ข้อมูลก่อนสร้าง

```text
ASSET ID: [ชื่อคงที่ เช่น registration-desk-a]
ASSET KIND: [single prop / object states / modular structure / repeating tile]
DELIVERY STAGE: [concept / production-source / game-ready]
PROFILE: [profile/version]
REFERENCE DIRECTORY: [โฟลเดอร์เดียวกับ MD นี้ หรือที่ผู้ใช้ระบุ]
REFERENCE SELECTION: [named-only / all-in-directory]
SELECTED REFERENCE FILES: [ชื่อไฟล์จริงที่เลือกทั้งหมด]
REFERENCE ROLES: [ตารางจากคู่มือกลาง]
PRIMARY STYLE / CONSTRUCTION REFERENCE: [ภาพในชุดที่เลือกที่ใช้ตัดสินสไตล์]
EDIT TARGET: [ภาพที่แก้และสิ่งที่รักษา / none]
DESIGN LOCK: [silhouette, สี, ชิ้นส่วน, หน้าที่]
CAMERA: [จาก profile]
STYLE / LIGHT: [reference ที่เลือก]
CANVAS SIZE: [source pixels]
NATIVE ART SCALE: [native pixel grid หรือ reference scale]
SHARED PALETTE: [ไฟล์ palette / รายการสี / unresolved]
PALETTE BUDGET: [จำนวนสีทั้งชุดเมื่อใช้ limited palette / not-applicable]
COLOR ROLES: [สีฐาน สีเงาร่วม สีไฮไลต์ และสีเน้น]
DISPLAY SIZE / UNIFORM SCALE: [world pixels หรืออัตราส่วน]
RELATIVE SCALE: [ขนาดต้นไม้ โต๊ะ ที่นั่ง และของตกแต่งเทียบ scale reference]
PADDING: [source pixels ต่อด้าน]
ORIGIN: [ตาม profile]
GROUND FOOTPRINT: [ตำแหน่งและขนาดฐานใน source pixels]
COLLISION RECTANGLES: [รายการ x,y,width,height หรือ none]
DEPTH ANCHOR: [depthY ใน source pixels]
BACKGROUND / SHADOW MODE: [จากคู่มือกลาง]
STATES / PARTS: [รายการและตำแหน่งสัมพันธ์ หรือ none]
INTERACTION INTENT: [none / พฤติกรรมที่เกมมี handler แล้ว]
```

ขนาดที่ยังไม่กำหนดให้เทียบกับ scale reference ก่อน ห้ามกำหนด collision จาก silhouette ทั้งชิ้นโดยอัตโนมัติ

## 3. ข้อกำหนดภาพสิ่งของ

รักษา silhouette, สัดส่วน, วัสดุ สี และชิ้นส่วนที่มีหน้าที่ เช่นช่องเปิด มือจับ ขา ล้อ จอ และจุดยึด ไม่เพิ่มหรือเอาชิ้นส่วนออกเองเพื่อให้วาดง่ายขึ้น

เมื่อใช้ Editor32-v1:

- ใช้ Top-down view เท่านั้น แบบ high-angle top-down RPG เห็น top plane และ front plane ด้วยสัดส่วนเดียวกับ reference ที่ผ่านแล้ว
- ไม่มี horizon, vanishing point หรือ perspective convergence เส้นขนานยังขนานในภาพ
- ห้ามหมุนด้านซ้าย/ขวาเข้าหากล้องแบบสามส่วนสี่หรือ isometric ห้ามใช้ front elevation หรือ side view แทน top-down
- Design reference ใช้รูปทรงและวัสดุ มุมถ่ายภาพไม่เปลี่ยนกล้องของชุดแมป
- วาง footprint บนระนาบพื้นเดียวกับตัวละคร ตรวจ relative scale ที่ขนาดแสดงจริง

ความสมเหตุสมผลของโครงสร้าง ใช้เฉพาะชิ้นส่วนที่งานนั้นมี:

- หลังคา เสา เคาน์เตอร์ ตู้ และฐานอ้าง centerline/grid เดียวกัน
- เสารองรับต้องเชื่อมส่วนบนกับฐาน ฐานมีพื้นที่รองรับที่สมเหตุสมผล
- ชิ้นซ้ำมีขนาดและวิธีติดตั้งเดียวกัน ความไม่สมมาตรต้องมาจากดีไซน์
- แถบสี ลายผ้า ขอบ รอยต่อ และ scallop วิ่งตามผิวและจังหวะโครงสร้าง
- จอ ช่องใส่เอกสาร มือจับ และชิ้นเล็กมี silhouette และจุดยึด ไม่เป็นก้อนสีลอย
- แยกไม้ โลหะ แก้ว ผ้า และพลาสติกด้วยวิธีลงสีของสไตล์ที่เลือก
- รายละเอียดเล็กที่อ่านไม่ออกให้ลดรูปตามที่อนุญาต โดยรักษาหน้าที่
- ใช้แสงทิศเดียวกัน เงาตกพื้นทำตาม SHADOW MODE; self-shading ทำตามสไตล์

### 3.1 คุมสไตล์และสีของทั้งชุด

เลือกโมดูลสไตล์จากคู่มือกลางให้ชัด คำว่า RPG หรือภาพที่ดูมีขอบหยักยังไม่ยืนยันว่าเป็น Pixel Art หากผู้ใช้ขอ Pixel Art ห้ามใช้คำสั่ง soft raster, anti-aliased edges, smooth shading หรือ gradients ปะปนใน prompt

- กำหนด palette ร่วมก่อนสร้างชุดใหม่ ใช้ไฟล์สีหรือรายการสีจริงเมื่อมี ไม่เลือกชุดสีแยกตามวัตถุจนทุกชิ้นดูอยู่คนละฉาก
- สำหรับชุด Pixel Art ที่ต้องการสีหม่น ใช้ 16–24 สีทั้งชุดเป็นเป้าหมายเริ่มต้น ไม่ใช่ข้อบังคับทุกสไตล์ สีโปร่งใสนับแยก ระบุจำนวนและสีที่เลือกใน contract
- วางลำดับความเด่นของสี ฐานใช้สีหม่น สีสดหรือสว่างใช้กับจุดเน้นที่กำหนด ไม่ทำใบไม้ ไม้ ผ้า และหนังสือให้เด่นเท่ากันทั้งหมด
- ใช้สีเงาหรือสีไฮไลต์ร่วมข้ามวัสดุตามแสงที่เลือก เมื่อเลือก hue shift ให้เงาเอียงไปทางสีเย็นและไฮไลต์ไปทางสีอุ่นอย่างควบคุม ไม่บังคับม่วง/เหลืองกับทุก reference
- ใช้ selective outline เมื่อสไตล์ที่เลือกต้องการ ขอบใบไม้ ไม้ ผ้า และโลหะใช้สีเข้มในกลุ่มวัสดุหรือสีเงาร่วม ไม่ครอบทุกชิ้นด้วยเส้นดำหนาแบบสติกเกอร์
- สีสด กริด หรือการไม่มีเงาตกพื้นไม่ใช่หลักฐานว่าเป็นงาน AI ให้ตรวจความสอดคล้องกับ contract และภาพอ้างอิงที่เลือก

### 3.2 ตรวจ Pixel Art ที่ native resolution

ใช้ร่วมกับโมดูล Low-resolution Pixel Art ในคู่มือกลาง ข้อกำหนดนี้ไม่ใช้กับ Flat, Soft Raster, Painted หรือ 3D-style โดยอัตโนมัติ

- กำหนด native canvas และหน่วยพิกเซลร่วมทั้งชุด เส้นรอบนอก พื้นผิว หนังสือ และรายละเอียดเล็กต้องอยู่บนกริดเดียวกัน
- สร้างรูปด้วยก้อนสีที่เชื่อมกันและ contour แบบขั้นที่ตั้งใจ ไม่ใช้ภาพเรียบแล้วใส่ฟิลเตอร์พิกเซลหรือ texture ทับเพื่อให้ดูเหมือน Pixel Art
- ใช้พื้นที่สีเรียบและจำนวนเฉดตาม palette ที่เลือก ห้ามมี smooth gradient, glow เบลอ, bloom, anti-aliasing หรือขอบกึ่งโปร่งใส หากไม่ได้ระบุข้อยกเว้นของสไตล์
- ใบไม้แบ่งเป็นมวลใหญ่ กลาง และเล็กตามแสงและรูปทรง เปลี่ยนจังหวะ cluster ระหว่าง variant ไม่ประทับรูปดาวหรือดอกไม้แบบเดียวกันทั่วทุกต้น
- ลดรายละเอียดที่เล็กกว่าหน่วยพิกเซล เช่นสันหนังสือและลายไม้ ให้เป็น cluster ที่อ่านออก ไม่ใส่เส้นละเอียดกว่าขอบของวัตถุ
- ตรวจที่ native 100% และขยายด้วย nearest-neighbor เพื่อดูกริด การเห็นขอบหยักเมื่อ zoom อย่างเดียวไม่ถือว่าผ่าน
- การสั่งจำนวนสีหรือ native grid ใน prompt ยังไม่ใช่ผลตรวจ ต้องวัดจากไฟล์จริง หากยังมีสีหรือกริดเกินเป้าหมายให้ระบุ pending และแก้ก่อนรับรอง
- เทียบความหนาเส้นและจำนวน pixel clusters ที่ native resolution ของวัตถุชนิดเดียวกันกับ ref ไม่เทียบเพียงขนาดภาพรวมบนจอ เส้นหนึ่ง native pixel เมื่อขยายต้องหนาตาม integer factor เดียวกับรายละเอียดภายใน ไม่ใช่เส้นละเอียดครอบก้อนพิกเซลใหญ่
- หาก ref ใช้ก้อนสีเรียบ ให้แต่ละ cluster เป็นสีเดียวจริง ตรวจพิกเซลภายในโต๊ะ กระถาง และเบาะด้วย ห้ามมีสีค่อย ๆ เปลี่ยนแม้ contour ภายนอกดูหยัก
- จำนวนสี 16–24 เป็นเป้าหมายของงานที่เลือก budget นี้เท่านั้น หาก style ref ใช้ palette ต่างออกไปให้กำหนด budget ที่เหมาะกับ ref ห้ามบีบจำนวนสีจนสูญเสียสไตล์ที่ผู้ใช้ขอ

### 3.3 กล้อง สเกล โครงสร้าง และ variant

- ตรวจ top plane ของโต๊ะ ที่นั่ง กระถาง ชั้นหนังสือ และส่วนบนของโคมร่วมกัน ชั้นหนังสือไม่ควรกลายเป็น front elevation ขณะที่โต๊ะใช้ top-down
- คำว่า 3/4 top-down มีความกำกวม ห้ามใช้เป็นคำสั่งกล้องเดี่ยว ๆ ให้ระบุ high-angle top-down orthographic RPG, facing the lower screen edge, no side rotation ตาม profile และ reference ที่ผ่านแล้ว
- Tile grid, native art grid และช่องของภาพรวมเป็นคนละค่า Editor32-v1 ใช้ tile 32×32 world pixels ไม่เปลี่ยนเป็น 16×16 เพียงเพราะต้องการพิกเซลใหญ่ขึ้น
- ขนาดภาพรวม padding และ silhouette ไม่จำเป็นต้องเป็นผลคูณของ tile ทุกชิ้น ขนาด footprint/preset ที่ต้อง snap ให้กำหนดตามหน้าที่และ profile
- ใช้ uniform scale ร่วมตาม scale reference ไม่ขยายพัฟ โต๊ะ และต้นไม้ให้เต็มช่องเท่ากัน หากขนาด runtime ยังไม่ทราบให้ระบุ unresolved
- ขาโต๊ะต้องยึดกับโครงและมีตำแหน่งสมเหตุสมผล ขาหลังที่ถูกบังจริงไม่ต้องฝืนแสดง ตรวจค้ำยัน แขนเก้าอี้ และฐานโคมว่าเชื่อมกัน กิ่งที่หายใต้พุ่มอาจเป็นการบังตามปกติ
- แยกวัสดุด้วยรูปทรงและ cluster ของสไตล์ที่เลือก เช่นลายไม้สั้นตามทิศเสี้ยน ผ้าเป็นก้อนสีด้าน และโลหะมีไฮไลต์เฉพาะขอบ ไม่ใส่เส้นขนานแบบเดียวกันทุกผิว
- Variant ควรต่างใน silhouette สัดส่วน หน้าที่ หรือโครงสร้างตามที่ผู้ใช้อนุญาต ไม่เพียงเปลี่ยนสีหรือยืดแบบเดิม รักษาจำนวนและประเภทที่ผู้ใช้ขอ
- รูปแบบกริดใช้ได้เมื่อผู้ใช้ขอภาพรวม แต่ช่องแสดงแบบไม่ใช่หลักฐานของสเกลในเกม
- Shadow mode none หมายถึงไม่อบเงาตกพื้นโดยตั้งใจ ไม่ถือว่าเป็นข้อผิดพลาด หากเลือก baked ให้เงาสัมผัสพื้นยึดฐานและทิศแสงเดียวกัน สำหรับ Pixel Art ใช้ก้อนเงาคมบนกริด หากเลือก separate ให้เตรียมเงาแยกตามคู่มือกลาง

### 3.4 จุดที่ยังดูเหมือนภาพเจนในชุดล่าสุด

ข้อสังเกตนี้อ้างภาพ `connecta-map-props-12-v3.png` และ Example01 ที่ตรวจรอบนี้ เทียบกับ Example02/03 เป็นข้อบกพร่องด้านความสอดคล้องกับ ref ไม่ใช่วิธีพิสูจน์ว่าภาพใดสร้างด้วย AI

| จุดที่พบ | ข้อกำหนดสำหรับรอบถัดไป |
|---|---|
| โต๊ะและกระถางยังมีไล่สีอ่อน ๆ ภายใน แม้ขอบเป็นขั้น | วาดพื้นที่ผิวเป็นก้อนสีเดียวจริง ใช้ base/shadow/highlight ตาม palette ไม่ให้สีเปลี่ยนต่อเนื่องภายใน cluster |
| ขอบบางส่วนมีเม็ดสีละเอียด/กึ่งโปร่งใส ขณะที่พุ่มใช้ก้อนพิกเซลใหญ่ | ให้ขอบและรายละเอียดใช้ native grid เดียวกัน ตรวจเส้นรอบวัตถุบนพื้นสว่างและมืด ไม่ใช้ความหยักภายนอกแทนการตรวจไฟล์ |
| ขอบโต๊ะ กระถาง แขนเก้าอี้ และกรอบไม้หนา มี highlight ริมกว้างจนดูคล้ายไอคอนปริมาตร | เทียบความหนากับเฟอร์นิเจอร์ใน style ref ลด bevel และ rim light ที่ไม่ได้อยู่ในแบบ ใช้เส้นบางและเงาเพียงด้านที่อธิบายรูปทรง |
| ไฮไลต์พุ่มไม้ยังเป็นหย่อมขนาดคล้ายกันกระจายรอบยอด | จัดมวลใบตามทิศแสง กิ่ง และ canopy แต่ละต้น ไม่กระจายแพตช์เพื่อเติมพื้นที่ให้เต็ม ใช้จังหวะ cluster ต่างกันตาม silhouette |
| โต๊ะมีเส้นลายไม้สั้นคล้ายกันทุกแบบ หนังสือเรียงบล็อกซ้ำอย่างสม่ำเสมอ | ทุกเส้นต้องอธิบายวัสดุหรือรูปทรง ถ้าไม่ช่วยให้อ่านให้ตัดออก เปลี่ยนจังหวะหนังสืออย่างควบคุมภายในดีไซน์ ไม่เพิ่ม noise หรือรอยสุ่มเพื่อให้ดูเป็นงานมือ |
| ชั้นหนังสือมี top plane น้อยกว่าโต๊ะ และความหนาของที่นั่ง/ฐานยังเทียบกันยาก | วางวัตถุใน preview กล้องเดียวกัน ตรวจ top/front ratio และ scale reference รวมกัน ห้ามแก้แต่ละชิ้นด้วยการขยายให้เต็มช่อง |

ผลตรวจไฟล์ล่าสุดมี 67,788 สี RGB ที่มองเห็น และ 701,765 พิกเซลที่มี alpha ระหว่าง 0 กับ 255 จึงยังไม่ผ่าน limited palette หรือ binary alpha แม้ภาพ preview ดูเป็นพิกเซล ตัวเลขนี้เป็น snapshot ของไฟล์ที่ตรวจ ไม่ใช่เป้าหมายหรือค่ามาตรฐาน ต้องวัดใหม่เมื่อภาพเปลี่ยน

หากภาพรอบใหม่ยังผิดเหมือนเดิม ให้แก้ข้อบกพร่องที่ระบุทีละจุดและตรวจซ้ำ การเพิ่มคำว่า pixel art, 1px หรือ nearest-neighbor ใน prompt อย่างเดียวไม่ถือว่าซ่อมแล้ว ห้ามรายงานว่าสีเรียบ เส้นตรงกริด หรือพร้อมใช้จนมีผลตรวจรองรับ

## 4. แยกชิ้นสำหรับบูธและห้อง

กำหนด PART LIST ก่อนสร้าง เช่น floor, rear-wall, left-side, right-side, counter-front และ sign ชื่อ/จำนวนมาจากดีไซน์จริง ไม่เติมชุดชิ้นส่วนนี้ให้ทุกงานโดยอัตโนมัติ

แต่ละชิ้นมี assetId, native size, local offset, display size, depthY และ collision ของตัวเอง จุดเริ่ม group ต้องคงที่ทุก variant

- แยกส่วนที่ต้องบังตัวละครคนละระดับ
- ระบุ overlap ที่ตั้งใจและรอยต่อที่ต้องชนกันพอดี
- พื้น/หลังคา/ป้ายที่ไม่ขวางทางต้องไม่รับ collision ของฐานมาเอง
- การแยกภาพหนึ่งชิ้นเป็นหลายแถบต้องรักษาพิกัดและภาพประกอบเดิม
- Prefab recipe เป็นแบบประกอบ เมื่อส่งให้ loader ที่ไม่อ่าน recipe ให้ขยายเป็น group/objects ใน TMJ
- หาก AI ส่งภาพรวม ให้ระบุว่ายังเป็น production-source จนตัดและประกอบกลับทดสอบแล้ว

## 5. พรอมป์ต์เสริมสำหรับสิ่งของ

ใช้ต่อจาก prompt กลาง เติมข้อมูลให้ครบและลบเงื่อนไขที่ไม่ตรงประเภท

```text
OBJECT CONTRACT
Asset ID: [id]. Kind: [kind]. Profile: [profile].
Camera: TOP-DOWN VIEW ONLY, high-angle orthographic RPG, facing the lower screen edge.
Use the same top/front compression for every object.
No front elevation, side view, rotated three-quarter view or isometric view.
Do not inherit a conflicting camera from any reference or switch views for individual props.
Reference selection: [named-only / all-in-directory].
Selected image inputs: [exact filenames and their assigned roles].
Primary style/construction reference: [selected filename].
Edit target: [filename or none]; preserve [design only / approved regions].
Use every selected reference only for its assigned role.
Do not add unselected style references or reuse defects from the edit target.
Preserve [design locks and functional parts].
Use the profile camera and [approved scale reference].
Keep parallel edges parallel and the ground footprint aligned to the map plane.
Maintain consistent top/front compression, detail scale and lighting across the set.

SET COHERENCE
Shared palette: [palette file or exact swatches].
Palette budget: [whole-set color count or not-applicable].
Color roles: [base, shared shadows, highlights, accents].
Relative sizes: [approved size relationships].
Use controlled saturation and [selected hue-shift behavior].
Distinguish materials with readable surface clusters and construction.
Do not enlarge each prop independently to fill its presentation cell.

[For low-resolution Pixel Art only]
Native canvas/grid: [size and pixel unit].
Use deliberate connected flat-color clusters on one consistent native grid.
Keep outlines, leaf masses, wood marks and books on that same grid.
Use [selected outline treatment] and vary foliage cluster shapes naturally.
No smooth gradients, anti-aliasing, blur, glow, bloom or pixelation filters.
Use truly flat single-color regions inside each cluster, not subtle ramps.
Match the selected reference's native outline thickness and detail budget.
Remove unreferenced thick bevels, glossy rim lights and decorative noise.
Place foliage highlights by canopy construction and light, not repeated patches.
Export enlargement: [integer factor] using nearest-neighbor only.
These are targets; verify actual palette, alpha and grid after generation.

GEOMETRY
Target source canvas: [size].
Intended world display size: [size].
Preserve aspect ratio. Do not stretch one axis to fill the canvas.
Keep [padding] clear around the complete silhouette.
Origin/ground anchor: [value].

[For modular structures]
Required parts: [exact list].
Use shared connection points and consistent dimensions across repeated parts.
Provide an assembled preview and prepare separate pieces in the file-preparation stage.

[For repeating tiles]
Required repeat directions: [horizontal / vertical / both].
Match edge colors, line thickness and pattern phase across repeat boundaries.

[For states]
Keep canvas, origin and size identical across [states].
Change only the requested functional state.

Background: [mode]. Ground shadow: [mode].
Do not add people, labels or decorative parts unless requested.
```

## 6. เตรียมไฟล์และข้อมูล

ขั้นนี้ใช้การตัด/จัดไฟล์และการตรวจวัดจริง แยกจากการเจนภาพ:

1. ตรวจ native canvas, alpha, silhouette และ padding หากต้องแก้ภาพใช้ขั้น edit ที่รักษาสไตล์
2. ตัดแต่ละ asset และจัด canvas ให้ตรง contract โดยไม่เปลี่ยนสัดส่วน
3. Pixel Art ตรวจ native grid ก่อน แล้วขยายด้วย nearest-neighbor ตาม integer factor ที่กำหนด ห้ามย่อ/ขยายแต่ละชิ้นคนละเกณฑ์ การลดภาพเรียบด้วย nearest-neighbor อย่างเดียวไม่แก้ cluster หรือทำให้เป็น Pixel Art ที่ผ่านแล้ว
4. วัด footprint, collision rectangles และ depth anchor ในพิกัดภาพที่เตรียมแล้ว
5. สร้าง/อัปเดต TSJ ให้ image path, imagewidth/imageheight, tile.id และ metadata ตรงไฟล์จริง
6. นิยาม assetKey, family/variant, ground และ depthY ตาม compiler ที่ใช้ Collision อยู่ใน objectgroup ของ tile
7. Prefab เพิ่ม recipe ตามรูปแบบที่ tool รองรับพร้อม preview ประกอบ ใช้ TMJ group เป็น output เมื่อส่งเข้าเกม
8. ทดลองกับตัวละครในเกมก่อนให้สถานะ runtime-validated

สำหรับ limited-palette Pixel Art ให้นับสี RGB ของพิกเซลที่ไม่โปร่งใสและตรวจ alpha จริง หากใช้ binary alpha ต้องไม่มีค่าระหว่าง 0 กับ 255 ตรวจว่าสีตรง palette ที่เลือก ไม่ใช่เพียงจำนวนใกล้เคียง หากต้อง remap เป็น indexed palette ให้รักษาสีเงา/ไฮไลต์ของวัสดุและตรวจ cluster อีกครั้ง การ quantize อัตโนมัติไม่ได้ซ่อมรูปทรง โครงสร้าง หรือมุมกล้อง

งาน production ที่ต้องคุมแต่ละชิ้นอาจสร้างแยกแล้วจัด sheet ภายหลัง แต่หากผู้ใช้ขอภาพเดียวให้ส่งภาพเดียวตาม scope และระบุสถานะการเตรียมไฟล์ ไม่เพิ่มจำนวนภาพหรือไฟล์ชิ้นงานแทนคำขอเอง

เมื่อ crop/resize เปลี่ยนภาพ ต้องปรับ origin, collision และ depthY ตามการแปลงเดียวกัน ห้ามใช้ตัวเลขจากภาพก่อนตัดกับภาพหลังตัด

ชื่อ PNG ต้องไม่ชนกันภายใน catalog ใช้ assetId คงที่และเพิ่ม version ในชื่อไฟล์เมื่อต้องเก็บร่างหลายชุด อย่าเปลี่ยน tile IDs ของชุดเดิมจนแมปที่อ้างอยู่ชี้ผิด

TSJ collection อาจมี tilewidth/tileheight เป็นขนาดชิ้นใหญ่ที่สุด ค่านั้นไม่ใช่ tile grid ของโลก ให้ใช้ค่าจาก TMJ/profile ในการคำนวณช่อง

## 7. QA เฉพาะสิ่งของ

### Visual

- [ ] Silhouette, สี, วัสดุ และ functional parts ตรง design reference
- [ ] กล้อง top/front และ relative scale ตรงชุดที่ผ่านแล้ว
- [ ] ทุกชิ้นเป็น Top-down view เท่านั้น ไม่มีหน้าตรง ด้านข้าง มุมสามส่วนสี่ที่หมุนด้านข้าง หรือ isometric ปะปน
- [ ] โครงสร้างเชื่อมกัน ชิ้นซ้ำและลายบนผิวสม่ำเสมอ
- [ ] ป้าย/ข้อความมีเฉพาะที่สั่ง
- [ ] Shadow mode ไม่ขัดพื้นหลัง
- [ ] ใช้เฉพาะ ref ที่ระบุชื่อ หรือใช้ครบทั้งโฟลเดอร์เมื่อไม่ได้ระบุชื่อ และเปิดดูภาพจริงแล้ว
- [ ] บันทึกบทบาท ref ทุกภาพ มี style/construction หลักที่ชัด ไม่เฉลี่ยสไตล์หรือดึงข้อบกพร่องของ target กลับมา
- [ ] Palette และสีเงา/ไฮไลต์ร่วมสอดคล้องทั้งชุด สีเน้นมีลำดับตามที่เลือก
- [ ] Top plane ของชั้นหนังสือ โคม โต๊ะ และที่นั่งตรงกล้องเดียวกัน
- [ ] สเกลเทียบกันที่ขนาดแสดงจริง ไม่ขยายทุกชิ้นเต็มช่อง
- [ ] ขา ค้ำยัน แขนเก้าอี้ กิ่ง และฐานเชื่อมกันหรือถูกบังอย่างสมเหตุสมผล
- [ ] Variant ต่างตามดีไซน์ที่อนุญาต วัสดุไม่มีลายสำเร็จรูปซ้ำทุกผิว
- [ ] Pixel Art only: cluster ใบไม้ไม่เป็นแสตมป์ซ้ำ กริดและเส้นสม่ำเสมอ ไม่มี gradient/glow/blur
- [ ] เส้น bevel และรายละเอียดเทียบ native scale กับ ref แล้ว ทุกลายช่วยอธิบายรูปทรงหรือวัสดุ

### File

- [ ] PNG/alpha และ native dimensions ตรวจจริงแล้ว
- [ ] ไม่มีส่วนสำคัญถูกตัด padding พอ และไม่ยืดแกนเดียว
- [ ] State/variant ใช้ anchor ตาม contract
- [ ] Tile ต่อขอบและมุมได้เมื่อวางซ้ำหลายช่อง
- [ ] Prefab ประกอบกลับได้ ไม่มีช่องว่างหรือ overlap ที่ไม่ได้ตั้งใจ
- [ ] TSJ image paths, native size, collision/depth ตรงไฟล์
- [ ] Limited palette only: นับสีจริงและตรวจว่าสีอยู่ใน palette ที่เลือกแล้ว
- [ ] Pixel Art only: ตรวจ native grid, integer enlargement และ binary alpha ตาม contract แล้ว
- [ ] Pixel Art only: ตรวจสีภายใน cluster และขอบบนพื้นสว่าง/มืด ไม่รับรองจาก preview อย่างเดียว
- [ ] ระบุจุดที่ยัง pending เช่น palette remap, crop, padding, scale หรือ runtime อย่างชัดเจน

### Runtime

- [ ] เทียบขนาดกับตัวละครและสิ่งของอ้างอิงแล้ว
- [ ] ชนเฉพาะพื้นที่ที่กำหนด เดินรอบและด้านหลังได้ตามดีไซน์
- [ ] Depth ถูกเมื่อตัวละครอยู่เหนือ/ใต้/ด้านข้างวัตถุ
- [ ] Ground/floor ไม่บังตัวละครผิดลำดับ
- [ ] Interaction ที่ระบุมี handler และทดสอบได้ หรือระบุ pending

## 8. สิ่งที่ต้องส่งมอบ

ส่ง PNG ที่เตรียมแล้ว รายการ TSJ ที่อ้างอิงภาพ ข้อมูล prefab เมื่อเกี่ยวข้อง และผล QA พร้อม profile/override ระบุไฟล์ที่ยังต้องเตรียมหรือยังไม่ผ่านเกมให้ชัด Preview board ใช้ประกอบการตรวจได้แต่ไม่แทนไฟล์ชิ้นงาน

