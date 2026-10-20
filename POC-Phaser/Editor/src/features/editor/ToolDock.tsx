import type { EditorTool } from './EditorScene';
import { PixelIcon } from './PixelIcon';
import { Dropdown } from 'antd';

type RegionTool = 'zone' | 'collider' | 'interact';
const regionNames = { zone: 'พื้นที่', collider: 'กรอบชน', interact: 'กรอบ Interact' };

const tools: { value: EditorTool; label: string }[] = [
  { value: 'select', label: 'เลือก / ย้าย' },
  { value: 'place', label: 'วาง asset' },
  { value: 'paint', label: 'ระบายพื้น' },
  { value: 'spawn', label: 'จุดเกิด' },
  { value: 'collider', label: 'กรอบชน' },
  { value: 'zone', label: 'พื้นที่' },
  { value: 'interact', label: 'แก้ไข Interact' },
  { value: 'erase-layout', label: 'ลบ Layout / Prop' },
];

export function ToolDock({
  tool,
  onTool,
  deleteRegionMode,
  onRegionAction,
  canPlace,
  canPaint,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: EditorTool;
  onTool: (tool: EditorTool) => void;
  deleteRegionMode: boolean;
  onRegionAction: (tool: RegionTool, action: 'select' | 'delete') => void;
  canPlace: boolean;
  canPaint: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="tool-dock" role="toolbar" aria-label="เครื่องมือแก้ไขแมป">
      <div className="dock-tools">
        {tools.map(({ value, label }) => (
          <div key={value} className="dock-tool">
            <button
              type="button"
              className="dock-button"
              aria-label={label}
              aria-pressed={tool === value}
              data-delete-mode={tool === value && deleteRegionMode && value in regionNames}
              disabled={(value === 'place' && !canPlace) || (value === 'paint' && !canPaint)}
              onClick={() => onTool(value)}
            >
              <PixelIcon name={value} />
              <span className="dock-tooltip" role="tooltip">
                {label}
              </span>
            </button>
            {(value === 'zone' || value === 'collider' || value === 'interact') && (
              <Dropdown
                trigger={['click']}
                placement="top"
                menu={{
                  selectable: true,
                  selectedKeys: tool === value ? [deleteRegionMode ? 'delete' : 'select'] : [],
                  items: [
                    { key: 'select', label: `เลือก / แก้ไข${regionNames[value]}` },
                    {
                      key: 'delete',
                      label: `ลบ${regionNames[value]}${value === 'interact' ? ' · เก็บภาพไว้' : ''}`,
                      danger: true,
                    },
                  ],
                  onClick: ({ key }) =>
                    onRegionAction(value, key === 'delete' ? 'delete' : 'select'),
                }}
              >
                <button
                  type="button"
                  className="dock-tool-menu"
                  aria-label={`เมนู${regionNames[value]}`}
                >
                  <span aria-hidden="true">▾</span>
                </button>
              </Dropdown>
            )}
          </div>
        ))}
      </div>
      <div className="dock-history">
        <button
          type="button"
          className="dock-button"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <PixelIcon name="undo" />
          <span className="dock-tooltip" role="tooltip">
            ย้อนกลับ · Ctrl+Z / Ctrl+ผ
          </span>
        </button>
        <button
          type="button"
          className="dock-button"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <PixelIcon name="redo" />
          <span className="dock-tooltip" role="tooltip">
            ทำซ้ำ · Ctrl+Shift+Z
          </span>
        </button>
      </div>
    </div>
  );
}
