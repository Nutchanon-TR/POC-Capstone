/** ข้อมูลล้วน ๆ: ไฟล์นี้ไม่ import React หรือ Phaser */
export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type Direction = 'down' | 'up' | 'left' | 'right';
export type PlayerState = Point & { facing: Direction; moving: boolean };
export type WorldObject = Rect & {
  id: number;
  assetKey: string;
  textureKey: string;
  depth: number;
};
export type Interaction = Rect & {
  id: number;
  kind: string;
  label: string;
  areaId: string;
  action: string;
};
export type World = {
  width: number;
  height: number;
  tileSize: number;
  spawn: Point;
  textures: { key: string; url: string }[];
  floors: (Point & { textureKey: string })[];
  objects: WorldObject[];
  colliders: Rect[];
  interactions: Interaction[];
};

export const PLAYER_SPEED = 180;
export const INTERACTION_DISTANCE = 64;
export const PLAYER_FEET = { width: 18, height: 12 };

export function playerFeet(position: Point): Rect {
  return {
    x: position.x - PLAYER_FEET.width / 2,
    y: position.y - PLAYER_FEET.height,
    ...PLAYER_FEET,
  };
}
