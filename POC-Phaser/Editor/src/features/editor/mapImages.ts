import type {
  Catalog,
  MapDocument,
  MapSummary,
  WorkspaceSnapshot,
} from '../../../shared/map/types';
import { compileDocument } from '../../../shared/map/compile.mjs';
import { setProperty } from '../../../shared/map/studio';

async function imageFrom(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
/** Native floor PNGs must match TMJ tile size so Tiled and Phaser render the same geometry. */
export async function catalogForTileSize(source: Catalog, tileSize: number): Promise<Catalog> {
  const catalog = structuredClone(source);
  await Promise.all(
    catalog.tiles
      .filter(
        (t) =>
          t.meta.ground &&
          t.imagewidth === t.imageheight &&
          [16, 32, 64, 128].includes(t.imagewidth) &&
          t.imagewidth !== tileSize,
      )
      .map(async (tile) => {
        const texture = catalog.textures.find((t) => t.key === tile.key);
        if (!texture) throw Error('ไม่พบภาพพื้นในคลัง');
        const image = await imageFrom(texture.url),
          canvas = document.createElement('canvas');
        canvas.width = tileSize;
        canvas.height = tileSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw Error('สร้างภาพพื้นไม่สำเร็จ');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, tileSize, tileSize);
        const scale = tileSize / tile.imagewidth;
        tile.image = `floor-${tile.gid}-${tileSize}.png`;
        tile.imagewidth = tileSize;
        tile.imageheight = tileSize;
        tile.meta.depthY *= scale;
        setProperty(tile, 'depthY', tile.meta.depthY);
        if (catalog.defaultSizes?.[tile.meta.assetKey])
          catalog.defaultSizes[tile.meta.assetKey] = { width: tileSize, height: tileSize };
        for (const shape of tile.objectgroup?.objects ?? []) {
          shape.x *= scale;
          shape.y *= scale;
          shape.width *= scale;
          shape.height *= scale;
        }
        texture.url = canvas.toDataURL('image/png');
        texture.width = tileSize;
        texture.height = tileSize;
      }),
  );
  catalog.tileset = {
    ...catalog.tileset,
    tiles: catalog.tiles,
    tilewidth: Math.max(...catalog.tiles.map((t) => t.imagewidth)),
    tileheight: Math.max(...catalog.tiles.map((t) => t.imageheight)),
  };
  return catalog;
}
export async function thumbnailFor(
  document: MapDocument,
  catalog: Catalog,
): Promise<string | undefined> {
  try {
    const world = compileDocument(document, catalog.tiles, catalog.textures, { editor: true });
    const images = new Map(
      await Promise.all(world.textures.map(async (t) => [t.key, await imageFrom(t.url)] as const)),
    );
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 148;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#735236';
    ctx.fillRect(0, 0, 240, 148);
    ctx.imageSmoothingEnabled = false;
    const scale = Math.min(224 / world.width, 132 / world.height);
    ctx.translate((240 - world.width * scale) / 2, (148 - world.height * scale) / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f5e9cc';
    ctx.fillRect(0, 0, world.width, world.height);
    for (const floor of world.floors) {
      const image = images.get(floor.texture);
      if (!image) continue;
      const pattern = ctx.createPattern(image, 'repeat');
      if (!pattern) continue;
      ctx.save();
      ctx.translate(floor.x, floor.y);
      ctx.globalAlpha = floor.opacity;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, floor.width, floor.height);
      ctx.restore();
    }
    for (const item of [...world.objects].sort(
      (a, b) => (a.ground ? -1000 : a.depth) - (b.ground ? -1000 : b.depth),
    )) {
      const image = images.get(item.texture);
      if (image) {
        ctx.globalAlpha = item.opacity;
        ctx.drawImage(image, item.x, item.y, item.width, item.height);
      }
    }
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
export async function summaryFor(snapshot: WorkspaceSnapshot): Promise<MapSummary> {
  const { record, catalog } = snapshot;
  return {
    id: record.id,
    name: record.name,
    revision: record.revision,
    updatedAt: record.updatedAt,
    width: record.document.width,
    height: record.document.height,
    tileSize: record.document.tilewidth,
    thumbnail: await thumbnailFor(record.document, catalog),
  };
}
