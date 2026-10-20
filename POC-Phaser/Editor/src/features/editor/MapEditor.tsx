'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Alert, Button, Select, Spin, Switch, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Catalog,
  MapDocument,
  MapRecord,
  MapSummary,
  WorkspaceSnapshot,
  Prefab,
} from '../../../shared/map/types';
import { compileDocument } from '../../../shared/map/compile.mjs';
import {
  addAsset,
  findNode,
  movePlacement,
  paintFloor,
  placements,
  removePlacement,
  erasableObjectsInArea,
  removeObjects,
  renamePlacement,
} from '../../../shared/map/editor';
import { editorApi } from './api';
import { AssetPalette } from './AssetPalette';
import { AssetManager } from './AssetManager';
import { BoothEditor } from './BoothEditor';
import { boothInstance, replaceBoothInstance } from '../../../shared/map/booth-instance';
import { PropertiesPanel } from './PropertiesPanel';
import { exportBundle, exportTmj } from './export';
import { importBundle } from '../../../shared/map/bundle';
import { gridStep, gridPosition, placementShape, gridPlacement } from '../../../shared/map/grid';
import type { EditorTool } from './EditorScene';
import { isEditingTarget } from './shortcuts';
import { ToolDock } from './ToolDock';
import { PixelIcon } from './PixelIcon';
import { StudioControls, type MapSettings } from './StudioControls';
import { AssetUpload } from './AssetUpload';
import { MapLibrary, MapCreateDialog, type NewMapSettings } from './MapLibrary';
import { catalogForTileSize } from './mapImages';
import {
  reorderPlacement,
  reorderSelection,
  restoreRenderOrder,
  type RenderOrderAction,
} from '../../../shared/map/order';
import {
  moveSelection,
  resizeRegion,
  unlockedSelection,
  isLayoutPlacement,
  type RegionTarget,
} from '../../../shared/map/transform';
import {
  copySelection,
  pasteSelection,
  alignSelection,
  spaceSelection,
  type SelectionClipboard,
  type Alignment,
  type Spacing,
} from '../../../shared/map/selection';
import { SelectionMenu } from './SelectionMenu';
import {
  addRectangle,
  createBlankMap,
  getBlueprint,
  parseMapDocument,
  resizeMap,
  resizeObject,
  restoreObjectSize,
  setBlueprint,
  setProperty,
  updateObjectProperty,
  editAssetCollider,
} from '../../../shared/map/studio';
const EditorViewport = dynamic(() => import('./EditorViewport'), { ssr: false });
type History = { past: MapDocument[]; present: MapDocument; future: MapDocument[] };
type SelectionCommands = {
  enabled: boolean;
  removeEnabled: boolean;
  copy: () => boolean;
  paste: () => boolean;
  remove: () => boolean;
  layer: (action: RenderOrderAction) => void;
  space: (action: Spacing) => void;
};
type EditorDraft = {
  record: MapRecord;
  catalog: Catalog;
  history: History;
  baseline: string;
  snap: number;
  selection?: string;
  selectedKeys?: string[];
  asset?: string;
};
export function MapEditor() {
  const [assetPage, setAssetPage] = useState(false);
  const [instanceEditor, setInstanceEditor] = useState<{ key: string; prefab: Prefab }>();
  const [selectionMenu, setSelectionMenu] = useState<{
    point: { x: number; y: number };
    keys: string[];
  }>();
  const closeSelectionMenu = useCallback(() => setSelectionMenu(undefined), []);
  const clipboard = useRef<SelectionClipboard>(undefined),
    pasteCount = useRef(0),
    selectionCommands = useRef<SelectionCommands>(undefined);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [drafts, setDrafts] = useState(() => new Map<string, EditorDraft>());
  const [maps, setMaps] = useState<MapSummary[]>([]),
    [mapListOpen, setMapListOpen] = useState(true),
    [mapDialog, setMapDialog] = useState<{
      kind: 'new' | 'duplicate';
      source: WorkspaceSnapshot;
    }>();
  const [catalog, setCatalog] = useState<Catalog>(),
    [record, setRecord] = useState<MapRecord>(),
    [history, setHistory] = useState<History>(),
    [baseline, setBaseline] = useState(''),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<string>(),
    [selectedKeys, setSelectedKeys] = useState<string[]>([]),
    [shelfOpen, setShelfOpen] = useState(true),
    [shelfTab, setShelfTab] = useState<'assets' | 'properties'>('assets'),
    [asset, setAsset] = useState<string>(),
    [tool, setTool] = useState<EditorTool>('select'),
    [zoneAction, setZoneAction] = useState<'select' | 'draw'>('select'),
    [colliderAction, setColliderAction] = useState<'select' | 'draw'>('select'),
    [deleteRegionMode, setDeleteRegionMode] = useState(false),
    [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(32),
    [showCollision, setShowCollision] = useState(false),
    [walkMode, setWalkMode] = useState(false),
    [busy, setBusy] = useState(false),
    [viewCommand, setViewCommand] = useState<{ id: number; kind: 'fit' | 'in' | 'out' | 'cancel' }>(
      {
        id: 0,
        kind: 'fit',
      },
    );
  const file = useRef<HTMLInputElement>(null),
    [toast, context] = message.useMessage();
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([editorApi.catalog(abort.signal), editorApi.load(abort.signal)])
      .then(([c, r]) => {
        if (abort.signal.aborted) return;
        setError('');
        compileDocument(r.document, c.tiles, c.textures, { editor: true });
        getBlueprint(r.document);
        setCatalog(c);
        setMapListOpen(!window.matchMedia('(max-width: 1100px)').matches);
        setSnap(gridStep(r.document.tilewidth));
        void editorApi
          .list()
          .then(setMaps)
          .catch((e) => setError(e.message));
        setShelfOpen(!window.matchMedia('(max-width: 1100px)').matches);
        setRecord(r);
        setHistory({
          past: r.migrationBaseline ? [parseMapDocument(JSON.parse(r.migrationBaseline))] : [],
          present: r.document,
          future: [],
        });
        setBaseline(r.migrationBaseline ?? JSON.stringify(r.document));
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [attempt]);
  const document = history?.present;
  useEffect(() => {
    let canceled = false;
    const refresh = () => {
      if (busy) return;
      void editorApi
        .refreshCatalog()
        .then((next) => {
          if (!canceled && next) setCatalog(next);
        })
        .catch((e: unknown) => {
          if (!canceled) setError(e instanceof Error ? e.message : 'โหลดคลังร่วมไม่สำเร็จ');
        });
    };
    window.addEventListener('focus', refresh);
    return () => {
      canceled = true;
      window.removeEventListener('focus', refresh);
    };
  }, [record?.id, busy]);
  const blueprint = useMemo(() => (document ? getBlueprint(document) : undefined), [document]);
  const world = useMemo(
    () =>
      document && catalog
        ? compileDocument(document, catalog.tiles, catalog.textures, { editor: true })
        : undefined,
    [document, catalog],
  );
  const items = useMemo(() => (document ? placements(document) : []), [document]);
  const assetCollider = selection?.startsWith('collision:')
    ? world?.colliders.find((rect) => `collision:${rect.id}` === selection)
    : undefined;
  const dirty = !!document && JSON.stringify(document) !== baseline;
  const dirtyIds = new Set(
    [...drafts]
      .filter(([, d]) => JSON.stringify(d.history.present) !== d.baseline)
      .map(([id]) => id),
  );
  if (record) {
    if (dirty) dirtyIds.add(record.id);
    else dirtyIds.delete(record.id);
  }
  const anyDirty = dirtyIds.size > 0;
  const undo = useCallback(() => {
    if (busy) return;
    setViewCommand((v) => ({ id: v.id + 1, kind: 'cancel' }));
    setHistory((h) =>
      h && h.past.length
        ? {
            past: h.past.slice(0, -1),
            present: h.past.at(-1)!,
            future: [h.present, ...h.future],
          }
        : h,
    );
  }, [busy]);
  const redo = useCallback(() => {
    if (busy) return;
    setViewCommand((v) => ({ id: v.id + 1, kind: 'cancel' }));
    setHistory((h) =>
      h && h.future.length
        ? {
            past: [...h.past, h.present],
            present: h.future[0],
            future: h.future.slice(1),
          }
        : h,
    );
  }, [busy]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (assetPage || isEditingTarget(event.target)) return;
      const commands = selectionCommands.current;
      const commandKey = event.ctrlKey || event.metaKey;
      if (
        commands?.removeEnabled &&
        !commandKey &&
        !event.altKey &&
        ['Delete', 'Backspace'].includes(event.key) &&
        commands.remove()
      ) {
        event.preventDefault();
        return;
      }
      if (commands?.enabled) {
        if (commandKey && !event.altKey && event.code === 'KeyC' && commands.copy()) {
          event.preventDefault();
          return;
        }
        if (commandKey && !event.altKey && event.code === 'KeyV' && commands.paste()) {
          event.preventDefault();
          return;
        }
        if (commandKey && ['BracketLeft', 'BracketRight'].includes(event.code)) {
          event.preventDefault();
          commands.layer(
            event.code === 'BracketRight'
              ? event.altKey
                ? 'front'
                : 'forward'
              : event.altKey
                ? 'back'
                : 'backward',
          );
          return;
        }
        if (event.altKey && event.shiftKey && event.code === 'KeyT') {
          event.preventDefault();
          commands.space('tidy');
          return;
        }
      }
      if (!commandKey || event.altKey) return;
      const isUndo = event.code === 'KeyZ' || ['z', 'ผ'].includes(event.key.toLowerCase());
      const isRedo = event.code === 'KeyY' || event.key.toLowerCase() === 'y';
      if (isUndo || isRedo) {
        event.preventDefault();
        if (isRedo || event.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [undo, redo, assetPage]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (anyDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyDirty]);
  function stashDraft() {
    if (record && catalog && history)
      setDrafts((saved) =>
        new Map(saved).set(record.id, {
          record,
          catalog,
          history,
          baseline,
          snap,
          selection,
          selectedKeys,
          asset,
        }),
      );
  }
  function showSnapshot(next: WorkspaceSnapshot, cached?: EditorDraft) {
    setSelectionMenu(undefined);
    compileDocument(next.record.document, next.catalog.tiles, next.catalog.textures, {
      editor: true,
    });
    setCatalog(next.catalog);
    setRecord(next.record);
    setHistory(
      cached?.history ?? {
        past: next.record.migrationBaseline
          ? [parseMapDocument(JSON.parse(next.record.migrationBaseline))]
          : [],
        present: next.record.document,
        future: [],
      },
    );
    setBaseline(
      cached?.baseline ?? next.record.migrationBaseline ?? JSON.stringify(next.record.document),
    );
    const nextSnap = cached?.snap ?? next.record.document.tilewidth;
    setSnap([0, 8, 16, 32].includes(nextSnap) ? nextSnap : 32);
    setWalkMode(false);
    setSelection(cached?.selection);
    setSelectedKeys(cached?.selectedKeys ?? []);
    setAsset(cached?.asset);
    setTool('select');
    setError('');
    setViewCommand((v) => ({ id: v.id + 1, kind: 'fit' }));
    if (window.matchMedia('(max-width: 1100px)').matches) setMapListOpen(false);
  }
  async function openMap(id: string) {
    if (busy) return;
    if (id === record?.id) {
      if (window.matchMedia('(max-width: 1100px)').matches) setMapListOpen(false);
      return;
    }
    stashDraft();
    setBusy(true);
    try {
      const cached = drafts.get(id);
      const next = await editorApi.activate(
        id,
        cached
          ? {
              record: { ...cached.record, document: cached.history.present },
              catalog: cached.catalog,
            }
          : undefined,
      );
      showSnapshot(next, cached);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เปิดแมปไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  async function duplicateMap(id: string) {
    if (busy || !record || !catalog || !history) return;
    setBusy(true);
    try {
      const cached = drafts.get(id);
      const source =
        id === record.id
          ? {
              record: { ...record, name: world?.title || record.name, document: history.present },
              catalog,
            }
          : cached
            ? {
                record: { ...cached.record, document: cached.history.present },
                catalog: cached.catalog,
              }
            : await editorApi.read(id);
      setMapDialog({ kind: 'duplicate', source });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อ่านแมปไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  async function createLibraryMap(settings: NewMapSettings) {
    if (!mapDialog || busy) return;
    setBusy(true);
    try {
      const nextCatalog =
        mapDialog.kind === 'new'
          ? await catalogForTileSize(mapDialog.source.catalog, settings.tileSize)
          : structuredClone(mapDialog.source.catalog);
      const nextDoc =
        mapDialog.kind === 'new'
          ? createBlankMap(
              settings.width,
              settings.height,
              settings.floorGid,
              settings.title,
              settings.tileSize,
            )
          : structuredClone(mapDialog.source.record.document);
      setProperty(nextDoc, 'title', settings.title);
      compileDocument(nextDoc, nextCatalog.tiles, nextCatalog.textures, { editor: true });
      stashDraft();
      const next = await editorApi.create({
        catalog: nextCatalog,
        document: nextDoc,
        name: settings.title,
      });
      showSnapshot(next);
      setMaps(await editorApi.list());
      setMapDialog(undefined);
      void toast.success(mapDialog.kind === 'new' ? 'สร้างแมปแล้ว' : 'สร้างสำเนาแมปแล้ว');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างแมปไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  function change(edit: (draft: MapDocument) => void) {
    if (!history || !catalog || busy) return false;
    try {
      const next = structuredClone(history.present);
      edit(next);
      compileDocument(next, catalog.tiles, catalog.textures, { editor: true });
      if (JSON.stringify(next) === JSON.stringify(history.present)) return true;
      setHistory({
        past: [...history.past, history.present].slice(-50),
        present: next,
        future: [],
      });
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'แก้ไขแมปไม่สำเร็จ');
      return false;
    }
  }
  const move = (key: string, x: number, y: number) => {
    const px = gridPosition(x, snap),
      py = gridPosition(y, snap);
    if (!world || px < 0 || py < 0 || px >= world.width || py >= world.height) {
      setError('ตำแหน่งต้องอยู่ในกริดของแมป');
      return false;
    }
    const item = items.find((p) => p.key === key);
    if (tool === 'select' && catalog && item && isLayoutPlacement(catalog, world, item)) {
      setError('Layout ถูกล็อกในโหมดเลือก/ย้าย');
      return false;
    }
    const images = world.objects.filter((o) => item?.objectIds.includes(o.id));
    const rect =
      world.colliders.find((r) => r.id === String(item?.objectIds[0])) ??
      world.zones.find((r) => r.id === item?.objectIds[0]);
    const width = images.length
      ? Math.max(...images.map((o) => o.x + o.width)) - (item?.x ?? 0)
      : (rect?.width ?? 0);
    const height = images.length
      ? Math.max(...images.map((o) => o.y + o.height)) - (item?.y ?? 0)
      : (rect?.height ?? 0);
    if (!gridPlacement(px, py, width, height, snap, world).valid) {
      setError('ชิ้นส่วนต้องอยู่ภายในบล็อกของแมป');
      return false;
    }
    return change((draft) => movePlacement(draft, key, px, py));
  };
  function commandKeys() {
    if (!catalog || !world) return [];
    const keys =
      selection && selectedKeys.includes(selection) ? selectedKeys : selection ? [selection] : [];
    return unlockedSelection(catalog, world, items, keys);
  }
  function copyChosen() {
    if (!document || !catalog || !world || busy) return false;
    const contents = copySelection(document, catalog, world, commandKeys());
    if (!contents?.nodes.length) return false;
    clipboard.current = contents;
    pasteCount.current = 0;
    setHasClipboard(true);
    setSelectionMenu(undefined);
    void toast.success(`คัดลอก ${contents.nodes.length} ชิ้นแล้ว`);
    return true;
  }
  function pasteChosen() {
    const contents = clipboard.current;
    if (!catalog || !contents || busy) return false;
    let keys: string[] = [];
    if (
      change((draft) => {
        keys = pasteSelection(draft, catalog, contents, (pasteCount.current + 1) * (snap || 16));
      })
    ) {
      pasteCount.current += 1;
      setSelectedKeys(keys);
      setSelection(keys[0]);
      setSelectionMenu(undefined);
    }
    return true;
  }
  function removeChosen() {
    if (selection && (tool === 'zone' || tool === 'collider' || tool === 'interact'))
      return eraseRegion({ kind: tool, key: selection });
    const keys = (
      selection && selectedKeys.includes(selection) ? selectedKeys : selection ? [selection] : []
    ).filter((key) => items.some((item) => item.key === key && item.kind !== 'spawn'));
    if (!keys.length || busy) return false;
    if (
      change((draft) => {
        for (const key of keys) removePlacement(draft, key);
      })
    ) {
      setSelectedKeys([]);
      setSelection(undefined);
      setSelectionMenu(undefined);
    }
    return true;
  }
  function eraseRegion(target: Pick<RegionTarget, 'kind' | 'key'>) {
    if (!world || busy) return false;
    const { kind, key } = target;
    const valid =
      kind === 'interact'
        ? world.interactions.some((rect) => `object:${rect.id}` === key)
        : kind === 'collider' && key.startsWith('collision:')
          ? world.colliders.some((rect) => `collision:${rect.id}` === key)
          : items.some((item) => item.key === key && item.kind === kind);
    if (!valid) return false;
    if (
      change((draft) => {
        if (kind === 'interact') updateObjectProperty(draft, key, 'interactEnabled', false);
        else if (key.startsWith('collision:'))
          editAssetCollider(draft, world.colliders, key.slice('collision:'.length), true);
        else removePlacement(draft, key);
      })
    ) {
      setSelectedKeys([]);
      setSelection(undefined);
      setSelectionMenu(undefined);
    }
    return true;
  }
  function layerChosen(action: RenderOrderAction) {
    setSelectionMenu(undefined);
    if (world) change((draft) => reorderSelection(draft, world.objects, commandKeys(), action));
  }
  function alignChosen(action: Alignment) {
    setSelectionMenu(undefined);
    if (world && catalog)
      change((draft) => alignSelection(draft, catalog, world, commandKeys(), action));
  }
  function spaceChosen(action: Spacing) {
    setSelectionMenu(undefined);
    if (world && catalog)
      change((draft) => spaceSelection(draft, catalog, world, commandKeys(), action, snap || 16));
  }
  useEffect(() => {
    selectionCommands.current = {
      enabled: tool === 'select' && !walkMode && !busy && !assetPage,
      removeEnabled: !walkMode && !busy && !assetPage,
      copy: copyChosen,
      paste: pasteChosen,
      remove: removeChosen,
      layer: layerChosen,
      space: spaceChosen,
    };
  });
  function configureMap(settings: MapSettings) {
    const changed = change((draft) => {
      if (settings.kind === 'new') {
        const next = createBlankMap(
          settings.width,
          settings.height,
          settings.floorGid,
          settings.title.trim() || 'แมปใหม่',
        );
        Object.assign(draft, next);
      } else {
        resizeMap(draft, settings.width, settings.height, settings.floorGid);
        if (catalog) {
          const nextWorld = compileDocument(draft, catalog.tiles, catalog.textures, {
            editor: true,
          });
          for (const rect of [...nextWorld.objects, ...nextWorld.colliders, ...nextWorld.zones])
            if (
              rect.x < 0 ||
              rect.y < 0 ||
              rect.x + rect.width > nextWorld.width + 0.01 ||
              rect.y + rect.height > nextWorld.height + 0.01
            )
              throw Error('มีสิ่งของหรือกรอบอยู่นอกขนาดใหม่ ย้ายหรือลบก่อนลดขนาดแมป');
        }
        setProperty(draft, 'title', settings.title.trim() || 'แมปใหม่');
      }
    });
    if (changed) {
      setSelection(undefined);
      setTool('select');
      setViewCommand((v) => ({ id: v.id + 1, kind: 'fit' }));
    }
    return changed;
  }
  async function save() {
    if (!record || !document) return;
    setBusy(true);
    try {
      const next = await editorApi.save({ ...record, name: world?.title || record.name, document });
      setRecord(next);
      setDrafts((saved) => {
        const updated = new Map(saved);
        updated.delete(next.id);
        return updated;
      });
      setMaps(await editorApi.list());
      setBaseline(JSON.stringify(document));
      setError('');
      void toast.success(`บันทึกแล้ว · ไฟล์ถาวร · revision ${next.revision}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(selected: File) {
    if (!catalog) return;
    try {
      if (selected.size > 30 * 1024 * 1024) throw Error('ไฟล์ใหญ่เกิน 30MB');
      const incoming = selected.name.toLowerCase().endsWith('.zip')
        ? importBundle(new Uint8Array(await selected.arrayBuffer()))
        : { document: parseMapDocument(JSON.parse(await selected.text())), catalog };
      compileDocument(incoming.document, incoming.catalog.tiles, incoming.catalog.textures, {
        editor: true,
      });
      getBlueprint(incoming.document);
      await editorApi.setCatalog(incoming.catalog, incoming.document);
      setCatalog(await editorApi.catalog());
      setHistory({ past: [], present: incoming.document, future: [] });
      setSelection(undefined);
      setAsset(undefined);
      setTool('select');
      setViewCommand((v) => ({ id: v.id + 1, kind: 'fit' }));
      void toast.success('นำเข้าฉบับร่างแล้ว กดบันทึกเพื่อเก็บเป็นไฟล์ถาวร');
    } catch (e) {
      void toast.error((e as Error).message);
    }
  }
  if (!catalog || !history || !record || !world)
    return (
      <main className="editor-loading">
        <Spin size="large" />
        <h1>กำลังเปิดพื้นที่ออกแบบ</h1>
        {error && (
          <Alert
            type="error"
            title={error}
            action={<Button onClick={() => setAttempt((v) => v + 1)}>ลองใหม่</Button>}
          />
        )}
        <p>Map Studio เก็บแมปถาวรในโปรเจกต์และส่งออกชุดไฟล์สำหรับ Tiled</p>
      </main>
    );
  const command = (kind: 'fit' | 'in' | 'out') => setViewCommand((v) => ({ id: v.id + 1, kind }));
  const visibleMaps = maps.map((m) => {
    const draft = drafts.get(m.id);
    const preview = m.id === record.id ? history.present : draft?.history.present;
    return preview
      ? {
          ...m,
          name: String(preview.properties?.find((p) => p.name === 'title')?.value || m.name),
          width: preview.width,
          height: preview.height,
          tileSize: preview.tilewidth,
        }
      : m;
  });
  return (
    <div className={`map-studio-shell ${mapListOpen ? 'maps-expanded' : ''}`}>
      <MapLibrary
        maps={visibleMaps}
        activeId={record.id}
        open={mapListOpen}
        busy={busy}
        dirtyIds={dirtyIds}
        onToggle={() => {
          setAssetPage(false);
          setMapListOpen((v) => !v);
          setViewCommand((value) => ({ id: value.id + 1, kind: 'fit' }));
        }}
        assetsActive={assetPage}
        onAssets={() => {
          setAssetPage((value) => !value);
          setWalkMode(false);
          setMapListOpen(false);
          setSelectionMenu(undefined);
          setViewCommand((value) => ({ id: value.id + 1, kind: 'fit' }));
        }}
        onOpen={(id) => void openMap(id)}
        onNew={() =>
          setMapDialog({
            kind: 'new',
            source: { record: { ...record, document: history.present }, catalog },
          })
        }
        onDuplicate={(id) => void duplicateMap(id)}
      />
      {mapDialog && (
        <MapCreateDialog
          kind={mapDialog.kind}
          source={mapDialog.source}
          busy={busy}
          onCancel={() => !busy && setMapDialog(undefined)}
          onCreate={createLibraryMap}
        />
      )}
      {instanceEditor && (
        <BoothEditor
          initial={instanceEditor.prefab}
          creating={false}
          scope="instance"
          catalog={catalog}
          onCancel={() => setInstanceEditor(undefined)}
          onSave={async (prefab) => {
            if (
              !change((draft) => replaceBoothInstance(draft, catalog, instanceEditor.key, prefab))
            )
              throw Error('แก้ไขบูธไม่สำเร็จ ตรวจตำแหน่งชิ้นส่วนให้อยู่ภายในแมป');
            setInstanceEditor(undefined);
          }}
        />
      )}
      <main
        className={`editor-app ${shelfOpen ? '' : 'shelf-closed'} ${assetPage ? 'asset-view-hidden' : ''}`}
        aria-hidden={assetPage}
        inert={assetPage}
      >
        {context}
        <header className="editor-header">
          <Link
            href="/"
            onClick={(e) => {
              if (anyDirty && !window.confirm('มีการแก้ไขที่ยังไม่บันทึก ออกจาก editor หรือไม่?'))
                e.preventDefault();
            }}
            className="editor-back"
          >
            <PixelIcon name="library" /> <span>Map Studio</span>
          </Link>
          <div className="editor-title">
            <h1>{world.title}</h1>
          </div>
          <span className={`save-state ${dirty ? 'dirty' : ''}`}>
            {dirty ? '● ยังไม่บันทึก' : `✓ บันทึกแล้ว · v${record.revision}`}
          </span>
          <Button
            className="shelf-toggle"
            aria-label="เปิด / ปิดคลังชิ้นส่วน"
            aria-expanded={shelfOpen}
            onClick={() => setShelfOpen((v) => !v)}
          >
            <PixelIcon name="library" />
            <span>คลังชิ้นส่วน</span>
          </Button>
          <Button
            className="save-button"
            type="primary"
            loading={busy}
            disabled={!dirty}
            onClick={save}
          >
            <PixelIcon name="save" />
            บันทึกแมป
          </Button>
        </header>
        {error && <Alert banner type="error" title={error} closable onClose={() => setError('')} />}
        <div className="editor-toolbar">
          <label className="inline-field">
            <Switch size="small" checked={grid} onChange={setGrid} /> Grid
          </label>
          <label className="inline-field">
            <Switch
              size="small"
              aria-label="แสดงกรอบชน"
              checked={showCollision}
              onChange={setShowCollision}
            />{' '}
            กรอบชน
          </label>
          <label className="inline-field">
            ขนาดบล็อก
            <Select
              size="small"
              aria-label="ขนาดบล็อก"
              value={snap}
              onChange={(value) => setSnap(gridStep(value))}
              options={[
                { value: 0, label: 'อิสระ' },
                { value: 8, label: '8 px' },
                { value: 16, label: '16 px' },
                { value: 32, label: '32 px' },
              ]}
            />
          </label>
          <details className="studio-menu">
            <summary>
              <PixelIcon name="settings" /> ไฟล์ / ตั้งค่า
            </summary>
            <div className="toolbar-end">
              <StudioControls
                document={document!}
                catalog={catalog}
                blueprint={blueprint}
                onBlueprint={(blueprint) => change((draft) => setBlueprint(draft, blueprint))}
                onMap={configureMap}
              />
              <AssetUpload
                tileSize={document!.tilewidth}
                onAdded={async (key) => {
                  setCatalog(await editorApi.catalog());
                  setAsset(key);
                  setTool('place');
                  setSelection(undefined);
                  setMaps(await editorApi.list());
                }}
              />
              <Button onClick={() => file.current?.click()} disabled={busy}>
                Import TMJ / ZIP
              </Button>
              <Button
                onClick={() => exportTmj(history.present)}
                title="TMJ อย่างเดียวต้องใช้คู่กับ TSJ และภาพจาก ZIP"
              >
                Export TMJ
              </Button>
              <Button
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await exportBundle(history.present, catalog);
                  } catch (e) {
                    void toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Export ชุด Tiled ZIP
              </Button>
            </div>
          </details>
          <input
            ref={file}
            type="file"
            accept=".tmj,.json,.zip"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="editor-body">
          <section className="editor-workspace" aria-label="พื้นที่แก้ไขแมป">
            <EditorViewport
              key={record.id}
              catalog={catalog}
              onToggleWalk={() => {
                setWalkMode((active) => !active);
                setSelection(undefined);
                if (!walkMode && window.matchMedia('(max-width: 1100px)').matches)
                  setShelfOpen(false);
              }}
              state={{
                suspended: assetPage,
                world,
                placements: items,
                selection,
                selectedKeys:
                  selection && selectedKeys.includes(selection)
                    ? selectedKeys
                    : selection
                      ? [selection]
                      : [],
                tool,
                grid,
                snap,
                asset,
                blueprint,
                showCollision,
                zoneAction,
                colliderAction,
                deleteRegionMode,
                walkMode,
              }}
              viewCommand={viewCommand}
              events={{
                select: (key) => {
                  setSelectedKeys([]);
                  setSelection(key);
                  if (key && !key.startsWith('collision:')) {
                    setShelfTab('properties');
                    if (tool !== 'zone' && tool !== 'collider') setShelfOpen(true);
                  }
                },
                move,
                selectMany: (keys) => {
                  setSelectedKeys(keys);
                  setSelection(keys[0]);
                },
                moveMany: (keys, dx, dy) => {
                  change((draft) => moveSelection(draft, world, keys, dx, dy, catalog));
                },
                contextMenu: (point, keys) => {
                  setSelectedKeys(keys);
                  setSelection(keys[0]);
                  setSelectionMenu({ point, keys });
                },
                resizeRegion: (target, rect) => {
                  change((draft) =>
                    setSelection(resizeRegion(draft, catalog, world, target, rect)),
                  );
                },
                eraseRegion,
                place: (x, y) => {
                  if (tool === 'spawn') {
                    const spawn = items.find((i) => i.kind === 'spawn');
                    if (spawn) move(spawn.key, x, y);
                  } else if (asset) {
                    const shape = placementShape(catalog, asset);
                    if (!shape) return;
                    const rect = gridPlacement(x, y, shape.width, shape.height, snap, world);
                    if (rect.valid)
                      change((draft) =>
                        setSelection(addAsset(draft, catalog, asset, rect.x, rect.y)),
                      );
                  }
                },
                paint: (cells) => {
                  const tile = catalog.tiles.find((t) => t.meta.assetKey === asset);
                  if (tile?.meta.ground)
                    change((draft) => {
                      const brush = [];
                      const tileSize = document!.tilewidth;
                      const size = Math.max(tileSize, snap);
                      for (const point of cells) {
                        const x = gridPosition(point.x, size),
                          y = gridPosition(point.y, size);
                        for (let dy = 0; dy < size; dy += tileSize)
                          for (let dx = 0; dx < size; dx += tileSize)
                            brush.push({ x: x + dx, y: y + dy });
                      }
                      paintFloor(draft, brush, tile.gid);
                    });
                },
                placeLayout: (cells) => {
                  const tile = catalog.tiles.find((t) => t.meta.assetKey === asset);
                  if (!asset || tile?.meta.family !== 'Layout') return;
                  const shape = placementShape(catalog, asset);
                  if (!shape) return;
                  change((draft) => {
                    for (const cell of cells) {
                      if (
                        !gridPlacement(cell.x, cell.y, shape.width, shape.height, snap, world).valid
                      )
                        throw Error('ชิ้นส่วนต้องอยู่ภายในแมป');
                      addAsset(draft, catalog, asset, cell.x, cell.y);
                    }
                  });
                },
                eraseLayout: (area) => {
                  const ids = erasableObjectsInArea(catalog, world.objects, area).map((o) => o.id);
                  if (ids.length && change((draft) => removeObjects(draft, ids)))
                    setSelection(undefined);
                },
                error: setError,
                rectangle: (kind, rect) => {
                  const changed = change((draft) => setSelection(addRectangle(draft, kind, rect)));
                  if (kind === 'collider') setShowCollision(true);
                  if (changed) {
                    if (kind === 'zone') setZoneAction('select');
                    else setColliderAction('select');
                    setShelfTab('properties');
                    setShelfOpen(true);
                  }
                },
              }}
            />
            <div className="editor-mode">
              {walkMode
                ? 'ทดลองเดิน · WASD / ลูกศร · กดรูปตัวละครอีกครั้งเพื่อออก'
                : deleteRegionMode &&
                    (tool === 'zone' || tool === 'collider' || tool === 'interact')
                  ? `คลิกเพื่อลบ${tool === 'zone' ? 'พื้นที่' : tool === 'collider' ? 'กรอบชน' : 'กรอบ Interact · เก็บภาพไว้'} · Ctrl+Z / Ctrl+ผ ย้อนกลับ`
                  : tool === 'select'
                    ? selectedKeys.length > 1 && selection && selectedKeys.includes(selection)
                      ? `เลือก ${selectedKeys.length} ชิ้น · ลากในกรอบเพื่อย้ายพร้อมกัน · Ctrl+Z ย้อนกลับ`
                      : 'ลากคลุมเพื่อเลือก · Shift เลือกเพิ่ม · Ctrl+C/V · คลิกขวาจัดวาง · Layout ล็อก'
                    : tool === 'interact'
                      ? 'Interact · ลากกลางกรอบเพื่อย้าย · ลากขอบหรือมุมเพื่อปรับขนาด'
                      : tool === 'spawn'
                        ? 'คลิกเพื่อเปลี่ยนจุดเกิด'
                        : tool === 'paint'
                          ? `ลากคลุมพื้น · ช่องพื้น ${Math.max(document!.tilewidth, snap)} px · ปล่อยเพื่อวาง`
                          : tool === 'erase-layout'
                            ? 'ลากคลุม Layout / Prop · ปล่อยเพื่อลบ · Ctrl+Z ย้อนกลับ'
                            : tool === 'collider'
                              ? colliderAction === 'draw'
                                ? 'ลากเพื่อสร้างกรอบชนใหม่ · Esc ยกเลิก'
                                : 'กรอบชน · ลากกลางเพื่อย้าย · ลากขอบหรือมุมเพื่อปรับขนาด'
                              : tool === 'zone'
                                ? zoneAction === 'draw'
                                  ? 'ลากเพื่อสร้างพื้นที่ใหม่ · Esc ยกเลิก'
                                  : 'พื้นที่ · ลากกลางเพื่อย้าย · ลากขอบหรือมุมเพื่อปรับขนาด'
                                : catalog.tiles.find((t) => t.meta.assetKey === asset)?.meta
                                      .family === 'Layout'
                                  ? 'ลากคลุม Layout · ปล่อยเพื่อวาง · ลากกลับเพื่อลดพื้นที่'
                                  : `คลิกเพื่อวาง · ${asset}`}
            </div>
            {tool === 'zone' && (
              <div className="zone-actions" role="toolbar" aria-label="จัดการพื้นที่">
                <Button
                  aria-pressed={zoneAction === 'draw'}
                  onClick={() => {
                    setDeleteRegionMode(false);
                    setZoneAction((action) => (action === 'draw' ? 'select' : 'draw'));
                    setSelection(undefined);
                  }}
                >
                  สร้างพื้นที่ใหม่
                </Button>
                {items.find((item) => item.key === selection && item.kind === 'zone') && (
                  <>
                    <span className="zone-selected-name">
                      {
                        world.zones.find((zone) => zone.id === Number(selection?.split(':')[1]))
                          ?.label
                      }
                    </span>
                    <Button
                      onClick={() => {
                        setShelfTab('properties');
                        setShelfOpen(true);
                      }}
                    >
                      แก้ไขพื้นที่
                    </Button>
                    <Button
                      danger
                      onClick={() => {
                        if (selection && change((draft) => removePlacement(draft, selection)))
                          setSelection(undefined);
                      }}
                    >
                      ลบพื้นที่
                    </Button>
                  </>
                )}
              </div>
            )}
            {tool === 'collider' && (
              <div
                className="zone-actions collider-actions"
                role="toolbar"
                aria-label="จัดการกรอบชน"
              >
                <Button
                  aria-pressed={colliderAction === 'draw'}
                  onClick={() => {
                    setDeleteRegionMode(false);
                    setColliderAction((action) => (action === 'draw' ? 'select' : 'draw'));
                    setSelection(undefined);
                  }}
                >
                  สร้างกรอบชนใหม่
                </Button>
                {items.find((item) => item.key === selection && item.kind === 'collider') && (
                  <>
                    <span className="zone-selected-name">
                      {items.find((item) => item.key === selection)?.name}
                    </span>
                    <Button
                      onClick={() => {
                        setShelfTab('properties');
                        setShelfOpen(true);
                      }}
                    >
                      แก้ไขกรอบชน
                    </Button>
                    <Button
                      danger
                      onClick={() => {
                        if (selection && change((draft) => removePlacement(draft, selection)))
                          setSelection(undefined);
                      }}
                    >
                      ลบกรอบชน
                    </Button>
                  </>
                )}
                {assetCollider && (
                  <>
                    <span className="zone-selected-name">กรอบชนจาก asset</span>
                    <Button
                      onClick={() => {
                        if (
                          change((draft) =>
                            setSelection(
                              editAssetCollider(draft, world.colliders, assetCollider.id),
                            ),
                          )
                        ) {
                          setShelfTab('properties');
                          setShelfOpen(true);
                        }
                      }}
                    >
                      แก้ไขกรอบชน
                    </Button>
                    <Button
                      danger
                      onClick={() => {
                        if (
                          change((draft) => {
                            editAssetCollider(draft, world.colliders, assetCollider.id, true);
                          })
                        )
                          setSelection(undefined);
                      }}
                    >
                      ลบกรอบชน
                    </Button>
                  </>
                )}
              </div>
            )}
            <ToolDock
              tool={tool}
              deleteRegionMode={deleteRegionMode}
              onRegionAction={(next, action) => {
                setTool(next);
                setZoneAction('select');
                setColliderAction('select');
                setDeleteRegionMode(action === 'delete');
                setSelectedKeys([]);
                setSelection(undefined);
                if (next === 'collider') setShowCollision(true);
              }}
              onTool={(next) => {
                setDeleteRegionMode(false);
                setTool(next);
                if (next === 'zone') setZoneAction('select');
                if (next === 'collider') {
                  setColliderAction('select');
                  setShowCollision(true);
                }
              }}
              canPlace={!!asset}
              canPaint={!!catalog.tiles.find((t) => t.meta.assetKey === asset)?.meta.ground}
              canUndo={!!history.past.length && !busy}
              canRedo={!!history.future.length && !busy}
              onUndo={undo}
              onRedo={redo}
            />
            <div className="editor-zoom">
              <Button aria-label="ซูมออก" onClick={() => command('out')}>
                −
              </Button>
              <Button onClick={() => command('fit')}>พอดีจอ</Button>
              <Button aria-label="ซูมเข้า" onClick={() => command('in')}>
                ＋
              </Button>
            </div>
            <div className="editor-map-meta">
              {world.width} × {world.height} px <span>·</span> {world.summary.booths} บูธ{' '}
              <span>·</span> {world.objects.length} ชิ้น
            </div>
          </section>
          {selectionMenu && tool === 'select' && !walkMode && (
            <SelectionMenu
              point={selectionMenu.point}
              count={commandKeys().length}
              canPaste={hasClipboard}
              onClose={closeSelectionMenu}
              onCopy={copyChosen}
              onPaste={pasteChosen}
              onRemove={removeChosen}
              onLayer={layerChosen}
              onAlign={alignChosen}
              onSpace={spaceChosen}
            />
          )}
          <aside
            className="studio-shelf"
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            aria-label="คลังและรายละเอียดชิ้นส่วน"
            hidden={!shelfOpen}
          >
            <div className="shelf-tabs">
              <button
                type="button"
                aria-pressed={shelfTab === 'assets'}
                onClick={() => setShelfTab('assets')}
              >
                <PixelIcon name="library" /> คลังชิ้นส่วน
              </button>
              <button
                type="button"
                aria-pressed={shelfTab === 'properties'}
                onClick={() => setShelfTab('properties')}
              >
                <PixelIcon name="inspect" /> รายละเอียด
              </button>
              <button
                className="shelf-close"
                type="button"
                aria-label="ปิดคลังชิ้นส่วน"
                onClick={() => setShelfOpen(false)}
              >
                <PixelIcon name="close" />
              </button>
            </div>
            <div className="shelf-page" hidden={shelfTab !== 'assets'}>
              <AssetPalette
                key={catalog.tiles.length}
                catalog={catalog}
                tileSize={document!.tilewidth}
                onCatalogChanged={(next) => {
                  setCatalog(next);
                  if (
                    asset &&
                    !next.prefabs.some((prefab) => prefab.key === asset) &&
                    !next.tiles.some((tile) => tile.meta.assetKey === asset)
                  ) {
                    setAsset(undefined);
                    setTool('select');
                  }
                }}
                active={asset}
                onInteract={() => {
                  setDeleteRegionMode(false);
                  setTool('interact');
                }}
                onSelect={(key, floor) => {
                  setAsset(key);
                  setTool(floor ? 'paint' : 'place');
                  if (window.matchMedia('(max-width: 760px)').matches) setShelfOpen(false);
                }}
              />
            </div>
            <div className="shelf-page" hidden={shelfTab !== 'properties'}>
              <PropertiesPanel
                onEditBooth={() => {
                  if (!selection) return;
                  try {
                    setInstanceEditor({
                      key: selection,
                      prefab: boothInstance(history.present, catalog, selection).prefab,
                    });
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'เปิดบูธไม่สำเร็จ');
                  }
                }}
                objects={world.objects}
                onRestoreOrder={() =>
                  selection &&
                  change((draft) => restoreRenderOrder(draft, world.objects, selection))
                }
                onOrder={(action) =>
                  selection &&
                  change((draft) => reorderPlacement(draft, world.objects, selection, action))
                }
                step={snap || 1}
                document={history.present}
                catalog={catalog}
                items={items}
                selection={selection}
                onSelect={(key) => {
                  setDeleteRegionMode(false);
                  setSelection(key);
                  const kind = items.find((item) => item.key === key)?.kind;
                  if (kind === 'zone') {
                    setTool('zone');
                    setZoneAction('select');
                  } else if (kind === 'collider') {
                    setTool('collider');
                    setColliderAction('select');
                    setShowCollision(true);
                  } else setTool('select');
                }}
                onMove={move}
                onRename={(name) => change((draft) => renamePlacement(draft, selection!, name))}
                onRemove={() => {
                  change((draft) => removePlacement(draft, selection!));
                  setSelection(undefined);
                }}
                onNpc={(name, value) =>
                  change((draft) => {
                    const n = findNode(draft, selection!);
                    const property = n?.properties?.find((p) => p.name === name);
                    if (property) property.value = value;
                  })
                }
                onSize={(axis, value, preserveRatio) =>
                  selection &&
                  change((draft) => resizeObject(draft, selection, axis, value, preserveRatio))
                }
                onRestoreSize={() =>
                  selection && change((draft) => restoreObjectSize(draft, catalog, selection))
                }
                onProperty={(name, value) => {
                  if (selection)
                    change((draft) => updateObjectProperty(draft, selection, name, value));
                  if (name.startsWith('interact')) setTool('interact');
                }}
              />
            </div>
          </aside>
        </div>
      </main>
      {assetPage && (
        <AssetManager
          catalog={catalog}
          onBusy={setBusy}
          onBack={() => {
            setAssetPage(false);
            setViewCommand((value) => ({ id: value.id + 1, kind: 'fit' }));
          }}
          onCatalogChanged={(next) => {
            setCatalog(next);
            if (next.tiles.some((tile) => tile.meta.assetKey === asset && tile.meta.editorHidden))
              setAsset(undefined);
          }}
        />
      )}
    </div>
  );
}
