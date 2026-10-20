'use client';
import { useEffect, useRef, useState } from 'react';
import type { RenderOrderAction } from '../../../shared/map/order';
import type { Alignment, Spacing } from '../../../shared/map/selection';

type Section = 'layer' | 'align' | 'space';
export function SelectionMenu({
  point,
  count,
  canPaste,
  onCopy,
  onPaste,
  onRemove,
  onLayer,
  onAlign,
  onSpace,
  onClose,
}: {
  point: { x: number; y: number };
  count: number;
  canPaste: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onRemove: () => void;
  onLayer: (action: RenderOrderAction) => void;
  onAlign: (action: Alignment) => void;
  onSpace: (action: Spacing) => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>();
  const root = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const left = Math.max(8, Math.min(point.x, window.innerWidth - 244));
  const top = Math.max(8, Math.min(point.y, window.innerHeight - 300));
  const narrow = window.innerWidth < 650;
  useEffect(() => {
    root.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(hoverTimer.current);
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);
  const layer: [RenderOrderAction, string, string][] = [
    ['front', 'ย้ายขึ้นไปบนสุด', 'Ctrl+Alt+]'],
    ['forward', 'ย้ายขึ้นไปหนึ่งชั้น', 'Ctrl+]'],
    ['backward', 'ย้ายลงไปหนึ่งชั้น', 'Ctrl+['],
    ['back', 'ย้ายลงไปล่างสุด', 'Ctrl+Alt+['],
  ];
  const align: [Alignment, string][] = [
    ['left', 'ซ้าย'],
    ['center-x', 'ตรงกลาง'],
    ['right', 'ขวา'],
    ['top', 'บน'],
    ['center-y', 'กลาง'],
    ['bottom', 'ล่าง'],
  ];
  const spacing: [Spacing, string][] = [
    ['tidy', 'จัดเรียง'],
    ['vertical', 'แนวตั้ง'],
    ['horizontal', 'แนวนอน'],
  ];
  const run = (action: () => void) => {
    action();
    onClose();
  };
  return (
    <div
      ref={root}
      className="selection-menu-root"
      style={{ left, top }}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {(!narrow || !section) && (
        <div className="selection-menu" role="menu" aria-label="เมนูการเลือก">
          <div className="selection-menu-caption">เลือก {count} ชิ้น</div>
          <button role="menuitem" disabled={!count} onClick={() => run(onCopy)}>
            คัดลอก <kbd>Ctrl+C</kbd>
          </button>
          <button role="menuitem" disabled={!canPaste} onClick={() => run(onPaste)}>
            วาง <kbd>Ctrl+V</kbd>
          </button>
          <button role="menuitem" disabled={!count} onClick={() => run(onRemove)}>
            ลบ <kbd>Delete</kbd>
          </button>
          <hr />
          {(
            [
              ['layer', 'เลเยอร์'],
              ['align', 'จัดองค์ประกอบ'],
              ['space', 'เว้นระยะห่างเท่ากัน'],
            ] satisfies [Section, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={section === key}
              disabled={!count}
              onMouseEnter={() => {
                clearTimeout(hoverTimer.current);
                hoverTimer.current = setTimeout(() => setSection(key), 120);
              }}
              onMouseLeave={() => clearTimeout(hoverTimer.current)}
              onClick={() => setSection(key)}
            >
              {label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}
      {section && (
        <div
          className="selection-menu selection-submenu"
          role="menu"
          onMouseEnter={() => clearTimeout(hoverTimer.current)}
          aria-label={
            section === 'layer'
              ? 'เลเยอร์'
              : section === 'align'
                ? 'จัดองค์ประกอบ'
                : 'เว้นระยะห่างเท่ากัน'
          }
          style={
            narrow
              ? {}
              : {
                  left: left + 480 > window.innerWidth ? -236 : 236,
                  top: Math.max(
                    0,
                    Math.min(
                      140 + (section === 'align' ? 34 : section === 'space' ? 68 : 0),
                      window.innerHeight - top - (section === 'align' ? 240 : 180) - 8,
                    ),
                  ),
                }
          }
        >
          {narrow && (
            <button role="menuitem" onClick={() => setSection(undefined)}>
              ‹ กลับ
            </button>
          )}
          {section === 'layer' &&
            layer.map(([action, label, shortcut]) => (
              <button key={action} role="menuitem" onClick={() => run(() => onLayer(action))}>
                {label}
                <kbd>{shortcut}</kbd>
              </button>
            ))}
          {section === 'align' &&
            align.map(([action, label]) => (
              <button key={action} role="menuitem" onClick={() => run(() => onAlign(action))}>
                {label}
              </button>
            ))}
          {section === 'space' &&
            spacing.map(([action, label]) => (
              <button
                key={action}
                role="menuitem"
                disabled={count < 3}
                onClick={() => run(() => onSpace(action))}
              >
                {label}
                {action === 'tidy' && <kbd>Alt+Shift+T</kbd>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
