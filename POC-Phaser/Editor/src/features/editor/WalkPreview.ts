import Phaser from 'phaser';
import type { Direction, WorldData } from '@/game/types';
import { canWalk, moveWalker, walkSpawn, type WalkPosition } from '../../../shared/map/walk';
import { isEditingTarget } from './shortcuts';

const texture = 'editor-student02';
const keys: Record<string, Direction> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};
export class WalkPreview {
  private sprite?: Phaser.GameObjects.Sprite;
  private shadow?: Phaser.GameObjects.Ellipse;
  private position?: WalkPosition;
  private direction: Direction = 'down';
  private keyboard = new Set<string>();
  private touch = new Set<Direction>();
  private telemetryAt = 0;
  private moving = false;
  static preload(scene: Phaser.Scene) {
    scene.load.atlas(
      texture,
      '/editor/characters/student02/Student02.png',
      '/editor/characters/student02/atlas.json',
    );
  }
  constructor(
    private scene: Phaser.Scene,
    private onError: (message: string) => void,
  ) {}
  sync(world: WorldData) {
    if (this.position && canWalk(world, this.position)) return;
    this.position = walkSpawn(world);
    if (!this.position) {
      this.sprite?.setVisible(false);
      this.shadow?.setVisible(false);
      this.release();
      this.onError('ไม่มีพื้นที่ว่างให้ตัวละครยืน ลองปรับกรอบชนก่อนทดลองเดิน');
      return;
    }
    if (!this.sprite) {
      for (const direction of ['up', 'down', 'left', 'right']) {
        const key = `${texture}:walk:${direction}`;
        if (!this.scene.anims.exists(key))
          this.scene.anims.create({
            key,
            frames: Array.from({ length: 4 }, (_, i) => ({
              key: texture,
              frame: `${direction}-${i}`,
            })),
            frameRate: 7,
            repeat: -1,
          });
      }
      this.shadow = this.scene.add.ellipse(
        this.position.x,
        this.position.y - 2,
        22,
        7,
        0x302414,
        0.28,
      );
      this.sprite = this.scene.add
        .sprite(this.position.x, this.position.y, texture, 'down-0')
        .setName('editor-walk-preview')
        .setOrigin(0.5, 1);
      this.sprite.setScale(56 / this.sprite.height);
      this.focus(world);
    }
    this.sprite.setVisible(true);
    this.shadow?.setVisible(true);
    this.draw();
    this.publish();
  }
  key(code: string, pressed: boolean) {
    if (!keys[code]) return false;
    if (pressed) this.keyboard.add(code);
    else this.keyboard.delete(code);
    return true;
  }
  focus(world: WorldData) {
    if (!this.sprite) return;
    this.scene.cameras.main
      .setBounds(0, 0, world.width, world.height)
      .setZoom(1)
      .startFollow(this.sprite, true, 0.15, 0.15, 0, 24);
  }
  press(direction: Direction, pressed: boolean) {
    if (pressed) this.touch.add(direction);
    else this.touch.delete(direction);
  }
  release() {
    this.keyboard.clear();
    this.touch.clear();
  }
  update(world: WorldData, time: number, delta: number) {
    if (!this.position || !this.sprite) return;
    if (isEditingTarget(document.activeElement) || document.hidden) this.release();
    const held = new Set([...this.keyboard].map((code) => keys[code]).concat([...this.touch]));
    const axis = {
      x: Number(held.has('right')) - Number(held.has('left')),
      y: Number(held.has('down')) - Number(held.has('up')),
    };
    const next = moveWalker(world, this.position, axis, delta);
    this.moving = next.x !== this.position.x || next.y !== this.position.y;
    if (axis.x || axis.y)
      this.direction =
        Math.abs(axis.y) >= Math.abs(axis.x)
          ? axis.y < 0
            ? 'up'
            : 'down'
          : axis.x < 0
            ? 'left'
            : 'right';
    this.position = next;
    if (this.moving) this.sprite.play(`${texture}:walk:${this.direction}`, true);
    else {
      this.sprite.anims.stop();
      this.sprite.setFrame(`${this.direction}-0`);
    }
    this.draw();
    if (time >= this.telemetryAt) {
      this.publish();
      this.telemetryAt = time + 100;
    }
  }
  private draw() {
    if (!this.position) return;
    this.sprite?.setPosition(this.position.x, this.position.y).setDepth(this.position.y);
    this.shadow?.setPosition(this.position.x, this.position.y - 2).setDepth(this.position.y - 0.01);
  }
  private publish() {
    this.scene.game.canvas.dataset.walkPreview = JSON.stringify({
      ...this.position,
      direction: this.direction,
      moving: this.moving,
      frame: this.sprite?.frame.name,
    });
  }
  destroy() {
    this.scene.cameras.main.stopFollow().removeBounds();
    this.release();
    this.sprite?.destroy();
    this.shadow?.destroy();
    delete this.scene.game.canvas.dataset.walkPreview;
  }
}
