import Phaser from 'phaser';
import { gameConfig } from '../config';
import type { WorldData } from '../types';

export function loadWorld(scene: Phaser.Scene, world: WorldData) {
  for (const floor of world.floors)
    scene.add
      .tileSprite(floor.x, floor.y, floor.width, floor.height, floor.texture)
      .setOrigin(0)
      .setDepth(gameConfig.depth.floor)
      .setAlpha(floor.opacity);
  for (const object of world.objects)
    scene.add
      .image(object.x, object.y, object.texture)
      .setName(`object:${object.id}`)
      .setOrigin(0)
      .setDisplaySize(object.width, object.height)
      .setDepth(object.ground ? gameConfig.depth.groundObjects : object.depth)
      .setAlpha(object.opacity)
      .setData({ asset: object.asset, tiledId: object.id });
  const collision = scene.physics.add.staticGroup();
  for (const shape of world.colliders) {
    const zone = scene.add.zone(
      shape.x + shape.width / 2,
      shape.y + shape.height / 2,
      shape.width,
      shape.height,
    );
    zone.setName(`collision:${shape.id}`);
    collision.add(zone);
  }
  scene.physics.world.setBounds(0, 0, world.width, world.height);
  return collision;
}
