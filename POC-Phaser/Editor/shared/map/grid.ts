import type { Catalog } from './types';
export const gridSteps = [0, 8, 16, 32, 64, 128];
export function gridStep(value: number) {
  return gridSteps.includes(value) ? value : 32;
}
export function gridPosition(value: number, step: number) {
  if (step === 0) return Math.round(value * 100) / 100;
  return Math.floor((value + 1e-8) / gridStep(step)) * gridStep(step);
}
export function placementShape(
  catalog: Catalog,
  key: string,
  step = 32,
  paint = false,
  tileSize = 32,
) {
  const prefab = catalog.prefabs.find((p) => p.key === key);
  const tile = catalog.tiles.find((t) => t.meta.assetKey === key);
  if (!prefab && !tile) return undefined;
  if (paint && tile) {
    const size = Math.max(tileSize, gridStep(step));
    const parts = [];
    for (let y = 0; y < size; y += tileSize)
      for (let x = 0; x < size; x += tileSize)
        parts.push({ texture: tile.key, x, y, width: tileSize, height: tileSize });
    return { width: size, height: size, parts };
  }
  const source =
    prefab?.parts.map((p) => ({ ...p })) ??
    (tile ? [{ key, x: 0, y: 0, w: tile.imagewidth, h: tile.imageheight }] : []);
  const first = source[0],
    firstTile = catalog.tiles.find((t) => t.meta.assetKey === first?.key);
  if (!firstTile) return undefined;
  const scale =
    prefab?.sizing === 'explicit'
      ? 1
      : (catalog.defaultSizes?.[firstTile.meta.assetKey]?.width ?? firstTile.imagewidth) /
        firstTile.imagewidth;
  const parts = source.map((p) => {
    const asset = catalog.tiles.find((t) => t.meta.assetKey === p.key);
    if (!asset) throw Error(`ไม่พบ asset ${p.key}`);
    return {
      texture: asset.key,
      x: p.x * scale,
      y: p.y * scale,
      width: p.w * scale,
      height: p.h * scale,
    };
  });
  return {
    width:
      prefab?.sizing === 'explicit' ? prefab.width : Math.max(...parts.map((p) => p.x + p.width)),
    height:
      prefab?.sizing === 'explicit' ? prefab.height : Math.max(...parts.map((p) => p.y + p.height)),
    parts,
  };
}
export function gridPlacement(
  x: number,
  y: number,
  width: number,
  height: number,
  step: number,
  bounds: { width: number; height: number },
) {
  const cell = gridStep(step),
    px = gridPosition(x, cell),
    py = gridPosition(y, cell);
  const w = cell ? Math.ceil(width / cell) * cell : width,
    h = cell ? Math.ceil(height / cell) * cell : height;
  return {
    x: px,
    y: py,
    width: w,
    height: h,
    valid: px >= 0 && py >= 0 && px + w <= bounds.width && py + h <= bounds.height,
  };
}

export type GridArea = { x: number; y: number; width: number; height: number };

export function zoneAtPoint<T extends GridArea & { id: number }>(
  zones: T[],
  point: { x: number; y: number },
  selectedId?: number,
) {
  return zones
    .filter(
      (zone) =>
        point.x >= zone.x &&
        point.y >= zone.y &&
        point.x < zone.x + zone.width &&
        point.y < zone.y + zone.height,
    )
    .sort(
      (a, b) =>
        a.width * a.height - b.width * b.height ||
        Number(b.id === selectedId) - Number(a.id === selectedId) ||
        b.id - a.id,
    )[0];
}

// Inclusive stamps, anchored at the first cell. Reversing the drag replaces
// the pending rectangle instead of accumulating a permanent brush trail.
export function rectangleCells(
  start: { x: number; y: number },
  end: { x: number; y: number },
  stride: { width: number; height: number },
  bounds: { width: number; height: number },
) {
  const lastX = Math.trunc((end.x - start.x) / stride.width);
  const lastY = Math.trunc((end.y - start.y) / stride.height);
  const cells: { x: number; y: number }[] = [];
  for (let row = Math.min(0, lastY); row <= Math.max(0, lastY); row++)
    for (let col = Math.min(0, lastX); col <= Math.max(0, lastX); col++) {
      const x = start.x + col * stride.width,
        y = start.y + row * stride.height;
      if (
        x >= 0 &&
        y >= 0 &&
        x + stride.width <= bounds.width &&
        y + stride.height <= bounds.height
      )
        cells.push({ x, y });
    }
  return cells;
}

export function cellArea(
  cells: { x: number; y: number }[],
  stride: { width: number; height: number },
): GridArea | undefined {
  if (!cells.length) return undefined;
  const x = Math.min(...cells.map((c) => c.x)),
    y = Math.min(...cells.map((c) => c.y));
  return {
    x,
    y,
    width: Math.max(...cells.map((c) => c.x)) - x + stride.width,
    height: Math.max(...cells.map((c) => c.y)) - y + stride.height,
  };
}
