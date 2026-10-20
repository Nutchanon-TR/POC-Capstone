# ข้อมูล assets สำหรับบทเรียน

ตรวจจากไฟล์จริงเมื่อ 15 ตุลาคม 2026

## ที่มา

- `public/assets/expo` คัดลอกจาก `../Project/public/assets/expo` เฉพาะ expo.tmj, expo.tsj, props และ structure ไม่คัดลอก zip หรือโค้ดเกม
- `public/assets/characters` คัดลอกจาก `../Sample/public/assets/characters` ทั้งภาพ student-walk.png, metadata และ source/Student02.png
- รักษาชื่อ โครงโฟลเดอร์ และเนื้อหาไฟล์ต้นฉบับ ไม่ปรับตำแหน่งหรือแก้แผนที่
- ใช้ assets ภายในชุดฝึกนี้ตามบริบทโปรเจกต์เดิม ที่มาข้างต้นเป็นเส้นทางในเครื่อง ไม่ใช่การรับรองสิทธิ์เผยแพร่ใหม่

## เส้นทางบนเว็บ

| ไฟล์ใน Practice | URL เมื่อเปิด dev server |
| --- | --- |
| public/assets/expo/expo.tmj | /assets/expo/expo.tmj |
| public/assets/expo/expo.tsj | /assets/expo/expo.tsj |
| public/assets/expo/props/table-long-v.png | /assets/expo/props/table-long-v.png |
| public/assets/characters/student-walk.png | /assets/characters/student-walk.png |

URL ไม่ใส่คำว่า public เพราะ Next.js ให้บริการเนื้อหาโฟลเดอร์นี้จากรากเว็บ
ใน TMJ ค่า source คือ expo.tsj ต้องหาเทียบกับโฟลเดอร์ของ TMJ
ใน TSJ ค่า image เช่น props/table-long-v.png ต้องหาเทียบกับโฟลเดอร์ของ TSJ

## แผนที่ expo.tmj

- Orthogonal แบบ finite ขนาด 42 คอลัมน์ × 26 แถว แต่ละช่อง 32 × 32 พิกเซล
- โลกกว้าง 1344 พิกเซล สูง 832 พิกเซล ก่อนการซูมกล้อง
- tilesets[0] ระบุ firstgid = 1 และ source = expo.tsj
- Floor เป็น tilelayer มี data 1092 ช่อง
- Structures and furniture เป็น objectgroup มี 204 วัตถุ
- Areas มี 12 เขต ใช้บอกหน้าที่พื้นที่ ไม่ใช่รูปภาพโดยตรง
- Collision มี 21 สี่เหลี่ยมสำหรับขอบเขตชนที่ระดับแผนที่
- Spawn มีจุด Spawn_Player ที่ x = 160, y = 736
- Collision และ Spawn ถูกซ่อนไว้ แต่ข้อมูลยังอ่านไปใช้ได้ ค่า visible ควบคุมการแสดง ไม่ได้ลบข้อมูล

## ชุดรูป expo.tsj

- name = expo-sketch, columns = 0, tilecount = 28 เป็น image collection
- แต่ละ tiles[] ระบุ id, image, imagewidth, imageheight และ properties ของตัวเอง
- รูปบางชิ้นมี objectgroup กำหนดพื้นที่ชนในพิกัดท้องถิ่นของรูป
- tilewidth = 196 และ tileheight = 107 ใน TSJ ไม่ใช่ขนาดช่องพื้นของแผนที่ ช่องพื้นให้อ่านจาก TMJ
- objectalignment = topleft และ map profile = ProjectExpo32-v1 โค้ดเดิมอ่านพิกัด tile object เป็นมุมซ้ายบนอยู่แล้ว ต้องรักษาสัญญานี้

ตัวอย่างจริง วัตถุแรกใน Structures and furniture:

```text
name = wall-mint-corner-nw
gid = 18
x = 32, y = 24
width = 32, height = 96
```

ตามรหัส 18 ลบ firstgid 1 ได้ local id 17 จึงหา tiles[] ที่ id = 17 ใน TSJ
เส้นทาง image ของมันคือ structure/wall-mint-corner-nw.png
ตอนวาดด้วย Phaser ต้องจัด origin ให้สอดคล้องกับพิกัดมุมซ้ายบน
สูตรนี้ใช้ตรง ๆ กับ gid ตัวอย่างที่ไม่มี flip flags เมื่อถึงบทอ่าน gid ต้องอธิบาย flags ก่อนรองรับค่าที่พลิกภาพ

สำหรับ Floor ถ้า index = 131 จะได้ column = 131 % 42 = 5 และ row = floor(131 / 42) = 3
พิกัดมุมซ้ายบนจึงเป็น x = 5 × 32 = 160, y = 3 × 32 = 96
ค่า data[index] คือ gid ของรูปที่จะวางในช่องนั้น ค่า 0 หมายถึงช่องว่าง

พื้นที่ชนที่อยู่ใน TSJ เป็นพิกัดภายในรูป ต้องแปลงเป็นพิกัดโลกตามตำแหน่งวัตถุ
รวม scale/rotation หากวัตถุนั้นใช้ ก่อนนำไปสร้าง physics body
ส่วน Collision ใน TMJ เป็นตำแหน่งระดับแผนที่ ให้แยกสองต้นทางนี้ตอนสอน

## ตัวละคร

student-walk.png เป็นภาพที่ Sample เตรียมไว้แล้ว ตาม metadata มีกรอบ 64 × 64 พิกเซล 4 คอลัมน์
แถวเรียง down, up, left, right และตำแหน่งเท้าภายในเฟรมคือ x = 32, y = 62
ภาพ source/Student02.png เป็นต้นฉบับที่ช่องไม่สม่ำเสมอ ไม่ควรส่งเข้า load.spritesheet ด้วยขนาด 64 × 64 โดยตรง
เมื่อถึงบท animation ให้เปิดทั้งสองรูปและ metadata เพื่ออธิบายว่าภาพที่ runtime ใช้ถูกเตรียมอย่างไร
ตอนนี้ยังไม่มีโค้ดโหลดหรือเล่น animation
