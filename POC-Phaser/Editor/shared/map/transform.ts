import type { Rect, WorldData } from '../../src/game/types';
import type { Catalog, MapDocument } from './types';
import { findNode, movePlacement, placements, type Placement } from './editor';
import { editAssetCollider, setProperty } from './studio';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type RegionTarget = { kind: 'zone' | 'collider' | 'interact'; key: string; rect: Rect };
export const resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export function handlePoint(rect: Rect, handle: ResizeHandle) {
  return {
    x: rect.x + rect.width * (handle.includes('w') ? 0 : handle.includes('e') ? 1 : 0.5),
    y: rect.y + rect.height * (handle.includes('n') ? 0 : handle.includes('s') ? 1 : 0.5),
  };
}
export function hitResizeHandle(rect: Rect, point: { x: number; y: number }, zoom: number) {
  const radiusX = Math.min(7 / zoom, rect.width / 4);
  const radiusY = Math.min(7 / zoom, rect.height / 4);
  const edgeX = Math.min(4 / zoom, rect.width / 4);
  const edgeY = Math.min(4 / zoom, rect.height / 4);
  for (const handle of resizeHandles) {
    const at = handlePoint(rect, handle);
    if (Math.abs(point.x - at.x) <= radiusX && Math.abs(point.y - at.y) <= radiusY) return handle;
  }
  if (
    point.x < rect.x - 4 / zoom ||
    point.x > rect.x + rect.width + 4 / zoom ||
    point.y < rect.y - 4 / zoom ||
    point.y > rect.y + rect.height + 4 / zoom
  )
    return undefined;
  if (Math.abs(point.x - rect.x) <= edgeX) return 'w';
  if (Math.abs(point.x - rect.x - rect.width) <= edgeX) return 'e';
  if (Math.abs(point.y - rect.y) <= edgeY) return 'n';
  if (Math.abs(point.y - rect.y - rect.height) <= edgeY) return 's';
}
export function resizeRectangle(
  rect: Rect,
  handle: ResizeHandle,
  point: { x: number; y: number },
  step: number,
  world: Pick<WorldData, 'width' | 'height'>,
): Rect {
  const snap = (value: number) =>
    step ? Math.round(value / step) * step : Math.round(value * 100) / 100;
  const min = step || 1;
  let left = rect.x,
    top = rect.y,
    right = rect.x + rect.width,
    bottom = rect.y + rect.height;
  if (handle.includes('w'))
    left = Math.max(0, Math.min(right - Math.min(min, right), snap(point.x)));
  if (handle.includes('e'))
    right = Math.min(
      world.width,
      Math.max(left + Math.min(min, world.width - left), snap(point.x)),
    );
  if (handle.includes('n'))
    top = Math.max(0, Math.min(bottom - Math.min(min, bottom), snap(point.y)));
  if (handle.includes('s'))
    bottom = Math.min(
      world.height,
      Math.max(top + Math.min(min, world.height - top), snap(point.y)),
    );
  return { x: left, y: top, width: right - left, height: bottom - top };
}
export function normalizedSelection(items: Placement[], keys: string[]) {
  const chosen = items.filter((item) => keys.includes(item.key));
  return chosen
    .filter(
      (item) =>
        !chosen.some(
          (owner) =>
            owner !== item &&
            owner.kind === 'booth' &&
            item.objectIds.length &&
            item.objectIds.every((id) => owner.objectIds.includes(id)),
        ),
    )
    .map((item) => item.key);
}
/** Booths are logical groups; individual Layout tiles stay fixed in Select/Move. */
export function isLayoutPlacement(catalog: Catalog, world: WorldData, item: Placement) {
  return (
    item.kind === 'object' &&
    item.objectIds.some((id) => {
      const object = world.objects.find((object) => object.id === id);
      return catalog.tiles.some(
        (tile) => tile.key === object?.texture && tile.meta.family === 'Layout',
      );
    })
  );
}
export function unlockedSelection(
  catalog: Catalog,
  world: WorldData,
  items: Placement[],
  keys: string[],
) {
  return normalizedSelection(items, keys).filter((key) => {
    const item = items.find((item) => item.key === key);
    return item && !isLayoutPlacement(catalog, world, item);
  });
}
export function placementBounds(world: WorldData, item: Placement): Rect | undefined {
  const objects = world.objects.filter((object) => item.objectIds.includes(object.id));
  if (objects.length) {
    const x = Math.min(...objects.map((object) => object.x)),
      y = Math.min(...objects.map((object) => object.y));
    return {
      x,
      y,
      width: Math.max(...objects.map((object) => object.x + object.width)) - x,
      height: Math.max(...objects.map((object) => object.y + object.height)) - y,
    };
  }
  if (item.kind === 'zone') return world.zones.find((rect) => rect.id === item.objectIds[0]);
  if (item.kind === 'collider')
    return world.colliders.find((rect) => rect.id === String(item.objectIds[0]));
  if (item.kind === 'spawn' || item.kind === 'npc')
    return { x: item.x, y: item.y, width: 16, height: 16 };
}
export function selectionBounds(
  world: WorldData,
  items: Placement[],
  keys: string[],
): Rect | undefined {
  const rects = items
    .filter((item) => keys.includes(item.key))
    .flatMap((item) => {
      const rect = placementBounds(world, item);
      return rect ? [rect] : [];
    });
  if (!rects.length) return undefined;
  const x = Math.min(...rects.map((rect) => rect.x)),
    y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
    height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
  };
}
export function selectInRectangle(world: WorldData, items: Placement[], area: Rect) {
  return normalizedSelection(
    items,
    items
      .filter((item) => {
        const rect = placementBounds(world, item);
        if (!rect) return false;
        if (item.kind === 'zone' || item.kind === 'collider')
          return (
            rect.x >= area.x &&
            rect.y >= area.y &&
            rect.x + rect.width <= area.x + area.width &&
            rect.y + rect.height <= area.y + area.height
          );
        return (
          rect.x < area.x + area.width &&
          rect.x + rect.width > area.x &&
          rect.y < area.y + area.height &&
          rect.y + rect.height > area.y
        );
      })
      .map((item) => item.key),
  );
}
export function moveSelection(
  map: MapDocument,
  world: WorldData,
  keys: string[],
  dx: number,
  dy: number,
  catalog?: Catalog,
) {
  const items = placements(map),
    chosen = catalog
      ? unlockedSelection(catalog, world, items, keys)
      : normalizedSelection(items, keys);
  const bounds = selectionBounds(world, items, chosen);
  if (
    !bounds ||
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    bounds.x + dx < 0 ||
    bounds.y + dy < 0 ||
    bounds.x + bounds.width + dx > world.width + 0.01 ||
    bounds.y + bounds.height + dy > world.height + 0.01
  )
    throw Error('ชิ้นส่วนที่เลือกต้องอยู่ภายในแมป');
  for (const key of chosen) {
    const item = items.find((item) => item.key === key);
    if (item) movePlacement(map, key, item.x + dx, item.y + dy);
  }
}
export function resizeRegion(
  map: MapDocument,
  catalog: Catalog,
  world: WorldData,
  target: RegionTarget,
  rect: Rect,
): string {
  if (
    ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
    rect.x < 0 ||
    rect.y < 0 ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.x + rect.width > world.width + 0.01 ||
    rect.y + rect.height > world.height + 0.01
  )
    throw Error('กรอบต้องมีขนาดมากกว่า 0 และอยู่ภายในแมป');
  let key = target.key;
  if (target.kind === 'collider' && key.startsWith('collision:')) {
    key = editAssetCollider(map, world.colliders, key.slice('collision:'.length)) ?? '';
  }
  const node = findNode(map, key),
    item = placements(map).find((item) => item.key === key);
  if (!node || !item || !('width' in node) || !('height' in node)) throw Error('ไม่พบกรอบที่เลือก');
  if (target.kind === 'interact') {
    const object = world.objects.find((object) => object.id === item.objectIds[0]);
    const tile = 'gid' in node ? catalog.tiles.find((tile) => tile.gid === node.gid) : undefined;
    if (!object || !tile) throw Error('ไม่พบ asset ของกรอบ Interact');
    const sx = object.width / tile.imagewidth,
      sy = object.height / tile.imageheight;
    for (const [name, value] of Object.entries({
      interactX: (rect.x - object.x) / sx,
      interactY: (rect.y - object.y) / sy,
      interactWidth: rect.width / sx,
      interactHeight: rect.height / sy,
    }))
      setProperty(node, name, value);
  } else {
    movePlacement(map, key, rect.x, rect.y);
    node.width = rect.width;
    node.height = rect.height;
  }
  return key;
}
