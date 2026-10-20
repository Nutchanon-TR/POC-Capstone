import Phaser from 'phaser';
import { Player } from './Player';
import type { NpcData } from '../types';
export class BoothNpc extends Player {
  private target = 1;
  private idleUntil = 0;
  private label: Phaser.GameObjects.Text;
  constructor(
    scene: Phaser.Scene,
    readonly dataSource: NpcData,
  ) {
    super(scene, dataSource.x, dataSource.y, dataSource.character);
    this.setName('booth-npc').setPushable(false);
    this.label = scene.add
      .text(this.x, this.y - 95, 'คุยกับ InternWitch · E', {
        fontFamily: 'Tahoma',
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#152c43',
        padding: { x: 9, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100000);
    this.once('destroy', () => this.label.destroy());
  }
  patrol(time: number, talking: boolean) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const destination = this.dataSource.x + this.target * this.dataSource.patrolRadius;
    if (talking || time < this.idleUntil || !this.dataSource.patrolRadius) this.move(0, 0);
    else if (Math.abs(this.x - destination) < 4 || body.blocked.left || body.blocked.right) {
      this.target *= -1;
      this.idleUntil = time + 800;
      this.move(0, 0);
    } else this.move(Math.sign(destination - this.x), 0, this.dataSource.speed);
    this.label.setPosition(this.x, this.y - 95);
  }
  isNear(player: Player) {
    return (
      Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= this.dataSource.range
    );
  }
}
