import { Navigation } from "./navigation";
import { contains, type Point, type WorldData } from "./world";
export interface Actor extends Point {
  id: string;
  name: string;
  character: number;
  direction: number;
  moving: boolean;
  path: Point[];
  pause: number;
}
export class HallSimulation {
  readonly navigation: Navigation;
  readonly npcs: Actor[];
  readonly player: Actor;
  motion = true;
  blocked = false;
  manual: Point = { x: 0, y: 0 };
  constructor(
    readonly world: WorldData,
    player: { name: string; character: number },
    names: string[],
  ) {
    this.navigation = new Navigation(world);
    if (this.navigation.blocked(world.spawn))
      throw new Error("The map spawn is blocked.");
    this.player = {
      ...world.spawn,
      ...player,
      id: "you",
      direction: 0,
      moving: false,
      path: [],
      pause: 0,
    };
    this.npcs = names.map((name, index) => {
      const spawn =
        this.navigation.cells[(index * 47 + 19) % this.navigation.cells.length];
      return {
        ...spawn,
        id: `npc-${index}`,
        name,
        character: index,
        direction: 0,
        moving: false,
        path: [],
        pause: index % 3,
      };
    });
  }
  private move(
    actor: Actor,
    dx: number,
    dy: number,
    dt: number,
    speed: number,
  ) {
    actor.moving = Math.hypot(dx, dy) > 0.1;
    if (!actor.moving) return;
    actor.direction =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : dy > 0 ? 0 : 1;
    Object.assign(actor, this.navigation.move(actor, dx, dy, dt, speed));
  }
  walkTo(point: Point) {
    if (!this.navigation.blocked(point))
      this.player.path = this.navigation.path(this.player, point);
  }
  warp(slot: string) {
    const area = this.world.areas.find(
      (a) => a.id === slot && a.kind === "booth",
    );
    if (!area) return false;
    const p = this.navigation.nearest(
      { x: area.x + area.width / 2, y: area.y + area.height - 14 },
      (p) => contains(area, p),
    );
    if (!p) return false;
    Object.assign(this.player, p);
    this.player.path = [];
    return true;
  }
  zone() {
    return (
      this.world.areas.find(
        (a) => a.kind === "booth" && contains(a, this.player),
      )?.id ?? null
    );
  }
  update(dt: number, keyboard: Point) {
    let dx = 0,
      dy = 0;
    if (!this.blocked) {
      dx = keyboard.x || this.manual.x;
      dy = keyboard.y || this.manual.y;
      if (dx || dy) this.player.path = [];
      else if (this.player.path[0]) {
        const to = this.player.path[0];
        dx = to.x - this.player.x;
        dy = to.y - this.player.y;
        if (Math.hypot(dx, dy) < 4) {
          this.player.path.shift();
          dx = dy = 0;
        }
      }
    }
    this.move(this.player, dx, dy, dt, 128);
    for (const [i, npc] of this.npcs.entries()) {
      npc.moving = false;
      if (!this.motion) continue;
      if (npc.pause > 0) {
        npc.pause -= dt;
        continue;
      }
      const target = npc.path[0];
      if (target) {
        this.move(npc, target.x - npc.x, target.y - npc.y, dt, 48);
        if (Math.hypot(target.x - npc.x, target.y - npc.y) < 3)
          npc.path.shift();
      } else {
        npc.pause = 1 + (i % 3);
        const cell =
          this.navigation.cells[
            (i * 61 + Math.floor(this.player.x) + Math.floor(npc.y) + 103) %
              this.navigation.cells.length
          ];
        npc.path = this.navigation.path(npc, cell);
      }
    }
  }
}
