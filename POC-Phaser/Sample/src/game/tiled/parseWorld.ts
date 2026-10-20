import { z } from 'zod';
import type { Interaction, Rect, World, WorldObject } from '../domain/world';

// JSON จากไฟล์ภายนอกเป็น unknown จนผ่าน schema นี้
const properties = z
  .array(z.object({ name: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }))
  .default([]);
const rect = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().nonnegative().default(0),
  height: z.number().nonnegative().default(0),
});
const object = rect.extend({
  id: z.number().int(),
  name: z.string().default(''),
  type: z.string().default(''),
  gid: z.number().int().positive().optional(),
  rotation: z.literal(0).default(0),
  visible: z.boolean().default(true),
  properties,
});
const layer = z.object({
  name: z.string(),
  type: z.enum(['tilelayer', 'objectgroup']),
  visible: z.boolean().default(true),
  offsetx: z.number().default(0),
  offsety: z.number().default(0),
  data: z.array(z.number().int().nonnegative()).default([]),
  objects: z.array(object).default([]),
});
const mapSchema = z.object({
  orientation: z.literal('orthogonal'),
  infinite: z.literal(false).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tilewidth: z.number().int().positive(),
  tileheight: z.number().int().positive(),
  tilesets: z
    .array(z.object({ firstgid: z.number().int().positive(), source: z.string() }))
    .length(1),
  layers: z.array(layer),
  properties,
});
const tilesetSchema = z.object({
  tiles: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      image: z.string().regex(/^\.\.\/images\/[\w.-]+\.png$/),
      imagewidth: z.number().positive(),
      imageheight: z.number().positive(),
      properties,
      objectgroup: z
        .object({ objects: z.array(rect.extend({ rotation: z.literal(0).default(0) })) })
        .optional(),
    }),
  ),
});

type Properties = z.infer<typeof properties>;
function props(values: Properties): Record<string, string | number | boolean> {
  return Object.fromEntries(values.map((property) => [property.name, property.value]));
}
function number(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}
function string(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Adapter จาก editor export เป็น World ที่ gameplay อ่านได้โดยไม่รู้จัก Tiled */
export function parseWorld(mapJson: unknown, tilesetJson: unknown): World {
  const map = mapSchema.parse(mapJson);
  const tileset = tilesetSchema.parse(tilesetJson);
  const reference = map.tilesets[0];
  if (!reference) throw new Error('Map must reference one tileset');
  const firstgid = reference.firstgid;
  if (props(map.properties).profile !== 'ProjectExpo32-v1') {
    throw new Error(
      'This sample accepts the ProjectExpo32-v1 editor export. Standard Tiled uses a different tile-object origin.',
    );
  }
  const tiles = new Map(tileset.tiles.map((tile) => [tile.id + firstgid, tile]));
  const textures = tileset.tiles.map((tile) => ({
    key: `tile-${tile.id + firstgid}`,
    url: `/assets/map/${tile.image.replace('../', '')}`,
  }));
  const floors: World['floors'] = [];
  const objects: WorldObject[] = [];
  const colliders: Rect[] = [];
  const interactions: Interaction[] = [];
  let spawn: World['spawn'] | null = null;

  for (const current of map.layers) {
    // Collision/Spawn เป็นข้อมูล จึงอ่านได้แม้ซ่อนใน editor
    if (current.type === 'tilelayer') {
      if (!current.visible) continue;
      if (current.data.length !== map.width * map.height)
        throw new Error(`Invalid tile count: ${current.name}`);
      current.data.forEach((gid, index) => {
        if (gid === 0) return;
        if (!tiles.has(gid)) throw new Error(`Unknown floor gid: ${gid}`);
        floors.push({
          x: (index % map.width) * map.tilewidth + current.offsetx,
          y: Math.floor(index / map.width) * map.tileheight + current.offsety,
          textureKey: `tile-${gid}`,
        });
      });
      continue;
    }
    for (const placed of current.objects) {
      const x = placed.x + current.offsetx;
      const y = placed.y + current.offsety;
      if (current.name === 'Spawn' && placed.name === 'Spawn_Player') {
        spawn = { x, y };
        continue;
      }
      if (current.name === 'Collision') {
        colliders.push({ x, y, width: placed.width, height: placed.height });
        continue;
      }
      if (!current.visible || !placed.visible || !placed.gid) continue;
      const tile = tiles.get(placed.gid);
      if (!tile) throw new Error(`Unknown object gid: ${placed.gid}`);
      const meta = props(tile.properties);
      const overrides = props(placed.properties);
      const merged = { ...meta, ...overrides };
      const sx = placed.width / tile.imagewidth;
      const sy = placed.height / tile.imageheight;
      // Export นี้ใช้ top-left ทั้ง gid objects และ rectangles ตาม README ใน ZIP
      const depth = number(overrides.renderDepth, y + number(merged.depthY, tile.imageheight) * sy);
      objects.push({
        id: placed.id,
        x,
        y,
        width: placed.width,
        height: placed.height,
        assetKey: string(meta.assetKey, placed.name),
        textureKey: `tile-${placed.gid}`,
        depth,
      });
      // Walls มี Collision layer อยู่แล้ว; props บนโต๊ะใช้ collider ของโต๊ะ
      if (
        meta.kind !== 'structure' &&
        overrides.counterTableId === undefined &&
        overrides.renderDepth === undefined
      ) {
        for (const footprint of tile.objectgroup?.objects ?? []) {
          colliders.push({
            x: x + footprint.x * sx,
            y: y + footprint.y * sy,
            width: footprint.width * sx,
            height: footprint.height * sy,
          });
        }
      }
      const enabled =
        typeof overrides.interactEnabled === 'boolean'
          ? overrides.interactEnabled
          : meta.interactable === true;
      if (enabled) {
        const kind = string(merged.interactKind, 'inspect');
        interactions.push({
          id: placed.id,
          kind,
          action: string(merged.interactAction, 'inspect'),
          label:
            kind === 'computer'
              ? `คอมพิวเตอร์ ${string(merged.areaId, `#${placed.id}`).replace('booth-', 'บูธ ')}`
              : placed.name,
          areaId: string(merged.areaId),
          x: x + number(merged.interactX, 0) * sx,
          y: y + number(merged.interactY, 0) * sy,
          width: number(merged.interactWidth, tile.imagewidth) * sx,
          height: number(merged.interactHeight, tile.imageheight) * sy,
        });
      }
    }
  }
  if (!spawn) throw new Error('Missing Spawn_Player in Spawn layer');
  return {
    width: map.width * map.tilewidth,
    height: map.height * map.tileheight,
    tileSize: map.tilewidth,
    spawn,
    textures,
    floors,
    objects,
    colliders,
    interactions,
  };
}
