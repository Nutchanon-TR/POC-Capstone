import type { Catalog, Layer, MapDocument, Prefab, TileObject } from './types';
import { findNode, placements, renamePlacement } from './editor';
import { fitBoothFrame } from './booth';
import { setProperty } from './studio';

export function boothInstance(map: MapDocument, catalog: Catalog, key: string) {
  const group = findNode(map, key);
  const placement = placements(map).find((item) => item.key === key && item.kind === 'booth');
  if (!group || !('layers' in group) || !placement) throw Error('ไม่พบบูธที่เลือก');
  const pieces: { node: TileObject; x: number; y: number }[] = [];
  function walk(layers: Layer[], x = 0, y = 0) {
    for (const layer of layers) {
      const ox = x + (layer.offsetx ?? 0),
        oy = y + (layer.offsety ?? 0);
      for (const node of layer.objects ?? [])
        if (node.gid) pieces.push({ node, x: ox + node.x, y: oy + node.y });
      walk(layer.layers ?? [], ox, oy);
    }
  }
  walk(group.layers ?? []);
  if (!pieces.length) throw Error('บูธนี้ยังไม่มีภาพ asset');
  const origin = {
    x: Math.min(0, ...pieces.map((p) => p.x)),
    y: Math.min(0, ...pieces.map((p) => p.y)),
  };
  const property = (name: string) =>
    Number(group.properties?.find((p) => p.name === name)?.value ?? 0);
  const prefab: Prefab = {
    key: `instance-${group.id}`,
    label: placement.name,
    sizing: 'explicit',
    width: Math.max(
      property('boothWidth'),
      ...pieces.map(({ node, x }) => x - origin.x + node.width),
    ),
    height: Math.max(
      property('boothHeight'),
      ...pieces.map(({ node, y }) => y - origin.y + node.height),
    ),
    parts: pieces.map(({ node, x, y }) => {
      const tile = catalog.tiles.find((tile) => tile.gid === node.gid);
      if (!tile) throw Error('ไม่พบภาพชิ้นส่วนบูธ');
      const renderDepth = node.properties?.find((p) => p.name === 'renderDepth')?.value;
      return {
        key: tile.meta.assetKey,
        sourceId: node.id,
        x: x - origin.x,
        y: y - origin.y,
        w: node.width,
        h: node.height,
        depthY:
          typeof renderDepth === 'number'
            ? ((renderDepth - placement.y - y) * tile.imageheight) / node.height
            : Number(node.properties?.find((p) => p.name === 'depthY')?.value ?? tile.meta.depthY),
      };
    }),
  };
  return {
    prefab: fitBoothFrame(prefab, catalog),
    origin,
    objectIds: new Set(pieces.map((p) => p.node.id)),
    placement,
  };
}
export function replaceBoothInstance(
  map: MapDocument,
  catalog: Catalog,
  key: string,
  prefab: Prefab,
) {
  const original = boothInstance(map, catalog, key);
  const group = findNode(map, key);
  if (!group || !('layers' in group)) throw Error('ไม่พบบูธที่เลือก');
  const reused = new Set<number>();
  const objects: TileObject[] = prefab.parts.map((part) => {
    const tile = catalog.tiles.find((tile) => tile.meta.assetKey === part.key);
    if (!tile) throw Error('ไม่พบ asset ชิ้นส่วนบูธ');
    const source =
      part.sourceId && original.objectIds.has(part.sourceId)
        ? findNode(map, `object:${part.sourceId}`)
        : undefined;
    if (source && (!('gid' in source) || reused.has(source.id))) throw Error('ชิ้นส่วนบูธซ้ำ');
    if (source) reused.add(source.id);
    const object: TileObject = {
      ...(source && 'gid' in source ? structuredClone(source) : {}),
      id: source?.id ?? map.nextobjectid++,
      name: source?.name ?? tile.meta.label ?? part.key,
      gid: tile.gid,
      x: part.x + original.origin.x,
      y: part.y + original.origin.y,
      width: part.w,
      height: part.h,
      visible: source?.visible ?? true,
      rotation: 0,
    };
    const worldX = original.placement.x + object.x,
      worldY = original.placement.y + object.y;
    if (
      worldX < 0 ||
      worldY < 0 ||
      worldX + part.w > map.width * map.tilewidth ||
      worldY + part.h > map.height * map.tileheight
    )
      throw Error('ชิ้นส่วนต้องอยู่ภายในแมป');
    object.properties = object.properties?.filter((p) => p.name !== 'renderDepth');
    if (part.depthY !== undefined) setProperty(object, 'depthY', part.depthY);
    return object;
  });
  const replacements = new Map(
    objects.filter((object) => reused.has(object.id)).map((object) => [object.id, object]),
  );
  // Keep surviving pieces in their original layers, including visibility and opacity.
  function replaceOld(layers: Layer[], x = 0, y = 0) {
    for (const layer of layers) {
      const ox = x + (layer.offsetx ?? 0),
        oy = y + (layer.offsety ?? 0);
      if (layer.objects)
        layer.objects = layer.objects.flatMap((object) => {
          if (!original.objectIds.has(object.id)) return [object];
          const replacement = replacements.get(object.id);
          return replacement
            ? [{ ...replacement, x: replacement.x - ox, y: replacement.y - oy }]
            : [];
        });
      replaceOld(layer.layers ?? [], ox, oy);
    }
  }
  replaceOld(group.layers ?? []);
  const added = objects.filter((object) => !reused.has(object.id));
  if (added.length)
    (group.layers ??= []).push({
      id: map.nextlayerid++,
      name: 'Edited pieces',
      type: 'objectgroup',
      objects: added,
    });
  setProperty(group, 'boothWidth', prefab.width);
  setProperty(group, 'boothHeight', prefab.height);
  if (prefab.label) renamePlacement(map, key, prefab.label);
}
