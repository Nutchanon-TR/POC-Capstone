import type { Catalog, Layer, MapDocument, TileObject } from './types';
import type { GridArea } from './grid';

export function erasableObjectsInArea(
  catalog: Catalog,
  objects: { id: number; texture: string; x: number; y: number; width: number; height: number }[],
  area: GridArea,
) {
  const textures = new Set(
    catalog.tiles
      .filter((t) => !t.meta.ground && (t.meta.family === 'Layout' || t.meta.family === 'Prop'))
      .map((t) => t.key),
  );
  return objects.filter(
    (o) =>
      textures.has(o.texture) &&
      o.x < area.x + area.width &&
      o.x + o.width > area.x &&
      o.y < area.y + area.height &&
      o.y + o.height > area.y,
  );
}

export function removeObjects(map: MapDocument, ids: number[]) {
  const removed = new Set(ids);
  function walk(layers: Layer[]) {
    for (const layer of layers) {
      if (layer.objects) layer.objects = layer.objects.filter((o) => !removed.has(o.id));
      if (layer.layers) walk(layer.layers);
    }
  }
  walk(map.layers);
}
export type Placement = {
  key: string;
  name: string;
  x: number;
  y: number;
  objectIds: number[];
  kind: 'booth' | 'object' | 'spawn' | 'npc' | 'collider' | 'zone';
};
export function placementName(node: Pick<TileObject, 'name' | 'properties'>) {
  const values = Object.fromEntries((node.properties ?? []).map((p) => [p.name, p.value]));
  const label = values.label || values.title || node.name;
  return String(label);
}

export function renamePlacement(map: MapDocument, key: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw Error('กรุณาใส่ชื่อวัตถุ');
  const node = findNode(map, key);
  if (!node) throw Error('ไม่พบวัตถุที่เลือก');
  node.name = trimmed;
  for (const property of node.properties ?? [])
    if (property.name === 'label' || property.name === 'title') property.value = trimmed;
}
export function placements(map: MapDocument): Placement[] {
  const result: Placement[] = [];
  function walk(layers: Layer[], ox = 0, oy = 0, owner?: Placement) {
    for (const l of layers) {
      const x = ox + (l.offsetx || 0),
        y = oy + (l.offsety || 0);
      if (l.type === 'group') {
        const group: Placement = owner || {
          key: `layer:${l.id}`,
          name: l.name,
          x,
          y,
          objectIds: [],
          kind: 'booth',
        };
        if (!owner) result.push(group);
        walk(l.layers || [], x, y, group);
      }
      for (const o of l.objects || []) {
        if (o.gid) {
          if (owner) owner.objectIds.push(o.id);
          result.push({
            key: `object:${o.id}`,
            name: placementName(o),
            x: x + o.x,
            y: y + o.y,
            objectIds: [o.id],
            kind: 'object',
          });
        }
        if ((o.class || o.type) === 'Spawn' || (o.class || o.type) === 'Npc')
          result.push({
            key: `object:${o.id}`,
            name: placementName(o),
            x: x + o.x,
            y: y + o.y,
            objectIds: [o.id],
            kind: (o.class || o.type) === 'Spawn' ? 'spawn' : 'npc',
          });
        if (
          (o.class || o.type) === 'Collider' ||
          (o.class || o.type) === 'Zone' ||
          (o.class || o.type) === 'Area'
        )
          result.push({
            key: `object:${o.id}`,
            name: placementName(o),
            x: x + o.x,
            y: y + o.y,
            objectIds: [o.id],
            kind: (o.class || o.type) === 'Collider' ? 'collider' : 'zone',
          });
      }
    }
  }
  walk(map.layers);
  return result;
}
export function findNode(map: MapDocument, key: string): Layer | TileObject | undefined {
  const [kind, id] = key.split(':');
  function walk(layers: Layer[]): Layer | TileObject | undefined {
    for (const l of layers) {
      if (kind === 'layer' && l.id === Number(id)) return l;
      const o = l.objects?.find((o) => kind === 'object' && o.id === Number(id));
      if (o) return o;
      const nested = walk(l.layers || []);
      if (nested) return nested;
    }
  }
  return walk(map.layers);
}
export function movePlacement(map: MapDocument, key: string, x: number, y: number) {
  const placement = placements(map).find((p) => p.key === key),
    node = findNode(map, key);
  if (!placement || !node) return;
  if (key.startsWith('layer:')) {
    const l = node as Layer;
    l.offsetx = (l.offsetx || 0) + x - placement.x;
    l.offsety = (l.offsety || 0) + y - placement.y;
  } else {
    const o = node as TileObject;
    o.x += x - placement.x;
    o.y += y - placement.y;
  }
}
export function removePlacement(map: MapDocument, key: string) {
  const [kind, id] = key.split(':');
  function walk(layers: Layer[]) {
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (kind === 'layer' && l.id === Number(id)) {
        layers.splice(i, 1);
        continue;
      }
      l.objects = l.objects?.filter((o) => !(kind === 'object' && o.id === Number(id)));
      if (l.layers) walk(l.layers);
    }
  }
  walk(map.layers);
}
export function addAsset(
  map: MapDocument,
  catalog: Catalog,
  key: string,
  x: number,
  y: number,
): string {
  const prefab = catalog.prefabs.find((p) => p.key === key);
  if (prefab) {
    const first = catalog.tiles.find((t) => t.meta.assetKey === prefab.parts[0].key)!;
    const defaults = catalog.defaultSizes?.[first.meta.assetKey];
    const sx = prefab.sizing === 'explicit' ? 1 : defaults ? defaults.width / first.imagewidth : 1,
      sy = prefab.sizing === 'explicit' ? 1 : defaults ? defaults.height / first.imageheight : 1;
    const id = map.nextlayerid++;
    const objects = prefab.parts.map((p) => {
      const tile = catalog.tiles.find((t) => t.meta.assetKey === p.key)!;
      return {
        id: map.nextobjectid++,
        gid: tile.gid,
        name: p.key,
        x: p.x * sx,
        y: p.y * sy,
        width: p.w * sx,
        height: p.h * sy,
        rotation: 0,
        visible: true,
        properties:
          p.depthY === undefined ? [] : [{ name: 'depthY', type: 'float', value: p.depthY }],
      };
    });
    map.layers.push({
      id,
      name: `${prefab.label || key} · ${id}`,
      type: 'group',
      offsetx: x,
      offsety: y,
      properties: [
        { name: 'boothId', type: 'string', value: `${key}-${id}` },
        { name: 'boothWidth', type: 'float', value: prefab.width * sx },
        { name: 'boothHeight', type: 'float', value: prefab.height * sy },
      ],
      layers: [{ id: map.nextlayerid++, name: 'Pieces', type: 'objectgroup', objects }],
    });
    return `layer:${id}`;
  }
  const tile = catalog.tiles.find((t) => t.meta.assetKey === key);
  if (!tile) throw Error('Asset missing');
  let layer = map.layers.find((l) => l.name === 'Editor props');
  if (!layer) {
    layer = { id: map.nextlayerid++, name: 'Editor props', type: 'objectgroup', objects: [] };
    map.layers.push(layer);
  }
  const id = map.nextobjectid++;
  layer.objects!.push({
    id,
    name: tile.meta.label || key,
    gid: tile.gid,
    x,
    y,
    width: catalog.defaultSizes?.[key]?.width ?? tile.imagewidth,
    height: catalog.defaultSizes?.[key]?.height ?? tile.imageheight,
    rotation: 0,
    visible: true,
  });
  return `object:${id}`;
}
export function paintFloor(map: MapDocument, cells: { x: number; y: number }[], gid: number) {
  const layer = map.layers.find((l) => l.type === 'tilelayer');
  if (!layer?.data || !layer.width || !layer.height) throw Error('No floor tile layer');
  for (const cell of cells) {
    const x = Math.floor((cell.x - (layer.offsetx || 0)) / map.tilewidth) - (layer.x || 0),
      y = Math.floor((cell.y - (layer.offsety || 0)) / map.tileheight) - (layer.y || 0);
    if (x >= 0 && x < layer.width && y >= 0 && y < layer.height)
      layer.data[y * layer.width + x] = gid;
  }
}
