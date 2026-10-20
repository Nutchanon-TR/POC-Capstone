import {
  PLAYER_SPEED,
  playerFeet,
  type PlayerState,
  type Point,
  type Rect,
  type World,
} from './world';

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** รับ state เดิม แล้วคืน state ใหม่ ทดสอบได้โดยไม่ต้องเปิด browser */
export function movePlayer(
  player: PlayerState,
  input: Point,
  seconds: number,
  world: World,
): PlayerState {
  const magnitude = Math.hypot(input.x, input.y);
  if (magnitude === 0) return { ...player, moving: false };

  const facing =
    Math.abs(input.x) > Math.abs(input.y)
      ? input.x < 0
        ? 'left'
        : 'right'
      : input.y < 0
        ? 'up'
        : 'down';
  const distance = PLAYER_SPEED * Math.max(0, Math.min(seconds, 0.05));
  const dx = (input.x / magnitude) * distance;
  const dy = (input.y / magnitude) * distance;
  // แยก X/Y เพื่อให้ชนโต๊ะแล้วยังเลื่อนไปตามขอบได้
  const canStand = (position: Point) => {
    const feet = playerFeet(position);
    return (
      feet.x >= 0 &&
      feet.y >= 0 &&
      feet.x + feet.width <= world.width &&
      feet.y + feet.height <= world.height &&
      !world.colliders.some((collider) => overlaps(feet, collider))
    );
  };
  let x = player.x;
  let y = player.y;
  // จำกัดระยะต่อก้าว ป้องกันเดินทะลุ collider บาง ๆ เมื่อ frame ช้า
  const steps = Math.max(1, Math.ceil(distance / 4));
  for (let step = 0; step < steps; step++) {
    if (canStand({ x: x + dx / steps, y })) x += dx / steps;
    if (canStand({ x, y: y + dy / steps })) y += dy / steps;
  }
  return { x, y, facing, moving: x !== player.x || y !== player.y };
}
