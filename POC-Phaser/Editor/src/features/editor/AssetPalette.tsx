'use client';
/* Sprite thumbnails use original local textures without image optimization. */
/* eslint-disable @next/next/no-img-element */
import { Button, Input, Popconfirm, message } from 'antd';
import { useState } from 'react';
import type { Catalog, Prefab } from '../../../shared/map/types';
import { BoothEditor } from './BoothEditor';
import { editorApi } from './api';
const categories = [
  { value: 'Booth', label: 'Booth' },
  { value: 'Prop', label: 'Prop' },
  { value: 'Layout', label: 'Layout' },
  { value: 'Floor', label: 'Floor' },
  { value: 'Interact', label: 'Interact' },
  { value: 'Custom', label: 'ของฉัน' },
];
export function AssetPalette({
  catalog,
  active,
  onSelect,
  onInteract,
  tileSize,
  onCatalogChanged,
}: {
  catalog: Catalog;
  active?: string;
  onSelect: (key: string, floor: boolean) => void;
  onInteract: () => void;
  tileSize: number;
  onCatalogChanged: (catalog: Catalog) => void;
}) {
  const [family, setFamily] = useState(active?.startsWith('custom-') ? 'Custom' : 'Prop'),
    [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ prefab: Prefab; creating: boolean; revision: number }>();
  const [boothBusy, setBoothBusy] = useState(false);
  const [toast, context] = message.useMessage();
  async function edit(prefab: Prefab) {
    setBoothBusy(true);
    try {
      setDialog({ prefab, creating: false, revision: await editorApi.boothRevision(prefab.key) });
    } catch (error) {
      void toast.error(error instanceof Error ? error.message : 'เปิดชุดบูธไม่สำเร็จ');
    } finally {
      setBoothBusy(false);
    }
  }
  const items =
    family === 'Booth'
      ? catalog.prefabs.map((p) => ({
          key: p.key,
          parts: p.parts,
          width: p.width,
          height: p.height,
          floor: false,
          label: p.label || p.key,
        }))
      : catalog.tiles
          .filter((t) => !t.meta.editorHidden)
          .filter((t) =>
            family === 'Interact'
              ? t.meta.interactable
              : family === 'Custom'
                ? t.meta.assetKey.startsWith('custom-')
                : family === 'Floor'
                  ? t.meta.ground && t.imagewidth === tileSize && t.imageheight === tileSize
                  : t.meta.family === family &&
                    !(t.meta.ground && t.imagewidth === tileSize && t.imageheight === tileSize),
          )
          .map((t) => ({
            key: t.meta.assetKey,
            parts: [{ key: t.meta.assetKey, x: 0, y: 0, w: t.imagewidth, h: t.imageheight }],
            width: t.imagewidth,
            height: t.imageheight,
            floor: !!t.meta.ground && t.imagewidth === tileSize && t.imageheight === tileSize,
            label: t.meta.label || t.meta.assetKey,
          }));
  return (
    <aside className="asset-panel">
      {context}
      {dialog && (
        <BoothEditor
          key={dialog.prefab.key}
          initial={dialog.prefab}
          creating={dialog.creating}
          catalog={catalog}
          onCancel={() => setDialog(undefined)}
          onSave={async (prefab) => {
            const next = await editorApi.updateBooth(prefab.key, prefab, dialog.revision);
            onCatalogChanged(next);
            setDialog(undefined);
            void toast.success('บันทึกชุดบูธถาวรแล้ว');
          }}
        />
      )}
      <div className="panel-heading">
        <h2>ชิ้นส่วนของห้อง</h2>
        <p>เลือกชิ้นส่วน · Floor / Layout ลากคลุมเพื่อวาง</p>
      </div>
      {family === 'Booth' && (
        <div className="booth-library-tools">
          <Button
            disabled={boothBusy}
            onClick={() =>
              setDialog({
                creating: true,
                revision: 0,
                prefab: {
                  key: `booth-custom-${crypto.randomUUID()}`,
                  label: 'บูธใหม่',
                  width: 192,
                  height: 192,
                  sizing: 'explicit',
                  parts: [],
                },
              })
            }
          >
            ＋ เพิ่มบูธ
          </Button>
          <p>สร้างชุดบูธไว้ใช้ร่วมกันทุกแมป</p>
        </div>
      )}
      <div className="asset-categories" role="group" aria-label="หมวด asset">
        {categories.map((category) => (
          <button
            type="button"
            key={category.value}
            aria-pressed={family === category.value}
            onKeyDown={(event) => {
              if (event.code === 'Space') event.stopPropagation();
            }}
            onClick={() => setFamily(category.value)}
          >
            {category.label}
          </button>
        ))}
      </div>
      {family === 'Interact' && (
        <div className="interact-help">
          <p>เลือกภาพเพื่อวาง · กรอบสีเหลืองคือขอบเขต Interact</p>
          <button type="button" onClick={onInteract}>
            แก้ไข Interact ในแมป
          </button>
          <p>ตั้ง Action key แล้วให้โปรเจกต์ปลายทางกำหนดการทำงาน</p>
        </div>
      )}
      <Input.Search
        placeholder="ค้นหา asset"
        aria-label="ค้นหา asset"
        allowClear
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="asset-category-caption">
        <strong>{family === 'Custom' ? 'ของฉัน' : family}</strong>
        <span>
          {
            items.filter(
              (i) =>
                i.key.includes(query.toLowerCase()) ||
                i.label.toLowerCase().includes(query.toLowerCase()),
            ).length
          }{' '}
          ชิ้น
        </span>
      </div>
      <div className="asset-grid">
        {items
          .filter(
            (i) =>
              i.key.includes(query.toLowerCase()) ||
              i.label.toLowerCase().includes(query.toLowerCase()),
          )
          .map((item) => {
            const scale = Math.min(104 / item.width, 80 / item.height);
            return (
              <div className="asset-entry" key={item.key}>
                <button
                  type="button"
                  className={`asset-card ${active === item.key ? 'selected' : ''}`}
                  key={item.key}
                  aria-pressed={active === item.key}
                  onClick={() => onSelect(item.key, item.floor)}
                >
                  <span className="asset-picture">
                    {active === item.key && (
                      <span className="asset-selected-mark" aria-hidden="true">
                        ✓
                      </span>
                    )}
                    {item.parts.map((p, index) => {
                      const tile = catalog.tiles.find((t) => t.meta.assetKey === p.key)!;
                      const url = catalog.textures.find((t) => t.key === tile.key)!.url;
                      return (
                        <img
                          key={`${p.key}-${index}`}
                          loading="lazy"
                          alt=""
                          src={url}
                          style={{
                            position: 'absolute',
                            width: p.w * scale,
                            height: p.h * scale,
                            left: (112 - item.width * scale) / 2 + p.x * scale,
                            top: (86 - item.height * scale) / 2 + p.y * scale,
                          }}
                        />
                      );
                    })}
                  </span>
                  <span>{item.label}</span>
                </button>
                {family === 'Booth' && (
                  <div className="booth-card-actions">
                    <Button
                      size="small"
                      aria-label={`แก้ไขบูธ ${item.label}`}
                      disabled={boothBusy}
                      onClick={() => {
                        const prefab = catalog.prefabs.find((prefab) => prefab.key === item.key);
                        if (prefab) void edit(prefab);
                      }}
                    >
                      แก้ไข
                    </Button>
                    <Popconfirm
                      title={`ลบชุดบูธ ${item.label}?`}
                      description="บูธที่วางในแมปแล้วจะยังคงอยู่"
                      okText="ลบชุดบูธ"
                      cancelText="ยกเลิก"
                      onConfirm={async () => {
                        setBoothBusy(true);
                        try {
                          const revision = await editorApi.boothRevision(item.key);
                          onCatalogChanged(await editorApi.updateBooth(item.key, null, revision));
                          void toast.success('ลบชุดบูธแล้ว');
                        } catch (error) {
                          void toast.error(
                            error instanceof Error ? error.message : 'ลบชุดบูธไม่สำเร็จ',
                          );
                        } finally {
                          setBoothBusy(false);
                        }
                      }}
                    >
                      <Button
                        size="small"
                        danger
                        aria-label={`ลบชุดบูธ ${item.label}`}
                        disabled={boothBusy}
                      >
                        ลบ
                      </Button>
                    </Popconfirm>
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <div className="panel-footnote">
        คลัง asset ร่วมทุกแมป · บันทึกถาวรในโปรเจกต์
        <br />
        บูธถูกย้ายเป็นกลุ่ม พร้อม collision
      </div>
    </aside>
  );
}
