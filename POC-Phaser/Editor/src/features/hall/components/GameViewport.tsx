'use client';

import { useEffect, useRef } from 'react';
import type { GameBridge } from '@/game/GameBridge';
import type { WorldData } from '@/game/types';
import { gameConfig } from '@/game/config';

export default function GameViewport({
  bridge,
  world: suppliedWorld,
}: {
  bridge: GameBridge;
  world?: WorldData;
}) {
  const parent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    let disposed = false;
    let instance: { destroy(): void } | undefined;
    async function start() {
      try {
        bridge.update({ phase: 'loading', progress: 0, error: undefined });
        const [module, response] = await Promise.all([
          import('@/game/createGame'),
          suppliedWorld
            ? Promise.resolve(undefined)
            : fetch(gameConfig.mapUrl, { signal: abort.signal, cache: 'no-store' }),
        ]);
        if (response && !response.ok)
          throw new Error(`โหลดแมปไม่สำเร็จ (${response.status}) ตรวจสอบว่า NestJS กำลังทำงาน`);
        const world: WorldData = suppliedWorld || (await response!.json());
        if (world.schemaVersion !== 1)
          throw new Error('รูปแบบแมปไม่ตรงกับแอป กรุณารัน npm run map:sync');
        if (!disposed && parent.current)
          instance = module.createGame(parent.current, bridge, world);
      } catch (error) {
        if (!disposed)
          bridge.update({
            phase: 'error',
            error: error instanceof Error ? error.message : 'ไม่สามารถเปิดแมปได้',
          });
      }
    }
    void start();
    return () => {
      disposed = true;
      abort.abort();
      instance?.destroy();
    };
  }, [bridge, suppliedWorld]);
  return <div ref={parent} className="game-mount" data-testid="game-mount" />;
}
