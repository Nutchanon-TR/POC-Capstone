'use client';
/* eslint-disable @next/next/no-img-element */
import { Alert, Button, Input, InputNumber, Popconfirm, Switch } from 'antd';
import { useRef, useState, type PointerEvent } from 'react';
import type { Catalog, CatalogTile } from '../../../shared/map/types';
import {
  assetDefinition,
  assetDefinitionSchema,
  type AssetDefinition,
} from '../../../shared/map/asset-definitions';
import { boothCategories, boothCategory } from '../../../shared/map/booth';
import { resizeHandles, resizeRectangle, type ResizeHandle } from '../../../shared/map/transform';
import { editorApi } from './api';
import { PixelIcon } from './PixelIcon';

type Bounds = NonNullable<AssetDefinition['interaction']>['bounds'];
export function AssetManager({
  catalog,
  onCatalogChanged,
  onBack,
  onBusy,
}: {
  catalog: Catalog;
  onCatalogChanged: (catalog: Catalog) => void;
  onBack: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState<{ key: string; revision: number }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const tile = catalog.tiles.find((tile) => tile.meta.assetKey === editing?.key);
  const imageFor = (tile: CatalogTile) =>
    catalog.textures.find((image) => image.key === tile.key)?.url;
  return (
    <main className="asset-manager">
      <header className="asset-manager-heading">
        <div>
          <h1>จัดการ asset</h1>
          <p>ชื่อ ขนาดมาตรฐาน และกรอบ ใช้ร่วมกันทุกแมป</p>
        </div>
        <Button onClick={onBack} disabled={busy}>
          <PixelIcon name="zone" />
          กลับไปแมป
        </Button>
      </header>
      {error && <Alert type="error" title={error} />}
      {editing && tile ? (
        <AssetDefinitionEditor
          key={tile.meta.assetKey}
          catalog={catalog}
          tile={tile}
          image={imageFor(tile)}
          onBack={() => setEditing(undefined)}
          onSave={async (value) => {
            setBusy(true);
            onBusy(true);
            try {
              const next = await editorApi.updateAsset(editing.key, value, editing.revision);
              onCatalogChanged(next);
              setEditing({ ...editing, revision: editing.revision + 1 });
            } finally {
              setBusy(false);
              onBusy(false);
            }
          }}
          onDelete={async () => {
            setBusy(true);
            onBusy(true);
            try {
              const next = await editorApi.updateAsset(editing.key, null, editing.revision);
              onCatalogChanged(next);
              setEditing(undefined);
            } finally {
              setBusy(false);
              onBusy(false);
            }
          }}
        />
      ) : (
        <>
          <div className="asset-manager-filters">
            <Input.Search
              aria-label="ค้นหา asset ในคลัง"
              placeholder="ค้นหาชื่อ asset"
              value={query}
              allowClear
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="booth-categories" role="group" aria-label="หมวดคลัง asset">
              {['All', ...boothCategories].map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={category === name}
                  onClick={() => setCategory(name)}
                >
                  {name === 'All' ? 'ทั้งหมด' : name}
                </button>
              ))}
            </div>
          </div>
          <div className="asset-manager-grid">
            {catalog.tiles
              .filter(
                (tile) =>
                  !tile.meta.editorHidden &&
                  (category === 'All' || boothCategory(tile) === category) &&
                  `${tile.meta.label} ${tile.meta.assetKey}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .map((tile) => (
                <button
                  type="button"
                  key={tile.meta.assetKey}
                  disabled={busy}
                  aria-label={`แก้ไข asset ${tile.meta.label || tile.meta.assetKey}`}
                  onClick={() => {
                    setBusy(true);
                    setError('');
                    void editorApi
                      .assetRevision(tile.meta.assetKey)
                      .then((revision) => setEditing({ key: tile.meta.assetKey, revision }))
                      .catch((e: unknown) =>
                        setError(e instanceof Error ? e.message : 'เปิด asset ไม่สำเร็จ'),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  <span className="asset-manager-image">
                    <img src={imageFor(tile)} alt="" draggable={false} loading="lazy" />
                  </span>
                  <strong>{tile.meta.label || tile.meta.assetKey}</strong>
                  <small>
                    {boothCategory(tile)} · {tile.imagewidth} × {tile.imageheight} px
                  </small>
                </button>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
function AssetDefinitionEditor({
  catalog,
  tile,
  image,
  onBack,
  onSave,
  onDelete,
}: {
  catalog: Catalog;
  tile: CatalogTile;
  image?: string;
  onBack: () => void;
  onSave: (value: AssetDefinition) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [value, setValue] = useState(() => assetDefinition(catalog, tile));
  const [frame, setFrame] = useState(
    tile.objectgroup?.objects[0]
      ? `collision:${tile.objectgroup.objects[0].id}`
      : tile.meta.interactable
        ? 'interact'
        : '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const collider = value.colliders.find((rect) => `collision:${rect.id}` === frame);
  const bounds = frame === 'interact' ? value.interaction?.bounds : collider?.bounds;
  function change(next: AssetDefinition) {
    setValue(next);
    setSaved(false);
  }
  function setBounds(bounds: Bounds) {
    if (frame === 'interact' && value.interaction)
      change({ ...value, interaction: { ...value.interaction, bounds } });
    else
      change({
        ...value,
        colliders: value.colliders.map((rect) =>
          `collision:${rect.id}` === frame ? { ...rect, bounds } : rect,
        ),
      });
  }
  async function persist(remove = false) {
    setBusy(true);
    setError('');
    try {
      if (remove) await onDelete();
      else {
        await onSave(assetDefinitionSchema.parse(value));
        setSaved(true);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'บันทึก asset ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="asset-definition-editor" aria-label="รายละเอียด asset">
      <div className="asset-definition-title">
        <Button onClick={onBack} disabled={busy}>
          กลับไปคลัง asset
        </Button>
        <h2>{tile.meta.label || tile.meta.assetKey}</h2>
        <Button type="primary" onClick={() => void persist()} loading={busy}>
          บันทึก asset
        </Button>
      </div>
      {error && <Alert type="error" title={error} />}
      {saved && <Alert type="success" title="บันทึก asset ถาวรแล้ว" />}
      <div className="asset-definition-layout">
        <section className="asset-frame-workbench">
          <h3>ภาพและกรอบ</h3>
          <p className="studio-note">เลือกกรอบด้านขวา ลากเพื่อย้าย หรือลากจุดจับเพื่อปรับขนาด</p>
          <AssetFrame
            image={image}
            tile={tile}
            bounds={bounds}
            interaction={frame === 'interact'}
            onChange={setBounds}
            disabled={busy}
          />
          <p className="studio-note">
            ภาพต้นฉบับ {tile.imagewidth} × {tile.imageheight} px
          </p>
        </section>
        <div className="asset-definition-fields">
          <label>
            ชื่อ asset
            <Input
              aria-label="ชื่อ asset"
              value={value.label}
              maxLength={120}
              disabled={busy}
              onChange={(e) => change({ ...value, label: e.target.value })}
            />
          </label>
          <div className="coordinate-fields">
            {(['width', 'height'] as const).map((axis) => (
              <label key={axis}>
                {axis === 'width' ? 'กว้างมาตรฐาน' : 'สูงมาตรฐาน'}
                <InputNumber
                  aria-label={axis === 'width' ? 'ความกว้างมาตรฐาน asset' : 'ความสูงมาตรฐาน asset'}
                  min={1}
                  max={8192}
                  value={value[axis]}
                  disabled={busy || !!tile.meta.ground}
                  onChange={(number) => number !== null && change({ ...value, [axis]: number })}
                />
              </label>
            ))}
          </div>
          <p className="studio-note">
            {tile.meta.ground
              ? 'ขนาดช่องพื้นอิง tile size ของแต่ละแมป'
              : 'ขนาดมาตรฐานใช้กับการวางครั้งถัดไป ชิ้นที่วางแล้วคงขนาดเดิม'}
          </p>
          <div className="asset-frame-actions">
            <Button
              disabled={busy || value.colliders.length >= 100}
              onClick={() => {
                const id = Math.max(0, ...value.colliders.map((rect) => rect.id)) + 1;
                change({
                  ...value,
                  colliders: [
                    ...value.colliders,
                    { id, bounds: { x: 0, y: 0.5, width: 1, height: 0.5 } },
                  ],
                });
                setFrame(`collision:${id}`);
              }}
            >
              เพิ่มกรอบชน
            </Button>
            <label>
              Interact{' '}
              <Switch
                aria-label="เปิด Interact ของ asset"
                checked={!!value.interaction}
                disabled={busy}
                onChange={(enabled) => {
                  change({
                    ...value,
                    interaction: enabled
                      ? {
                          bounds: { x: 0, y: 0, width: 1, height: 1 },
                          kind: 'custom',
                          actionKey: '',
                        }
                      : null,
                  });
                  setFrame(enabled ? 'interact' : '');
                }}
              />
            </label>
          </div>
          <label>
            เลือกกรอบ
            <select
              aria-label="เลือกกรอบ asset"
              value={frame}
              disabled={busy}
              onChange={(e) => setFrame(e.target.value)}
            >
              <option value="">ดูภาพ</option>
              {value.colliders.map((rect, index) => (
                <option key={rect.id} value={`collision:${rect.id}`}>
                  กรอบชน {index + 1}
                </option>
              ))}
              {value.interaction && <option value="interact">Interact</option>}
            </select>
          </label>
          {bounds && (
            <>
              <div className="coordinate-fields">
                {(['x', 'y', 'width', 'height'] as const).map((axis) => {
                  const dimension =
                    axis === 'x' || axis === 'width' ? tile.imagewidth : tile.imageheight;
                  return (
                    <label key={axis}>
                      {{ x: 'X', y: 'Y', width: 'กว้าง', height: 'สูง' }[axis]}
                      <InputNumber
                        aria-label={`กรอบ asset ${axis}`}
                        min={axis === 'x' || axis === 'y' ? 0 : 1}
                        max={dimension}
                        value={Math.round(bounds[axis] * dimension * 100) / 100}
                        disabled={busy}
                        onChange={(number) => {
                          if (number === null) return;
                          const next = { ...bounds, [axis]: number / dimension };
                          next.width = Math.max(1 / tile.imagewidth, Math.min(next.width, 1));
                          next.height = Math.max(1 / tile.imageheight, Math.min(next.height, 1));
                          next.x = Math.max(0, Math.min(next.x, 1 - next.width));
                          next.y = Math.max(0, Math.min(next.y, 1 - next.height));
                          setBounds(next);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
              <Button
                danger
                disabled={busy}
                onClick={() => {
                  if (frame === 'interact') change({ ...value, interaction: null });
                  else
                    change({
                      ...value,
                      colliders: value.colliders.filter((rect) => `collision:${rect.id}` !== frame),
                    });
                  setFrame('');
                }}
              >
                ลบกรอบที่เลือก
              </Button>
            </>
          )}
          {frame === 'interact' && value.interaction && (
            <>
              <label>
                ชนิด Interact
                <Input
                  aria-label="ชนิด Interact ของ asset"
                  value={value.interaction.kind}
                  maxLength={80}
                  disabled={busy}
                  onChange={(e) =>
                    value.interaction &&
                    change({
                      ...value,
                      interaction: { ...value.interaction, kind: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Action key
                <Input
                  aria-label="Action key ของ asset"
                  value={value.interaction.actionKey}
                  maxLength={200}
                  disabled={busy}
                  onChange={(e) =>
                    value.interaction &&
                    change({
                      ...value,
                      interaction: { ...value.interaction, actionKey: e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}
          <p className="studio-note">
            กรอบใช้ร่วมกับ asset นี้ทุกแมป กรอบที่ตั้งแยกไว้บนวัตถุยังใช้ค่าของวัตถุนั้น
          </p>
          <Popconfirm
            title="ลบ asset ออกจากคลัง?"
            description="ภาพที่วางในแมปแล้วจะยังอยู่"
            okText="ลบ asset"
            cancelText="ยกเลิก"
            onConfirm={() => persist(true)}
          >
            <Button danger disabled={busy}>
              ลบ asset จากคลัง
            </Button>
          </Popconfirm>
        </div>
      </div>
    </section>
  );
}
function AssetFrame({
  image,
  tile,
  bounds,
  interaction,
  onChange,
  disabled,
}: {
  image?: string;
  tile: CatalogTile;
  bounds?: Bounds;
  interaction: boolean;
  onChange: (bounds: Bounds) => void;
  disabled: boolean;
}) {
  const view = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ bounds: Bounds; x: number; y: number; handle?: ResizeHandle }>(
    undefined,
  );
  function begin(event: PointerEvent<HTMLElement>, handle?: ResizeHandle) {
    if (!bounds || disabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    gesture.current = { bounds: { ...bounds }, x: event.clientX, y: event.clientY, handle };
    view.current?.focus({ preventScroll: true });
    view.current?.setPointerCapture(event.pointerId);
  }
  function cancel() {
    const start = gesture.current;
    gesture.current = undefined;
    if (start) onChange(start.bounds);
  }
  return (
    <div
      ref={view}
      tabIndex={0}
      className="asset-definition-preview"
      aria-label="ภาพแก้ไขกรอบ asset"
      style={{
        aspectRatio: `${tile.imagewidth} / ${tile.imageheight}`,
        maxWidth: Math.min(600, (420 * tile.imagewidth) / tile.imageheight),
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && gesture.current) {
          e.preventDefault();
          cancel();
        }
      }}
      onPointerMove={(e) => {
        const start = gesture.current,
          box = view.current?.getBoundingClientRect();
        if (!start || !box || disabled) return;
        const dx = (e.clientX - start.x) / box.width,
          dy = (e.clientY - start.y) / box.height;
        if (!start.handle)
          onChange({
            ...start.bounds,
            x: Math.max(0, Math.min(1 - start.bounds.width, start.bounds.x + dx)),
            y: Math.max(0, Math.min(1 - start.bounds.height, start.bounds.y + dy)),
          });
        else {
          const r = start.bounds,
            h = start.handle;
          const rect = resizeRectangle(
            {
              x: r.x * tile.imagewidth,
              y: r.y * tile.imageheight,
              width: r.width * tile.imagewidth,
              height: r.height * tile.imageheight,
            },
            h,
            {
              x:
                (r.x + (h.includes('w') ? 0 : h.includes('e') ? r.width : r.width / 2) + dx) *
                tile.imagewidth,
              y:
                (r.y + (h.includes('n') ? 0 : h.includes('s') ? r.height : r.height / 2) + dy) *
                tile.imageheight,
            },
            0,
            { width: tile.imagewidth, height: tile.imageheight },
          );
          onChange({
            x: rect.x / tile.imagewidth,
            y: rect.y / tile.imageheight,
            width: rect.width / tile.imagewidth,
            height: rect.height / tile.imageheight,
          });
        }
      }}
      onPointerUp={() => {
        gesture.current = undefined;
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
    >
      <img src={image} alt="" draggable={false} />
      {bounds && (
        <div
          className={`asset-definition-bounds ${interaction ? 'interaction' : ''}`}
          style={{
            left: `${100 * bounds.x}%`,
            top: `${100 * bounds.y}%`,
            width: `${100 * bounds.width}%`,
            height: `${100 * bounds.height}%`,
          }}
          onPointerDown={(e) => begin(e)}
        >
          {resizeHandles.map((handle) => (
            <button
              key={handle}
              type="button"
              className={`booth-resize-handle handle-${handle}`}
              aria-label={`ปรับกรอบ asset ${handle}`}
              disabled={disabled}
              style={{
                left: `${handle.includes('w') ? 0 : handle.includes('e') ? 100 : 50}%`,
                top: `${handle.includes('n') ? 0 : handle.includes('s') ? 100 : 50}%`,
              }}
              onPointerDown={(e) => begin(e, handle)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
