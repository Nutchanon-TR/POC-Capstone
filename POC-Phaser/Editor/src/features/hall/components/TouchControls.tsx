import type { Direction } from '@/game/types';
import type { GameBridge } from '@/game/GameBridge';

export function TouchControls({ bridge }: { bridge: GameBridge }) {
  const directions: [Direction, string, string][] = [
    ['up', '↑', 'เดินขึ้น'],
    ['left', '←', 'เดินซ้าย'],
    ['down', '↓', 'เดินลง'],
    ['right', '→', 'เดินขวา'],
  ];
  return (
    <div className="touch-controls" aria-label="ปุ่มเดินสำหรับจอสัมผัส">
      {directions.map(([direction, arrow, label]) => (
        <button
          key={direction}
          className={`touch-${direction}`}
          aria-label={label}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            bridge.send({ type: 'direction', direction, pressed: true });
          }}
          onPointerUp={() => bridge.send({ type: 'direction', direction, pressed: false })}
          onPointerCancel={() => bridge.send({ type: 'direction', direction, pressed: false })}
          onLostPointerCapture={() => bridge.send({ type: 'direction', direction, pressed: false })}
        >
          {arrow}
        </button>
      ))}
    </div>
  );
}
