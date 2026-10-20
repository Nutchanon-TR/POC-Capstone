import type { Point } from "./world";
export type HallCommand =
  | { type: "warp"; slot: string }
  | { type: "zoom"; value: number }
  | { type: "motion"; enabled: boolean }
  | { type: "say"; text: string }
  | { type: "blocked"; value: boolean }
  | { type: "move"; x: number; y: number };
export type HallEvent =
  | { type: "ready"; npcs: number; objects: number; collisions: number }
  | { type: "position"; point: Point; zone: string | null }
  | { type: "open"; slot: string }
  | { type: "error"; message: string };
/** Instance scoped: no window globals, shared singleton, or React state per frame. */
export class HallBridge {
  private readonly commands = new Set<(command: HallCommand) => void>();
  private readonly events = new Set<(event: HallEvent) => void>();
  send(command: HallCommand) {
    this.commands.forEach((fn) => fn(command));
  }
  emit(event: HallEvent) {
    this.events.forEach((fn) => fn(event));
  }
  onCommand(fn: (command: HallCommand) => void) {
    this.commands.add(fn);
    return () => {
      this.commands.delete(fn);
    };
  }
  subscribe(fn: (event: HallEvent) => void) {
    this.events.add(fn);
    return () => {
      this.events.delete(fn);
    };
  }
}
