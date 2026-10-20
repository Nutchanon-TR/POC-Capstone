import { z } from 'zod';
import type { Catalog, MapRecord, Prefab, WorkspaceSnapshot } from '../../../shared/map/types';
import { catalogFromTileset, floorGids } from '../../../shared/map/bundle';
import { parseMapDocument } from '../../../shared/map/studio';
import { compileDocument } from '../../../shared/map/compile.mjs';
import { upgradeExpoCatalog, splitExpoCounters } from '../../../shared/map/expo-upgrade';
import {
  readMap,
  listMaps,
  writeMap,
  activateMap,
  shareAssets,
  hydrateDiskWorkspace,
  readBoothLibrary,
  writeBooth,
  readAssetLibrary,
  writeAssetDefinition,
} from './mapStorage';
import { mergeCatalogs } from '../../../shared/map/catalog';
import { applyAssetDefinitions, type AssetDefinition } from '../../../shared/map/asset-definitions';
import { catalogForTileSize, summaryFor } from './mapImages';
import {
  applyBooths,
  prefabSchema as boothSchema,
  restoreCatalog,
  snapshotSchema,
  validateBooth,
} from '../../../shared/map/workspace';
const prefabSchema = z.array(boothSchema);
type Snapshot = WorkspaceSnapshot;
let current: Snapshot | undefined, pending: Promise<Snapshot> | undefined;
async function persist(snapshot: Snapshot, expectedRevision?: number) {
  await writeMap(
    snapshot,
    await summaryFor(snapshot),
    expectedRevision === undefined ? { kind: 'seed' } : { kind: 'save', expectedRevision },
  );
}
async function sharedCatalog(catalog: Catalog, tileSize: number): Promise<Catalog> {
  const library = await shareAssets(catalog, restoreCatalog);
  return catalogForTileSize(
    applyAssetDefinitions(
      applyBooths(mergeCatalogs(catalog, library), await readBoothLibrary()),
      await readAssetLibrary(),
    ),
    tileSize,
  );
}
async function restoreSaved(saved: unknown): Promise<Snapshot> {
  const data = snapshotSchema.parse(saved),
    document = parseMapDocument(data.record.document),
    catalog = restoreCatalog(data.catalog, floorGids(document));
  const baseline = JSON.stringify(document);
  const complete = () =>
    ['expo-cloth-table', 'expo-computer', 'expo-documents'].every((key) =>
      catalog.tiles.some((t) => t.meta.assetKey === key),
    );
  if (!complete() && catalog.tiles.some((t) => t.meta.assetKey === 'expo-booth-counter')) {
    try {
      const response = await fetch('/starter/expo.tsj');
      if (response.ok) {
        const starter = catalogFromTileset(await response.json(), (image) => `/starter/${image}`);
        upgradeExpoCatalog(catalog, starter);
      }
    } catch {
      // Keep the saved workspace usable when the starter library is unavailable.
    }
  }
  if (complete()) splitExpoCounters(document, catalog);
  return {
    record: {
      ...data.record,
      document,
      migrationBaseline: JSON.stringify(document) !== baseline ? baseline : undefined,
    },
    catalog,
  };
}
async function starter(): Promise<Snapshot> {
  const responses = await Promise.all(
    ['/starter/expo.tmj', '/starter/expo.tsj', '/starter/prefabs.json'].map((url) => fetch(url)),
  );
  if (responses.some((r) => !r.ok)) throw Error('ไม่พบไฟล์เริ่มต้นของ Map Studio');
  const [rawMap, rawSet, rawPrefabs]: unknown[] = await Promise.all(responses.map((r) => r.json()));
  const document = parseMapDocument(rawMap),
    catalog = catalogFromTileset(rawSet, (image) => `/starter/${image}`, floorGids(document));
  catalog.prefabs = prefabSchema.parse(rawPrefabs);
  return {
    record: {
      id: 'local',
      name: 'Exhibition hall',
      revision: 1,
      document,
      updatedAt: new Date().toISOString(),
    },
    catalog,
  };
}
async function initialize(): Promise<Snapshot> {
  await hydrateDiskWorkspace();
  const saved = await readMap();
  const snapshot = saved === undefined ? await starter() : await restoreSaved(saved);
  snapshot.record.name = String(
    snapshot.record.document.properties?.find((p) => p.name === 'title')?.value ||
      snapshot.record.name,
  );
  if (!(await listMaps()).some((m) => m.id === snapshot.record.id)) {
    const seed = structuredClone(snapshot);
    if (seed.record.migrationBaseline)
      seed.record.document = parseMapDocument(JSON.parse(seed.record.migrationBaseline));
    delete seed.record.migrationBaseline;
    await persist(seed);
  }
  await seedKmuttMap();
  // Migrate every existing map's library, without changing its document or revision.
  let library = snapshot.catalog;
  for (const map of await listMaps()) {
    const savedMap = await readMap(map.id);
    const data = snapshotSchema.parse(savedMap);
    library = mergeCatalogs(
      library,
      restoreCatalog(data.catalog, floorGids(parseMapDocument(data.record.document))),
    );
  }
  await shareAssets(library, restoreCatalog);
  snapshot.catalog = await sharedCatalog(snapshot.catalog, snapshot.record.document.tilewidth);
  return snapshot;
}

/** Add the authored example once, leaving the active map and any edited copy untouched. */
async function seedKmuttMap() {
  const id = 'preset-kmutt-jobfair-v1';
  if ((await readMap(id)) !== undefined) return;
  try {
    const base = '/maps/kmutt/';
    const responses = await Promise.all(
      ['map.tmj', 'expo.tsj', 'prefabs.json'].map((name) => fetch(base + name)),
    );
    if (responses.some((response) => !response.ok)) return;
    const [rawMap, rawTileset, rawPrefabs]: unknown[] = await Promise.all(
      responses.map((response) => response.json()),
    );
    const document = parseMapDocument(rawMap);
    const catalog = catalogFromTileset(rawTileset, (image) => base + image, floorGids(document));
    catalog.prefabs = prefabSchema.parse(rawPrefabs);
    compileDocument(document, catalog.tiles, catalog.textures, { editor: true });
    const snapshot: Snapshot = {
      record: { id, name: 'kmutt', revision: 1, updatedAt: new Date().toISOString(), document },
      catalog,
    };
    await writeMap(snapshot, await summaryFor(snapshot), { kind: 'seed', activate: false });
  } catch {
    // Optional bundled content must not prevent opening saved work when offline.
  }
}
async function workspace() {
  if (current) return current;
  pending ??= initialize();
  try {
    current = await pending;
    return current;
  } catch (error) {
    pending = undefined;
    throw error;
  }
}
export const editorApi = {
  read: async (id: string) => {
    await workspace();
    const raw = await readMap(id);
    if (raw === undefined) throw Error('ไม่พบแมปที่เลือก');
    const snapshot = await restoreSaved(raw);
    snapshot.catalog = await sharedCatalog(snapshot.catalog, snapshot.record.document.tilewidth);
    return snapshot;
  },
  list: async () => {
    await workspace();
    return listMaps();
  },
  activate: async (id: string, draft?: WorkspaceSnapshot) => {
    await workspace();
    const raw = draft ?? (await readMap(id));
    if (raw === undefined) throw Error('ไม่พบแมปที่เลือก');
    const next = draft ? structuredClone(draft) : await restoreSaved(raw);
    if (next.record.id !== id) throw Error('ID แมปไม่ตรงกับไฟล์ที่บันทึก');
    next.catalog = await sharedCatalog(next.catalog, next.record.document.tilewidth);
    compileDocument(next.record.document, next.catalog.tiles, next.catalog.textures, {
      editor: true,
    });
    await activateMap(id);
    current = next;
    return structuredClone(next);
  },
  create: async (
    input: Pick<WorkspaceSnapshot, 'catalog'> & { document: MapRecord['document']; name: string },
  ) => {
    await workspace();
    const next: Snapshot = {
      catalog: structuredClone(input.catalog),
      record: {
        id: crypto.randomUUID(),
        name: input.name,
        document: structuredClone(input.document),
        revision: 1,
        updatedAt: new Date().toISOString(),
      },
    };
    next.catalog = await sharedCatalog(next.catalog, next.record.document.tilewidth);
    compileDocument(next.record.document, next.catalog.tiles, next.catalog.textures, {
      editor: true,
    });
    await writeMap(next, await summaryFor(next), { kind: 'create' });
    current = next;
    return structuredClone(next);
  },
  catalog: async (signal?: AbortSignal) => {
    const state = await workspace();
    if (signal?.aborted) throw new DOMException('Canceled', 'AbortError');
    return structuredClone(state.catalog);
  },
  refreshCatalog: async () => {
    const state = await workspace();
    const catalog = await sharedCatalog(state.catalog, state.record.document.tilewidth);
    if (current !== state) return undefined;
    const next = applyAssetDefinitions(
      applyBooths(mergeCatalogs(state.catalog, catalog), await readBoothLibrary()),
      await readAssetLibrary(),
    );
    if (JSON.stringify(next) === JSON.stringify(state.catalog)) return undefined;
    state.catalog = next;
    return structuredClone(state.catalog);
  },
  load: async (signal?: AbortSignal) => {
    const state = await workspace();
    if (signal?.aborted) throw new DOMException('Canceled', 'AbortError');
    return structuredClone(state.record);
  },
  setCatalog: async (catalog: Catalog, document?: MapRecord['document']) => {
    const w = await workspace();
    w.catalog = await sharedCatalog(catalog, (document ?? w.record.document).tilewidth);
    if (document) w.record.document = structuredClone(document);
  },
  boothRevision: async (key: string) => (await readBoothLibrary())[key]?.revision ?? 0,
  assetRevision: async (key: string) => (await readAssetLibrary())[key]?.revision ?? 0,
  updateAsset: async (key: string, value: AssetDefinition | null, expectedRevision: number) => {
    const state = await workspace();
    const library = await writeAssetDefinition(key, value, expectedRevision);
    state.catalog = applyAssetDefinitions(state.catalog, library);
    return structuredClone(state.catalog);
  },
  updateBooth: async (key: string, value: Prefab | null, expectedRevision: number) => {
    const state = await workspace();
    if (value) validateBooth(value, state.catalog);
    const library = await writeBooth(key, value, expectedRevision);
    state.catalog = applyBooths(state.catalog, library);
    return structuredClone(state.catalog);
  },
  save: async (record: MapRecord) => {
    const w = await workspace();
    if (record.id !== w.record.id) throw Error('แมปที่บันทึกไม่ตรงกับแมปที่เปิดอยู่');
    const next = { ...record, revision: record.revision + 1, updatedAt: new Date().toISOString() };
    delete next.migrationBaseline;
    await persist({ record: next, catalog: w.catalog }, record.revision);
    w.record = structuredClone(next);
    return structuredClone(next);
  },
  uploadAsset: async (asset: {
    name: string;
    family: 'Prop' | 'Layout' | 'Floor';
    image: string;
    displayWidth: number;
    depthY: number;
    collision: { x: number; y: number; width: number; height: number } | null;
  }) => {
    const w = await workspace(),
      image = new Image();
    image.src = asset.image;
    await image.decode();
    if (
      !asset.name.trim() ||
      !asset.image.startsWith('data:image/png;base64,') ||
      image.width > 2048 ||
      image.height > 2048 ||
      asset.displayWidth <= 0 ||
      !Number.isFinite(asset.depthY)
    )
      throw Error('ข้อมูล asset ไม่ถูกต้อง');
    if (
      asset.family === 'Floor' &&
      (image.width !== image.height || ![16, 32, 64, 128].includes(image.width))
    )
      throw Error('พื้นต้องเป็น PNG จัตุรัส 16, 32, 64 หรือ 128 px');
    const id = Math.max(-1, ...w.catalog.tiles.map((t) => t.id)) + 1,
      key = `custom-${crypto.randomUUID()}`;
    const properties = [
      { name: 'assetKey', type: 'string', value: key },
      { name: 'label', type: 'string', value: asset.name.trim() },
      { name: 'family', type: 'string', value: asset.family },
      { name: 'ground', type: 'bool', value: asset.family === 'Floor' },
      { name: 'depthY', type: 'float', value: asset.depthY },
    ];
    const tile = {
      id,
      image: `${key}.png`,
      imagewidth: image.width,
      imageheight: image.height,
      properties,
      ...(asset.collision
        ? {
            objectgroup: {
              objects: [{ id: 1, name: 'Footprint', ...asset.collision, rotation: 0 }],
            },
          }
        : {}),
    };
    const next = catalogFromTileset(
      { ...w.catalog.tileset, tiles: [...w.catalog.tiles, tile] },
      (path) =>
        path === tile.image
          ? asset.image
          : (w.catalog.textures.find(
              (t) => w.catalog.tiles.find((a) => a.key === t.key)?.image === path,
            )?.url ?? ''),
      floorGids(w.record.document),
    );
    next.prefabs = w.catalog.prefabs;
    next.defaultSizes = {
      ...w.catalog.defaultSizes,
      [key]: {
        width: asset.family === 'Floor' ? image.width : asset.displayWidth,
        height:
          asset.family === 'Floor'
            ? image.height
            : (asset.displayWidth * image.height) / image.width,
      },
    };
    // Store the native image globally before adapting floors to this map's grid.
    w.catalog = await sharedCatalog(next, w.record.document.tilewidth);
    return { key };
  },
};
