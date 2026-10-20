'use client';
/* eslint-disable @next/next/no-img-element */
import { Alert, Button, Input, InputNumber, Modal, Select, Switch, message } from 'antd';
import { useState } from 'react';
import { editorApi } from './api';
import { readImageFile } from './imageFile';
type ImageSource = Awaited<ReturnType<typeof readImageFile>>;
export function AssetUpload({
  onAdded,
  tileSize,
}: {
  onAdded: (key: string) => Promise<void>;
  tileSize: number;
}) {
  const [open, setOpen] = useState(false),
    [image, setImage] = useState<ImageSource>(),
    [name, setName] = useState(''),
    [family, setFamily] = useState<'Prop' | 'Layout' | 'Floor'>('Prop'),
    [width, setWidth] = useState(32),
    [depthY, setDepthY] = useState(0),
    [collision, setCollision] = useState<{ x: number; y: number; width: number; height: number }>(),
    [busy, setBusy] = useState(false),
    [toast, context] = message.useMessage();
  async function select(file: File) {
    setBusy(true);
    try {
      const source = await readImageFile(file, 2 * 1024 * 1024, ['image/png']);
      if (source.width > 2048 || source.height > 2048) throw Error('asset ต้องไม่เกิน 2048 × 2048');
      setImage(source);
      setWidth(source.width);
      setDepthY(source.height);
      setName(file.name.replace(/\.png$/i, ''));
      setCollision(undefined);
    } catch (error) {
      void toast.error(error instanceof Error ? error.message : 'เปิดภาพไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  async function add() {
    if (!image) return;
    setBusy(true);
    try {
      const added = await editorApi.uploadAsset({
        name,
        family,
        image: image.url,
        displayWidth: width,
        depthY,
        collision: collision ?? null,
      });
      await onAdded(added.key);
      setOpen(false);
      setImage(undefined);
      void toast.success('เพิ่ม asset ในคลังร่วมทุกแมปแล้ว คลิกบนแมปเพื่อวาง');
    } catch (error) {
      void toast.error(error instanceof Error ? error.message : 'เพิ่ม asset ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {context}
      <Button
        onClick={() => {
          setOpen(true);
          setFamily('Prop');
        }}
      >
        เพิ่ม asset PNG
      </Button>
      <Modal
        title="เพิ่มภาพลงในคลัง asset"
        open={open}
        onCancel={() => !busy && setOpen(false)}
        onOk={add}
        okText="เพิ่มเข้าในคลัง"
        cancelText="ยกเลิก"
        confirmLoading={busy}
        okButtonProps={{
          disabled: busy || !image || !name.trim(),
          'aria-label': 'เพิ่มเข้าในคลัง',
        }}
        width={600}
        style={{ top: 24 }}
        styles={{ body: { maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto', paddingRight: 8 } }}
      >
        <div className="studio-fields">
          <Alert
            type="info"
            title="PNG ไม่เกิน 2 MB ภาพไม่เกิน 2048 × 2048"
            description="เพิ่มครั้งเดียว ใช้ได้ทุกแมป ภาพจะถูกเก็บถาวรในโปรเจกต์และรวมใน ZIP เมื่อ export"
          />
          <input
            aria-label="ไฟล์ asset PNG"
            type="file"
            accept="image/png"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void select(file);
              e.target.value = '';
            }}
          />
          {image && (
            <>
              <div
                className="asset-upload-preview"
                style={{ width: Math.min(220, image.width, (240 * image.width) / image.height) }}
              >
                <img src={image.url} alt="ภาพ asset ที่นำเข้า" />
                {collision && (
                  <span
                    style={{
                      left: `${(collision.x / image.width) * 100}%`,
                      top: `${(collision.y / image.height) * 100}%`,
                      width: `${(collision.width / image.width) * 100}%`,
                      height: `${(collision.height / image.height) * 100}%`,
                    }}
                  />
                )}
              </div>
              <label>
                ชื่อ
                <Input
                  aria-label="ชื่อ asset ใหม่"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                ประเภท
                <Select
                  aria-label="ประเภท asset ใหม่"
                  value={family}
                  onChange={(value) => {
                    setFamily(value);
                    if (value === 'Floor') {
                      setWidth(tileSize);
                      setCollision(undefined);
                    }
                  }}
                  options={[
                    { value: 'Prop', label: 'สิ่งของ' },
                    { value: 'Layout', label: 'โครงสร้าง' },
                    { value: 'Floor', label: 'พื้นจัตุรัส · ตาม Tile size แมป' },
                  ]}
                />
              </label>
              <label>
                ความกว้างที่วางในแมป · px
                <InputNumber
                  aria-label="ความกว้าง asset ใหม่"
                  value={width}
                  min={1}
                  max={8192}
                  disabled={family === 'Floor'}
                  onChange={(v) => v !== null && setWidth(v)}
                />
              </label>
              <p>
                ภาพ {image.width} × {image.height} px → แสดง {width} ×{' '}
                {Math.round(((width * image.height) / image.width) * 100) / 100} px · รักษาอัตราส่วน
              </p>
              <label>
                แนวหน้าหลัง Y ในภาพต้นฉบับ
                <InputNumber
                  aria-label="แนวหน้าหลัง asset ใหม่"
                  value={depthY}
                  min={0}
                  max={image.height}
                  onChange={(v) => v !== null && setDepthY(v)}
                />
              </label>
              <label className="studio-inline">
                มีพื้นที่ชน
                <Switch
                  aria-label="พื้นที่ชน asset ใหม่"
                  checked={!!collision}
                  disabled={family === 'Floor'}
                  onChange={(enabled) =>
                    setCollision(
                      enabled
                        ? {
                            x: 0,
                            y: Math.floor(image.height * 0.8),
                            width: image.width,
                            height: image.height - Math.floor(image.height * 0.8),
                          }
                        : undefined,
                    )
                  }
                />
              </label>
              {collision && (
                <>
                  <p>กรอบสีแดงคือพื้นที่ชน พิกัดด้านล่างอ้างอิงภาพต้นฉบับ และย่อตามขนาดที่วาง</p>
                  <div className="coordinate-fields">
                    {(['x', 'y', 'width', 'height'] as const).map((axis) => (
                      <label key={axis}>
                        {axis}
                        <InputNumber
                          aria-label={`กรอบชน asset ${axis}`}
                          min={axis === 'width' || axis === 'height' ? 1 : 0}
                          value={collision[axis]}
                          onChange={(v) => v !== null && setCollision({ ...collision, [axis]: v })}
                        />
                      </label>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
