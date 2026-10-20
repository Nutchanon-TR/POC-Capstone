'use client';
/* eslint-disable @next/next/no-img-element */
import { Alert, Button, Input, InputNumber, Modal } from 'antd';
import { useRef, useState, type PointerEvent } from 'react';
import type { Catalog, Prefab } from '../../../shared/map/types';
import { validateBooth } from '../../../shared/map/workspace';
import {
  boothCategories,
  boothCategory,
  editableBooth,
  orderBoothParts,
  reorderBoothPart,
  boothFloorBrush,
  boothFloorCells,
  paintBoothFloor,
  type BoothFloorBrush,
  boothTileUnit,
  fitBoothFrame,
  type BoothCategory,
} from '../../../shared/map/booth';
import { resizeHandles, resizeRectangle, type ResizeHandle } from '../../../shared/map/transform';

type Part = Prefab['parts'][number];
type Tool = 'select' | 'paint-floor' | 'erase-floor' | 'erase-asset';
type Gesture = { index: number; part: Part; clientX: number; clientY: number; scale: number } & (
  { kind: 'move' } | { kind: 'resize'; handle: ResizeHandle }
);
const handleLabels: Record<ResizeHandle, string> = {
  nw: 'บนซ้าย',
  n: 'บน',
  ne: 'บนขวา',
  e: 'ขวา',
  se: 'ล่างขวา',
  s: 'ล่าง',
  sw: 'ล่างซ้าย',
  w: 'ซ้าย',
};

export function BoothEditor({
  initial,
  creating,
  catalog,
  onSave,
  onCancel,
  scope = 'library',
}: {
  initial: Prefab;
  creating: boolean;
  catalog: Catalog;
  onSave: (prefab: Prefab) => Promise<void>;
  onCancel: () => void;
  scope?: 'library' | 'instance';
}) {
  const [draft, setDraft] = useState(() => editableBooth(fitBoothFrame(initial, catalog), catalog));
  const [selected, setSelected] = useState<number | undefined>(
    initial.parts.length ? 0 : undefined,
  );
  const [asset, setAsset] = useState<string>();
  const [category, setCategory] = useState<BoothCategory>('Prop');
  const [assetQuery, setAssetQuery] = useState('');
  const [step, setStep] = useState(8);
  const [tool, setTool] = useState<Tool>('select');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<Gesture>(undefined);
  const floorStroke = useRef<{ brush: BoothFloorBrush; start: { x: number; y: number } }>(
    undefined,
  );
  const [floorGhost, setFloorGhost] = useState<{
    brush: BoothFloorBrush;
    cells: { x: number; y: number }[];
  }>();
  const preview = useRef<HTMLDivElement>(null);
  const tileFor = (key: string) => catalog.tiles.find((tile) => tile.meta.assetKey === key);
  const imageFor = (key: string) =>
    catalog.textures.find((texture) => texture.key === tileFor(key)?.key)?.url;
  const labelFor = (key: string) => tileFor(key)?.meta.label || key;
  const selectedPart = selected === undefined ? undefined : draft.parts[selected];
  const selectedCategory = selectedPart && boothCategory(tileFor(selectedPart.key));
  const floorBrush = boothFloorBrush(catalog, asset, step);
  const tileUnit = boothTileUnit(draft, catalog, asset);
  const minimumColumns = Math.max(
    1,
    Math.ceil(Math.max(0, ...draft.parts.map((part) => part.x + part.w)) / tileUnit.width),
  );
  const minimumRows = Math.max(
    1,
    Math.ceil(Math.max(0, ...draft.parts.map((part) => part.y + part.h)) / tileUnit.height),
  );
  function floorPoint(event: PointerEvent<HTMLElement>) {
    const box = preview.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((event.clientX - box.left) * draft.width) / box.width;
    const y = ((event.clientY - box.top) * draft.height) / box.height;
    return { x, y, inside: x >= 0 && y >= 0 && x < draft.width && y < draft.height };
  }
  function cancelFloor() {
    floorStroke.current = undefined;
    setFloorGhost(undefined);
  }
  function updatePart(index: number, patch: Partial<Part>) {
    setDraft((current) =>
      orderBoothParts(
        {
          ...current,
          parts: current.parts.map((part, i) => (i === index ? { ...part, ...patch } : part)),
        },
        catalog,
      ),
    );
  }
  function removePart(index: number) {
    if (busy) return;
    drag.current = undefined;
    setDraft((current) =>
      orderBoothParts({ ...current, parts: current.parts.filter((_, i) => i !== index) }, catalog),
    );
    setSelected(undefined);
    preview.current?.focus({ preventScroll: true });
  }
  function beginGesture(event: PointerEvent<HTMLElement>, index: number, handle?: ResizeHandle) {
    if (busy || !preview.current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    preview.current.focus({ preventScroll: true });
    setSelected(index);
    if (tool !== 'select') {
      removePart(index);
      return;
    }
    const start = {
      index,
      part: { ...draft.parts[index] },
      clientX: event.clientX,
      clientY: event.clientY,
      scale: preview.current.getBoundingClientRect().width / draft.width,
    };
    drag.current = handle ? { ...start, kind: 'resize', handle } : { ...start, kind: 'move' };
    preview.current.setPointerCapture(event.pointerId);
  }
  function cancelGesture() {
    cancelFloor();
    const start = drag.current;
    drag.current = undefined;
    if (start) updatePart(start.index, start.part);
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const checked = validateBooth(
        { ...orderBoothParts(fitBoothFrame(draft, catalog, asset), catalog), sizing: 'explicit' },
        catalog,
      );
      if (scope === 'instance')
        checked.parts = checked.parts.map((part, index) => ({
          ...part,
          sourceId: draft.parts[index]?.sourceId,
        }));
      await onSave(checked);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'บันทึกชุดบูธไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  const selectionStyle = selectedPart
    ? {
        left: `${(100 * selectedPart.x) / draft.width}%`,
        top: `${(100 * selectedPart.y) / draft.height}%`,
        width: `${(100 * selectedPart.w) / draft.width}%`,
        height: `${(100 * selectedPart.h) / draft.height}%`,
      }
    : undefined;
  return (
    <Modal
      open
      title={scope === 'instance' ? 'แก้ไขบูธนี้' : creating ? 'เพิ่มชุดบูธ' : 'แก้ไขชุดบูธ'}
      width={1040}
      onCancel={() => !busy && onCancel()}
      onOk={save}
      okText={scope === 'instance' ? 'ใช้กับบูธนี้' : 'บันทึกชุดบูธ'}
      cancelText="ยกเลิก"
      confirmLoading={busy}
      okButtonProps={{ disabled: busy || !draft.parts.length }}
      style={{ top: 24 }}
      styles={{ body: { maxHeight: 'calc(100dvh - 190px)', overflowY: 'auto' } }}
      modalRender={(node) => (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {node}
        </div>
      )}
    >
      <div
        className="booth-editor"
        onKeyDown={(e) => {
          if (
            e.target instanceof Element &&
            e.target.closest('input, textarea, select, [contenteditable="true"]')
          )
            return;
          if (e.key === 'Escape' && (drag.current || floorStroke.current || floorGhost)) {
            e.preventDefault();
            e.stopPropagation();
            cancelGesture();
          }
          if (
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            ['Backspace', 'Delete'].includes(e.key) &&
            selected !== undefined &&
            !busy
          ) {
            e.preventDefault();
            e.stopPropagation();
            removePart(selected);
          }
        }}
      >
        {error && <Alert type="error" title={error} />}
        <div className="booth-editor-heading">
          <label>
            ชื่อชุดบูธ
            <Input
              aria-label="ชื่อชุดบูธ"
              value={draft.label ?? draft.key}
              maxLength={80}
              disabled={busy}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </label>
          <label>
            กรอบบูธ กว้าง · ช่อง
            <InputNumber
              aria-label="ความกว้างชุดบูธ"
              min={minimumColumns}
              max={Math.floor(8192 / tileUnit.width)}
              precision={0}
              step={1}
              value={draft.width / tileUnit.width}
              disabled={busy}
              onChange={(value) =>
                value !== null &&
                setDraft(
                  orderBoothParts(
                    { ...draft, width: Math.max(minimumColumns, value) * tileUnit.width },
                    catalog,
                  ),
                )
              }
            />
          </label>
          <label>
            กรอบบูธ สูง · ช่อง
            <InputNumber
              aria-label="ความสูงชุดบูธ"
              min={minimumRows}
              max={Math.floor(8192 / tileUnit.height)}
              precision={0}
              step={1}
              value={draft.height / tileUnit.height}
              disabled={busy}
              onChange={(value) =>
                value !== null &&
                setDraft(
                  orderBoothParts(
                    { ...draft, height: Math.max(minimumRows, value) * tileUnit.height },
                    catalog,
                  ),
                )
              }
            />
          </label>
        </div>
        <p className="studio-note">
          {scope === 'instance'
            ? 'แก้ไขเฉพาะบูธที่เลือกบนแมป แล้วกดบันทึกแมปเพื่อเก็บถาวร'
            : 'จัดชิ้นส่วนแล้วบันทึกเป็นชุดบูธสำหรับวางในทุกแมป การแก้ไขชุดใช้กับการวางครั้งถัดไป'}
          <br />
          ช่องพื้น {tileUnit.width} × {tileUnit.height} px · กรอบ {draft.width} × {draft.height} px
        </p>
        <div className="booth-composer">
          <section className="booth-workbench" aria-label="จัดวางชิ้นส่วนบูธ">
            <div className="booth-workbench-toolbar">
              <strong>จัดวางบูธ</strong>
              <select
                aria-label="กริดชุดบูธ"
                value={step}
                disabled={busy}
                onChange={(e) => setStep(Number(e.target.value))}
              >
                <option value={0}>อิสระ</option>
                {[8, 16, 32].map((value) => (
                  <option key={value} value={value}>
                    {value} px
                  </option>
                ))}
              </select>
            </div>
            <div className="booth-tools" role="toolbar" aria-label="เครื่องมือจัดชุดบูธ">
              {(
                [
                  { value: 'select', label: 'เลือก / ย้าย' },
                  { value: 'paint-floor', label: 'วางพื้น' },
                  { value: 'erase-floor', label: 'ลบพื้น' },
                  { value: 'erase-asset', label: 'ลบ asset' },
                ] satisfies { value: Tool; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tool === value}
                  disabled={busy || (value === 'paint-floor' && !floorBrush)}
                  onClick={() => {
                    cancelGesture();
                    setTool(value);
                    setSelected(undefined);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className={`booth-preview ${tool.startsWith('erase-') ? 'erasing' : ''} ${tool === 'paint-floor' ? 'painting' : ''}`}
              ref={preview}
              tabIndex={0}
              aria-label="พื้นที่จัดวางบูธ"
              data-floor-preview-count={floorGhost?.cells.length ?? 0}
              style={{
                aspectRatio: `${draft.width} / ${draft.height}`,
                maxWidth: Math.min(600, (400 * draft.width) / draft.height),
                backgroundSize: `${(100 * (step || 8)) / draft.width}% ${(100 * (step || 8)) / draft.height}%`,
              }}
              onPointerDown={(e) => {
                if (tool === 'paint-floor' && floorBrush && !busy && e.button === 0) {
                  const point = floorPoint(e);
                  if (!point?.inside) return;
                  e.preventDefault();
                  e.currentTarget.focus({ preventScroll: true });
                  e.currentTarget.setPointerCapture(e.pointerId);
                  floorStroke.current = { brush: floorBrush, start: point };
                  setSelected(undefined);
                  setFloorGhost({
                    brush: floorBrush,
                    cells: boothFloorCells(floorBrush, point, point, draft),
                  });
                  return;
                }
                if (e.target === e.currentTarget) setSelected(undefined);
              }}
              onPointerMove={(e) => {
                if (tool === 'paint-floor' && floorBrush && !busy) {
                  const point = floorPoint(e);
                  const stroke = floorStroke.current;
                  if (!point || (!point.inside && !stroke)) {
                    setFloorGhost(undefined);
                    return;
                  }
                  const brush = stroke?.brush ?? floorBrush;
                  setFloorGhost({
                    brush,
                    cells: boothFloorCells(brush, stroke?.start ?? point, point, draft),
                  });
                  return;
                }
                const start = drag.current;
                if (!start || busy) return;
                const dx = (e.clientX - start.clientX) / start.scale,
                  dy = (e.clientY - start.clientY) / start.scale;
                if (start.kind === 'resize') {
                  const part = start.part;
                  const x =
                    part.x +
                    (start.handle.includes('w')
                      ? 0
                      : start.handle.includes('e')
                        ? part.w
                        : part.w / 2) +
                    dx;
                  const y =
                    part.y +
                    (start.handle.includes('n')
                      ? 0
                      : start.handle.includes('s')
                        ? part.h
                        : part.h / 2) +
                    dy;
                  const rect = resizeRectangle(
                    { x: part.x, y: part.y, width: part.w, height: part.h },
                    start.handle,
                    { x, y },
                    step,
                    draft,
                  );
                  updatePart(start.index, { x: rect.x, y: rect.y, w: rect.width, h: rect.height });
                } else {
                  const snap = (value: number) =>
                    step ? Math.round(value / step) * step : Math.round(value * 100) / 100;
                  updatePart(start.index, {
                    x: Math.max(0, Math.min(draft.width - start.part.w, snap(start.part.x + dx))),
                    y: Math.max(0, Math.min(draft.height - start.part.h, snap(start.part.y + dy))),
                  });
                }
              }}
              onPointerUp={(e) => {
                const stroke = floorStroke.current;
                if (stroke) {
                  const point = floorPoint(e);
                  floorStroke.current = undefined;
                  if (point?.inside && !busy) {
                    try {
                      const cells = boothFloorCells(stroke.brush, stroke.start, point, draft);
                      if (!cells.length)
                        throw Error('วางพื้นได้ไม่เกิน 2,000 ชิ้นต่อครั้ง และต้องอยู่ภายในกรอบบูธ');
                      setDraft(paintBoothFloor(draft, catalog, stroke.brush, cells));
                      setError('');
                    } catch (error) {
                      setError(error instanceof Error ? error.message : 'วางพื้นไม่สำเร็จ');
                    }
                  }
                  setFloorGhost(undefined);
                }
                drag.current = undefined;
              }}
              onPointerLeave={() => {
                if (!floorStroke.current) setFloorGhost(undefined);
              }}
              onBlur={() => {
                if (floorStroke.current) cancelFloor();
              }}
              onPointerCancel={cancelGesture}
              onLostPointerCapture={cancelGesture}
            >
              {!draft.parts.length && (
                <p className="booth-empty">
                  เลือกหมวดและ asset ด้านขวา
                  <br />
                  {category === 'Floor' || tool === 'paint-floor'
                    ? 'ชี้เพื่อดูตัวอย่าง · คลิกหรือลากเพื่อวางพื้น'
                    : 'แล้วกดเพิ่มชิ้นส่วน'}
                </p>
              )}
              {draft.parts.map((part, index) => {
                const floor = boothCategory(tileFor(part.key)) === 'Floor';
                const enabled =
                  tool === 'select' ||
                  (tool === 'erase-floor' ? floor : tool === 'erase-asset' ? !floor : false);
                return (
                  <button
                    key={index}
                    type="button"
                    className={`booth-preview-part ${selected === index ? 'selected' : ''}`}
                    aria-label={`ชิ้นส่วน ${index + 1} ${labelFor(part.key)}`}
                    aria-pressed={selected === index}
                    data-part-x={part.x}
                    data-part-key={part.key}
                    data-part-y={part.y}
                    data-part-width={part.w}
                    data-part-height={part.h}
                    data-part-category={boothCategory(tileFor(part.key))}
                    style={{
                      left: `${(100 * part.x) / draft.width}%`,
                      top: `${(100 * part.y) / draft.height}%`,
                      width: `${(100 * part.w) / draft.width}%`,
                      height: `${(100 * part.h) / draft.height}%`,
                      zIndex: index + 1,
                      pointerEvents: enabled ? 'auto' : 'none',
                    }}
                    disabled={busy}
                    onPointerDown={(e) => beginGesture(e, index)}
                    onClick={(e) => {
                      if (e.detail !== 0 || busy) return;
                      if (tool === 'select') setSelected(index);
                      else if (enabled) removePart(index);
                    }}
                  >
                    <img src={imageFor(part.key)} alt="" draggable={false} />
                  </button>
                );
              })}
              {floorGhost?.cells.map((cell) => (
                <div
                  key={`${cell.x}:${cell.y}`}
                  className="booth-floor-ghost"
                  style={{
                    left: `${(100 * cell.x) / draft.width}%`,
                    top: `${(100 * cell.y) / draft.height}%`,
                    width: `${(100 * floorGhost.brush.w) / draft.width}%`,
                    height: `${(100 * floorGhost.brush.h) / draft.height}%`,
                  }}
                >
                  <img src={imageFor(floorGhost.brush.key)} alt="" draggable={false} />
                </div>
              ))}
              {selectedPart && selected !== undefined && tool === 'select' && (
                <div className="booth-selection" style={selectionStyle}>
                  {resizeHandles.map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      className={`booth-resize-handle handle-${handle}`}
                      aria-label={`ปรับขนาดชิ้นส่วน ${handleLabels[handle]}`}
                      disabled={busy}
                      style={{
                        left: `${handle.includes('w') ? 0 : handle.includes('e') ? 100 : 50}%`,
                        top: `${handle.includes('n') ? 0 : handle.includes('s') ? 100 : 50}%`,
                      }}
                      onPointerDown={(e) => beginGesture(e, selected, handle)}
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="studio-note" role="status">
              {tool === 'paint-floor'
                ? `ชี้เพื่อดูตัวอย่าง · คลิกหรือลากคลุมเพื่อวางพื้น · Esc ยกเลิก${floorGhost?.cells.length ? ` · ตัวอย่าง ${floorGhost.cells.length} ช่อง` : ''}`
                : tool === 'select'
                  ? 'ลากเพื่อย้าย · ลากขอบหรือมุมเพื่อปรับขนาด · Backspace ลบชิ้นที่เลือก'
                  : tool === 'erase-floor'
                    ? 'คลิกเพื่อลบเฉพาะพื้น · ภาพ asset ยังอยู่'
                    : 'คลิกเพื่อลบ asset · พื้นยังอยู่'}{' '}
              · {draft.parts.length} ชิ้น
            </p>
            {selectedPart && selected !== undefined && (
              <div className="booth-selection-details">
                <span>
                  {labelFor(selectedPart.key)}{' '}
                  <small>
                    {selectedCategory} · {Math.round(selectedPart.w)} × {Math.round(selectedPart.h)}{' '}
                    px
                  </small>
                </span>
                <div className="booth-part-actions" role="group" aria-label="ลำดับชิ้นส่วนบูธ">
                  {(
                    [
                      { value: 'front', label: 'หน้าสุด' },
                      { value: 'forward', label: 'หน้า' },
                      { value: 'backward', label: 'หลัง' },
                      { value: 'back', label: 'หลังสุด' },
                    ] as const
                  ).map(({ value, label }) => (
                    <Button
                      key={value}
                      size="small"
                      disabled={busy}
                      onClick={() => {
                        const next = reorderBoothPart(draft, catalog, selected, value);
                        setDraft(next.prefab);
                        setSelected(next.selected);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                  <Button size="small" danger disabled={busy} onClick={() => removePart(selected)}>
                    ลบชิ้นส่วน
                  </Button>
                </div>
              </div>
            )}
          </section>
          <section className="booth-parts" aria-label="ชิ้นส่วนในบูธ">
            <details className="booth-contents">
              <summary>
                ชิ้นส่วนในบูธ <span>{draft.parts.length}</span>
              </summary>
              <div className="booth-part-list">
                {boothCategories.map((name) => {
                  const parts = draft.parts.flatMap((part, index) =>
                    boothCategory(tileFor(part.key)) === name ? [{ part, index }] : [],
                  );
                  return (
                    <details key={name} className="booth-part-category" open>
                      <summary>
                        {name} <span>{parts.length}</span>
                      </summary>
                      {parts.map(({ part, index }) => (
                        <button
                          type="button"
                          key={index}
                          aria-pressed={selected === index}
                          disabled={busy}
                          onClick={() => {
                            setTool('select');
                            setSelected(index);
                          }}
                        >
                          <img src={imageFor(part.key)} alt="" draggable={false} />
                          {index + 1}. {labelFor(part.key)}
                        </button>
                      ))}
                      {!parts.length && <p>ยังไม่มีชิ้นส่วน</p>}
                    </details>
                  );
                })}
              </div>
            </details>
            <strong>เพิ่มชิ้นส่วน</strong>
            <div className="booth-categories" role="group" aria-label="หมวด asset สำหรับบูธ">
              {boothCategories.map((name) => (
                <button
                  type="button"
                  key={name}
                  aria-pressed={category === name}
                  onClick={() => {
                    cancelGesture();
                    setCategory(name);
                    setAsset(undefined);
                    setAssetQuery('');
                    if (tool === 'paint-floor') setTool('select');
                  }}
                  disabled={busy}
                >
                  {name}
                </button>
              ))}
            </div>
            <Input.Search
              aria-label="ค้นหา asset สำหรับบูธ"
              placeholder={`ค้นหา ${category}`}
              value={assetQuery}
              onChange={(e) => setAssetQuery(e.target.value)}
              allowClear
              disabled={busy}
            />
            <div className="booth-asset-picker" role="group" aria-label="เลือก asset สำหรับบูธ">
              {catalog.tiles
                .filter(
                  (tile) =>
                    !tile.meta.editorHidden &&
                    boothCategory(tile) === category &&
                    `${tile.meta.label} ${tile.meta.assetKey}`
                      .toLowerCase()
                      .includes(assetQuery.toLowerCase()),
                )
                .map((tile) => (
                  <button
                    type="button"
                    key={tile.meta.assetKey}
                    aria-label={`เลือก asset ${tile.meta.label || tile.meta.assetKey}`}
                    aria-pressed={asset === tile.meta.assetKey}
                    disabled={busy}
                    onClick={() => {
                      cancelGesture();
                      setAsset(tile.meta.assetKey);
                      if (tile.meta.ground) {
                        try {
                          setDraft(
                            orderBoothParts(
                              fitBoothFrame(draft, catalog, tile.meta.assetKey),
                              catalog,
                            ),
                          );
                        } catch (error) {
                          setError(error instanceof Error ? error.message : 'ปรับกรอบบูธไม่สำเร็จ');
                          return;
                        }
                        setTool('paint-floor');
                        setSelected(undefined);
                        preview.current?.scrollIntoView({ block: 'nearest' });
                      } else if (tool === 'paint-floor') setTool('select');
                    }}
                  >
                    <img src={imageFor(tile.meta.assetKey)} alt="" draggable={false} />
                    <span>{tile.meta.label || tile.meta.assetKey}</span>
                  </button>
                ))}
            </div>
            {category === 'Floor' ? (
              <p className="studio-note">
                เลือกพื้นแล้วคลิกบนภาพตัวอย่างเพื่อวาง หรือลากคลุมหลายช่อง
              </p>
            ) : (
              <Button
                disabled={busy || !asset}
                onClick={() => {
                  const tile = asset && tileFor(asset);
                  if (!tile) return;
                  const size = catalog.defaultSizes?.[tile.meta.assetKey] ?? {
                    width: tile.imagewidth,
                    height: tile.imageheight,
                  };
                  const ratio = Math.min(1, draft.width / size.width, draft.height / size.height);
                  const part = {
                    key: tile.meta.assetKey,
                    x: 0,
                    y: 0,
                    w: size.width * ratio,
                    h: size.height * ratio,
                  };
                  const next = orderBoothParts(
                    { ...draft, parts: [...draft.parts, part] },
                    catalog,
                  );
                  // The new part is foremost within its ground/asset plane.
                  const position = next.parts.filter(
                    (p) => boothCategory(tileFor(p.key)) === 'Floor',
                  ).length;
                  setDraft(next);
                  setSelected(tile.meta.ground ? position - 1 : next.parts.length - 1);
                  setTool('select');
                  preview.current?.focus({ preventScroll: true });
                  preview.current?.scrollIntoView({ block: 'nearest' });
                }}
              >
                ＋ เพิ่มชิ้นส่วน
              </Button>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
}
