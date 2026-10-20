'use client';
import dynamic from 'next/dynamic';
import { useRef, useState, useSyncExternalStore } from 'react';
import { GameBridge } from '@/game/GameBridge';
import type { WorldData } from '@/game/types';
import { CharacterControls } from '../hall/components/CharacterControls';
import { MapToolbar } from '../hall/components/MapToolbar';
const GameViewport = dynamic(() => import('../hall/components/GameViewport'), { ssr: false });
export function MapPreview({ world }: { world: WorldData }) {
  const [bridge] = useState(() => new GameBridge()),
    parent = useRef<HTMLDivElement>(null);
  const status = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot);
  const focusGame = () => parent.current?.querySelector('canvas')?.focus();
  return (
    <div className="preview-stage" ref={parent} data-phase={status.phase}>
      <GameViewport bridge={bridge} world={world} />
      <CharacterControls bridge={bridge} status={status} focusGame={focusGame} />
      <MapToolbar bridge={bridge} status={status} focusGame={focusGame} />
      {status.phase !== 'ready' && (
        <div className="preview-status">{status.error || `กำลังโหลด ${status.progress}%`}</div>
      )}
    </div>
  );
}
