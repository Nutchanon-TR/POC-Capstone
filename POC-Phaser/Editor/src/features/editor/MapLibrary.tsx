'use client';
/* Pixel map previews come from local saved documents. */
/* eslint-disable @next/next/no-img-element */
import { Button, Input, InputNumber, Modal, Select } from 'antd';
import { useState } from 'react';
import type { MapSummary, WorkspaceSnapshot } from '../../../shared/map/types';
import { PixelIcon } from './PixelIcon';

export function MapLibrary({
  maps,
  activeId,
  open,
  busy,
  dirtyIds,
  onToggle,
  onOpen,
  onNew,
  onDuplicate,
  assetsActive,
  onAssets,
}: {
  maps: MapSummary[];
  activeId: string;
  open: boolean;
  busy: boolean;
  dirtyIds: Set<string>;
  onToggle: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  assetsActive: boolean;
  onAssets: () => void;
}) {
  const [query, setQuery] = useState('');
  return (
    <aside className={`map-library ${open ? 'expanded' : ''}`} aria-label="จัดการแมป">
      <nav className="map-activity-rail" aria-label="แถบฟีเจอร์">
        <button
          type="button"
          className="map-activity-button"
          aria-label="เปิด / ปิดรายการแมป"
          aria-expanded={open}
          aria-controls="map-library-panel"
          onClick={onToggle}
          disabled={busy}
        >
          <PixelIcon name="zone" />
        </button>
        <button
          type="button"
          className="map-activity-button"
          aria-label="จัดการ asset"
          aria-pressed={assetsActive}
          disabled={busy}
          onClick={onAssets}
          title="จัดการ asset"
        >
          <PixelIcon name="assets" />
        </button>
      </nav>
      <section id="map-library-panel" className="map-library-panel" hidden={!open}>
        <header>
          <h2>แมปของฉัน</h2>
          <button type="button" aria-label="พับรายการแมป" onClick={onToggle}>
            <PixelIcon name="close" />
          </button>
        </header>
        <Button disabled={busy} onClick={onNew} className="map-new-button">
          ＋ สร้างแมปใหม่
        </Button>
        <Input.Search
          aria-label="ค้นหาแมป"
          placeholder="ค้นหาแมป"
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="map-list">
          {maps
            .filter((m) => m.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
            .map((map) => (
              <div className={`map-list-row ${map.id === activeId ? 'active' : ''}`} key={map.id}>
                <button
                  type="button"
                  className="map-open-button"
                  aria-label={`เปิดแมป ${map.name}`}
                  aria-pressed={map.id === activeId}
                  disabled={busy}
                  onClick={() => onOpen(map.id)}
                >
                  {map.thumbnail ? (
                    <img
                      src={map.thumbnail}
                      alt={`ตัวอย่างแมป ${map.name}`}
                      width={72}
                      height={46}
                    />
                  ) : (
                    <span className="map-thumbnail-empty">
                      <PixelIcon name="zone" />
                    </span>
                  )}
                  <span className="map-row-text">
                    <strong>{map.name}</strong>
                    <span>
                      {map.width} × {map.height} ช่อง · {map.tileSize} px
                    </span>
                    <time dateTime={map.updatedAt}>
                      {new Intl.DateTimeFormat('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(map.updatedAt))}
                    </time>
                    {dirtyIds.has(map.id) && <span className="map-draft-badge">ยังไม่บันทึก</span>}
                  </span>
                </button>
                <button
                  type="button"
                  className="map-duplicate-button"
                  aria-label={`Duplicate แมป ${map.name}`}
                  title="Duplicate"
                  disabled={busy}
                  onClick={() => onDuplicate(map.id)}
                >
                  ⧉
                </button>
              </div>
            ))}
          {maps.length > 0 &&
            !maps.some((m) => m.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && (
              <p className="map-list-empty">ไม่พบชื่อแมปนี้</p>
            )}
        </div>
        <footer>{maps.length} แมป · เก็บถาวรในโปรเจกต์</footer>
      </section>
    </aside>
  );
}

export type NewMapSettings = {
  title: string;
  width: number;
  height: number;
  tileSize: number;
  floorGid: number;
};
export function MapCreateDialog({
  kind,
  source,
  busy,
  onCancel,
  onCreate,
}: {
  kind: 'new' | 'duplicate';
  source: WorkspaceSnapshot;
  busy: boolean;
  onCancel: () => void;
  onCreate: (settings: NewMapSettings) => Promise<void>;
}) {
  const doc = source.record.document;
  const [title, setTitle] = useState(
      kind === 'duplicate' ? `${source.record.name} สำเนา` : 'แมปใหม่',
    ),
    [width, setWidth] = useState(doc.width),
    [height, setHeight] = useState(doc.height),
    [tileSize, setTileSize] = useState(doc.tilewidth),
    [floorGid, setFloorGid] = useState(0);
  const floors = source.catalog.tiles.filter(
    (t) => t.meta.ground && t.imagewidth === doc.tilewidth && t.imageheight === doc.tileheight,
  );
  const valid =
    !!title.trim() &&
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    width <= 256 &&
    height > 0 &&
    height <= 256;
  return (
    <Modal
      open
      title={kind === 'duplicate' ? 'Duplicate แมป' : 'สร้างแมปใหม่'}
      onCancel={onCancel}
      footer={null}
      maskClosable={!busy}
      closable={!busy}
      keyboard={!busy}
    >
      <div className="map-create-fields">
        <label>
          ชื่อแมป
          <Input
            autoFocus
            aria-label="ชื่อแมปใหม่"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        {kind === 'new' ? (
          <>
            <div className="coordinate-fields">
              <label>
                กว้าง · จำนวนช่อง
                <InputNumber
                  aria-label="ความกว้างแมปใหม่"
                  min={1}
                  max={256}
                  precision={0}
                  value={width}
                  onChange={(v) => v !== null && setWidth(v)}
                />
              </label>
              <label>
                สูง · จำนวนช่อง
                <InputNumber
                  aria-label="ความสูงแมปใหม่"
                  min={1}
                  max={256}
                  precision={0}
                  value={height}
                  onChange={(v) => v !== null && setHeight(v)}
                />
              </label>
            </div>
            <label>
              Tile size · ขนาดช่อง
              <Select
                aria-label="Tile size แมปใหม่"
                value={tileSize}
                options={[16, 32, 64, 128].map((value) => ({ value, label: `${value} px` }))}
                onChange={setTileSize}
              />
            </label>
            <label>
              พื้นเริ่มต้น
              <Select
                aria-label="พื้นแมปใหม่"
                value={floorGid}
                onChange={setFloorGid}
                options={[
                  { value: 0, label: 'ไม่มีพื้น' },
                  ...floors.map((t) => ({ value: t.gid, label: t.meta.label || t.meta.assetKey })),
                ]}
              />
            </label>
          </>
        ) : (
          <p>คัดลอกแมป คลัง asset และการตั้งค่าทั้งหมดเป็นแมปใหม่</p>
        )}
        <p className="new-map-dimensions">
          {width} × {height} ช่อง · {width * tileSize} × {height * tileSize} px
        </p>
        <Button
          type="primary"
          block
          loading={busy}
          disabled={!valid}
          onClick={() => void onCreate({ title: title.trim(), width, height, tileSize, floorGid })}
        >
          {kind === 'duplicate' ? 'สร้างสำเนาแมป' : 'สร้างแมป'}
        </Button>
      </div>
    </Modal>
  );
}
