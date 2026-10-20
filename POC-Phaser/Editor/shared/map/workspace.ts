import { z } from 'zod';
import { catalogFromTileset, floorGids } from './bundle';
import { parseMapDocument } from './studio';
import { compileDocument } from './compile.mjs';
import type { Catalog, WorkspaceSnapshot } from './types';
import { assetLibrarySchema } from './asset-definitions';

export const prefabSchema = z.object({
  key: z.string().min(1).max(160),
  label: z.string().trim().min(1).max(80).optional(),
  sizing: z.literal('explicit').optional(),
  width: z.number().positive().max(8192),
  height: z.number().positive().max(8192),
  parts: z
    .array(
      z.object({
        key: z.string().min(1),
        x: z.number().finite(),
        y: z.number().finite(),
        w: z.number().positive(),
        h: z.number().positive(),
        depthY: z.number().finite().optional(),
      }),
    )
    .max(2000),
});
export const storedCatalogSchema = z.object({
  tileset: z.unknown(),
  textures: z
    .array(z.object({ key: z.string(), url: z.string(), width: z.number(), height: z.number() }))
    .max(2000),
  prefabs: z.array(prefabSchema).max(1000),
  defaultSizes: z
    .record(z.string(), z.object({ width: z.number().positive(), height: z.number().positive() }))
    .optional(),
});
export const snapshotSchema = z.object({
  record: z.object({
    id: z.string().min(1).max(160),
    name: z.string().max(200),
    revision: z.number().int().positive(),
    updatedAt: z.string().datetime(),
    document: z.unknown(),
  }),
  catalog: storedCatalogSchema,
});
export const summarySchema = z.object({
  id: z.string(),
  name: z.string(),
  revision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tileSize: z.number().positive(),
  thumbnail: z.string().optional(),
});
export const boothLibrarySchema = z.record(
  z.string(),
  z.object({ revision: z.number().int().positive(), value: prefabSchema.nullable() }),
);
export type BoothLibrary = z.infer<typeof boothLibrarySchema>;
export function restoreCatalog(stored: unknown, ground = new Set<number>()): Catalog {
  const data = storedCatalogSchema.parse(stored);
  const rawTiles = z
    .object({ tiles: z.array(z.object({ id: z.number(), image: z.string() })) })
    .parse(data.tileset).tiles;
  const catalog = catalogFromTileset(
    data.tileset,
    (image) => {
      const tile = rawTiles.find((tile) => tile.image === image);
      const texture = data.textures.find(
        (texture) => texture.key === `tile-${(tile?.id ?? -1) + 1}`,
      );
      if (!texture) throw Error('ภาพในงานที่บันทึกไม่ครบ');
      return texture.url;
    },
    ground,
  );
  catalog.prefabs = data.prefabs;
  catalog.defaultSizes = data.defaultSizes;
  return catalog;
}
export function restoreSnapshot(stored: unknown): WorkspaceSnapshot {
  const data = snapshotSchema.parse(stored);
  const document = parseMapDocument(data.record.document);
  const catalog = restoreCatalog(data.catalog, floorGids(document));
  compileDocument(document, catalog.tiles, catalog.textures, { editor: true });
  return { record: { ...data.record, document }, catalog };
}
export function applyBooths(source: Catalog, library: BoothLibrary): Catalog {
  const catalog = structuredClone(source);
  catalog.prefabs = catalog.prefabs.filter((prefab) => !(prefab.key in library));
  for (const entry of Object.values(library))
    if (entry.value) {
      validateBooth(entry.value, catalog);
      catalog.prefabs.push(structuredClone(entry.value));
    }
  return catalog;
}
export function validateBooth(input: unknown, catalog: Catalog) {
  const prefab = prefabSchema.parse(input);
  if (!prefab.parts.length) throw Error('เพิ่ม asset ในบูธอย่างน้อย 1 ชิ้น');
  if (catalog.tiles.some((tile) => tile.meta.assetKey === prefab.key))
    throw Error('รหัสบูธซ้ำกับ asset');
  for (const part of prefab.parts) {
    if (!catalog.tiles.some((tile) => tile.meta.assetKey === part.key))
      throw Error(`ไม่พบ asset ${part.key}`);
    if (
      part.x < 0 ||
      part.y < 0 ||
      part.x + part.w > prefab.width + 0.01 ||
      part.y + part.h > prefab.height + 0.01
    )
      throw Error('ชิ้นส่วนทุกชิ้นต้องอยู่ภายในขนาดบูธ');
  }
  return prefab;
}
export const diskWorkspaceSchema = z.object({
  version: z.literal(1),
  activeMapId: z.string().optional(),
  maps: z.array(snapshotSchema),
  summaries: z.array(summarySchema),
  catalog: storedCatalogSchema.optional(),
  booths: boothLibrarySchema,
  assetLibrary: assetLibrarySchema.default({}),
});
