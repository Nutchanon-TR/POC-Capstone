import Phaser from 'phaser';
import type { Command, GameBridge } from '../bridge';
import type { Interaction, PlayerState, World } from '../domain/world';
import { playerFeet } from '../domain/world';
import { movePlayer } from '../domain/movement';
import { nearestComputer } from '../domain/interaction';
import { attachInput } from './input';
import { assets, walkRows } from './manifest';

/** Scene ประกอบโลกและวาดผลของ domain; กติกาเดิน/ระยะ E อยู่ใน domain */
export class WorldScene extends Phaser.Scene {
  private player: PlayerState;
  private avatar: Phaser.GameObjects.Sprite | null = null;
  private shadow: Phaser.GameObjects.Ellipse | null = null;
  private outline: Phaser.GameObjects.Graphics | null = null;
  private debugView: Phaser.GameObjects.Graphics | null = null;
  private nearby: Interaction | null = null;
  private active: Interaction | null = null;
  private debugEnabled = false;
  private paused = false;
  private lastPublish = 0;
  private inputController: ReturnType<typeof attachInput> | null = null;
  private highlightedId: number | null = null;

  constructor(
    private world: World,
    private bridge: GameBridge,
    private host: HTMLElement,
  ) {
    super('World');
    this.player = { ...world.spawn, facing: 'down', moving: false };
  }

  preload() {
    this.world.textures.forEach((texture) => this.load.image(texture.key, texture.url));
    this.load.spritesheet(assets.student.key, assets.student.url, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.bridge.publish({
        status: 'error',
        message: `โหลดภาพไม่สำเร็จ: ${file.key} ลองรีเฟรชหน้า`,
      });
    });
  }

  create() {
    if (this.bridge.getSnapshot().status === 'error') return;
    for (const floor of this.world.floors) {
      this.add.image(floor.x, floor.y, floor.textureKey).setOrigin(0).setDepth(-1000);
    }
    for (const object of this.world.objects) {
      this.add
        .image(object.x, object.y, object.textureKey)
        .setOrigin(0)
        .setDisplaySize(object.width, object.height)
        .setDepth(object.depth)
        .setName(`object:${object.id}`);
    }
    for (const [direction, row] of Object.entries(walkRows)) {
      this.anims.create({
        key: `walk-${direction}`,
        frames: this.anims.generateFrameNumbers(assets.student.key, {
          start: row * 4,
          end: row * 4 + 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    this.shadow = this.add.ellipse(this.player.x, this.player.y - 2, 25, 9, 0x143c3d, 0.2);
    // feet = (32,62) ในเฟรม 64px ตรงกับจุด player ใน domain
    this.avatar = this.add
      .sprite(this.player.x, this.player.y, assets.student.key)
      .setOrigin(0.5, 62 / 64);
    this.outline = this.add.graphics().setDepth(10000);
    this.debugView = this.add.graphics().setDepth(10001);
    this.inputController = attachInput(this.host, this.bridge);
    const disconnect = this.bridge.connect((command) => this.handleCommand(command));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      disconnect();
      this.inputController?.dispose();
      this.scale.off('resize', this.fitCamera, this);
    });
    this.scale.on('resize', this.fitCamera, this);
    this.fitCamera();
    this.renderPlayer();
    this.publish();
    if (!this.paused) this.host.focus({ preventScroll: true });
  }

  private fitCamera() {
    const camera = this.cameras.main;
    const zoom = Math.min(
      this.scale.width / this.world.width,
      this.scale.height / this.world.height,
    );
    camera.setZoom(zoom).centerOn(this.world.width / 2, this.world.height / 2);
    camera.setBackgroundColor('#dbece7');
  }

  private handleCommand(command: Command) {
    switch (command.type) {
      case 'direction':
        this.inputController?.setTouch(command.direction, command.pressed);
        break;
      case 'interact':
        if (!this.paused && !this.active) {
          this.nearby = nearestComputer(this.player, this.world.interactions);
          this.active = this.nearby;
          if (this.active) {
            this.inputController?.clear();
            this.player = { ...this.player, moving: false };
          }
        }
        break;
      case 'close-interaction':
        this.active = null;
        this.inputController?.clear();
        break;
      case 'reset':
        this.player = { ...this.world.spawn, facing: 'down', moving: false };
        this.active = null;
        this.inputController?.clear();
        this.renderPlayer();
        break;
      case 'debug':
        this.debugEnabled = command.enabled;
        break;
      case 'pause':
        this.paused = command.paused;
        this.inputController?.clear();
        break;
      default: {
        const exhaustive: never = command;
        return exhaustive;
      }
    }
    this.nearby = nearestComputer(this.player, this.world.interactions);
    this.publish();
  }

  update(time: number, delta: number) {
    if (!this.avatar || this.bridge.getSnapshot().status === 'error') return;
    const previousTarget = this.nearby?.id;
    const previousMoving = this.player.moving;
    const blocked = this.paused || this.active !== null || document.hidden;
    this.player = blocked
      ? { ...this.player, moving: false }
      : movePlayer(
          this.player,
          this.inputController?.sample() ?? { x: 0, y: 0 },
          delta / 1000,
          this.world,
        );
    this.nearby = nearestComputer(this.player, this.world.interactions);
    this.renderPlayer();
    this.renderOverlays();
    // UI ไม่ต้อง render ทุก frame; ส่งตำแหน่งสูงสุด 10 ครั้ง/วินาที
    if (
      time - this.lastPublish >= 100 ||
      previousTarget !== this.nearby?.id ||
      previousMoving !== this.player.moving
    ) {
      this.lastPublish = time;
      this.publish();
    }
  }

  private renderPlayer() {
    if (!this.avatar) return;
    this.avatar.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
    this.shadow?.setPosition(this.player.x, this.player.y - 2).setDepth(this.player.y - 1);
    if (this.player.moving) this.avatar.play(`walk-${this.player.facing}`, true);
    else {
      this.avatar.anims.stop();
      this.avatar.setFrame(walkRows[this.player.facing] * 4);
    }
  }

  private renderOverlays() {
    if (this.highlightedId !== (this.nearby?.id ?? null)) {
      this.highlightedId = this.nearby?.id ?? null;
      this.outline?.clear();
      if (this.nearby)
        this.outline
          ?.lineStyle(2, 0x117e71)
          .strokeRoundedRect(
            this.nearby.x - 4,
            this.nearby.y - 4,
            this.nearby.width + 8,
            this.nearby.height + 8,
            4,
          );
    }
    this.debugView?.clear();
    if (this.debugEnabled && this.debugView) {
      this.debugView.lineStyle(1, 0xd74d63, 0.85);
      for (const collider of this.world.colliders)
        this.debugView.strokeRect(collider.x, collider.y, collider.width, collider.height);
      this.debugView.lineStyle(1, 0x237ee0, 1);
      const feet = playerFeet(this.player);
      this.debugView.strokeRect(feet.x, feet.y, feet.width, feet.height);
      for (const target of this.world.interactions.filter((target) => target.kind === 'computer')) {
        this.debugView
          .lineStyle(1, 0x117e71, 0.8)
          .strokeRect(target.x, target.y, target.width, target.height);
      }
    }
  }

  private publish() {
    const snapshot = {
      status: 'ready',
      player: this.player,
      nearby: this.nearby,
      active: this.active,
      debug: this.debugEnabled,
      paused: this.paused,
      computerCount: this.world.interactions.filter((target) => target.kind === 'computer').length,
      colliderCount: this.world.colliders.length,
    } satisfies import('../bridge').Snapshot;
    this.bridge.publish(snapshot);
    // Read-only diagnostics สำหรับ browser test และ DevTools ไม่มีช่อง teleport
    this.host.dataset.gameState = JSON.stringify(snapshot);
  }
}
