'use client';
import { Alert, Button, Drawer, Input, InputNumber, Select, Slider, Switch, message } from 'antd';
import { useRef, useState } from 'react';
import type { Catalog, MapDocument } from '../../../shared/map/types';
import { fitBlueprint, type Blueprint } from '../../../shared/map/studio';
import { readImageFile } from './imageFile';
export type MapSettings = {
  kind: 'resize' | 'new';
  width: number;
  height: number;
  title: string;
  floorGid: number;
};
export function StudioControls({
  document,
  catalog,
  blueprint,
  onBlueprint,
  onMap,
}: {
  document: MapDocument;
  catalog: Catalog;
  blueprint?: Blueprint;
  onBlueprint: (blueprint?: Blueprint) => void;
  onMap: (settings: MapSettings) => boolean;
}) {
  const [open, setOpen] = useState(false),
    [width, setWidth] = useState(document.width),
    [height, setHeight] = useState(document.height),
    [title, setTitle] = useState(''),
    [floorGid, setFloorGid] = useState(0),
    [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null),
    [toast, context] = message.useMessage();
  const floors = catalog.tiles.filter(
    (t) =>
      t.meta.ground && t.imagewidth === document.tilewidth && t.imageheight === document.tileheight,
  );
  async function upload(file: File) {
    setUploading(true);
    try {
      const image = await readImageFile(file, 1.5 * 1024 * 1024, [
        'image/png',
        'image/jpeg',
        'image/webp',
      ]);
      onBlueprint(
        fitBlueprint(
          {
            name: file.name,
            url: image.url,
            imageWidth: image.width,
            imageHeight: image.height,
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
            opacity: 0.4,
            visible: true,
          },
          document.width * document.tilewidth,
          document.height * document.tileheight,
        ),
      );
    } catch (error) {
      void toast.error(error instanceof Error ? error.message : 'เปิดภาพไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      {context}
      <Button
        onClick={() => {
          setWidth(document.width);
          setHeight(document.height);
          setTitle(
            String(document.properties?.find((p) => p.name === 'title')?.value || 'แมปใหม่'),
          );
          setFloorGid(floors[0]?.gid ?? 0);
          setOpen(true);
        }}
      >
        Blueprint / ขนาดแมป
      </Button>
      <Drawer title="ตั้งค่าพื้นที่ออกแบบ" open={open} onClose={() => setOpen(false)} size={380}>
        <div className="studio-fields">
          <h3>ขนาดแมป</h3>
          <label>
            ชื่อแมป
            <Input
              aria-label="ชื่อแมป"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="coordinate-fields">
            <label>
              กว้าง · ช่อง
              <InputNumber
                aria-label="จำนวนช่องแนวนอน"
                value={width}
                min={1}
                max={256}
                precision={0}
                onChange={(v) => v !== null && setWidth(v)}
              />
            </label>
            <label>
              สูง · ช่อง
              <InputNumber
                aria-label="จำนวนช่องแนวตั้ง"
                value={height}
                min={1}
                max={256}
                precision={0}
                onChange={(v) => v !== null && setHeight(v)}
              />
            </label>
          </div>
          <p>
            {width * document.tilewidth} × {height * document.tileheight} px · ช่องละ{' '}
            {document.tilewidth} px
          </p>
          <label>
            พื้นสำหรับพื้นที่ใหม่
            <Select
              aria-label="พื้นเริ่มต้น"
              value={floorGid}
              onChange={setFloorGid}
              options={[
                { value: 0, label: 'ไม่มีพื้น' },
                ...floors.map((t) => ({ value: t.gid, label: t.meta.label || t.meta.assetKey })),
              ]}
            />
          </label>
          <Button
            onClick={() => {
              if (onMap({ kind: 'resize', width, height, title, floorGid })) setOpen(false);
            }}
          >
            ปรับขนาดแมปปัจจุบัน
          </Button>
          <p>สร้างแมปเพิ่มและ Duplicate จากรายการแมปทางซ้าย</p>
          <h3>ภาพ blueprint</h3>
          <Button loading={uploading} onClick={() => file.current?.click()}>
            อัปโหลด blueprint
          </Button>
          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) void upload(selected);
              e.target.value = '';
            }}
          />
          <p>PNG / JPG / WebP ไม่เกิน 1.5 MB ภาพอ้างอิงถูกเก็บพร้อมแมปและแสดงในพื้นที่ออกแบบ</p>
          {blueprint && (
            <>
              <Alert type="info" title={blueprint.name} />
              <label className="studio-inline">
                แสดงภาพ
                <Switch
                  aria-label="แสดง blueprint"
                  checked={blueprint.visible}
                  onChange={(visible) => onBlueprint({ ...blueprint, visible })}
                />
              </label>
              <label>
                ความทึบ
                <Slider
                  aria-label="ความทึบ blueprint"
                  value={Math.round(blueprint.opacity * 100)}
                  onChange={(v) => onBlueprint({ ...blueprint, opacity: v / 100 })}
                />
              </label>
              <div className="coordinate-fields">
                {(['x', 'y'] as const).map((axis) => (
                  <label key={axis}>
                    {axis.toUpperCase()}
                    <InputNumber
                      aria-label={`Blueprint ${axis.toUpperCase()}`}
                      value={blueprint[axis]}
                      onChange={(v) => v !== null && onBlueprint({ ...blueprint, [axis]: v })}
                    />
                  </label>
                ))}
              </div>
              <label>
                ความกว้าง · px
                <InputNumber
                  aria-label="ความกว้าง blueprint"
                  value={Math.round(blueprint.width)}
                  min={1}
                  max={8192}
                  onChange={(v) =>
                    v !== null &&
                    onBlueprint({
                      ...blueprint,
                      width: v,
                      height: (v * blueprint.imageHeight) / blueprint.imageWidth,
                    })
                  }
                />
              </label>
              <p>ปรับขนาดตามอัตราส่วนเดิม · สูง {Math.round(blueprint.height)} px</p>
              <Button
                onClick={() =>
                  onBlueprint(
                    fitBlueprint(
                      blueprint,
                      document.width * document.tilewidth,
                      document.height * document.tileheight,
                    ),
                  )
                }
              >
                จัดภาพให้พอดีแมป
              </Button>
              <Button danger onClick={() => onBlueprint(undefined)}>
                นำ blueprint ออก
              </Button>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}
