import type { WorldData, Rect } from '../../src/game/types';
import type { Catalog, Layer, MapDocument, TileObject } from './types';
import { findNode, movePlacement, placements } from './editor';
import { placementBounds, selectionBounds, unlockedSelection } from './transform';
import { setProperty } from './studio';

type ClipboardNode = { kind: 'layer'; value: Layer } | { kind: 'object'; value: TileObject };
export type SelectionClipboard = {
  nodes: ClipboardNode[];
  assets: Record<number, string>;
  bounds: Rect;
};
export type Alignment = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom';
export type Spacing = 'horizontal' | 'vertical' | 'tidy';

export function copySelection(
  map: MapDocument,
  catalog: Catalog,
  world: WorldData,
  keys: string[],
): SelectionClipboard | undefined {
  const items = placements(map),
    chosen = unlockedSelection(catalog, world, items, keys).filter(
      (key) => items.find((item) => item.key === key)?.kind !== 'spawn',
    );
  const bounds = selectionBounds(world, items, chosen);
  if (!bounds) return;
  const nodes: ClipboardNode[] = [];
  for (const key of chosen) {
    const item = items.find((item) => item.key === key),
      source = findNode(map, key);
    if (!item || !source) continue;
    if (key.startsWith('layer:') && 'layers' in source) {
      const value = structuredClone(source);
      value.offsetx = item.x;
      value.offsety = item.y;
      nodes.push({ kind: 'layer', value });
    } else if (
      'x' in source &&
      'width' in source &&
      'height' in source &&
      typeof source.x === 'number' &&
      typeof source.y === 'number' &&
      typeof source.width === 'number' &&
      typeof source.height === 'number'
    ) {
      const value: TileObject = {
        ...structuredClone(source),
        x: item.x,
        y: item.y,
        width: source.width,
        height: source.height,
      };
      nodes.push({ kind: 'object', value });
    }
  }
  return {
    nodes,
    assets: Object.fromEntries(catalog.tiles.map((tile) => [tile.gid, tile.meta.assetKey])),
    bounds,
  };
}

export function pasteSelection(
  map: MapDocument,
  catalog: Catalog,
  clipboard: SelectionClipboard,
  offset: number,
): string[] {
  const bounds = clipboard.bounds;
  const width = map.width * map.tilewidth,
    height = map.height * map.tileheight;
  if (bounds.width > width || bounds.height > height) throw Error('ชุดที่คัดลอกใหญ่กว่าแมปนี้');
  const dx = Math.max(0, Math.min(width - bounds.width, bounds.x + offset)) - bounds.x;
  const dy = Math.max(0, Math.min(height - bounds.height, bounds.y + offset)) - bounds.y;
  const gids = new Map(catalog.tiles.map((tile) => [tile.meta.assetKey, tile.gid]));
  const cloneObject = (source: TileObject): TileObject => {
    const object = structuredClone(source);
    object.id = map.nextobjectid++;
    if (object.gid) {
      const gid = gids.get(clipboard.assets[object.gid]);
      if (!gid) throw Error('ไม่พบ asset ที่คัดลอกในแมปนี้');
      object.gid = gid;
    }
    return object;
  };
  const cloneLayer = (source: Layer): Layer => {
    const layer = structuredClone(source);
    layer.id = map.nextlayerid++;
    if (layer.objects)
      layer.objects = layer.objects
        .filter((object) => (object.class || object.type) !== 'Spawn')
        .map(cloneObject);
    if (layer.layers) layer.layers = layer.layers.map(cloneLayer);
    if (layer.properties?.some((property) => property.name === 'boothId'))
      setProperty(layer, 'boothId', `copy-booth-${layer.id}`);
    return layer;
  };
  const result: string[] = [];
  let loose: Layer | undefined;
  for (const entry of clipboard.nodes) {
    if (entry.kind === 'layer') {
      const layer = cloneLayer(entry.value);
      layer.offsetx = (layer.offsetx ?? 0) + dx;
      layer.offsety = (layer.offsety ?? 0) + dy;
      map.layers.push(layer);
      result.push(`layer:${layer.id}`);
    } else {
      loose ??= { id: map.nextlayerid++, name: 'Editor pasted', type: 'objectgroup', objects: [] };
      const object = cloneObject(entry.value);
      object.x += dx;
      object.y += dy;
      loose.objects?.push(object);
      result.push(`object:${object.id}`);
    }
  }
  if (loose) map.layers.push(loose);
  return result;
}

function rectangles(map: MapDocument, catalog: Catalog, world: WorldData, keys: string[]) {
  const items = placements(map),
    chosen = unlockedSelection(catalog, world, items, keys);
  return items
    .filter((item) => chosen.includes(item.key))
    .flatMap((item) => {
      const rect = placementBounds(world, item);
      return rect ? [{ item, rect }] : [];
    });
}
export function alignSelection(
  map: MapDocument,
  catalog: Catalog,
  world: WorldData,
  keys: string[],
  alignment: Alignment,
) {
  const selected = rectangles(map, catalog, world, keys);
  if (!selected.length) return;
  const bounds =
    selected.length === 1
      ? { x: 0, y: 0, width: world.width, height: world.height }
      : selectionBounds(
          world,
          placements(map),
          selected.map(({ item }) => item.key),
        );
  if (!bounds) return;
  for (const { item, rect } of selected) {
    let x = rect.x,
      y = rect.y;
    if (alignment === 'left') x = bounds.x;
    if (alignment === 'center-x') x = bounds.x + (bounds.width - rect.width) / 2;
    if (alignment === 'right') x = bounds.x + bounds.width - rect.width;
    if (alignment === 'top') y = bounds.y;
    if (alignment === 'center-y') y = bounds.y + (bounds.height - rect.height) / 2;
    if (alignment === 'bottom') y = bounds.y + bounds.height - rect.height;
    movePlacement(map, item.key, item.x + x - rect.x, item.y + y - rect.y);
  }
}
export function spaceSelection(
  map: MapDocument,
  catalog: Catalog,
  world: WorldData,
  keys: string[],
  direction: Spacing,
  gap = 16,
) {
  const selected = rectangles(map, catalog, world, keys);
  if (selected.length < 3) return;
  if (direction === 'tidy') {
    const maxWidth = Math.max(...selected.map(({ rect }) => rect.width)),
      maxHeight = Math.max(...selected.map(({ rect }) => rect.height));
    const candidates = Array.from({ length: selected.length }, (_, index) => index + 1)
      .map((columns) => ({ columns, rows: Math.ceil(selected.length / columns) }))
      .map((shape) => ({
        ...shape,
        width: shape.columns * maxWidth + (shape.columns - 1) * gap,
        height: shape.rows * maxHeight + (shape.rows - 1) * gap,
      }))
      .filter((shape) => shape.width <= world.width && shape.height <= world.height)
      .sort((a, b) => Math.abs(a.columns - a.rows) - Math.abs(b.columns - b.rows));
    const shape = candidates[0];
    if (!shape) throw Error('แมปมีพื้นที่ไม่พอสำหรับจัดเรียงชุดที่เลือก');
    const originX = Math.min(...selected.map(({ rect }) => rect.x), world.width - shape.width),
      originY = Math.min(...selected.map(({ rect }) => rect.y), world.height - shape.height);
    selected
      .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
      .forEach(({ item, rect }, index) =>
        movePlacement(
          map,
          item.key,
          item.x + originX + (index % shape.columns) * (maxWidth + gap) - rect.x,
          item.y + originY + Math.floor(index / shape.columns) * (maxHeight + gap) - rect.y,
        ),
      );
    return;
  }
  const axis = direction === 'horizontal' ? 'x' : 'y',
    size = axis === 'x' ? 'width' : 'height';
  selected.sort((a, b) => a.rect[axis] - b.rect[axis]);
  const first = selected[0].rect,
    last = selected[selected.length - 1].rect;
  const space =
    (last[axis] +
      last[size] -
      first[axis] -
      selected.reduce((sum, { rect }) => sum + rect[size], 0)) /
    (selected.length - 1);
  let position = first[axis];
  for (const { item, rect } of selected) {
    movePlacement(
      map,
      item.key,
      item.x + (axis === 'x' ? position - rect.x : 0),
      item.y + (axis === 'y' ? position - rect.y : 0),
    );
    position += rect[size] + space;
  }
}
