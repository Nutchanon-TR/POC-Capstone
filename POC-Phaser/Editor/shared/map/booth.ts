import type { Catalog, CatalogTile, Prefab } from './types';
import type { RenderOrderAction } from './order';
import { rectangleCells } from './grid';

export const boothCategories = ['Prop', 'Layout', 'Floor', 'Interact'] as const;
export type BoothCategory = (typeof boothCategories)[number];
export function boothCategory(tile?: CatalogTile): BoothCategory {
  if (tile?.meta.ground) return 'Floor';
  if (tile?.meta.family === 'Layout') return 'Layout';
  if (tile?.meta.interactable) return 'Interact';
  return 'Prop';
}
/** Parts are stored back-to-front. Floors stay on the renderer's ground plane. */
export function orderBoothParts(prefab: Prefab, catalog: Catalog): Prefab {
  const parts = [...prefab.parts].sort(
    (a, b) =>
      Number(boothCategory(catalog.tiles.find((t) => t.meta.assetKey === a.key)) !== 'Floor') -
      Number(boothCategory(catalog.tiles.find((t) => t.meta.assetKey === b.key)) !== 'Floor'),
  );
  return {
    ...prefab,
    parts: parts.map((part, index) => {
      const tile = catalog.tiles.find((t) => t.meta.assetKey === part.key);
      // Encode the stack as native depthY so placed TMJ objects need no new runtime convention.
      const baseline = prefab.height + (index + 1) / (parts.length + 1);
      return tile && !tile.meta.ground
        ? { ...part, depthY: ((baseline - part.y) * tile.imageheight) / part.h }
        : part;
    }),
  };
}
export function editableBooth(prefab: Prefab, catalog: Catalog): Prefab {
  const copy = structuredClone(prefab);
  copy.parts.sort((a, b) => {
    const depth = (part: Prefab['parts'][number]) => {
      const tile = catalog.tiles.find((t) => t.meta.assetKey === part.key);
      return tile?.meta.ground
        ? -Infinity
        : part.y + ((part.depthY ?? tile?.meta.depthY ?? 0) * part.h) / (tile?.imageheight ?? 1);
    };
    return depth(a) - depth(b);
  });
  return orderBoothParts(copy, catalog);
}
export function reorderBoothPart(
  prefab: Prefab,
  catalog: Catalog,
  selected: number,
  action: RenderOrderAction,
) {
  const part = prefab.parts[selected];
  if (!part) return { prefab, selected };
  const floor = boothCategory(catalog.tiles.find((t) => t.meta.assetKey === part.key)) === 'Floor';
  const peers = prefab.parts.flatMap((candidate, index) =>
    (boothCategory(catalog.tiles.find((t) => t.meta.assetKey === candidate.key)) === 'Floor') ===
    floor
      ? [index]
      : [],
  );
  const position = peers.indexOf(selected);
  const next =
    action === 'front'
      ? peers.length - 1
      : action === 'back'
        ? 0
        : action === 'forward'
          ? Math.min(peers.length - 1, position + 1)
          : Math.max(0, position - 1);
  const destination = peers[next];
  const parts = [...prefab.parts];
  parts.splice(selected, 1);
  parts.splice(destination, 0, part);
  return { prefab: orderBoothParts({ ...prefab, parts }, catalog), selected: destination };
}

export function boothFloorBrush(catalog: Catalog, key: string | undefined, step: number) {
  const tile = catalog.tiles.find((tile) => tile.meta.assetKey === key && tile.meta.ground);
  if (!tile) return;
  return {
    key: tile.meta.assetKey,
    w: tile.imagewidth,
    h: tile.imageheight,
    width: Math.ceil(Math.max(step, tile.imagewidth) / tile.imagewidth) * tile.imagewidth,
    height: Math.ceil(Math.max(step, tile.imageheight) / tile.imageheight) * tile.imageheight,
  };
}
export type BoothFloorBrush = NonNullable<ReturnType<typeof boothFloorBrush>>;
export function boothFloorCells(
  brush: BoothFloorBrush,
  start: { x: number; y: number },
  end: { x: number; y: number },
  bounds: { width: number; height: number },
) {
  const anchor = (point: { x: number; y: number }) => ({
    x: Math.floor(Math.max(0, Math.min(bounds.width - 0.001, point.x)) / brush.width) * brush.width,
    y:
      Math.floor(Math.max(0, Math.min(bounds.height - 0.001, point.y)) / brush.height) *
      brush.height,
  });
  const from = anchor(start),
    to = anchor(end);
  const count =
    ((((Math.abs(to.x - from.x) / brush.width + 1) *
      (Math.abs(to.y - from.y) / brush.height + 1) *
      brush.width) /
      brush.w) *
      brush.height) /
    brush.h;
  if (count > 2000) return [];
  return rectangleCells(from, to, brush, bounds).flatMap((cell) => {
    const parts = [];
    for (let y = 0; y < brush.height; y += brush.h)
      for (let x = 0; x < brush.width; x += brush.w) parts.push({ x: cell.x + x, y: cell.y + y });
    return parts;
  });
}
export function paintBoothFloor(
  prefab: Prefab,
  catalog: Catalog,
  brush: BoothFloorBrush,
  cells: { x: number; y: number }[],
) {
  if (!cells.length) return prefab;
  const positions = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));
  const parts = prefab.parts.filter(
    (part) =>
      !(
        boothCategory(catalog.tiles.find((tile) => tile.meta.assetKey === part.key)) === 'Floor' &&
        part.w === brush.w &&
        part.h === brush.h &&
        positions.has(`${part.x}:${part.y}`)
      ),
  );
  if (parts.length + cells.length > 2000) throw Error('ชุดบูธมีชิ้นส่วนได้ไม่เกิน 2,000 ชิ้น');
  return orderBoothParts(
    {
      ...prefab,
      parts: [
        ...parts,
        ...cells.map((cell) => ({ key: brush.key, ...cell, w: brush.w, h: brush.h })),
      ],
    },
    catalog,
  );
}

export function boothTileUnit(prefab: Prefab, catalog: Catalog, selectedFloor?: string) {
  const keys = new Set([...prefab.parts.map((part) => part.key), selectedFloor]);
  const floors = catalog.tiles.filter((tile) => tile.meta.ground && keys.has(tile.meta.assetKey));
  if (!floors.length) {
    const fallback = catalog.tiles.find(
      (tile) => tile.meta.ground && tile.imagewidth === tile.imageheight,
    );
    if (fallback) floors.push(fallback);
  }
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const multiple = (values: number[]) => values.reduce((a, b) => (a * b) / gcd(a, b), 1);
  return {
    width: floors.length ? multiple(floors.map((tile) => tile.imagewidth)) : 32,
    height: floors.length ? multiple(floors.map((tile) => tile.imageheight)) : 32,
  };
}
export function fitBoothFrame(prefab: Prefab, catalog: Catalog, selectedFloor?: string) {
  const unit = boothTileUnit(prefab, catalog, selectedFloor);
  const width =
    Math.ceil(Math.max(prefab.width, ...prefab.parts.map((part) => part.x + part.w)) / unit.width) *
    unit.width;
  const height =
    Math.ceil(
      Math.max(prefab.height, ...prefab.parts.map((part) => part.y + part.h)) / unit.height,
    ) * unit.height;
  if (width > 8192 || height > 8192) throw Error('ขนาดพื้นรวมกันทำให้กรอบบูธเกิน 8,192 px');
  return { ...prefab, width, height };
}
