import type { WorldData } from '../../src/game/types';
import type { MapDocument } from './types';
import { findNode, placements, type Placement } from './editor';
import { setProperty } from './studio';

export type RenderOrderAction = 'front' | 'back' | 'forward' | 'backward';
type Objects = WorldData['objects'];

function stack(objects: Objects) {
  // Same stable ordering as Phaser: later objects draw in front when depths match.
  return objects.filter((o) => !o.ground).sort((a, b) => a.depth - b.depth);
}

/** Return selected sprites to their native Y-based sorting. */
export function restoreRenderOrder(map: MapDocument, objects: Objects, key: string) {
  const item = placements(map).find((p) => p.key === key);
  const visible = new Set(stack(objects).map((o) => o.id));
  for (const id of item?.objectIds ?? []) {
    if (!visible.has(id)) continue;
    const node = findNode(map, `object:${id}`);
    if (node?.properties) node.properties = node.properties.filter((p) => p.name !== 'renderDepth');
  }
}
export function renderOrderState(objects: Objects, placement?: Placement) {
  if (!placement || !['object', 'booth'].includes(placement.kind)) return undefined;
  const ordered = stack(objects),
    ids = new Set(placement.objectIds);
  const indexes = ordered.flatMap((o, index) => (ids.has(o.id) ? [index] : []));
  if (!indexes.length) return undefined;
  const first = indexes[0],
    last = indexes[indexes.length - 1],
    count = indexes.length;
  return {
    first: first + 1,
    last: last + 1,
    total: ordered.length,
    count,
    front: !ordered.slice(-count).every((o) => ids.has(o.id)),
    back: !ordered.slice(0, count).every((o) => ids.has(o.id)),
    forward: last < ordered.length - 1,
    backward: first > 0,
  };
}

/** Reorder visual tile objects without changing their geometry, groups or collision. */
export function reorderPlacement(
  map: MapDocument,
  objects: Objects,
  key: string,
  action: RenderOrderAction,
) {
  const placement = placements(map).find((p) => p.key === key);
  return reorder(map, objects, placement, action);
}

export function reorderSelection(
  map: MapDocument,
  objects: Objects,
  keys: string[],
  action: RenderOrderAction,
) {
  const items = placements(map).filter((item) => keys.includes(item.key));
  const objectIds = [...new Set(items.flatMap((item) => item.objectIds))];
  return reorder(
    map,
    objects,
    { key: 'selection', name: 'Selection', x: 0, y: 0, objectIds, kind: 'booth' },
    action,
  );
}

function reorder(
  map: MapDocument,
  objects: Objects,
  placement: Placement | undefined,
  action: RenderOrderAction,
) {
  const state = renderOrderState(objects, placement);
  if (!placement || !state || !state[action]) return;
  const ordered = stack(objects),
    ids = new Set(placement.objectIds);
  const selected = ordered.filter((o) => ids.has(o.id)),
    remaining = ordered.filter((o) => !ids.has(o.id));
  let insertion: number;
  switch (action) {
    case 'front':
      insertion = remaining.length;
      break;
    case 'back':
      insertion = 0;
      break;
    case 'forward': {
      const next = ordered[state.last];
      insertion = remaining.findIndex((o) => o.id === next.id) + 1;
      break;
    }
    case 'backward': {
      const previous = ordered[state.first - 2];
      insertion = remaining.findIndex((o) => o.id === previous.id);
      break;
    }
  }
  const desired = [...remaining.slice(0, insertion), ...selected, ...remaining.slice(insertion)];
  const previous = remaining[insertion - 1],
    next = remaining[insertion];
  const depths = new Map<number, number>();
  if (previous && next && previous.depth === next.depth) {
    // Make room inside a tied depth. Only this tie cluster and the selection need overrides.
    const value = previous.depth;
    const cluster = desired.filter((o) => ids.has(o.id) || o.depth === value);
    const before = remaining.findLast((o) => o.depth < value),
      after = remaining.find((o) => o.depth > value);
    const low = value - Math.min(1, before ? value - before.depth : 1) / 2;
    const high = value + Math.min(1, after ? after.depth - value : 1) / 2;
    for (const [index, o] of cluster.entries())
      depths.set(o.id, low + ((high - low) * (index + 1)) / (cluster.length + 1));
  } else {
    for (const [index, o] of selected.entries()) {
      const depth =
        previous && next
          ? previous.depth + ((next.depth - previous.depth) * (index + 1)) / (selected.length + 1)
          : previous
            ? previous.depth + index + 1
            : next.depth - selected.length + index;
      depths.set(o.id, depth);
    }
  }
  const adjusted = ordered
    .map((o) => ({ ...o, depth: depths.get(o.id) ?? o.depth }))
    .sort((a, b) => a.depth - b.depth);
  // Precision/extreme imported-depth fallback. Keep props above ground and below editor overlays.
  if (
    [...depths.values()].some((d) => !Number.isFinite(d) || d <= -900 || d >= 90000) ||
    adjusted.some((o, index) => o.id !== desired[index].id)
  ) {
    depths.clear();
    for (const [index, o] of desired.entries()) depths.set(o.id, index + 1);
  }
  for (const [id, depth] of depths) {
    const node = findNode(map, `object:${id}`);
    if (!node || !('gid' in node)) throw Error('ไม่พบ asset ที่ต้องการปรับลำดับ');
    setProperty(node, 'renderDepth', depth);
  }
}
