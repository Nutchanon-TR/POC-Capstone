import type { Point, WorldData } from "./world";
/** Foot-sized collision, shared by manual movement and the cached walking graph. */
export class Navigation {
  readonly cells: Point[] = [];
  private readonly grid: boolean[][];
  constructor(private readonly world: WorldData) {
    this.grid = Array.from({ length: world.rows }, (_, y) =>
      Array.from({ length: world.columns }, (_, x) => {
        const p = {
          x: x * world.tileWidth + world.tileWidth / 2,
          y: y * world.tileWidth + world.tileWidth / 2,
        };
        const open = !this.blocked(p);
        if (open) this.cells.push(p);
        return open;
      }),
    );
  }
  blocked(p: Point) {
    const w = this.world;
    if (p.x < 48 || p.x > w.width - 64 || p.y < 80 || p.y > w.height - 66)
      return true;
    const col = Math.floor(p.x / w.tileWidth),
      row = Math.floor(p.y / w.tileWidth);
    if ((w.floor[row * w.columns + col] ?? -1) < 0) return true;
    return w.collisions.some(
      (r) =>
        p.x + 8 > r.x &&
        p.x - 8 < r.x + r.width &&
        p.y + 3 > r.y &&
        p.y - 7 < r.y + r.height,
    );
  }
  move(from: Point, dx: number, dy: number, dt: number, speed: number): Point {
    const length = Math.hypot(dx, dy);
    if (length < 0.1) return from;
    const distance = Math.min(dt, 0.04) * speed;
    const next = { ...from };
    const x = from.x + (dx / length) * distance,
      y = from.y + (dy / length) * distance;
    if (!this.blocked({ x, y: next.y })) next.x = x;
    if (!this.blocked({ x: next.x, y })) next.y = y;
    return next;
  }
  nearest(p: Point, within?: (p: Point) => boolean) {
    return this.cells
      .filter((c) => !within || within(c))
      .reduce<Point | null>(
        (best, c) =>
          !best ||
          Math.hypot(c.x - p.x, c.y - p.y) <
            Math.hypot(best.x - p.x, best.y - p.y)
            ? c
            : best,
        null,
      );
  }
  path(from: Point, to: Point): Point[] {
    const size = this.world.tileWidth;
    const end = this.nearest(to);
    const first = this.nearest(from);
    if (!end || !first) return [];
    const key = (p: Point) =>
      `${Math.floor(p.x / size)},${Math.floor(p.y / size)}`;
    const queue = [first],
      previous = new Map<string, Point | null>([[key(first), null]]);
    let found: Point | null = null;
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      if (key(current) === key(end)) {
        found = current;
        break;
      }
      for (const [dx, dy] of [
        [size, 0],
        [-size, 0],
        [0, size],
        [0, -size],
      ]) {
        const next = { x: current.x + dx, y: current.y + dy };
        const col = Math.floor(next.x / size),
          row = Math.floor(next.y / size);
        if (this.grid[row]?.[col] && !previous.has(key(next))) {
          previous.set(key(next), current);
          queue.push(next);
        }
      }
    }
    if (!found) return [];
    const result: Point[] = [];
    let cursor: Point | null = found;
    while (cursor) {
      result.push(cursor);
      cursor = previous.get(key(cursor)) ?? null;
    }
    const route = result.reverse();
    if (Math.hypot(route[0].x - from.x, route[0].y - from.y) < 3) route.shift();
    return route;
  }
}
