import { z } from 'zod';
import type { Catalog, CatalogTile } from './types';
import { setProperty } from './studio';

const boundsSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .refine((r) => r.x + r.width <= 1.000001 && r.y + r.height <= 1.000001, 'กรอบต้องอยู่ภายในภาพ');
export const assetDefinitionSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    width: z.number().positive().max(8192),
    height: z.number().positive().max(8192),
    colliders: z
      .array(z.object({ id: z.number().int().positive(), bounds: boundsSchema }))
      .max(100),
    interaction: z
      .object({
        bounds: boundsSchema,
        kind: z.string().min(1).max(80),
        actionKey: z.string().max(200),
      })
      .nullable(),
  })
  .refine(
    (value) => new Set(value.colliders.map((rect) => rect.id)).size === value.colliders.length,
    'รหัสกรอบชนซ้ำ',
  );
export type AssetDefinition = z.infer<typeof assetDefinitionSchema>;
export const assetLibrarySchema = z.record(
  z.string(),
  z.object({
    revision: z.number().int().positive(),
    value: assetDefinitionSchema.nullable(),
    previous: assetDefinitionSchema.optional(),
  }),
);
export type AssetLibrary = z.infer<typeof assetLibrarySchema>;
export function assetDefinition(catalog: Catalog, tile: CatalogTile): AssetDefinition {
  const property = (key: string, fallback: string | number) =>
    tile.properties.find((p) => p.name === key)?.value ?? fallback;
  const size = !tile.meta.ground && catalog.defaultSizes?.[tile.meta.assetKey];
  return {
    label: tile.meta.label || tile.meta.assetKey,
    width: size ? size.width : tile.imagewidth,
    height: size ? size.height : tile.imageheight,
    colliders: (tile.objectgroup?.objects ?? []).map((r) => ({
      id: r.id,
      bounds: {
        x: r.x / tile.imagewidth,
        y: r.y / tile.imageheight,
        width: r.width / tile.imagewidth,
        height: r.height / tile.imageheight,
      },
    })),
    interaction: tile.meta.interactable
      ? {
          kind: String(property('interactKind', 'custom')),
          actionKey: String(property('interactAction', '')),
          bounds: {
            x: Number(property('interactX', 0)) / tile.imagewidth,
            y: Number(property('interactY', 0)) / tile.imageheight,
            width: Number(property('interactWidth', tile.imagewidth)) / tile.imagewidth,
            height: Number(property('interactHeight', tile.imageheight)) / tile.imageheight,
          },
        }
      : null,
  };
}
export function applyAssetDefinitions(source: Catalog, library: AssetLibrary): Catalog {
  const catalog = structuredClone(source);
  for (const tile of catalog.tiles) {
    const entry = library[tile.meta.assetKey];
    if (!entry) continue;
    const value = entry.value ?? entry.previous;
    if (!value) {
      tile.meta.editorHidden = true;
      setProperty(tile, 'editorHidden', true);
      continue;
    }
    tile.meta.label = value.label;
    tile.meta.editorHidden = entry.value === null;
    tile.meta.interactable = !!value.interaction;
    setProperty(tile, 'label', value.label);
    setProperty(tile, 'editorHidden', entry.value === null);
    setProperty(tile, 'interactable', !!value.interaction);
    tile.objectgroup = {
      objects: value.colliders.map(({ id, bounds }) => ({
        id,
        name: 'Footprint',
        x: bounds.x * tile.imagewidth,
        y: bounds.y * tile.imageheight,
        width: bounds.width * tile.imagewidth,
        height: bounds.height * tile.imageheight,
        rotation: 0,
      })),
    };
    if (!tile.meta.ground)
      (catalog.defaultSizes ??= {})[tile.meta.assetKey] = {
        width: value.width,
        height: value.height,
      };
    if (value.interaction) {
      const { bounds, kind, actionKey } = value.interaction;
      setProperty(tile, 'interactKind', kind);
      setProperty(tile, 'interactAction', actionKey);
      for (const [key, number] of Object.entries({
        interactX: bounds.x * tile.imagewidth,
        interactY: bounds.y * tile.imageheight,
        interactWidth: bounds.width * tile.imagewidth,
        interactHeight: bounds.height * tile.imageheight,
      }))
        setProperty(tile, key, number);
    }
  }
  catalog.tileset = { ...catalog.tileset, tiles: catalog.tiles };
  return catalog;
}
