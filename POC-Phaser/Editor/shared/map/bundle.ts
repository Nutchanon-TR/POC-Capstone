import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';
import { z } from 'zod';
import type { Catalog, MapDocument, Property } from './types';
import { parseMapDocument } from './studio';
const property = z.object({
  name: z.string(),
  type: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});
const shape = z
  .object({
    id: z.number().int(),
    name: z.string().default('Footprint'),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive(),
    height: z.number().positive(),
    rotation: z.literal(0).default(0),
  })
  .passthrough();
const tilesetSchema = z
  .object({
    type: z.literal('tileset'),
    name: z.string(),
    objectalignment: z.literal('topleft'),
    tiles: z
      .array(
        z
          .object({
            id: z.number().int().nonnegative(),
            image: z.string().min(1),
            imagewidth: z.number().int().positive().max(2048),
            imageheight: z.number().int().positive().max(2048),
            properties: z.array(property).default([]),
            objectgroup: z.object({ objects: z.array(shape) }).optional(),
          })
          .passthrough(),
      )
      .min(1)
      .max(2000),
  })
  .passthrough();
export function catalogFromTileset(
  input: unknown,
  imageUrl: (image: string) => string,
  ground = new Set<number>(),
): Catalog {
  const set = tilesetSchema.parse(input),
    ids = new Set<number>(),
    keys = new Set<string>();
  const tiles = set.tiles.map((tile) => {
    if (ids.has(tile.id)) throw Error('Tile ID ซ้ำ');
    ids.add(tile.id);
    const p = Object.fromEntries(tile.properties.map((v) => [v.name, v.value]));
    const assetKey = typeof p.assetKey === 'string' ? p.assetKey : `${set.name}-${tile.id}`;
    if (keys.has(assetKey)) throw Error('Asset key ซ้ำ');
    keys.add(assetKey);
    const isGround = p.ground === true || p.kind === 'floor' || ground.has(tile.id + 1);
    const family = isGround
      ? 'Floor'
      : p.family === 'Layout' || p.kind === 'structure'
        ? 'Layout'
        : 'Prop';
    const depthY =
      typeof p.depthY === 'number' && Number.isFinite(p.depthY) ? p.depthY : tile.imageheight;
    const meta = {
      assetKey,
      family,
      ground: isGround,
      depthY,
      label: typeof p.label === 'string' ? p.label : assetKey,
      interactable: p.interactable === true,
      editorHidden: p.editorHidden === true,
    };
    const values: Property[] = Object.entries(meta).map(([name, value]) => ({
      name,
      value,
      type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'float' : 'string',
    }));
    return {
      ...tile,
      properties: [
        ...tile.properties.filter((v) => !values.some((p) => p.name === v.name)),
        ...values,
      ],
      gid: tile.id + 1,
      key: `tile-${tile.id + 1}`,
      meta,
    };
  });
  return {
    tiles,
    textures: tiles.map((t) => ({
      key: t.key,
      url: imageUrl(t.image),
      width: t.imagewidth,
      height: t.imageheight,
    })),
    prefabs: [],
    tileset: { ...set, tiles },
  };
}
export function floorGids(map: MapDocument) {
  const result = new Set<number>();
  const walk = (layers: MapDocument['layers']) => {
    for (const l of layers) {
      if (l.type === 'tilelayer') for (const gid of l.data ?? []) if (gid) result.add(gid);
      if (l.layers) walk(l.layers);
    }
  };
  walk(map.layers);
  return result;
}
export function portableDocument(document: MapDocument): MapDocument {
  const map = structuredClone(document);
  map.tilesets = [{ firstgid: 1, source: 'tilesets/map.tsj' }];
  return map;
}
export async function buildBundle(document: MapDocument, catalog: Catalog): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {
    'map.tmj': strToU8(JSON.stringify(portableDocument(document), null, 2)),
  };
  const tiles = catalog.tiles.map((tile) => ({
    ...Object.fromEntries(
      Object.entries(tile).filter(([name]) => !['gid', 'key', 'meta'].includes(name)),
    ),
    id: tile.id,
    image: `../images/tile-${tile.gid}.png`,
  }));
  const queue = [...catalog.tiles];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let tile = queue.shift(); tile; tile = queue.shift()) {
        const texture = catalog.textures.find((t) => t.key === tile.key);
        if (!texture) throw Error(`ไม่พบภาพ ${tile.key}`);
        const response = await fetch(texture.url);
        if (!response.ok) throw Error(`โหลดภาพ ${tile.key} ไม่สำเร็จ`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length < 24 || bytes[0] !== 137 || strFromU8(bytes.slice(1, 4)) !== 'PNG')
          throw Error('รูปในชุด export ต้องเป็น PNG');
        files[`images/tile-${tile.gid}.png`] = bytes;
      }
    }),
  );
  files['tilesets/map.tsj'] = strToU8(
    JSON.stringify(
      {
        ...catalog.tileset,
        tiles,
        tilewidth: Math.max(...catalog.tiles.map((t) => t.imagewidth)),
        tileheight: Math.max(...catalog.tiles.map((t) => t.imageheight)),
        tilecount: tiles.length,
        nexttileid: Math.max(...tiles.map((t) => t.id)) + 1,
        columns: 0,
      },
      null,
      2,
    ),
  );
  files['studio/prefabs.json'] = strToU8(JSON.stringify(catalog.prefabs));
  files['README.txt'] = strToU8(
    'Open map.tmj in Tiled. Keep tilesets/ and images/ beside it. This finite orthogonal map uses square 16, 32, 64 or 128px tiles and an image collection tileset. Floor PNGs match the map tile size. No API, database, or character runtime is required.\n\nInteraction data: TSJ tile properties interactable (bool) and interactKind (string) provide defaults. TMJ object properties interactEnabled (bool), interactKind, interactAction (string), interactX/Y/Width/Height (numbers) override defaults per placed asset. The interaction label is the object name (legacy label/title properties are also supported). Bounds are in native image pixels: worldX = layerOffsetX + object.x + interactX * object.width / imagewidth; equivalent for Y. Width/height scale with the placed sprite; omitted bounds cover the full image. interactEnabled=false removes only the interaction frame, keeping the sprite. Do not infer gameplay behavior from these keys; the consuming project supplies its own actions. studio/prefabs.json preserves depthY for separate props placed on cloth tables.',
  );
  return zipSync(files, { level: 1 });
}
function resolve(base: string, name: string) {
  if (/^(?:[a-z]+:|[/\\])/i.test(name) || name.includes('\\'))
    throw Error('Path ในชุดต้องเป็น relative path');
  const parts = base.split('/').filter(Boolean);
  for (const p of name.split('/')) {
    if (p === '..') {
      if (!parts.length) throw Error('Path ออกนอกชุดไฟล์');
      parts.pop();
    } else if (p && p !== '.') parts.push(p);
  }
  return parts.join('/');
}
export function importBundle(bytes: Uint8Array) {
  let count = 0,
    total = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      total += entry.originalSize;
      if (++count > 2500 || entry.originalSize > 8 * 1024 * 1024 || total > 64 * 1024 * 1024)
        throw Error('ชุดไฟล์ใหญ่เกินขนาดที่รองรับ');
      return true;
    },
  });
  const maps = Object.keys(files).filter((p) => p.endsWith('.tmj'));
  if (maps.length !== 1) throw Error('ZIP ต้องมี TMJ หนึ่งไฟล์');
  const mapPath = maps[0],
    document = parseMapDocument(JSON.parse(strFromU8(files[mapPath])));
  const dir = mapPath.slice(0, mapPath.lastIndexOf('/') + 1);
  const setPath = resolve(dir, document.tilesets[0].source),
    setBytes = files[setPath];
  if (!setBytes) throw Error('ไม่พบ TSJ ที่ TMJ อ้างอิง');
  const setDir = setPath.slice(0, setPath.lastIndexOf('/') + 1);
  const catalog = catalogFromTileset(
    JSON.parse(strFromU8(setBytes)),
    (image) => {
      const data = files[resolve(setDir, image)];
      if (!data || data.length < 24 || data[0] !== 137 || strFromU8(data.slice(1, 4)) !== 'PNG')
        throw Error(`ไม่พบภาพ PNG: ${image}`);
      const parts = [];
      for (let i = 0; i < data.length; i += 8192)
        parts.push(String.fromCharCode(...data.slice(i, i + 8192)));
      return `data:image/png;base64,${btoa(parts.join(''))}`;
    },
    floorGids(document),
  );
  const recipes = files['studio/prefabs.json'];
  if (recipes)
    catalog.prefabs = z
      .array(
        z.object({
          key: z.string(),
          label: z.string().optional(),
          sizing: z.literal('explicit').optional(),
          width: z.number().positive(),
          height: z.number().positive(),
          parts: z.array(
            z.object({
              key: z.string(),
              x: z.number(),
              y: z.number(),
              w: z.number().positive(),
              h: z.number().positive(),
              depthY: z.number().finite().optional(),
            }),
          ),
        }),
      )
      .parse(JSON.parse(strFromU8(recipes)));
  for (const tile of catalog.tiles) {
    const png = files[resolve(setDir, tile.image)],
      view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    if (view.getUint32(16) !== tile.imagewidth || view.getUint32(20) !== tile.imageheight)
      throw Error('ขนาด PNG ไม่ตรงกับ TSJ');
  }
  for (const prefab of catalog.prefabs)
    for (const part of prefab.parts)
      if (!catalog.tiles.some((t) => t.meta.assetKey === part.key))
        throw Error('Prefab อ้าง asset ที่ไม่มีในชุด');
  return { document, catalog };
}
