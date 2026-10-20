import type { WorldData, Rect } from '../../src/game/types';

export type WalkPosition = { x: number; y: number };
type WalkWorld = Pick<WorldData, 'width' | 'height' | 'colliders' | 'spawn'>;
export const walkFoot = { halfWidth: 13, height: 12 };
export function canWalk(world: WalkWorld, position: WalkPosition) {
  const foot: Rect = {
    x: position.x - walkFoot.halfWidth,
    y: position.y - walkFoot.height,
    width: walkFoot.halfWidth * 2,
    height: walkFoot.height,
  };
  return (
    foot.x >= 0 &&
    foot.y >= 0 &&
    foot.x + foot.width <= world.width &&
    position.y <= world.height &&
    !world.colliders.some(
      (c) =>
        foot.x < c.x + c.width &&
        foot.x + foot.width > c.x &&
        foot.y < c.y + c.height &&
        foot.y + foot.height > c.y,
    )
  );
}
export function walkSpawn(world: WalkWorld): WalkPosition | undefined {
  for (const point of [world.spawn, { x: world.width / 2, y: world.height / 2 }])
    if (canWalk(world, point)) return { ...point };
  for (let y = walkFoot.height; y <= world.height; y += 16)
    for (let x = walkFoot.halfWidth; x <= world.width - walkFoot.halfWidth; x += 16)
      if (canWalk(world, { x, y })) return { x, y };
  return undefined;
}
/** Normalize diagonals and use short collision steps, including thin imported rectangles. */
export function moveWalker(
  world: WalkWorld,
  position: WalkPosition,
  axis: WalkPosition,
  deltaMs: number,
) {
  const length = Math.hypot(axis.x, axis.y);
  if (!length) return { ...position };
  const distance = (160 * Math.min(100, Math.max(0, deltaMs))) / 1000;
  const count = Math.max(1, Math.ceil(distance / 2));
  const dx = ((axis.x / length) * distance) / count,
    dy = ((axis.y / length) * distance) / count;
  let next = { ...position };
  for (let i = 0; i < count; i++) {
    const horizontal = { x: next.x + dx, y: next.y };
    if (canWalk(world, horizontal)) next = horizontal;
    const vertical = { x: next.x, y: next.y + dy };
    if (canWalk(world, vertical)) next = vertical;
  }
  return next;
}
