import type { Catalog } from './types';

/** Add missing assets by logical key; never renumber tiles already used by the target map. */
export function mergeCatalogs(target: Catalog, source: Catalog): Catalog {
  const catalog = structuredClone(target);
  const keys = new Set(catalog.tiles.map((tile) => tile.meta.assetKey));
  const images = new Set(catalog.tiles.map((tile) => tile.image));
  let nextId = Math.max(-1, ...catalog.tiles.map((tile) => tile.id)) + 1;
  for (const incoming of source.tiles) {
    if (keys.has(incoming.meta.assetKey)) continue;
    if (catalog.tiles.length >= 2000) throw Error('คลังร่วมรองรับ asset ได้ไม่เกิน 2,000 ชิ้น');
    const texture = source.textures.find((item) => item.key === incoming.key);
    if (!texture) throw Error(`ไม่พบภาพ ${incoming.meta.assetKey} ในคลังร่วม`);
    const tile = structuredClone(incoming);
    tile.id = nextId++;
    tile.gid = tile.id + 1;
    tile.key = `tile-${tile.gid}`;
    tile.image = `shared/tile-${tile.id}.png`;
    while (images.has(tile.image)) tile.image = `shared/${tile.image}`;
    images.add(tile.image);
    keys.add(tile.meta.assetKey);
    catalog.tiles.push(tile);
    catalog.textures.push({ ...texture, key: tile.key });
    const size = source.defaultSizes?.[tile.meta.assetKey];
    if (size) (catalog.defaultSizes ??= {})[tile.meta.assetKey] = structuredClone(size);
  }
  const prefabKeys = new Set(catalog.prefabs.map((prefab) => prefab.key));
  for (const prefab of source.prefabs) {
    if (prefabKeys.has(prefab.key) || !prefab.parts.every((part) => keys.has(part.key))) continue;
    catalog.prefabs.push(structuredClone(prefab));
    prefabKeys.add(prefab.key);
  }
  catalog.tileset = {
    ...catalog.tileset,
    tiles: catalog.tiles,
    tilecount: catalog.tiles.length,
    nexttileid: nextId,
    tilewidth: Math.max(...catalog.tiles.map((tile) => tile.imagewidth)),
    tileheight: Math.max(...catalog.tiles.map((tile) => tile.imageheight)),
  };
  return catalog;
}
