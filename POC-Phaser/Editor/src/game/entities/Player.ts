import Phaser from 'phaser';
import { characterConfig as config, characters, type CharacterId } from '../config';
import type { Direction } from '../types';
import type { AvatarPose } from '../../../shared/realtime/protocol';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private direction: Direction = 'down';
  characterId: CharacterId = 'kaguya';

  static preload(scene: Phaser.Scene) {
    for (const config of Object.values(characters))
      scene.load.spritesheet(config.key, config.texture, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
  }
  constructor(scene: Phaser.Scene, x: number, y: number, character: CharacterId = 'kaguya') {
    super(scene, x, y, config.key, config.animations.down.idle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setName('player')
      .setOrigin(config.origin.x, config.origin.y)
      .setScale(config.scale)
      .setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body)
      .setSize(config.body.width, config.body.height, false)
      .setOffset(config.body.offsetX, config.body.offsetY);
    for (const config of Object.values(characters))
      for (const [direction, frames] of Object.entries(config.animations)) {
        const key = `${config.key}:walk:${direction}`;
        if (!scene.anims.exists(key))
          scene.anims.create({
            key,
            frames: scene.anims.generateFrameNumbers(config.key, {
              start: frames.start,
              end: frames.end,
            }),
            frameRate: config.frameRate,
            repeat: -1,
          });
      }
    this.setCharacter(character);
  }
  setCharacter(id: CharacterId) {
    this.anims.stop();
    this.characterId = id;
    this.setTexture(characters[id].key, config.animations[this.direction].idle);
    this.move(0, 0);
  }
  move(x: number, y: number, speed: number = config.speed) {
    const velocity = new Phaser.Math.Vector2(x, y).normalize().scale(speed);
    this.setVelocity(velocity.x, velocity.y);
    if (x || y) {
      if (Math.abs(y) >= Math.abs(x)) this.direction = y < 0 ? 'up' : 'down';
      else this.direction = x < 0 ? 'left' : 'right';
      this.play(`${characters[this.characterId].key}:walk:${this.direction}`, true);
    } else {
      this.anims.stop();
      this.setFrame(config.animations[this.direction].idle);
    }
    this.setDepth(this.y);
  }
  resetTo(x: number, y: number) {
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.move(0, 0);
  }
  getPose(): AvatarPose {
    const velocity = (this.body as Phaser.Physics.Arcade.Body).velocity;
    return {
      x: this.x,
      y: this.y,
      character: this.characterId,
      direction: this.direction,
      moving: velocity.lengthSq() > 0,
    };
  }
}
