'use client';
import { Button, Input, InputNumber, Select, Switch } from 'antd';
import { useState } from 'react';
import type { Catalog, MapDocument, Property } from '../../../shared/map/types';
import { findNode, type Placement } from '../../../shared/map/editor';
import { renderOrderState, type RenderOrderAction } from '../../../shared/map/order';
import type { WorldData } from '@/game/types';
export function PropertiesPanel({
  step,
  document,
  catalog,
  items,
  selection,
  onSelect,
  onMove,
  onRename,
  onRemove,
  onNpc,
  onSize,
  onRestoreSize,
  onProperty,
  objects,
  onOrder,
  onRestoreOrder,
  onEditBooth,
}: {
  step: number;
  document: MapDocument;
  catalog: Catalog;
  items: Placement[];
  selection?: string;
  onSelect: (key: string) => void;
  onMove: (key: string, x: number, y: number) => void;
  onRename: (name: string) => boolean;
  onRemove: () => void;
  onNpc: (name: string, value: string) => void;
  onSize: (axis: 'width' | 'height', value: number, preserveRatio: boolean) => void;
  onRestoreSize: () => void;
  onProperty: (name: string, value: Property['value']) => void;
  objects: WorldData['objects'];
  onOrder: (action: RenderOrderAction) => void;
  onRestoreOrder: () => void;
  onEditBooth: () => void;
}) {
  const [preserveRatio, setPreserveRatio] = useState(true);
  const item = items.find((p) => p.key === selection),
    node = item ? findNode(document, item.key) : undefined;
  const tile = node && 'gid' in node ? catalog.tiles.find((t) => t.gid === node.gid) : undefined;
  const order = renderOrderState(objects, item);
  const manualOrder = !!item?.objectIds.some(
    (id) =>
      objects.some((o) => o.id === id && !o.ground) &&
      findNode(document, `object:${id}`)?.properties?.some((p) => p.name === 'renderDepth'),
  );
  return (
    <aside className="properties-panel">
      <div className="panel-heading">
        <h2>รายละเอียดชิ้นส่วน</h2>
      </div>
      <label>
        เลือกวัตถุในแมป
        <Select
          showSearch
          optionFilterProp="label"
          aria-label="เลือกวัตถุในแมป"
          value={selection}
          placeholder="คลิกวัตถุบนแมป"
          onChange={onSelect}
          options={items.map((p) => ({ value: p.key, label: p.name }))}
        />
      </label>
      {item && node ? (
        <div className="property-fields" key={item.key}>
          <NameEditor key={`${item.key}:${item.name}`} name={item.name} onConfirm={onRename} />
          {item.kind === 'booth' && (
            <Button type="primary" onClick={onEditBooth}>
              แก้ไขบูธนี้
            </Button>
          )}
          <span className="selection-kind">
            {item.kind === 'booth'
              ? 'กลุ่มบูธ · ภาพและ collision ย้ายพร้อมกัน'
              : item.kind === 'npc'
                ? 'ผู้ดูแลบูธ · จุดเริ่มเดิน'
                : 'ตำแหน่งบนแมป'}
          </span>
          {order && (
            <section
              className="render-order-controls"
              aria-label="ลำดับการซ้อนภาพ"
              onKeyDown={(event) => {
                if (event.code === 'Space') event.stopPropagation();
              }}
            >
              <div className="render-order-heading">
                <strong>ลำดับการซ้อนภาพ</strong>
                <span>
                  {order.count === 1
                    ? `${order.first} / ${order.total}`
                    : `${order.count} ชิ้นในกลุ่ม`}
                </span>
              </div>
              <div className="render-order-buttons">
                <Button disabled={!order.front} onClick={() => onOrder('front')}>
                  หน้าสุด
                </Button>
                <Button disabled={!order.back} onClick={() => onOrder('back')}>
                  หลังสุด
                </Button>
                <Button disabled={!order.forward} onClick={() => onOrder('forward')}>
                  ขึ้น 1 ระดับ
                </Button>
                <Button disabled={!order.backward} onClick={() => onOrder('backward')}>
                  ลง 1 ระดับ
                </Button>
              </div>
              <p className="studio-note">วัตถุที่ถูกบังเลือกได้จากรายการด้านบน · Ctrl+Z ย้อนกลับ</p>
              {manualOrder && <Button onClick={onRestoreOrder}>เรียงตามตำแหน่งอัตโนมัติ</Button>}
            </section>
          )}
          {item.kind !== 'booth' && (
            <div className="coordinate-fields">
              <label>
                X
                <InputNumber
                  aria-label="ตำแหน่ง X"
                  step={step}
                  value={Math.round(item.x * 100) / 100}
                  onChange={(v) => {
                    if (v !== null) onMove(item.key, v, item.y);
                  }}
                />
              </label>
              <label>
                Y
                <InputNumber
                  aria-label="ตำแหน่ง Y"
                  step={step}
                  value={Math.round(item.y * 100) / 100}
                  onChange={(v) => {
                    if (v !== null) onMove(item.key, item.x, v);
                  }}
                />
              </label>
            </div>
          )}
          {(item.kind === 'object' || item.kind === 'collider' || item.kind === 'zone') && (
            <div className="coordinate-fields">
              {(['width', 'height'] as const).map((axis) => (
                <label key={axis}>
                  {axis === 'width' ? 'กว้าง' : 'สูง'}
                  <InputNumber
                    aria-label={axis === 'width' ? 'ความกว้างวัตถุ' : 'ความสูงวัตถุ'}
                    min={1}
                    value={Math.round((node[axis] || 0) * 100) / 100}
                    onChange={(value) => {
                      if (value !== null)
                        onSize(axis, value, item.kind === 'object' && preserveRatio);
                    }}
                  />
                </label>
              ))}
            </div>
          )}
          {item.kind === 'object' && tile && (
            <>
              <label className="studio-inline">
                ล็อกสัดส่วน
                <Switch
                  aria-label="ล็อกสัดส่วนวัตถุ"
                  checked={preserveRatio}
                  onChange={setPreserveRatio}
                />
              </label>
              <Button onClick={onRestoreSize}>คืนขนาดมาตรฐาน</Button>
              <section className="interaction-settings">
                <label className="studio-inline">
                  Interact · กรอบสีเหลือง
                  <Switch
                    aria-label="เปิด Interact"
                    checked={
                      (node.properties?.find((p) => p.name === 'interactEnabled')
                        ?.value as boolean) ?? !!tile.meta.interactable
                    }
                    onChange={(enabled) => onProperty('interactEnabled', enabled)}
                  />
                </label>
                {(node.properties?.find((p) => p.name === 'interactEnabled')?.value ??
                  tile.meta.interactable) === true && (
                  <>
                    <label>
                      ประเภท Interact
                      <Select
                        aria-label="ประเภท Interact"
                        value={String(
                          node.properties?.find((p) => p.name === 'interactKind')?.value ??
                            tile.properties.find((p) => p.name === 'interactKind')?.value ??
                            'custom',
                        )}
                        options={['board', 'computer', 'document', 'chair', 'sofa', 'custom'].map(
                          (value) => ({ value, label: value }),
                        )}
                        onChange={(value) => onProperty('interactKind', value)}
                      />
                    </label>
                    <ActionEditor
                      key={`${item.key}:${node.properties?.find((p) => p.name === 'interactAction')?.value ?? tile.properties.find((p) => p.name === 'interactAction')?.value ?? ''}`}
                      value={String(
                        node.properties?.find((p) => p.name === 'interactAction')?.value ??
                          tile.properties.find((p) => p.name === 'interactAction')?.value ??
                          '',
                      )}
                      onConfirm={(value) => onProperty('interactAction', value)}
                    />
                    <div className="coordinate-fields">
                      {(['interactX', 'interactY', 'interactWidth', 'interactHeight'] as const).map(
                        (name, index) => (
                          <label key={name}>
                            {['กรอบ X', 'กรอบ Y', 'กรอบกว้าง', 'กรอบสูง'][index]}
                            <InputNumber
                              aria-label={
                                [
                                  'กรอบ Interact X',
                                  'กรอบ Interact Y',
                                  'ความกว้าง Interact',
                                  'ความสูง Interact',
                                ][index]
                              }
                              min={index > 1 ? 1 : undefined}
                              value={Number(
                                node.properties?.find((p) => p.name === name)?.value ??
                                  tile.properties.find((p) => p.name === name)?.value ??
                                  (index === 2
                                    ? tile.imagewidth
                                    : index === 3
                                      ? tile.imageheight
                                      : 0),
                              )}
                              onChange={(value) => value !== null && onProperty(name, value)}
                            />
                          </label>
                        ),
                      )}
                    </div>
                    <p className="studio-note">
                      กรอบใช้พิกเซลในภาพต้นฉบับ ย้ายและย่อตาม asset · Action key
                      เป็นข้อมูลสำหรับโปรเจกต์ที่นำแมปไปใช้
                    </p>
                    <Button danger onClick={() => onProperty('interactEnabled', false)}>
                      ลบกรอบ Interact · เก็บภาพไว้
                    </Button>
                  </>
                )}
              </section>
              <label className="studio-inline">
                เปิดพื้นที่ชน
                <Switch
                  aria-label="เปิดพื้นที่ชนวัตถุ"
                  disabled={!tile.objectgroup?.objects.length}
                  checked={
                    !!tile.objectgroup?.objects.length &&
                    node.properties?.find((p) => p.name === 'collisionEnabled')?.value !== false
                  }
                  onChange={(enabled) => onProperty('collisionEnabled', enabled)}
                />
              </label>
              <label>
                แนวหน้าหลัง Y ในภาพ
                <InputNumber
                  aria-label="แนวหน้าหลังวัตถุ"
                  disabled={manualOrder}
                  min={0}
                  max={tile.imageheight}
                  value={Number(
                    node.properties?.find((p) => p.name === 'depthY')?.value ?? tile.meta.depthY,
                  )}
                  onChange={(value) => value !== null && onProperty('depthY', value)}
                />
              </label>
              <p className="studio-note">
                ตำแหน่งใช้มุมซ้ายบน กรอบชนและแนวหน้าหลังย่อตามขนาดภาพที่วาง
              </p>
            </>
          )}
          {item.kind === 'npc' &&
            ['title', 'dialogue'].map((name) => (
              <label key={name}>
                {name === 'title' ? 'ชื่อบูธสำหรับสนทนา' : 'บทสนทนา'}
                <Input.TextArea
                  key={`${name}:${node.properties?.find((p) => p.name === name)?.value}`}
                  rows={name === 'dialogue' ? 5 : 2}
                  defaultValue={String(node.properties?.find((p) => p.name === name)?.value || '')}
                  onBlur={(e) => onNpc(name, e.target.value)}
                />
              </label>
            ))}
          <Button danger disabled={item.kind === 'spawn'} onClick={onRemove}>
            ลบชิ้นส่วนที่เลือก
          </Button>
        </div>
      ) : (
        <div className="inspector-empty">
          <span>⌖</span>
          <h3>เลือกสิ่งที่อยากปรับ</h3>
          <p>
            คลิกบนแมปเพื่อเลือก
            <br />
            ลากเพื่อย้าย หรือใส่ตำแหน่งที่นี่
          </p>
        </div>
      )}
      <div className="editor-instructions">
        <strong>ควบคุมพื้นที่ทำงาน</strong>
        <p>
          Space ค้าง + ลาก หรือคลิกขวาลากเพื่อเลื่อนแมป
          <br />
          หมุนล้อเมาส์เพื่อซูม
          <br />
          Ctrl+Z ย้อนกลับ · Ctrl+Shift+Z / Ctrl+Y ทำซ้ำ
          <br />
          Esc ยกเลิกการลาก · ประวัติ 50 การแก้ไขล่าสุด
        </p>
        <strong>การแก้ไขใน Tiled</strong>
        <p>
          ดาวน์โหลด ZIP แล้วเปิด map.tmj
          <br />
          ภาพที่เพิ่มในคลังรวมอยู่ใน ZIP ด้วย
        </p>
      </div>
    </aside>
  );
}

function NameEditor({ name, onConfirm }: { name: string; onConfirm: (name: string) => boolean }) {
  const [draft, setDraft] = useState(name);
  const valid = !!draft.trim() && draft.trim() !== name;
  const confirm = () => {
    if (valid) onConfirm(draft.trim());
  };
  return (
    <div className="name-editor">
      <label>
        ชื่อ
        <Input
          aria-label="ชื่อวัตถุ"
          value={draft}
          maxLength={120}
          onChange={(event) => setDraft(event.target.value)}
          onPressEnter={confirm}
        />
      </label>
      <Button disabled={!valid} onClick={confirm}>
        ยืนยันชื่อ
      </Button>
    </div>
  );
}

function ActionEditor({ value, onConfirm }: { value: string; onConfirm: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="name-editor">
      <label>
        Action key
        <Input
          aria-label="Action key"
          value={draft}
          placeholder="เช่น open-document หรือ sit"
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={() => onConfirm(draft.trim())}
        />
      </label>
      <Button disabled={draft.trim() === value} onClick={() => onConfirm(draft.trim())}>
        ยืนยัน Action
      </Button>
    </div>
  );
}
