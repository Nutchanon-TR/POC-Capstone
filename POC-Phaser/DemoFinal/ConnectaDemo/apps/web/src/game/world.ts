import { z } from "zod";
const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const rect = point.extend({
  width: z.number().positive(),
  height: z.number().positive(),
});
export const worldSchema = z
  .object({
    width: z.number().positive(),
    height: z.number().positive(),
    tileWidth: z.number().positive(),
    columns: z.number().int().positive(),
    rows: z.number().int().positive(),
    floor: z.array(z.number().int()),
    tiles: z.array(
      z.object({
        gid: z.number().int(),
        image: z.string().regex(/^assets\/maps\/[a-zA-Z0-9/_.-]+\.png$/),
      }),
    ),
    sprites: z.array(
      rect.extend({
        id: z.number(),
        name: z.string(),
        gid: z.number(),
        depth: z.number(),
        interactable: z.boolean(),
        kind: z.string(),
        bounds: rect,
      }),
    ),
    collisions: z.array(rect),
    areas: z.array(
      rect.extend({ id: z.string(), kind: z.string(), code: z.string() }),
    ),
    spawn: point,
  })
  .superRefine((world, ctx) => {
    if (world.floor.length !== world.rows * world.columns)
      ctx.addIssue({
        code: "custom",
        message: "Floor dimensions do not match the grid.",
      });
    const gids = new Set(world.tiles.map((t) => t.gid));
    if (world.sprites.some((s) => !gids.has(s.gid)))
      ctx.addIssue({ code: "custom", message: "Unknown tile reference." });
  });
export type WorldData = z.infer<typeof worldSchema>;
export interface Point {
  x: number;
  y: number;
}
export interface Rect extends Point {
  width: number;
  height: number;
}
export function contains(rect: Rect, point: Point) {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  );
}
