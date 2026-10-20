'use client';

import { useEffect, useRef } from 'react';
import type { GameBridge } from '@/game/bridge';

export default function GameCanvas({ bridge }: { bridge: GameBridge }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const abort = new AbortController();
    let runtime: { dispose: () => void } | null = null;
    async function start() {
      try {
        // Phaser แตะ window ตอน import จึงต้อง import ใน browser หลัง mount
        const { mountGame } = await import('@/game/phaser/createGame');
        if (abort.signal.aborted || !element) return;
        const mounted = await mountGame(element, bridge, abort.signal);
        if (abort.signal.aborted) mounted?.dispose();
        else runtime = mounted;
      } catch (error) {
        if (!abort.signal.aborted)
          bridge.publish({
            status: 'error',
            message: error instanceof Error ? error.message : 'เปิดเกมไม่สำเร็จ',
          });
      }
    }
    void start();
    // รองรับ React StrictMode: ยกเลิก fetch เก่าและทำลาย canvas/listeners เก่า
    return () => {
      abort.abort();
      runtime?.dispose();
    };
  }, [bridge]);

  return (
    <div
      ref={host}
      className="game-canvas"
      tabIndex={0}
      role="application"
      aria-label="แมปทดลอง คลิกเพื่อเล่น ใช้ WASD หรือปุ่มลูกศร และ E เพื่อเปิดคอมพิวเตอร์"
      data-testid="game-host"
    />
  );
}
