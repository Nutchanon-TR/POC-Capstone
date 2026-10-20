import Phaser from 'phaser';
import type { Direction } from '../types';

export class MovementInput {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private touch = new Set<Direction>();
  constructor(private scene: Phaser.Scene) {
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
  }
  setDirection(direction: Direction, pressed: boolean) {
    if (pressed) this.touch.add(direction);
    else this.touch.delete(direction);
  }
  release() {
    this.touch.clear();
    Object.values(this.keys).forEach((key) => key.reset());
  }
  read() {
    const focused = document.activeElement === this.scene.game.canvas;
    const down = (direction: Direction, ...keys: string[]) =>
      this.touch.has(direction) || (focused && keys.some((key) => this.keys[key].isDown));
    return {
      x: Number(down('right', 'D', 'RIGHT')) - Number(down('left', 'A', 'LEFT')),
      y: Number(down('down', 'S', 'DOWN')) - Number(down('up', 'W', 'UP')),
    };
  }
  destroy() {
    this.release();
    Object.values(this.keys).forEach((key) => this.scene.input.keyboard?.removeKey(key));
  }
}
