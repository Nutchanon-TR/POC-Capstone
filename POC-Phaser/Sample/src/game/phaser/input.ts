import type { GameBridge } from '../bridge';
import type { Direction } from '../domain/world';

const directions: Record<string, Direction> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

/** Keyboard จำกัดที่ host ซึ่งต้อง focus ก่อน จึงไม่แย่งปุ่มจาก AntD */
export function attachInput(host: HTMLElement, bridge: GameBridge) {
  const keys = new Set<string>();
  const touch = new Set<Direction>();
  const clear = () => {
    keys.clear();
    touch.clear();
  };
  const down = (event: KeyboardEvent) => {
    if (directions[event.code]) {
      event.preventDefault();
      keys.add(event.code);
    }
    if (event.code === 'KeyE') {
      event.preventDefault();
      if (!event.repeat) bridge.dispatch({ type: 'interact' });
    }
  };
  const up = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };
  const focus = () => host.focus({ preventScroll: true });
  host.addEventListener('keydown', down);
  host.addEventListener('keyup', up);
  host.addEventListener('blur', clear);
  host.addEventListener('pointerdown', focus);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
  return {
    clear,
    setTouch(direction: Direction, pressed: boolean) {
      if (pressed) touch.add(direction);
      else touch.delete(direction);
    },
    sample() {
      const held = new Set([...keys].map((key) => directions[key]));
      touch.forEach((direction) => held.add(direction));
      return {
        x: Number(held.has('right')) - Number(held.has('left')),
        y: Number(held.has('down')) - Number(held.has('up')),
      };
    },
    dispose() {
      clear();
      host.removeEventListener('keydown', down);
      host.removeEventListener('keyup', up);
      host.removeEventListener('blur', clear);
      host.removeEventListener('pointerdown', focus);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    },
  };
}
