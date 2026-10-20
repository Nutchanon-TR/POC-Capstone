'use client';

import { useState } from 'react';
import { Segmented } from 'antd';
import { ArrowDown, FileCode2, Layers3, Monitor, Box, Braces } from 'lucide-react';

const lessons = [
  {
    title: 'เริ่มที่ React',
    file: 'features/playground/GameCanvas.tsx',
    code: `useEffect(() => {\n  const abort = new AbortController();\n  // import Phaser เฉพาะใน browser\n  void start();\n  return () => {\n    abort.abort();\n    runtime?.dispose();\n  };\n}, [bridge]);`,
    explanation:
      'useEffect ทำงานหลัง DOM พร้อมแล้ว จึงสร้าง Phaser ได้ ส่วน return คือ cleanup ที่ React เรียกตอนออกจากหน้า หรือทดสอบ mount ซ้ำใน StrictMode',
    syntax: '?. เรียก method เมื่อ runtime มีค่าเท่านั้น; [bridge] คือ dependency ที่ effect ใช้',
  },
  {
    title: 'อ่านไฟล์แมป',
    file: 'game/tiled/parseWorld.ts',
    code: `export function parseWorld(\n  mapJson: unknown,\n  tilesetJson: unknown,\n): World {\n  const map = mapSchema.parse(mapJson);\n  // แปลงพิกัดและ metadata\n  return { spawn, objects, colliders, ... };\n}`,
    explanation:
      'JSON ยังเชื่อถือไม่ได้ ใช้ Zod ตรวจ shape ก่อนแปลงเป็น World กติกาเกมจึงไม่ต้องรู้ว่า Tiled เก็บ properties หรือ gid แบบไหน',
    syntax:
      'unknown ต้องตรวจชนิดก่อนใช้; : World บอกชนิดผลลัพธ์; export เปิดให้ไฟล์อื่น import ได้',
  },
  {
    title: 'เดินหนึ่ง frame',
    file: 'game/domain/movement.ts',
    code: `const magnitude = Math.hypot(input.x, input.y);\nconst dx = input.x / magnitude * distance;\nconst dy = input.y / magnitude * distance;\n\nreturn {\n  x, y, facing,\n  moving: x !== player.x || y !== player.y,\n};`,
    explanation:
      'หารด้วย magnitude เพื่อให้เดินทแยงเร็วเท่าเดินตรง ลองขยับแกน X แล้ว Y และเช็กกรอบเท้ากับ collider ก่อนคืนตำแหน่งใหม่',
    syntax: '{ x, y } ย่อจาก { x: x, y: y }; !== คือไม่เท่ากัน; || คือเงื่อนไขใดเงื่อนไขหนึ่งจริง',
  },
  {
    title: 'วาดด้วย Phaser',
    file: 'game/phaser/WorldScene.ts',
    code: `update(time: number, delta: number) {\n  this.player = movePlayer(\n    this.player, input, delta / 1000, this.world,\n  );\n  this.avatar.setPosition(\n    this.player.x, this.player.y,\n  );\n}`,
    explanation:
      'Phaser เรียก update ทุก frame โดย delta เป็นมิลลิวินาที ส่วน create สร้างโลกหนึ่งครั้ง และ preload โหลดรูปก่อน create',
    syntax:
      'class รวม state และ methods; this หมายถึง scene นี้; extends Phaser.Scene ใช้ lifecycle ของ Phaser',
  },
  {
    title: 'กด E เปิดคอม',
    file: 'game/bridge.ts',
    code: `type Command =\n  | { type: 'interact' }\n  | { type: 'close-interaction' }\n  | { type: 'reset' };\n\nbridge.dispatch({ type: 'interact' });\nbridge.publish(nextSnapshot);`,
    explanation:
      'Input ส่ง command ไปที่เกม เกมตรวจระยะแล้วส่ง snapshot ให้ React แสดง AntD Modal React ไม่จับ sprite และ Scene ไม่เรียก setState ของ React',
    syntax:
      '| คือ union เลือกได้หนึ่งรูปแบบ; type เป็นตัวแยกชนิด command; subscribe รับการเปลี่ยน snapshot',
  },
];

export function LearningPanel() {
  const [view, setView] = useState('architecture');
  const [lessonIndex, setLessonIndex] = useState(0);
  const lesson = lessons[lessonIndex] ?? lessons[0];
  return (
    <div className="learning-panel">
      <Segmented
        block
        value={view}
        onChange={setView}
        options={[
          { label: 'สถาปัตยกรรม', value: 'architecture' },
          { label: 'อ่านโค้ดทีละส่วน', value: 'code' },
        ]}
      />
      {view === 'architecture' ? (
        <>
          <h2>แต่ละส่วนมีเจ้าของชัดเจน</h2>
          <p>โครงสร้างตามงานจริงของ POC ไฟล์ที่อยู่ใกล้กันเปลี่ยนด้วยเหตุผลเดียวกัน</p>
          <div className="architecture-flow">
            <div>
              <Monitor size={22} />
              <section>
                <strong>Next.js + React</strong>
                <span>หน้าเว็บ, ปุ่ม, loading และ AntD Modal</span>
              </section>
              <code>features/playground</code>
            </div>
            <ArrowDown className="flow-arrow" size={18} />
            <div className="flow-seam">
              <Braces size={22} />
              <section>
                <strong>Typed bridge</strong>
                <span>command เข้าเกม · snapshot ออกมาให้ UI</span>
              </section>
              <code>game/bridge.ts</code>
            </div>
            <ArrowDown className="flow-arrow" size={18} />
            <div>
              <Layers3 size={22} />
              <section>
                <strong>Phaser adapter</strong>
                <span>โหลดรูป, keyboard, animation และ camera</span>
              </section>
              <code>game/phaser</code>
            </div>
            <ArrowDown className="flow-arrow" size={18} />
            <div>
              <Box size={22} />
              <section>
                <strong>TypeScript domain</strong>
                <span>ตำแหน่ง, collision และระยะ interaction</span>
              </section>
              <code>game/domain</code>
            </div>
          </div>
          <h3>ข้อมูลแมปเข้าทางเดียว</h3>
          <p>
            <code>TMJ + TSJ → parseWorld → World</code>
          </p>
          <p>
            ตัว parser ตรวจไฟล์และแปลงพิกัด top-left ของ editor นี้ ส่วน domain ใช้ข้อมูลธรรมดา
            ไม่มี dependency ของ Phaser หรือ React
          </p>
          <h3>ทำไมเหมาะกับการดูแลต่อ</h3>
          <ul className="plain-list">
            <li>เปลี่ยนหน้าคอมพิวเตอร์ใน React โดยไม่แก้การเดิน</li>
            <li>เปลี่ยนกติกาการชนใน domain แล้วทดสอบได้ทันที</li>
            <li>เปลี่ยนรูปหรือแมปผ่าน manifest และ parser</li>
            <li>หนึ่งเกมต่อหนึ่ง bridge พร้อม cleanup ตอน unmount</li>
          </ul>
          <pre className="code-block">{`src/\n  app/                    หน้า Next.js\n  features/playground/    UI และ lifecycle\n  game/\n    bridge.ts             interface ระหว่าง UI/เกม\n    domain/               กติกาและข้อมูล\n    tiled/                อ่าน editor export\n    phaser/               แสดงโลกและรับ input\ntests/                    domain + browser`}</pre>
          <p className="learning-note">
            POC นี้ใช้ pure movement กับกรอบสี่เหลี่ยม ยังไม่ต้องเพิ่ม ECS, DI container หรือ global
            state library ถ้ามีกฎ multiplayer หรือ physics ซับซ้อน ให้ประเมิน module นี้ใหม่
          </p>
        </>
      ) : (
        <>
          <h2>ตามหนึ่งรอบจากหน้าเว็บถึงเกม</h2>
          <p>อ่านตามลำดับนี้ แล้วเปิดไฟล์จริงเพื่อดู implementation ทั้งหมด</p>
          <div className="lesson-nav">
            {lessons.map((item, index) => (
              <button
                key={item.file}
                onClick={() => setLessonIndex(index)}
                className={index === lessonIndex ? 'selected' : ''}
              >
                <span>{index + 1}</span>
                {item.title}
              </button>
            ))}
          </div>
          {lesson ? (
            <>
              <div className="source-path">
                <FileCode2 size={16} />
                <code>{lesson.file}</code>
              </div>
              <pre className="code-block">{lesson.code}</pre>
              <p>{lesson.explanation}</p>
              <div className="syntax-note">
                <strong>Syntax ที่ควรรู้</strong>
                <p>{lesson.syntax}</p>
              </div>
              <p className="learning-note">
                ตัวอย่างย่อเพื่ออธิบายแนวคิด บางบรรทัดตัดรายละเอียดออก ดูโค้ดที่รันจริงในไฟล์ที่ระบุ
                และ docs/LEARNING.md
              </p>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
