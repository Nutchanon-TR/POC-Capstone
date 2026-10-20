import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { mergeCatalogs } from '../../shared/map/catalog';
import {
  applyBooths,
  diskWorkspaceSchema,
  prefabSchema,
  restoreCatalog,
  restoreSnapshot,
  snapshotSchema,
  summarySchema,
  validateBooth,
  type BoothLibrary,
} from '../../shared/map/workspace';
import type { Catalog, MapSummary, WorkspaceSnapshot } from '../../shared/map/types';
import {
  applyAssetDefinitions,
  assetDefinitionSchema,
  assetDefinition,
  type AssetLibrary,
} from '../../shared/map/asset-definitions';

type DiskWorkspace = {
  version: 1;
  activeMapId?: string;
  maps: WorkspaceSnapshot[];
  summaries: MapSummary[];
  catalog?: Catalog;
  booths: BoothLibrary;
  assetLibrary: AssetLibrary;
};
export const studioOperationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('map'),
    snapshot: snapshotSchema,
    summary: summarySchema,
    mode: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('seed'), activate: z.literal(false).optional() }),
      z.object({ kind: z.literal('create') }),
      z.object({ kind: z.literal('save'), expectedRevision: z.number().int().positive() }),
    ]),
  }),
  z.object({ kind: z.literal('assets'), catalog: z.unknown() }),
  z.object({
    kind: z.literal('asset'),
    key: z.string().min(1).max(160),
    expectedRevision: z.number().int().nonnegative(),
    value: assetDefinitionSchema.nullable(),
  }),
  z.object({
    kind: z.literal('booth'),
    key: z.string().min(1).max(160),
    expectedRevision: z.number().int().nonnegative(),
    value: prefabSchema.nullable(),
  }),
]);
export class StudioConflict extends Error {}
const queues = new Map<string, Promise<unknown>>();

export function studioFile(namespace = 'project') {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(namespace)) throw Error('ชื่อพื้นที่เก็บงานไม่ถูกต้อง');
  return path.join(
    /* turbopackIgnore: true */
    path.resolve(/* turbopackIgnore: true */ process.env.MAP_STUDIO_DATA_DIR || '.studio'),
    namespace === 'project' ? 'workspace.json' : `${namespace}.json`,
  );
}
export async function readStudio(namespace = 'project'): Promise<DiskWorkspace> {
  try {
    const data = diskWorkspaceSchema.parse(
      JSON.parse(await readFile(/* turbopackIgnore: true */ studioFile(namespace), 'utf8')),
    );
    return {
      ...data,
      maps: data.maps.map(restoreSnapshot),
      catalog: data.catalog ? restoreCatalog(data.catalog) : undefined,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return { version: 1, maps: [], summaries: [], booths: {}, assetLibrary: {} };
    throw error;
  }
}
async function atomicWrite(file: string, state: DiskWorkspace) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(JSON.stringify(state));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error;
    });
  }
}
export async function updateStudio(input: unknown, namespace = 'project'): Promise<unknown> {
  const operation = studioOperationSchema.parse(input),
    file = studioFile(namespace);
  const prior = queues.get(file) ?? Promise.resolve();
  const next = prior
    .catch(() => undefined)
    .then(async () => {
      const state = await readStudio(namespace);
      let result: unknown;
      if (operation.kind === 'map') {
        const snapshot = restoreSnapshot(operation.snapshot);
        const existing = state.maps.find((map) => map.record.id === snapshot.record.id);
        const { mode } = operation;
        if (existing && mode.kind === 'seed')
          return {
            snapshot: existing,
            summary: state.summaries.find((summary) => summary.id === existing.record.id),
          };
        if (existing && mode.kind === 'create') throw new StudioConflict('ID แมปซ้ำ กรุณาลองใหม่');
        if (
          mode.kind === 'save' &&
          (!existing ||
            existing.record.revision !== mode.expectedRevision ||
            snapshot.record.revision !== mode.expectedRevision + 1)
        )
          throw new StudioConflict('มีอีกหน้าต่างแก้แมปนี้ กรุณา Export งานของคุณก่อนเปิดแมปใหม่');
        const summary = {
          ...operation.summary,
          id: snapshot.record.id,
          name: snapshot.record.name,
          revision: snapshot.record.revision,
          updatedAt: snapshot.record.updatedAt,
          width: snapshot.record.document.width,
          height: snapshot.record.document.height,
          tileSize: snapshot.record.document.tilewidth,
        };
        state.maps = [
          ...state.maps.filter((map) => map.record.id !== snapshot.record.id),
          snapshot,
        ];
        state.summaries = [
          ...state.summaries.filter((item) => item.id !== snapshot.record.id),
          summary,
        ];
        if (!(mode.kind === 'seed' && mode.activate === false))
          state.activeMapId = snapshot.record.id;
        result = { snapshot, summary };
      } else if (operation.kind === 'assets') {
        const source = restoreCatalog(operation.catalog);
        state.catalog = state.catalog ? mergeCatalogs(state.catalog, source) : source;
        state.catalog = applyAssetDefinitions(state.catalog, state.assetLibrary);
        result = {
          catalog: applyBooths(state.catalog, state.booths),
          booths: state.booths,
          assetLibrary: state.assetLibrary,
        };
      } else if (operation.kind === 'asset') {
        const existing = state.assetLibrary[operation.key];
        if ((existing?.revision ?? 0) !== operation.expectedRevision)
          throw new StudioConflict('มีอีกหน้าต่างแก้ asset นี้ เปิดหน้าแก้ไขใหม่แล้วลองอีกครั้ง');
        if (!state.catalog?.tiles.some((tile) => tile.meta.assetKey === operation.key))
          throw Error('ไม่พบ asset ที่เลือก');
        const tile = state.catalog.tiles.find((tile) => tile.meta.assetKey === operation.key);
        const previous =
          operation.value === null && tile
            ? assetDefinitionSchema.safeParse(
                existing?.value ?? existing?.previous ?? assetDefinition(state.catalog, tile),
              )
            : undefined;
        state.assetLibrary[operation.key] = {
          revision: (existing?.revision ?? 0) + 1,
          value: operation.value,
          ...(previous?.success ? { previous: previous.data } : {}),
        };
        state.catalog = applyAssetDefinitions(state.catalog, state.assetLibrary);
        result = { assetLibrary: state.assetLibrary };
      } else {
        const existing = state.booths[operation.key];
        if ((existing?.revision ?? 0) !== operation.expectedRevision)
          throw new StudioConflict(
            'มีอีกหน้าต่างแก้ชุดบูธนี้ เปิดหน้าต่างแก้ไขใหม่แล้วลองอีกครั้ง',
          );
        if (!state.catalog) throw Error('ไม่พบคลัง asset');
        const value = operation.value ? validateBooth(operation.value, state.catalog) : null;
        if (value && value.key !== operation.key) throw Error('รหัสชุดบูธไม่ตรงกัน');
        if (
          !value &&
          !existing &&
          !state.catalog.prefabs.some((prefab) => prefab.key === operation.key)
        )
          throw Error('ไม่พบชุดบูธที่เลือก');
        state.booths[operation.key] = { revision: (existing?.revision ?? 0) + 1, value };
        result = { booths: state.booths };
      }
      await atomicWrite(file, state);
      return result;
    });
  queues.set(file, next);
  try {
    return await next;
  } finally {
    if (queues.get(file) === next) queues.delete(file);
  }
}
