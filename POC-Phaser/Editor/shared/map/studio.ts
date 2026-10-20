import { z } from 'zod';
import type { Catalog, Layer, MapDocument, Property } from './types';
import { findNode, placementName } from './editor';

const propertySchema = z.object({
  name: z.string(),
  type: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});
const objectSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite(),
    height: z.number().finite(),
    gid: z.number().int().optional(),
    class: z.string().optional(),
    type: z.string().optional(),
    point: z.boolean().optional(),
    rotation: z.number().optional(),
    visible: z.boolean().optional(),
    properties: z.array(propertySchema).optional(),
  })
  .passthrough();
const layerSchema: z.ZodType<Layer> = z.lazy(() =>
  z
    .object({
      id: z.number().int(),
      name: z.string(),
      type: z.string(),
      offsetx: z.number().optional(),
      offsety: z.number().optional(),
      opacity: z.number().optional(),
      visible: z.boolean().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      data: z.array(z.number()).optional(),
      objects: z.array(objectSchema).optional(),
      layers: z.array(layerSchema).optional(),
      properties: z.array(propertySchema).optional(),
    })
    .passthrough(),
);
const documentSchema = z
  .object({
    type: z.literal('map'),
    orientation: z.literal('orthogonal'),
    infinite: z.literal(false),
    width: z.number().int().min(1).max(256),
    height: z.number().int().min(1).max(256),
    tilewidth: z.union([z.literal(16), z.literal(32), z.literal(64), z.literal(128)]),
    tileheight: z.union([z.literal(16), z.literal(32), z.literal(64), z.literal(128)]),
    nextlayerid: z.number().int().positive(),
    nextobjectid: z.number().int().positive(),
    layers: z.array(layerSchema),
    tilesets: z.array(z.object({ firstgid: z.literal(1), source: z.string() })).length(1),
    properties: z.array(propertySchema).optional(),
  })
  .passthrough();
export const blueprintSchema = z.object({
  name: z.string().max(200),
  url: z
    .string()
    .max(2100000)
    .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
  imageWidth: z.number().int().positive().max(8192),
  imageHeight: z.number().int().positive().max(8192),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive().max(8192),
  height: z.number().finite().positive().max(8192),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
});
export type Blueprint = z.infer<typeof blueprintSchema>;
const blueprintKey = 'studio.blueprint';
export function setProperty(
  target: { properties?: Property[] },
  name: string,
  value: Property['value'],
) {
  target.properties ??= [];
  const existing = target.properties.find((p) => p.name === name);
  if (existing) existing.value = value;
  else
    target.properties.push({
      name,
      type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'float' : 'string',
      value,
    });
}
export function getBlueprint(map: MapDocument): Blueprint | undefined {
  const value = map.properties?.find((p) => p.name === blueprintKey)?.value;
  if (typeof value !== 'string') return undefined;
  return blueprintSchema.parse(JSON.parse(value));
}
export function setBlueprint(map: MapDocument, blueprint?: Blueprint) {
  if (blueprint) setProperty(map, blueprintKey, JSON.stringify(blueprintSchema.parse(blueprint)));
  else map.properties = map.properties?.filter((p) => p.name !== blueprintKey);
}
export function parseMapDocument(input: unknown): MapDocument {
  const map = documentSchema.parse(input);
  getBlueprint(map);
  return map;
}
export function fitBlueprint(blueprint: Blueprint, width: number, height: number): Blueprint {
  const scale = Math.min(width / blueprint.imageWidth, height / blueprint.imageHeight);
  const w = blueprint.imageWidth * scale,
    h = blueprint.imageHeight * scale;
  return { ...blueprint, x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
export function createBlankMap(
  width: number,
  height: number,
  floorGid: number,
  title: string,
  tileSize = 32,
): MapDocument {
  return parseMapDocument({
    type: 'map',
    orientation: 'orthogonal',
    infinite: false,
    renderorder: 'right-down',
    version: '1.10',
    tiledversion: '1.11.0',
    width,
    height,
    tilewidth: tileSize,
    tileheight: tileSize,
    nextlayerid: 3,
    nextobjectid: 2,
    tilesets: [{ firstgid: 1, source: 'tilesets/exhibition.tsj' }],
    properties: [{ name: 'title', type: 'string', value: title }],
    layers: [
      {
        id: 1,
        name: 'Floor',
        type: 'tilelayer',
        width,
        height,
        data: Array(width * height).fill(floorGid),
      },
      {
        id: 2,
        name: 'Markers',
        type: 'objectgroup',
        objects: [
          {
            id: 1,
            name: 'Entrance',
            type: 'Spawn',
            point: true,
            x: (width * tileSize) / 2,
            y: (height * tileSize) / 2,
            width: 0,
            height: 0,
          },
        ],
      },
    ],
  });
}
export function resizeMap(map: MapDocument, width: number, height: number, floorGid: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 256 ||
    height > 256
  )
    throw Error('ขนาดแมปต้องเป็นจำนวนเต็ม 1–256 ช่อง');
  const oldWidth = map.width * map.tilewidth,
    oldHeight = map.height * map.tileheight;
  function walk(layers: Layer[]) {
    for (const layer of layers) {
      if (layer.layers) walk(layer.layers);
      if (layer.type === 'tilelayer' && layer.data && layer.width && layer.height) {
        if (layer.offsetx || layer.offsety || layer.x || layer.y)
          throw Error('ปรับขนาดพื้นได้เมื่อ layer เริ่มที่มุมซ้ายบนของแมป');
        const old = layer.data,
          oldColumns = layer.width,
          oldRows = layer.height;
        layer.data = Array.from({ length: width * height }, (_, i) => {
          const x = i % width,
            y = Math.floor(i / width);
          return x < oldColumns && y < oldRows ? old[y * oldColumns + x] : floorGid;
        });
        layer.width = width;
        layer.height = height;
      }
      // Seed-map edge walls follow the world edge; user-authored colliders stay untouched.
      if (layer.name === 'World collision')
        for (const object of layer.objects || []) {
          if (object.width === oldWidth) object.width = width * map.tilewidth;
          if (object.height === oldHeight) object.height = height * map.tileheight;
          if (object.x > 0 && object.x + object.width === oldWidth)
            object.x = width * map.tilewidth - object.width;
          if (object.y > 0 && object.y + object.height === oldHeight)
            object.y = height * map.tileheight - object.height;
        }
    }
  }
  walk(map.layers);
  map.width = width;
  map.height = height;
}
export function addRectangle(
  map: MapDocument,
  kind: 'collider' | 'zone',
  rect: { x: number; y: number; width: number; height: number },
) {
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.x < 0 ||
    rect.y < 0 ||
    rect.x + rect.width > map.width * map.tilewidth ||
    rect.y + rect.height > map.height * map.tileheight
  )
    throw Error('กรอบต้องมีขนาดและอยู่ภายในแมป');
  let layer = map.layers.find((l) => l.name === 'Studio regions' && l.type === 'objectgroup');
  if (!layer) {
    layer = { id: map.nextlayerid++, name: 'Studio regions', type: 'objectgroup', objects: [] };
    map.layers.push(layer);
  }
  const id = map.nextobjectid++;
  layer.objects?.push({
    id,
    name: `${kind === 'collider' ? 'สิ่งกีดขวาง' : 'พื้นที่'} ${id}`,
    type: kind === 'collider' ? 'Collider' : 'Zone',
    ...rect,
  });
  return `object:${id}`;
}
export function resizeObject(
  map: MapDocument,
  key: string,
  axis: 'width' | 'height',
  value: number,
  preserveRatio: boolean,
) {
  const node = findNode(map, key);
  if (!node || !('width' in node) || !('height' in node) || !node.width || !node.height)
    throw Error('เลือกวัตถุที่ปรับขนาดได้');
  if (!Number.isFinite(value) || value <= 0) throw Error('ขนาดต้องมากกว่า 0');
  if (preserveRatio) {
    const scale = value / (axis === 'width' ? node.width : node.height);
    node.width *= scale;
    node.height *= scale;
  } else node[axis] = value;
}
export function restoreObjectSize(map: MapDocument, catalog: Catalog, key: string) {
  const node = findNode(map, key);
  if (!node || !('gid' in node)) return;
  const tile = catalog.tiles.find((t) => t.gid === node.gid);
  if (!tile) return;
  node.width = catalog.defaultSizes?.[tile.meta.assetKey]?.width ?? tile.imagewidth;
  node.height = catalog.defaultSizes?.[tile.meta.assetKey]?.height ?? tile.imageheight;
}
export function updateObjectProperty(
  map: MapDocument,
  key: string,
  name: string,
  value: Property['value'],
) {
  const node = findNode(map, key);
  if (node) setProperty(node, name, value);
}

export function editAssetCollider(
  map: MapDocument,
  colliders: { id: string; x: number; y: number; width: number; height: number }[],
  colliderId: string,
  remove = false,
) {
  const owner = colliderId.split(':')[0];
  const node = findNode(map, `object:${owner}`);
  if (
    !colliderId.includes(':') ||
    !node ||
    !('gid' in node) ||
    !node.gid ||
    !colliders.some((c) => c.id === colliderId)
  )
    throw Error('ไม่พบกรอบชนจาก asset');
  updateObjectProperty(map, `object:${owner}`, 'collisionEnabled', false);
  let selected: string | undefined;
  for (const rect of colliders.filter((c) => c.id.startsWith(`${owner}:`))) {
    if (remove && rect.id === colliderId) continue;
    const { x, y, width, height } = rect;
    const key = addRectangle(map, 'collider', { x, y, width, height });
    const collider = findNode(map, key);
    if (collider) collider.name = `กรอบชน ${placementName(node)}`;
    if (rect.id === colliderId) selected = key;
  }
  return selected;
}
