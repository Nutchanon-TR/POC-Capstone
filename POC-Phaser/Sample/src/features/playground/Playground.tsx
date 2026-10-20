'use client';

import dynamic from 'next/dynamic';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Button, ConfigProvider, Drawer, Modal, Switch, Tooltip } from 'antd';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  Code2,
  Expand,
  Keyboard,
  Layers3,
  Monitor,
  RotateCcw,
  SquareTerminal,
} from 'lucide-react';
import { createGameBridge } from '@/game/bridge';
import type { Direction } from '@/game/domain/world';
import { LearningPanel } from './LearningPanel';

const GameCanvas = dynamic(() => import('./GameCanvas'), { ssr: false });
const theme = {
  token: {
    colorPrimary: '#167c70',
    borderRadius: 9,
    fontFamily: '"Noto Sans Thai", "Segoe UI", sans-serif',
    colorText: '#253e40',
    colorBorder: '#d5e3df',
  },
};

function Key({ children }: { children: React.ReactNode }) {
  return <kbd>{children}</kbd>;
}

export function Playground() {
  const [bridge] = useState(createGameBridge);
  const snapshot = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot);
  const [learningOpen, setLearningOpen] = useState(false);
  const [sessionOpened, setSessionOpened] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const ready = snapshot.status === 'ready' ? snapshot : null;

  const focusGame = () =>
    stage.current
      ?.querySelector<HTMLElement>('[data-testid="game-host"]')
      ?.focus({ preventScroll: true });
  const openLearning = () => {
    bridge.dispatch({ type: 'pause', paused: true });
    setLearningOpen(true);
  };
  const closeLearning = () => {
    setLearningOpen(false);
    bridge.dispatch({ type: 'pause', paused: false });
    focusGame();
  };
  const closeComputer = () => {
    bridge.dispatch({ type: 'close-interaction' });
    setSessionOpened(false);
    focusGame();
  };
  const reset = () => {
    bridge.dispatch({ type: 'reset' });
    focusGame();
  };
  const interact = () => {
    setSessionOpened(false);
    bridge.dispatch({ type: 'interact' });
  };

  async function fullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.current?.requestFullscreen();
    focusGame();
  }

  function directionButton(direction: Direction, icon: React.ReactNode) {
    return (
      <button
        key={direction}
        className={`direction direction-${direction}`}
        aria-label={`เดิน ${direction}`}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          bridge.dispatch({ type: 'direction', direction, pressed: true });
        }}
        onPointerUp={() => bridge.dispatch({ type: 'direction', direction, pressed: false })}
        onPointerCancel={() => bridge.dispatch({ type: 'direction', direction, pressed: false })}
        onLostPointerCapture={() =>
          bridge.dispatch({ type: 'direction', direction, pressed: false })
        }
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            bridge.dispatch({ type: 'direction', direction, pressed: true });
          }
        }}
        onKeyUp={() => bridge.dispatch({ type: 'direction', direction, pressed: false })}
        onBlur={() => bridge.dispatch({ type: 'direction', direction, pressed: false })}
      >
        {icon}
      </button>
    );
  }

  return (
    <ConfigProvider theme={theme}>
      <div className="lab-shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="Connecta Lab หน้าหลัก">
            <span className="brand-mark">
              <span />
              <span />
              <span />
              <span />
            </span>
            <strong>
              connecta<span>lab</span>
            </strong>
          </a>
          <span className="header-separator" />
          <span className="header-context">Phaser playground</span>
          <div className="header-right">
            <span className="version">Sample 0.1</span>
            <Button icon={<BookOpen size={16} />} onClick={openLearning}>
              คู่มือโค้ด
            </Button>
          </div>
        </header>
        <main className="workspace mx-auto w-full max-w-[1600px]">
          <section className="intro">
            <div>
              <div className="intro-context">
                <span className="status-dot" />
                พื้นที่ทดลองสำหรับนักพัฒนา
              </div>
              <h1>
                เริ่มจากโลกเล็ก ๆ<br className="mobile-break" /> ที่เข้าใจโค้ดได้ทุกส่วน
              </h1>
              <p>เดินสำรวจห้อง เปิดคอมพิวเตอร์ แล้วตามดูว่าแต่ละส่วนทำงานร่วมกันยังไง</p>
            </div>
            <button className="architecture-link" onClick={openLearning}>
              <Layers3 size={18} />
              ดูสถาปัตยกรรม
              <ArrowRight size={17} />
            </button>
          </section>
          <div className="playground-grid">
            <section className="play-area" aria-label="พื้นที่เล่น">
              <div className="stage-toolbar">
                <div>
                  <span className="map-icon">
                    <Layers3 size={17} />
                  </span>
                  <strong>Exhibition room</strong>
                  <span className="map-meta">42 × 26 tiles</span>
                </div>
                <div className="stage-actions">
                  <Tooltip title="กลับจุดเริ่มต้น">
                    <Button
                      aria-label="กลับจุดเริ่มต้น"
                      type="text"
                      icon={<RotateCcw size={17} />}
                      onClick={reset}
                    />
                  </Tooltip>
                  <Tooltip title="เต็มหน้าจอ">
                    <Button
                      aria-label="เต็มหน้าจอ"
                      type="text"
                      icon={<Expand size={17} />}
                      onClick={() => void fullscreen()}
                    />
                  </Tooltip>
                </div>
              </div>
              <div className="stage" ref={stage}>
                <GameCanvas bridge={bridge} />
                {snapshot.status === 'loading' ? (
                  <div className="stage-message" role="status">
                    <span className="loader" />
                    <strong>กำลังเปิดห้องทดลอง</strong>
                    <span>โหลดแมปและตัวละคร</span>
                  </div>
                ) : null}
                {snapshot.status === 'error' ? (
                  <div className="stage-message error-message" role="alert">
                    <strong>เปิดห้องไม่สำเร็จ</strong>
                    <span>{snapshot.message}</span>
                    <Button onClick={() => location.reload()}>ลองอีกครั้ง</Button>
                  </div>
                ) : null}
                <div className="world-label">
                  <span className="status-dot" />
                  {ready ? 'พร้อมสำรวจ' : 'กำลังโหลด'}
                </div>
                {ready?.nearby && !ready.active ? (
                  <button className="interaction-prompt" onClick={interact}>
                    <Key>E</Key>
                    <span>เปิด{ready.nearby.label}</span>
                    <ArrowRight size={16} />
                  </button>
                ) : null}
              </div>
              <div className="controls-strip">
                <div>
                  <Keyboard size={18} />
                  <span>
                    <Key>W</Key>
                    <Key>A</Key>
                    <Key>S</Key>
                    <Key>D</Key>
                    <span className="control-copy">หรือปุ่มลูกศรเพื่อเดิน</span>
                  </span>
                </div>
                <span>
                  <Key>E</Key> เปิดคอมพิวเตอร์
                </span>
                <span className="canvas-hint">คลิกแมปเพื่อควบคุม</span>
              </div>
              <div className="mobile-controls">
                <div className="dpad">
                  {directionButton('up', <ArrowUp size={20} />)}
                  {directionButton('left', <ArrowLeft size={20} />)}
                  {directionButton('down', <ArrowDown size={20} />)}
                  {directionButton('right', <ArrowRight size={20} />)}
                </div>
                <Button
                  type="primary"
                  icon={<Monitor size={17} />}
                  disabled={!ready?.nearby}
                  onClick={interact}
                >
                  เปิดคอม
                </Button>
              </div>
            </section>
            <aside className="side-panel">
              <section className="mission">
                <div className="mission-icon">
                  <Monitor size={24} />
                </div>
                <span className="side-caption">ลองทำในห้องนี้</span>
                <h2>
                  เปิดคอมพิวเตอร์
                  <br />
                  เครื่องแรกของคุณ
                </h2>
                <p>เลือกบูธที่มีคอมพิวเตอร์ เดินเข้าใกล้จนเห็นกรอบสีเขียว แล้วกด E</p>
                <ol className="mission-steps">
                  <li>
                    <span>1</span>
                    <div>
                      <strong>เดินเข้าไปในห้อง</strong>
                      <small>ใช้ WASD หรือปุ่มลูกศร</small>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>เข้าใกล้หน้าบูธ</strong>
                      <small>คอมพิวเตอร์อยู่บนโต๊ะ</small>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>กด E เพื่อเปิดคอม</strong>
                      <small>แผงข้อมูลจะแสดงในหน้าเว็บ</small>
                    </div>
                  </li>
                </ol>
                <Button
                  block
                  type={ready?.nearby ? 'primary' : 'default'}
                  icon={<Monitor size={16} />}
                  disabled={!ready?.nearby}
                  onClick={interact}
                >
                  {ready?.nearby ? 'เปิดคอมพิวเตอร์' : 'เดินเข้าใกล้คอมก่อน'}
                </Button>
              </section>
              <section className="inspector">
                <div className="inspector-heading">
                  <h3>สถานะในเกม</h3>
                  <span className="live-indicator">
                    <span className="status-dot" />
                    live
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>ตัวละคร</dt>
                    <dd>Student 02</dd>
                  </div>
                  <div>
                    <dt>ตำแหน่ง X / Y</dt>
                    <dd data-testid="coordinates">
                      {ready
                        ? `${Math.round(ready.player.x)} / ${Math.round(ready.player.y)}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>คอมพิวเตอร์</dt>
                    <dd>{ready ? `${ready.computerCount} เครื่อง` : '—'}</dd>
                  </div>
                  <div>
                    <dt>สิ่งที่อยู่ใกล้</dt>
                    <dd>
                      {ready?.nearby ? ready.nearby.areaId.replace('booth-', 'บูธ ') : 'ยังไม่มี'}
                    </dd>
                  </div>
                </dl>
                <div className="debug-control">
                  <label htmlFor="debug-toggle">แสดงกรอบ collision</label>
                  <Switch
                    id="debug-toggle"
                    size="small"
                    checked={ready?.debug ?? false}
                    disabled={!ready}
                    onChange={(enabled) => {
                      bridge.dispatch({ type: 'debug', enabled });
                      focusGame();
                    }}
                  />
                </div>
                {ready?.debug ? (
                  <div className="debug-legend">
                    <span>แดง: สิ่งกีดขวาง</span>
                    <span>น้ำเงิน: เท้าตัวละคร</span>
                  </div>
                ) : null}
              </section>
              <button className="read-code" onClick={openLearning}>
                <span>
                  <Code2 size={22} />
                </span>
                <div>
                  <strong>จากเกมที่เล่น สู่โค้ดที่อ่าน</strong>
                  <small>ดู flow และ syntax ทีละส่วน</small>
                </div>
                <ArrowRight size={17} />
              </button>
            </aside>
          </div>
          <footer className="workspace-footer">
            <span>
              Next.js <i /> Tailwind <i /> Ant Design <i /> Phaser
            </span>
            <span>แมปและตัวละครจากไฟล์ที่คุณให้มา</span>
          </footer>
        </main>
        <Drawer
          title={
            <span className="drawer-title">
              <BookOpen size={20} />
              คู่มือห้องทดลอง
            </span>
          }
          open={learningOpen}
          onClose={closeLearning}
          size={640}
          focusable={{ focusTriggerAfterClose: false }}
          afterOpenChange={(open) => {
            if (!open) focusGame();
          }}
        >
          <LearningPanel />
        </Drawer>
        <Modal
          title={
            <span className="drawer-title">
              <SquareTerminal size={20} />
              {ready?.active?.label ?? 'คอมพิวเตอร์'}
            </span>
          }
          open={Boolean(ready?.active)}
          onCancel={closeComputer}
          focusable={{ focusTriggerAfterClose: false }}
          afterClose={focusGame}
          footer={
            <Button type="primary" onClick={closeComputer}>
              กลับไปสำรวจห้อง
            </Button>
          }
        >
          <div className="computer-screen">
            <Monitor size={44} />
            <span>Connecta terminal</span>
            <strong>เชื่อมต่อคอมพิวเตอร์แล้ว</strong>
            <small>{ready?.active?.areaId.replace('booth-', 'บูธ ')}</small>
          </div>
          <p className="modal-copy">
            นี่คือแผงทดลองใน POC เกมส่ง interaction มาที่ React แล้วเปิด Ant Design Modal
            การเดินจะหยุดระหว่างใช้คอมพิวเตอร์
          </p>
          <div className="terminal-details">
            <span>
              Object ID <strong>{ready?.active?.id}</strong>
            </span>
            <span>
              Kind <strong>{ready?.active?.kind}</strong>
            </span>
            <span>
              Action <strong>{ready?.active?.action}</strong>
            </span>
          </div>
          <Button
            block
            icon={sessionOpened ? <Check size={17} /> : <Code2 size={17} />}
            onClick={() => setSessionOpened(true)}
            disabled={sessionOpened}
          >
            {sessionOpened ? 'React รับการกดปุ่มสำเร็จ' : 'ลองกดปุ่มในแผงคอมพิวเตอร์'}
          </Button>
          {sessionOpened ? (
            <p role="status" className="terminal-success">
              ตัวอย่างนี้เปลี่ยน state เฉพาะบนหน้าเว็บ ยังไม่ได้เรียก API
            </p>
          ) : null}
        </Modal>
      </div>
    </ConfigProvider>
  );
}
