import Phaser from 'phaser';
import type { HallPeer } from '../../../shared/realtime/protocol';
import { characters, characterConfig, gameConfig } from '../config';
export class RemotePlayer extends Phaser.GameObjects.Sprite {
  private target: HallPeer;
  private lastUpdate = 0;
  private label: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, peer: HallPeer) {
    super(scene, peer.x, peer.y, characters[peer.character].key);
    this.target = peer;
    scene.add.existing(this);
    this.setName(`peer:${peer.id}`)
      .setOrigin(characterConfig.origin.x, characterConfig.origin.y)
      .setScale(characterConfig.scale);
    this.label = scene.add
      .text(peer.x, peer.y - gameConfig.multiplayer.nameOffsetY, peer.name, {
        fontFamily: 'Tahoma',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#29465d',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5);
    this.once('destroy', () => this.label.destroy());
    this.receive(peer);
  }
  receive(peer: HallPeer) {
    if (peer.character !== this.target.character) this.setTexture(characters[peer.character].key);
    this.target = peer;
    this.lastUpdate = performance.now();
    if (peer.moving) this.play(`${characters[peer.character].key}:walk:${peer.direction}`, true);
    else {
      this.anims.stop();
      this.setFrame(characterConfig.animations[peer.direction].idle);
    }
  }
  speaking(active: boolean) {
    this.label
      .setText(`${active ? '● ' : ''}${this.target.name}`)
      .setBackgroundColor(active ? '#167c80' : '#29465d');
  }
  step(delta: number) {
    const alpha = 1 - Math.exp(-delta / gameConfig.multiplayer.interpolationMs);
    this.setPosition(
      Phaser.Math.Linear(this.x, this.target.x, alpha),
      Phaser.Math.Linear(this.y, this.target.y, alpha),
    ).setDepth(this.y);
    this.label
      .setPosition(this.x, this.y - gameConfig.multiplayer.nameOffsetY)
      .setDepth(this.y + 1);
    if (performance.now() - this.lastUpdate > gameConfig.multiplayer.staleAnimationMs) {
      this.anims.stop();
      this.setFrame(characterConfig.animations[this.target.direction].idle);
    }
  }
}
