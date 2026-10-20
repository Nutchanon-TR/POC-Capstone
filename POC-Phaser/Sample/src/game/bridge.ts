import type { Direction, Interaction, PlayerState } from './domain/world';

export type Snapshot =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      player: PlayerState;
      nearby: Interaction | null;
      active: Interaction | null;
      debug: boolean;
      paused: boolean;
      computerCount: number;
      colliderCount: number;
    };

export type Command =
  | { type: 'interact' }
  | { type: 'close-interaction' }
  | { type: 'reset' }
  | { type: 'debug'; enabled: boolean }
  | { type: 'pause'; paused: boolean }
  | { type: 'direction'; direction: Direction; pressed: boolean };

/** หนึ่ง bridge ต่อหนึ่งเกม ห้ามสร้าง singleton ที่ระดับ module */
export function createGameBridge() {
  let snapshot: Snapshot = { status: 'loading' };
  const listeners = new Set<() => void>();
  let receive: ((command: Command) => void) | null = null;
  const pending = new Map<Command['type'], Command>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(next: Snapshot) {
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
    dispatch(command: Command) {
      if (receive) receive(command);
      // จำการเปิดคู่มือ/debug ระหว่างโหลด แต่ไม่ค้างปุ่มเดินหรือ E ไว้
      else if (command.type === 'pause' || command.type === 'debug')
        pending.set(command.type, command);
    },
    connect(handler: (command: Command) => void) {
      receive = handler;
      pending.forEach(handler);
      pending.clear();
      return () => {
        if (receive === handler) receive = null;
      };
    },
  };
}

export type GameBridge = ReturnType<typeof createGameBridge>;
