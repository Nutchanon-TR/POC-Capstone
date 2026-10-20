import { INTERACTION_DISTANCE, type Interaction, type Point, type Rect } from './world';

export function distanceToRect(point: Point, rect: Rect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width);
  const dy = Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height);
  return Math.hypot(dx, dy);
}

/** POC นี้เปิดใช้งานเฉพาะคอมพิวเตอร์ ส่วน kind อื่นเก็บไว้ในข้อมูลโลก */
export function nearestComputer(player: Point, interactions: Interaction[]): Interaction | null {
  let nearest: Interaction | null = null;
  let distance = INTERACTION_DISTANCE;
  for (const target of interactions) {
    if (target.kind !== 'computer') continue;
    const candidate = distanceToRect(player, target);
    if (candidate <= distance) {
      nearest = target;
      distance = candidate;
    }
  }
  return nearest;
}
