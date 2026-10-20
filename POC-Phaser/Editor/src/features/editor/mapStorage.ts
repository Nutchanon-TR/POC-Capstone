import { z } from 'zod';
import type { Catalog, MapSummary, WorkspaceSnapshot } from '../../../shared/map/types';
import { mergeCatalogs } from '../../../shared/map/catalog';
import {
  boothLibrarySchema,
  diskWorkspaceSchema,
  restoreCatalog,
  restoreSnapshot,
  summarySchema,
  type BoothLibrary,
} from '../../../shared/map/workspace';
import type { Prefab } from '../../../shared/map/types';
import {
  assetLibrarySchema,
  type AssetDefinition,
  type AssetLibrary,
} from '../../../shared/map/asset-definitions';

async function diskRequest(body?: unknown): Promise<unknown> {
  const response = await fetch(
    '/api/studio/workspace',
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const data: unknown = await response.json();
  if (!response.ok) throw Error(z.object({ message: z.string() }).parse(data).message);
  return data;
}
async function workspaceValue(key: string): Promise<unknown> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('workspace').objectStore('workspace').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
async function cacheWorkspace(values: Record<string, unknown>) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workspace', 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      for (const [key, value] of Object.entries(values))
        tx.objectStore('workspace').put(value, key);
    });
  } finally {
    db.close();
  }
}
/** Disk is durable across restarts and browser profiles; IndexedDB remains the local cache. */
export async function hydrateDiskWorkspace() {
  const state = diskWorkspaceSchema.parse(await diskRequest());
  const cached = await listMaps();
  for (const summary of cached)
    if (!state.maps.some((snapshot) => snapshot.record.id === summary.id)) {
      const raw = await readMap(summary.id);
      await diskRequest({
        kind: 'map',
        snapshot: raw,
        summary,
        mode: { kind: 'seed', activate: false },
      });
    }
  for (const stored of state.maps) {
    const local = cached.find((summary) => summary.id === stored.record.id);
    if (!local || local.revision < stored.record.revision) {
      const snapshot = restoreSnapshot(stored);
      const summary = state.summaries.find((summary) => summary.id === stored.record.id);
      if (!summary) throw Error('รายการแมปในไฟล์ถาวรไม่ครบ');
      await cacheMap(snapshot, summary, { kind: 'seed', activate: false }, true);
    }
  }
  const activeId = state.activeMapId ?? state.maps[0]?.record.id ?? cached[0]?.id;
  if ((await readMap()) === undefined && activeId) await activateMap(activeId);
  // Keep older uploaded images until shareAssets has merged them onto disk.
  if (state.catalog) {
    const local = await workspaceValue('sharedAssets');
    await cacheWorkspace({
      sharedAssets: local
        ? mergeCatalogs(restoreCatalog(local), restoreCatalog(state.catalog))
        : restoreCatalog(state.catalog),
    });
  }
  await cacheWorkspace({ boothLibrary: state.booths, assetLibrary: state.assetLibrary });
}
export async function readAssetLibrary(): Promise<AssetLibrary> {
  return assetLibrarySchema.parse((await workspaceValue('assetLibrary')) ?? {});
}
export async function writeAssetDefinition(
  key: string,
  value: AssetDefinition | null,
  expectedRevision: number,
) {
  const result = z
    .object({ assetLibrary: assetLibrarySchema })
    .parse(await diskRequest({ kind: 'asset', key, value, expectedRevision }));
  await cacheWorkspace({ assetLibrary: result.assetLibrary });
  return result.assetLibrary;
}
export async function readBoothLibrary(): Promise<BoothLibrary> {
  return boothLibrarySchema.parse((await workspaceValue('boothLibrary')) ?? {});
}
export async function writeBooth(key: string, value: Prefab | null, expectedRevision: number) {
  const result = z
    .object({ booths: boothLibrarySchema })
    .parse(await diskRequest({ kind: 'booth', key, value, expectedRevision }));
  await cacheWorkspace({ boothLibrary: result.booths });
  return result.booths;
}

const storedRecord = z.object({
  record: z.object({ id: z.string(), revision: z.number().int().positive() }),
});
const summariesSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    revision: z.number().int().positive(),
    updatedAt: z.string().datetime(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    tileSize: z.number().positive(),
    thumbnail: z.string().optional(),
  }),
);
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('connecta-map-studio', 2);
    request.onupgradeneeded = () => {
      for (const name of ['workspace', 'maps', 'summaries'])
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('เปิดพื้นที่เก็บแมปไม่สำเร็จ'));
    request.onblocked = () =>
      reject(Error('ปิดหน้าต่าง Editor เก่าแล้วลองใหม่เพื่ออัปเกรดพื้นที่เก็บแมป'));
  });
}
export async function readMap(id?: string): Promise<unknown> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['workspace', 'maps']);
      tx.onerror = () => reject(tx.error);
      const maps = tx.objectStore('maps'),
        workspace = tx.objectStore('workspace');
      if (id) {
        const r = maps.get(id);
        r.onsuccess = () => resolve(r.result);
        return;
      }
      const r = workspace.get('activeMapId');
      r.onsuccess = () => {
        const active = typeof r.result === 'string' ? maps.get(r.result) : workspace.get('current');
        active.onsuccess = () => resolve(active.result);
      };
    });
  } finally {
    db.close();
  }
}
export async function listMaps(): Promise<MapSummary[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction('summaries').objectStore('summaries').getAll();
      r.onsuccess = () => {
        try {
          resolve(
            summariesSchema.parse(r.result).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
          );
        } catch {
          reject(Error('ข้อมูลรายการแมปไม่ถูกต้อง'));
        }
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}

/** One atomic read/merge/write keeps simultaneous uploads from different tabs. */
export async function shareAssets(
  source: Catalog,
  restore: (stored: unknown) => Catalog,
): Promise<Catalog> {
  const local = await workspaceValue('sharedAssets');
  const input = local ? mergeCatalogs(restore(local), source) : source;
  const result = z
    .object({ catalog: z.unknown(), booths: boothLibrarySchema, assetLibrary: assetLibrarySchema })
    .parse(await diskRequest({ kind: 'assets', catalog: input }));
  const catalog = restore(result.catalog);
  await cacheWorkspace({
    sharedAssets: catalog,
    boothLibrary: result.booths,
    assetLibrary: result.assetLibrary,
  });
  return catalog;
}
export async function activateMap(id: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['workspace', 'maps'], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(Error('ไม่พบแมปที่เลือก'));
      const r = tx.objectStore('maps').get(id);
      r.onsuccess = () => {
        if (r.result === undefined) tx.abort();
        else tx.objectStore('workspace').put(id, 'activeMapId');
      };
    });
  } finally {
    db.close();
  }
}
type WriteMode =
  | { kind: 'seed'; activate?: false }
  | { kind: 'create' }
  | { kind: 'save'; expectedRevision: number };
export async function writeMap(snapshot: WorkspaceSnapshot, summary: MapSummary, mode: WriteMode) {
  const result = z
    .object({ snapshot: z.unknown(), summary: summarySchema })
    .parse(await diskRequest({ kind: 'map', snapshot, summary, mode }));
  await cacheMap(restoreSnapshot(result.snapshot), result.summary, mode);
}
async function cacheMap(
  snapshot: WorkspaceSnapshot,
  summary: MapSummary,
  mode: WriteMode,
  replace = false,
) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['workspace', 'maps', 'summaries'], 'readwrite'),
        maps = tx.objectStore('maps');
      let message = 'บันทึกไม่สำเร็จ พื้นที่เก็บงานเต็มหรือมีอีกหน้าต่างแก้แมปนี้';
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(Error(message));
      tx.onerror = () => reject(Error(message));
      const r = maps.get(snapshot.record.id);
      r.onsuccess = () => {
        try {
          if (!replace && mode.kind === 'seed' && r.result !== undefined) return;
          if (mode.kind === 'create' && r.result !== undefined) {
            message = 'ID แมปซ้ำ กรุณาลองใหม่';
            tx.abort();
            return;
          }
          if (
            mode.kind === 'save' &&
            (r.result === undefined ||
              storedRecord.parse(r.result).record.revision !== mode.expectedRevision)
          ) {
            message = 'มีอีกหน้าต่างแก้แมปนี้ กรุณา Export งานของคุณก่อนเปิดแมปใหม่';
            tx.abort();
            return;
          }
          maps.put(snapshot, snapshot.record.id);
          tx.objectStore('summaries').put(summary, snapshot.record.id);
          if (mode.kind !== 'save' && !(mode.kind === 'seed' && mode.activate === false))
            tx.objectStore('workspace').put(snapshot.record.id, 'activeMapId');
        } catch {
          tx.abort();
        }
      };
    });
  } finally {
    db.close();
  }
}
