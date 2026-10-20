import { Button, Segmented, Tooltip } from 'antd';
import { gameConfig } from '@/game/config';
import type { GameBridge } from '@/game/GameBridge';
import type { GameStatus, ViewMode } from '@/game/types';

export function MapToolbar({
  bridge,
  status,
  focusGame,
}: {
  bridge: GameBridge;
  status: GameStatus;
  focusGame: () => void;
}) {
  const ready = status.phase === 'ready';
  return (
    <div className="map-toolbar" aria-label="ควบคุมแผนที่">
      <Segmented
        aria-label="มุมมองแผนที่"
        value={status.view}
        options={[
          { label: 'ติดตามตัวละคร', value: 'follow' },
          { label: 'ดูทั้งห้อง', value: 'overview' },
        ]}
        disabled={!ready}
        onChange={(value) => {
          bridge.send({ type: 'view', mode: value as ViewMode });
          focusGame();
        }}
      />
      <div className="zoom-controls">
        <Tooltip title="ย่อ">
          <Button
            aria-label="ย่อแผนที่"
            disabled={
              !ready || (status.view === 'follow' && status.zoom <= gameConfig.camera.minZoom)
            }
            onClick={() => {
              bridge.send({ type: 'zoom', delta: -gameConfig.camera.step });
              focusGame();
            }}
          >
            −
          </Button>
        </Tooltip>
        <output aria-label="ระดับซูม">{Math.round(status.zoom * 100)}%</output>
        <Tooltip title="ขยาย">
          <Button
            aria-label="ขยายแผนที่"
            disabled={
              !ready || (status.view === 'follow' && status.zoom >= gameConfig.camera.maxZoom)
            }
            onClick={() => {
              bridge.send({ type: 'zoom', delta: gameConfig.camera.step });
              focusGame();
            }}
          >
            +
          </Button>
        </Tooltip>
      </div>
      <Button
        disabled={!ready}
        onClick={() => {
          bridge.send({ type: 'reset' });
          focusGame();
        }}
        aria-label="กลับจุดเริ่มต้น"
      >
        ↶ <span className="reset-label">จุดเริ่มต้น</span>
      </Button>
    </div>
  );
}
