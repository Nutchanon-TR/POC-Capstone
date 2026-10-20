'use client';
import { Button, Modal, Select } from 'antd';
import { characters, type CharacterId } from '@/game/config';
import type { GameBridge } from '@/game/GameBridge';
import type { GameStatus } from '@/game/types';
export function CharacterControls({
  bridge,
  status,
  focusGame,
}: {
  bridge: GameBridge;
  status: GameStatus;
  focusGame: () => void;
}) {
  const close = () => {
    bridge.send({ type: 'close-dialogue' });
    focusGame();
  };
  return (
    <>
      <div className="character-controls">
        <label>
          ตัวละคร
          <Select
            aria-label="เลือกตัวละคร"
            value={status.character || 'kaguya'}
            disabled={status.phase !== 'ready'}
            options={Object.entries(characters).map(([value, c]) => ({ value, label: c.name }))}
            onChange={(id: CharacterId) => {
              bridge.send({ type: 'character', id });
              focusGame();
            }}
          />
        </label>
        {status.nearbyNpc && !status.dialogue && (
          <Button type="primary" onClick={() => bridge.send({ type: 'interact' })}>
            พูดคุย · E
          </Button>
        )}
      </div>
      <Modal
        title={status.dialogue?.title}
        open={!!status.dialogue}
        onCancel={close}
        footer={
          <Button type="primary" onClick={close}>
            กลับไปสำรวจ
          </Button>
        }
        afterClose={focusGame}
      >
        <p className="dialogue-speaker">InternWitch · ผู้ดูแลบูธ</p>
        <p className="dialogue-content">{status.dialogue?.dialogue}</p>
        <p className="dialogue-booth">บูธ: {status.dialogue?.boothId}</p>
      </Modal>
    </>
  );
}
