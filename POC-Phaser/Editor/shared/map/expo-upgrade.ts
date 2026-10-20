import type { Catalog, MapDocument, Prefab, Property } from './types';

const parts = [
  { key: 'expo-computer', x: 68, y: -31 },
  { key: 'expo-documents', x: 24, y: -8 },
];

/** Add library assets by key, preserving uploaded GIDs, textures and custom recipes. */
export function upgradeExpoCatalog(catalog: Catalog, starter: Catalog) {
  if (!catalog.tiles.some((t) => t.meta.assetKey === 'expo-booth-counter')) return false;
  let nextId = Math.max(...catalog.tiles.map((t) => t.id)) + 1;
  for (const incoming of starter.tiles) {
    const existing = catalog.tiles.find((t) => t.meta.assetKey === incoming.meta.assetKey);
    if (existing) {
      for (const name of ['interactable', 'interactKind', 'editorHidden']) {
        const p = incoming.properties.find((p) => p.name === name);
        if (p)
          existing.properties = [
            ...existing.properties.filter((v) => v.name !== name),
            structuredClone(p),
          ];
      }
      existing.meta.interactable = incoming.meta.interactable;
      existing.meta.editorHidden = incoming.meta.editorHidden;
    } else if (
      incoming.meta.assetKey.startsWith('expo-') &&
      incoming.meta.assetKey !== 'expo-registration-counter'
    ) {
      const tile = structuredClone(incoming),
        id = nextId++;
      tile.id = id;
      tile.gid = id + 1;
      tile.key = `tile-${id + 1}`;
      catalog.tiles.push(tile);
      const texture = starter.textures.find((t) => t.key === incoming.key)!;
      catalog.textures.push({ ...texture, key: tile.key });
    }
  }
  catalog.tileset = {
    ...catalog.tileset,
    tiles: catalog.tiles,
    tilecount: catalog.tiles.length,
    nexttileid: nextId,
  };
  for (const prefab of catalog.prefabs) splitCounterRecipe(prefab, catalog);
  return true;
}

export function splitCounterRecipe(prefab: Prefab, catalog: Catalog) {
  const table = catalog.tiles.find((t) => t.meta.assetKey === 'expo-cloth-table');
  if (!table || parts.some((p) => !catalog.tiles.some((t) => t.meta.assetKey === p.key))) return;
  prefab.parts = prefab.parts.flatMap((p) => {
    if (p.key !== 'expo-booth-counter') return [p];
    const sx = p.w / 116,
      sy = p.h / 61,
      y = p.y + (61 - table.imageheight) * sy;
    return [
      { key: table.meta.assetKey, x: p.x, y, w: p.w, h: table.imageheight * sy },
      ...parts.map((part) => {
        const tile = catalog.tiles.find((t) => t.meta.assetKey === part.key)!;
        return {
          key: part.key,
          x: p.x + part.x * sx,
          y: y + part.y * sy,
          w: tile.imagewidth * sx,
          h: tile.imageheight * sy,
          depthY: table.imageheight - part.y + 1,
        };
      }),
    ];
  });
}

/** Decompose only known legacy counters; IDs and metadata of other objects are untouched. */
export function splitExpoCounters(document: MapDocument, catalog: Catalog) {
  const legacy = catalog.tiles.find((t) => t.meta.assetKey === 'expo-booth-counter'),
    table = catalog.tiles.find((t) => t.meta.assetKey === 'expo-cloth-table');
  if (!legacy || !table || parts.some((p) => !catalog.tiles.some((t) => t.meta.assetKey === p.key)))
    return;
  const walk = (layers: MapDocument['layers']) => {
    for (const layer of layers) {
      layer.objects = layer.objects?.flatMap((o) => {
        if (o.gid !== legacy.gid) return [o];
        const sx = o.width / legacy.imagewidth,
          sy = o.height / legacy.imageheight,
          y = o.y + (legacy.imageheight - table.imageheight) * sy;
        const props: Property[] = (o.properties ?? []).filter(
          (p) => !['depthY', 'renderDepth'].includes(p.name),
        );
        return [
          {
            ...o,
            name: o.name === 'expo-booth-counter' ? 'โต๊ะคลุมผ้า' : o.name,
            gid: table.gid,
            y,
            height: table.imageheight * sy,
            properties: props,
          },
          ...parts.map((part) => {
            const tile = catalog.tiles.find((t) => t.meta.assetKey === part.key)!;
            return {
              id: document.nextobjectid++,
              name: tile.meta.label ?? part.key,
              gid: tile.gid,
              x: o.x + part.x * sx,
              y: y + part.y * sy,
              width: tile.imagewidth * sx,
              height: tile.imageheight * sy,
              rotation: o.rotation ?? 0,
              visible: o.visible ?? true,
              properties: [
                ...props.filter((p) => ['areaId', 'boothId'].includes(p.name)),
                { name: 'counterTableId', type: 'object', value: o.id },
                { name: 'depthY', type: 'float', value: table.imageheight - part.y + 1 },
              ],
            };
          }),
        ];
      });
      if (layer.layers) walk(layer.layers);
    }
  };
  walk(document.layers);
}
