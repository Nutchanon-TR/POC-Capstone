'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Button, Drawer, Progress, Spin } from 'antd';
import { GameBridge } from '@/game/GameBridge';
import { HallSidebar } from './components/HallSidebar';
import { MapToolbar } from './components/MapToolbar';
import { TouchControls } from './components/TouchControls';
import { CharacterControls } from './components/CharacterControls';

const GameViewport = dynamic(() => import('./components/GameViewport'), { ssr: false });
const VoicePanel = dynamic(() => import('../social/VoicePanel').then((m) => m.VoicePanel), {
  ssr: false,
});

export function HallExplorer() {
  const [bridge] = useState(() => new GameBridge());
  const status = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot);
  const [helpOpen, setHelpOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const stage = useRef<HTMLElement>(null);
  const focusGame = () => stage.current?.querySelector('canvas')?.focus({ preventScroll: true });
  return (
    <main className="hall-app">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Connecta หน้าหลัก">
          <span className="brand-mark">c</span>
          <span>connecta</span>
        </Link>
        <span className="header-divider" />
        <span className="header-context">พื้นที่จัดแสดงเสมือนจริง</span>
        <div className="header-right">
          <Link href="/editor" className="editor-link">
            แก้ไขแมป ↗
          </Link>
          <span className="room-status">
            <i /> ห้องสำหรับสำรวจ
          </span>
          <Button className="mobile-info" onClick={() => setHelpOpen(true)}>
            ข้อมูลห้อง
          </Button>
        </div>
      </header>
      <div className="hall-body">
        <div className="desktop-sidebar">
          <HallSidebar status={status} focusGame={focusGame} />
        </div>
        <section
          className="map-stage"
          ref={stage}
          aria-label="พื้นที่แผนที่"
          data-phase={status.phase}
        >
          <GameViewport bridge={bridge} key={attempt} />
          <div className="map-location">
            <span className="location-icon">⌖</span>
            <div>
              <span>คุณอยู่ที่</span>
              <strong aria-live="polite">{status.zone}</strong>
            </div>
            <span className="location-dot" />
          </div>
          <MapToolbar bridge={bridge} status={status} focusGame={focusGame} />
          <CharacterControls bridge={bridge} status={status} focusGame={focusGame} />
          {status.phase === 'ready' && status.sessionKey && (
            <VoicePanel
              key={`${attempt}:${status.sessionKey}`}
              bridge={bridge}
              sessionKey={status.sessionKey}
            />
          )}
          {status.phase === 'loading' && (
            <div className="loading-panel" role="status">
              <Spin size="large" />
              <h2>กำลังเปิดประตูห้องจัดแสดง</h2>
              <p>เตรียมบูธและเส้นทางให้ Kaguya</p>
              <Progress percent={status.progress} showInfo={false} strokeColor="#246bce" />
            </div>
          )}
          {status.phase === 'error' && (
            <div className="loading-panel" role="alert">
              <h2>ยังเปิดแผนที่ไม่ได้</h2>
              <p>{status.error}</p>
              <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                ลองอีกครั้ง
              </Button>
            </div>
          )}
          {status.phase === 'ready' && (
            <>
              <div className="map-caption">
                <span className="live-dot" />
                <span>เดินสำรวจได้อิสระ</span>
                <span className="caption-separator" />
                <span className="desktop-hint">WASD / ↑ ← ↓ →</span>
                <span className="touch-hint">ใช้ปุ่มลูกศรด้านขวา</span>
              </div>
              <TouchControls bridge={bridge} />
            </>
          )}
          <div className="map-credit">
            Exhibition Hall <span>·</span> Connecta
          </div>
        </section>
      </div>
      <Drawer title="ข้อมูลห้อง" open={helpOpen} onClose={() => setHelpOpen(false)} size={300}>
        <HallSidebar
          status={status}
          focusGame={() => {
            setHelpOpen(false);
            focusGame();
          }}
        />
      </Drawer>
    </main>
  );
}
