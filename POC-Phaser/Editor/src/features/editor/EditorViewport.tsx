'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Spin } from 'antd';
import Image from 'next/image';
import type { Direction } from '@/game/types';
import type { Catalog } from '../../../shared/map/types';
import type { EditorEvents, EditorState, createEditor } from './EditorScene';
export default function EditorViewport({
  catalog,
  state,
  events,
  viewCommand,
  onToggleWalk,
}: {
  catalog: Catalog;
  state: EditorState;
  events: EditorEvents;
  viewCommand: { id: number; kind: 'fit' | 'in' | 'out' | 'cancel' };
  onToggleWalk: () => void;
}) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading'),
    [attempt, setAttempt] = useState(0);
  const parent = useRef<HTMLDivElement>(null),
    instance = useRef<ReturnType<typeof createEditor>>(undefined),
    latest = useRef({ events, state });
  useEffect(() => {
    latest.current = { events, state };
    instance.current?.render(state);
  }, [events, state]);
  useEffect(() => {
    let disposed = false;
    void import('./EditorScene')
      .then(({ createEditor }) => {
        if (disposed || !parent.current) return;
        setPhase('loading');
        instance.current = createEditor(parent.current, catalog, {
          select: (key) => latest.current.events.select(key),
          move: (...a) => latest.current.events.move(...a),
          selectMany: (keys) => latest.current.events.selectMany(keys),
          moveMany: (...args) => latest.current.events.moveMany(...args),
          resizeRegion: (...args) => latest.current.events.resizeRegion(...args),
          eraseRegion: (target) => latest.current.events.eraseRegion(target),
          contextMenu: (...args) => latest.current.events.contextMenu(...args),
          place: (...a) => latest.current.events.place(...a),
          paint: (cells) => latest.current.events.paint(cells),
          placeLayout: (cells) => latest.current.events.placeLayout(cells),
          eraseLayout: (area) => latest.current.events.eraseLayout(area),
          rectangle: (...args) => latest.current.events.rectangle(...args),
          error: (message) => {
            if (!disposed) {
              setPhase('error');
              latest.current.events.error(message);
            }
          },
          ready: () => {
            if (!disposed) {
              setPhase('ready');
              latest.current.events.error('');
            }
          },
        });
        instance.current.render(latest.current.state);
      })
      .catch((error) => {
        if (!disposed) {
          setPhase('error');
          latest.current.events.error(error.message);
        }
      });
    return () => {
      disposed = true;
      instance.current?.destroy();
      instance.current = undefined;
    };
  }, [catalog, attempt]);
  useEffect(() => {
    if (viewCommand.kind === 'cancel') instance.current?.cancel();
    else if (viewCommand.kind === 'fit') instance.current?.fit();
    else instance.current?.zoom(viewCommand.kind === 'in' ? 0.15 : -0.15);
  }, [viewCommand]);
  return (
    <div
      className="editor-canvas"
      data-testid="editor-canvas"
      data-phase={phase}
      data-walk-mode={state.walkMode}
    >
      <div ref={parent} className="game-mount" />
      {phase === 'ready' && (
        <>
          <button
            type="button"
            className="walk-toggle"
            aria-label="ทดลองเดินด้วยตัวละคร"
            aria-pressed={state.walkMode}
            title={state.walkMode ? 'เอาตัวละครออก' : 'ทดลองเดินด้วยตัวละคร'}
            onClick={onToggleWalk}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.code === 'Space') e.stopPropagation();
            }}
          >
            <span className="walk-portrait">
              <Image
                src="/editor/characters/student02/Student02.png"
                width={1263}
                height={1246}
                alt=""
                unoptimized
                draggable={false}
              />
            </span>
          </button>
          {state.walkMode && (
            <div
              className="walk-pad"
              role="group"
              aria-label="ปุ่มเดินตัวละคร"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {(['up', 'left', 'down', 'right'] satisfies Direction[]).map((direction, i) => (
                <button
                  key={direction}
                  type="button"
                  className={`walk-pad-${direction}`}
                  aria-label={['เดินขึ้น', 'เดินซ้าย', 'เดินลง', 'เดินขวา'][i]}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    instance.current?.walkDirection(direction, true);
                  }}
                  onPointerUp={() => instance.current?.walkDirection(direction, false)}
                  onPointerCancel={() => instance.current?.walkDirection(direction, false)}
                  onLostPointerCapture={() => instance.current?.walkDirection(direction, false)}
                >
                  {['↑', '←', '↓', '→'][i]}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {phase !== 'ready' && (
        <div className="editor-loading-overlay" role="status">
          {phase === 'loading' ? (
            <>
              <Spin />
              <span>กำลังเตรียมชิ้นส่วนแมป</span>
            </>
          ) : (
            <Button onClick={() => setAttempt((v) => v + 1)}>ลองโหลด asset อีกครั้ง</Button>
          )}
        </div>
      )}
    </div>
  );
}
