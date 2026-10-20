# เรียนจากโค้ดที่รันจริง

อ่านเรียงตามนี้ โดยเปิดเกมคู่กับ editor ถ้าไม่คุ้น TypeScript ให้เริ่มส่วน syntax ก่อน แล้วค่อยตามหนึ่งรอบของการเดินและกด E

ตัวอย่างปัจจุบันรันบน Next.js App Router และ Phaser 4.2.1 อ่าน tutorial ของ Phaser 3 เพื่อเรียนแนวคิดพื้นฐานได้ แต่เมื่อใช้ API เกี่ยวกับ renderer, filters, masks หรือ lighting ให้ตรวจเอกสาร Phaser 4 ก่อน เพราะมีการเปลี่ยนแปลงระหว่างรุ่น

## 1. TypeScript ที่ใช้ใน Sample

`game/domain/world.ts` เป็นจุดเริ่มต้นที่ไม่มี framework มาเกี่ยว

```ts
export type Point = { x: number; y: number };
export type Direction = 'down' | 'up' | 'left' | 'right';
export type PlayerState = Point & {
  facing: Direction;
  moving: boolean;
};
```

- `type` ตั้งชื่อให้รูปแบบข้อมูล
- `x: number` แปลว่าค่า x ต้องเป็นตัวเลข
- `|` ใน Direction คือเลือกหนึ่งใน string ที่กำหนด
- `&` รวมข้อมูล Point กับ facing/moving
- `export` ทำให้ไฟล์อื่น import ชื่อนี้ได้
- `import type` นำเข้าเฉพาะชนิด ไม่โหลดโค้ด framework ตอน runtime

TypeScript ตรวจตอนพัฒนา แต่ JSON ใน browser ไม่ได้เปลี่ยนรูปแบบเพราะเราใส่ type จึงยังต้องตรวจไฟล์ด้วย Zod ที่ parser

```ts
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
```

`function` ประกาศฟังก์ชัน วงเล็บคือ inputs ส่วน `: boolean` คือชนิดผลลัพธ์ `&&` ต้องจริงทุกเงื่อนไขจึงถือว่ากรอบสองอันซ้อนกัน อ่าน function นี้ใน `movement.ts` แล้วลองวาดกรอบสองอันบนกระดาษ

```ts
return { ...player, moving: false };
```

`...player` คัดลอก fields ของ player ลง object ใหม่ แล้วเปลี่ยน moving ไม่ได้แก้ object ของ caller โดยตรง สิ่งนี้ช่วยให้ state เดิมยังใช้เทียบผลของ frame ได้

## 2. React สร้าง Phaser ตอนไหน

อ่าน `features/playground/GameCanvas.tsx`

- `useRef` เก็บ DOM host และไม่ได้ทำให้ component render ใหม่เมื่อเปลี่ยนค่า ref
- `useEffect` ทำงานหลัง React mount DOM
- `await import(...)` โหลด module เมื่อถึงจุดนั้น จึงโหลด Phaser ใน browser
- `AbortController` ยกเลิก fetch ที่ไม่จำเป็นหลังออกจากหน้า
- function ที่ return จาก effect คือ cleanup
- `runtime?.dispose()` ใช้ optional chaining เพราะ runtime อาจยังไม่พร้อม

StrictMode ใน development อาจลอง setup/cleanup ซ้ำเพื่อหาปัญหา lifecycle การแก้คือมี cleanup ครบ ไม่ใช่ปิด StrictMode เพียงเพื่อซ่อน canvas ที่ซ้ำ

`Playground.tsx` ใช้ `useState(createGameBridge)` เพื่อสร้าง bridge ตอนเริ่ม component instance ส่วน `useSyncExternalStore` subscribe ข้อมูลของเกมจากภายนอก React

## 3. อ่านแมปก่อนสร้างภาพ

อ่าน `game/phaser/createGame.ts` และ `game/tiled/parseWorld.ts`

```ts
const responses = await Promise.all([
  fetch(assets.map, { signal }),
  fetch(assets.tileset, { signal }),
]);
```

`Promise` แทนงาน async ที่ยังไม่เสร็จ `await` รอผลของงาน `Promise.all` ให้ fetch อิสระสองงานเริ่มพร้อมกัน ถ้า request ล้มเหลว UI แสดงข้อความ error พร้อมปุ่ม retry

```ts
const map = mapSchema.parse(mapJson);
```

`mapJson` เป็น unknown จนผ่าน schema อ่าน schema แล้วดูว่ามันยอมรับเฉพาะ finite orthogonal map, collection tileset เดียว และ rotation 0 เมื่อไม่รองรับต้องแก้ contract โดยตั้งใจ ไม่ปล่อยให้ภาพผิดแบบเงียบ ๆ

`Map` ใน parser คือ collection ของ key/value สำหรับหา tile จาก gid ส่วน `map` ที่เป็นตัวแปรเก็บข้อมูลแมป Tiled เป็นคนละความหมาย

## 4. Lifecycle ของ Phaser

อ่าน `game/phaser/WorldScene.ts`

```ts
export class WorldScene extends Phaser.Scene {
  preload() {
    /* โหลดภาพ */
  }
  create() {
    /* สร้างโลกและ input */
  }
  update(time: number, delta: number) {
    /* วาดผลทุก frame */
  }
}
```

`class` รวมข้อมูลและ methods `extends` ใช้ความสามารถของ Phaser.Scene `constructor` รับ dependency ที่ scene นี้ต้องใช้ `super('World')` เรียก constructor ของ parent class

`private` ระบุ field ที่ implementation ของ class จัดการเอง `this.player` หมายถึง player ของ scene instance นี้

Phaser เรียก preload ก่อน เมื่อโหลดเสร็จจึงเรียก create และเรียก update ต่อเนื่อง `time` คือเวลาเกม ส่วน `delta` เป็นเวลาระหว่าง frame หน่วยมิลลิวินาที จึงหาร 1000 ก่อนส่งให้ movement ที่ใช้วินาที

```ts
this.add
  .image(object.x, object.y, object.textureKey)
  .setOrigin(0)
  .setDisplaySize(object.width, object.height)
  .setDepth(object.depth);
```

`setOrigin(0)` ให้พิกัดวางภาพอิงมุมซ้ายบน `setDisplaySize` ปรับขนาดแสดงผลตามขนาด object ในแมป `setDepth` ระบุภาพไหนวาดทีหลัง ภาพตัวละครใช้ตำแหน่งเท้าเป็น depth เพื่อเดินด้านหน้าและด้านหลัง furniture ได้

## 5. เดินหนึ่ง frame ทำอะไรบ้าง

อ่าน `game/phaser/input.ts` แล้ว `game/domain/movement.ts`

1. input controller เก็บปุ่มที่ยังไม่ปล่อย
2. `sample()` แปลงเป็น vector เช่นขวา = `{ x: 1, y: 0 }`
3. `movePlayer` normalize vector เพื่อให้ทแยงไม่เร็วกว่าเดินตรง
4. ความเร็วเป็น pixel ต่อวินาที คูณเวลาของ frame จึงได้ระยะเดิน
5. ลองขยับ X/Y แยกกัน ถ้ากรอบเท้าชน collider จะไม่ขยับแกนนั้น
6. คืน PlayerState ใหม่
7. Scene วาง sprite ตามผลและเลือก animation ตาม facing

ตัวละครสูงกว่ากรอบชน เพราะคนเดินชนที่เท้า ไม่ใช่ที่ศีรษะ เปิดกรอบ collision เพื่อดูว่ากรอบสีแดงจาก footprint ของโต๊ะเล็กกว่ารูปโต๊ะทั้งรูปยังไง

## 6. กด E แล้วเปิด Modal ได้ยังไง

อ่าน `game/domain/interaction.ts`, `game/bridge.ts` และ `Playground.tsx`

1. Keyboard ส่ง `{ type: 'interact' }`
2. WorldScene เรียก `nearestComputer` ด้วยตำแหน่งล่าสุด
3. Function วัดระยะถึงกรอบคอมแล้วเลือกเครื่องที่ใกล้ที่สุดในระยะ 64px
4. Scene ใส่ Interaction ใน active และล้าง input
5. Scene publish snapshot ใหม่
6. React ได้ snapshot แล้ว `open={Boolean(ready?.active)}` เปิด AntD Modal
7. ปิด Modal ส่ง close-interaction และคืน focus ให้ host

`Boolean(value)` แปลงเป็น true/false เมื่อ active เป็น null จะได้ false ส่วน `ready?.active` ไม่อ่าน property ถ้า ready ไม่มีค่า

```ts
type Command = { type: 'interact' } | { type: 'pause'; paused: boolean };
```

นี่คือตัวอย่างย่อของ discriminated union ถ้า type เป็น pause compiler รู้ว่าต้องมี paused และถ้า type เป็น interact ไม่ต้องแนบ paused ดู union ฉบับเต็มใน bridge.ts

## ลองแก้ทีละข้อ

| ทดลอง                 | เปลี่ยนตรงไหน              | สิ่งที่ควรสังเกต                            |
| --------------------- | -------------------------- | ------------------------------------------- |
| เพิ่มความเร็วเป็น 240 | `PLAYER_SPEED` ใน world.ts | เดินต่อวินาทีเร็วขึ้น ไม่ขึ้นกับ frame rate |
| ลดระยะเปิดคอมเป็น 48  | `INTERACTION_DISTANCE`     | ต้องเข้าใกล้โต๊ะมากขึ้น บางจุดอาจเข้าถึงยาก |
| เพิ่มขนาดกรอบเท้า     | `PLAYER_FEET`              | ทางเดินแคบอาจผ่านไม่ได้                     |
| เปลี่ยนชื่อบน Modal   | Playground.tsx             | แผงเปลี่ยนโดยไม่แก้ Scene                   |
| เปลี่ยนปุ่ม E เป็น F  | input.ts และคำแนะนำ UI     | Input กับข้อความต้องตรงกัน                  |

หลังเปลี่ยนให้รัน `npm test` และลองเล่นจริง Test ที่ล้มเหลวหลังแก้กติกาอาจบอกว่าความคาดหวังเดิมไม่ตรงแล้ว ให้ตรวจผลที่ต้องการก่อนปรับ test

โค้ดในตัวอย่างที่มี comment แทนบรรทัดเป็นตัวอย่างย่อ ส่วนไฟล์ `.ts/.tsx` ที่ระบุคือ implementation ที่รันจริง
