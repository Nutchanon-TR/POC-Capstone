import Phaser from 'phaser';
import type { WorldData } from '@/game/types';
import type { Catalog } from '../../../shared/map/types';
import { erasableObjectsInArea, type Placement } from '../../../shared/map/editor';
import { gameConfig } from '@/game/config';
import type { Blueprint } from '../../../shared/map/studio';
import {
  gridPosition,
  gridStep,
  placementShape,
  gridPlacement,
  rectangleCells,
  cellArea,
  type GridArea,
  zoneAtPoint,
} from '../../../shared/map/grid';
import { isEditingTarget } from './shortcuts';
import { WalkPreview } from './WalkPreview';
import type { Direction } from '@/game/types';
import {
  handlePoint,
  hitResizeHandle,
  resizeHandles,
  resizeRectangle,
  selectInRectangle,
  selectionBounds,
  normalizedSelection,
  unlockedSelection,
  isLayoutPlacement,
  type RegionTarget,
  type ResizeHandle,
} from '../../../shared/map/transform';
declare global {
  interface Window {
    __EXHIBITION_EDITOR__?: Phaser.Game;
  }
}
export type EditorTool =
  'select' | 'place' | 'paint' | 'erase-layout' | 'spawn' | 'collider' | 'zone' | 'interact';
export type EditorState = {
  suspended?: boolean;
  world: WorldData;
  placements: Placement[];
  selection?: string;
  selectedKeys?: string[];
  tool: EditorTool;
  grid: boolean;
  snap: number;
  asset?: string;
  blueprint?: Blueprint;
  showCollision: boolean;
  zoneAction: 'select' | 'draw';
  colliderAction: 'select' | 'draw';
  deleteRegionMode: boolean;
  walkMode: boolean;
};
export type EditorEvents = {
  ready?: () => void;
  select: (key?: string) => void;
  move: (key: string, x: number, y: number) => void;
  selectMany: (keys: string[]) => void;
  moveMany: (keys: string[], dx: number, dy: number) => void;
  resizeRegion: (target: RegionTarget, rect: GridArea) => void;
  eraseRegion: (target: Pick<RegionTarget, 'kind' | 'key'>) => void;
  contextMenu: (point: { x: number; y: number }, keys: string[]) => void;
  place: (x: number, y: number) => void;
  paint: (cells: { x: number; y: number }[]) => void;
  placeLayout: (cells: { x: number; y: number }[]) => void;
  eraseLayout: (area: GridArea) => void;
  error: (message: string) => void;
  rectangle: (
    kind: 'collider' | 'zone',
    rect: { x: number; y: number; width: number; height: number },
  ) => void;
};
export class EditorScene extends Phaser.Scene {
  private state?: EditorState;
  private ready = false;
  private disposed = false;
  private loadFailed = false;
  private content: Phaser.GameObjects.GameObject[] = [];
  private overlay!: Phaser.GameObjects.Graphics;
  private controls!: Phaser.GameObjects.Graphics;
  private dragged = false;
  private marquee?: { x: number; y: number };
  private marqueeBase: string[] = [];
  private pointerHit = false;
  private shiftPressed = false;
  private moveKeys: string[] = [];
  private resizing?: { target: RegionTarget; handle: ResizeHandle; preview: GridArea };
  private fill?: {
    kind: 'paint' | 'layout' | 'erase';
    start: { x: number; y: number };
    stride: { width: number; height: number };
    cells: { x: number; y: number }[];
    key: string;
  };
  private fillGhost?: Phaser.GameObjects.Container;
  private spacePressed = false;
  private panning = false;
  private start?: { x: number; y: number; px: number; py: number; key: string };
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private regionViews = new Map<number, Phaser.GameObjects.Container>();
  private drawing?: { x: number; y: number };
  private gesture!: Phaser.GameObjects.Graphics;
  private blueprintSource?: string;
  private blueprintKey = 'studio-blueprint';
  private ghost?: Phaser.GameObjects.Container;
  private ghostOutline?: Phaser.GameObjects.Graphics;
  private ghostKey = '';
  private ghostShape?: ReturnType<typeof placementShape>;
  private pointerInside = false;
  private walker?: WalkPreview;
  constructor(
    private catalog: Catalog,
    private callbacks: EditorEvents,
  ) {
    super('MapEditor');
  }
  preload() {
    WalkPreview.preload(this);
    for (const t of this.catalog.textures) this.load.image(t.key, t.url);
    this.load.on('loaderror', (f: Phaser.Loader.File) => {
      this.loadFailed = true;
      this.callbacks.error(`โหลด asset ${f.key} ไม่สำเร็จ`);
    });
  }
  create() {
    if (this.loadFailed || this.disposed) return;
    this.ready = true;
    this.overlay = this.add.graphics().setDepth(200000);
    this.controls = this.add.graphics().setDepth(200007);
    this.gesture = this.add.graphics().setDepth(200006);
    this.ghostOutline = this.add.graphics().setDepth(200003);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    this.input.on('gameover', () => {
      this.pointerInside = true;
    });
    this.input.on('gameout', () => {
      this.pointerInside = false;
      this.hideGhost();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
    this.scale.on('resize', this.fit, this);
    if (this.state) {
      this.render(this.state);
      this.fit();
    }
    this.callbacks.ready?.();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.state) return;
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      if (
        p.rightButtonDown() &&
        !this.spacePressed &&
        this.state.tool === 'select' &&
        !this.state.walkMode
      ) {
        this.cancelGesture();
        const chosen = this.selectedKeys(),
          bounds = selectionBounds(this.state.world, this.state.placements, chosen);
        const inside =
          bounds &&
          point.x >= bounds.x &&
          point.y >= bounds.y &&
          point.x <= bounds.x + bounds.width &&
          point.y <= bounds.y + bounds.height;
        const object = [...this.state.world.objects]
          .sort((a, b) => b.depth - a.depth)
          .find(
            (object) =>
              point.x >= object.x &&
              point.y >= object.y &&
              point.x <= object.x + object.width &&
              point.y <= object.y + object.height,
          );
        const item = this.state.placements.find((item) =>
          item.objectIds.includes(object?.id ?? -1),
        );
        const keys = inside
          ? chosen
          : item
            ? unlockedSelection(this.catalog, this.state.world, this.state.placements, [item.key])
            : [];
        const box = this.game.canvas.getBoundingClientRect();
        this.callbacks.contextMenu({ x: box.left + p.x, y: box.top + p.y }, keys);
        return;
      }
      if (p.rightButtonDown() || this.spacePressed) {
        this.cancelGesture();
        this.panning = true;
        this.game.canvas.style.cursor = 'grabbing';
        return;
      }
      if (this.state.walkMode) return;
      this.dragged = false;
      this.pointerInside = true;
      if (this.deletingRegion()) {
        const target = this.resizeTargets().find(
          ({ rect }) =>
            point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height,
        );
        if (target) this.callbacks.eraseRegion(target);
        return;
      }
      if (this.beginResize(point)) return;
      if (this.state.tool === 'select') {
        if (this.pointerHit) {
          this.pointerHit = false;
          return;
        }
        if (this.start) return;
        const additive = this.shiftPressed || p.event?.shiftKey === true;
        this.marqueeBase = additive ? this.selectedKeys() : [];
        const keys = this.selectedKeys();
        const bounds = selectionBounds(this.state.world, this.state.placements, keys);
        const item = this.state.placements.find((item) => item.key === keys[0]);
        if (
          !additive &&
          keys.length > 1 &&
          bounds &&
          item &&
          Phaser.Geom.Rectangle.Contains(
            new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height),
            point.x,
            point.y,
          )
        )
          this.beginMove(item, point);
        else
          this.marquee = {
            x: Phaser.Math.Clamp(point.x, 0, this.state.world.width),
            y: Phaser.Math.Clamp(point.y, 0, this.state.world.height),
          };
        return;
      }
      if (this.state.tool === 'interact') {
        const region = zoneAtPoint(this.state.world.interactions, point);
        const item = this.state.placements.find((i) => i.key === `object:${region?.id}`);
        if (item) {
          this.start = { x: item.x, y: item.y, px: point.x, py: point.y, key: item.key };
          this.callbacks.select(item.key);
        } else this.callbacks.select(undefined);
        return;
      }
      const regionKind =
        this.state.tool === 'zone'
          ? 'zone'
          : this.state.tool === 'collider'
            ? 'collider'
            : undefined;
      const regionAction =
        regionKind === 'zone' ? this.state.zoneAction : this.state.colliderAction;
      if (regionKind && regionAction === 'select') {
        const selected = this.state.placements.find(
          (item) => item.key === this.state?.selection && item.kind === regionKind,
        );
        const regions =
          regionKind === 'zone' ? this.state.world.zones : this.editableColliders(this.state);
        const zone = zoneAtPoint(regions, point, selected?.objectIds[0]);
        const item = this.state.placements.find(
          (item) => item.kind === regionKind && item.objectIds.includes(zone?.id ?? -1),
        );
        if (zone && item) {
          this.start = { x: item.x, y: item.y, px: point.x, py: point.y, key: item.key };
          this.callbacks.select(item.key);
          return;
        }
        if (regionKind === 'collider') {
          const generated = zoneAtPoint(
            this.state.world.colliders
              .filter((rect) => rect.id.includes(':'))
              .map((rect, index) => ({ ...rect, sourceId: rect.id, id: index })),
            point,
          );
          if (generated) {
            this.callbacks.select(`collision:${generated.sourceId}`);
            return;
          }
        }
        this.callbacks.select(undefined);
      }
      const layout =
        this.catalog.tiles.find((t) => t.meta.assetKey === this.state?.asset)?.meta.family ===
        'Layout';
      if (
        this.state.tool === 'paint' ||
        (this.state.tool === 'place' && layout) ||
        this.state.tool === 'erase-layout'
      ) {
        const erase = this.state.tool === 'erase-layout';
        const rect = erase
          ? gridPlacement(
              point.x,
              point.y,
              this.state.snap || this.state.world.tileSize,
              this.state.snap || this.state.world.tileSize,
              this.state.snap,
              this.state.world,
            )
          : this.refreshGhost(p);
        if (rect?.valid) {
          this.fill = {
            kind: erase ? 'erase' : this.state.tool === 'paint' ? 'paint' : 'layout',
            start: { x: rect.x, y: rect.y },
            stride: { width: rect.width, height: rect.height },
            cells: [],
            key: '',
          };
          this.refreshFill(p);
        }
        return;
      }
      if (this.state.tool === 'place') {
        const rect = this.refreshGhost(p);
        if (rect?.valid) this.callbacks.place(rect.x, rect.y);
      }
      if (
        this.state.tool === 'spawn' &&
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.state.world.width &&
        point.y < this.state.world.height
      )
        this.callbacks.place(this.snap(point.x), this.snap(point.y));
      if (this.state.tool === 'collider' || this.state.tool === 'zone')
        this.drawing = { x: this.snap(point.x), y: this.snap(point.y) };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointerInside =
        p.x >= 0 && p.y >= 0 && p.x < this.scale.width && p.y < this.scale.height;
      if (!this.state) return;
      if (p.isDown && this.panning) {
        this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
        return;
      }
      if (this.state.walkMode) return;
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.resizing) {
        if (Phaser.Math.Distance.Between(p.x, p.y, p.downX, p.downY) <= 4) return;
        this.dragged = true;
        if (this.resizing.target.key.startsWith('object:'))
          this.regionViews.get(Number(this.resizing.target.key.split(':')[1]))?.setVisible(false);
        this.resizing.preview = resizeRectangle(
          this.resizing.target.rect,
          this.resizing.handle,
          point,
          this.state.snap,
          this.state.world,
        );
        this.drawTransform(
          this.resizing.preview,
          this.resizing.target.kind === 'interact'
            ? 0xe8b51c
            : this.resizing.target.kind === 'zone'
              ? 0x289ce9
              : 0xd97951,
          true,
        );
        this.game.canvas.dataset.resizePreview = JSON.stringify(this.resizing.preview);
        this.refreshControls();
        return;
      }
      if (!p.isDown) {
        const target = this.resizeTargets().find((target) =>
          hitResizeHandle(target.rect, point, this.cameras.main.zoom),
        );
        const handle = target && hitResizeHandle(target.rect, point, this.cameras.main.zoom);
        const cursors = {
          nw: 'nwse-resize',
          se: 'nwse-resize',
          ne: 'nesw-resize',
          sw: 'nesw-resize',
          n: 'ns-resize',
          s: 'ns-resize',
          e: 'ew-resize',
          w: 'ew-resize',
        };
        this.game.canvas.style.cursor = this.spacePressed
          ? 'grab'
          : this.deletingRegion()
            ? 'crosshair'
            : handle
              ? cursors[handle]
              : '';
      }
      if (this.marquee && p.isDown) {
        const rect = this.marqueeRect(point);
        this.drawTransform(rect, 0x41b9ff);
        this.game.canvas.dataset.marqueePreview = JSON.stringify(rect);
        return;
      }
      if (this.fill) this.refreshFill(p);
      else this.refreshGhost(p);
      if (!p.isDown) return;
      if (this.drawing) {
        const rect = this.drawnRectangle(p);
        const zone = this.state.tool === 'zone';
        this.gesture
          .clear()
          .fillStyle(zone ? 0x69c7ff : 0xffad66, zone ? 0.2 : 0.08)
          .fillRect(rect.x, rect.y, rect.width, rect.height)
          .lineStyle(2 / this.cameras.main.zoom, zone ? 0x289ce9 : 0xffad66, 1)
          .strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
      if (this.start) {
        if (Phaser.Math.Distance.Between(p.x, p.y, p.downX, p.downY) <= 4) return;
        this.dragged = true;
        this.controls.clear();
        const { dx, dy } = this.moveDelta(point);
        const keys = this.moveKeys.length ? this.moveKeys : [this.start.key];
        const ids = new Set(
          this.state.placements
            .filter((item) => keys.includes(item.key))
            .flatMap((item) => item.objectIds),
        );
        for (const id of ids) {
          const sprite = this.sprites.get(id),
            item = this.state.world.objects.find((o) => o.id === id);
          if (sprite && item) sprite.setPosition(item.x + dx, item.y + dy);
          const zone = this.state.world.zones.find((zone) => zone.id === id);
          if (zone) this.regionViews.get(id)?.setPosition(zone.x + dx, zone.y + dy);
          const collider = this.state.world.colliders.find((rect) => rect.id === String(id));
          if (collider) this.regionViews.get(id)?.setPosition(collider.x + dx, collider.y + dy);
          const interaction = this.state.world.interactions.find((rect) => rect.id === id);
          if (interaction)
            this.regionViews.get(id)?.setPosition(interaction.x + dx, interaction.y + dy);
        }
        const bounds = selectionBounds(this.state.world, this.state.placements, keys);
        if (bounds) this.drawTransform({ ...bounds, x: bounds.x + dx, y: bounds.y + dy }, 0x41b9ff);
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.panning) {
        this.panning = false;
        this.game.canvas.style.cursor = this.spacePressed ? 'grab' : '';
        return;
      }
      if (this.resizing) {
        const { target, handle } = this.resizing;
        const rect = resizeRectangle(
          target.rect,
          handle,
          point,
          this.state?.snap ?? 32,
          this.state!.world,
        );
        this.cancelGesture();
        if (
          this.dragged &&
          JSON.stringify(rect) !==
            JSON.stringify({
              x: target.rect.x,
              y: target.rect.y,
              width: target.rect.width,
              height: target.rect.height,
            })
        )
          this.callbacks.resizeRegion(target, rect);
        return;
      }
      if (this.marquee && this.state) {
        const rect = this.marqueeRect(point);
        const keys =
          Math.hypot(p.x - p.downX, p.y - p.downY) > 4
            ? unlockedSelection(this.catalog, this.state.world, this.state.placements, [
                ...this.marqueeBase,
                ...selectInRectangle(this.state.world, this.state.placements, rect),
              ])
            : this.marqueeBase;
        this.cancelGesture();
        this.callbacks.selectMany(keys);
        return;
      }
      if (this.fill) {
        this.refreshFill(p);
        const fill = this.fill,
          area = cellArea(fill.cells, fill.stride);
        this.cancelGesture();
        if (area) {
          if (fill.kind === 'paint') this.callbacks.paint(fill.cells);
          else if (fill.kind === 'layout') this.callbacks.placeLayout(fill.cells);
          else this.callbacks.eraseLayout(area);
        }
        return;
      }
      if (this.drawing && (this.state?.tool === 'collider' || this.state?.tool === 'zone')) {
        const rect = this.drawnRectangle(p);
        if (rect.width && rect.height) this.callbacks.rectangle(this.state.tool, rect);
      }
      this.drawing = undefined;
      this.gesture.clear();
      if (this.start && this.dragged) {
        const { dx, dy } = this.moveDelta(point);
        if (this.moveKeys.length > 1) this.callbacks.moveMany(this.moveKeys, dx, dy);
        else this.callbacks.move(this.start.key, this.start.x + dx, this.start.y + dy);
      }
      this.start = undefined;
      this.cancelGesture();
    });
    this.input.on('pointerupoutside', () => {
      this.cancelGesture();
      this.panning = false;
      this.game.canvas.style.cursor = this.spacePressed ? 'grab' : '';
      if (this.state) this.render(this.state);
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) =>
      this.zoom(dy > 0 ? -0.1 : 0.1),
    );
    this.game.canvas.oncontextmenu = (e) => e.preventDefault();
  }
  private snap(n: number) {
    return gridPosition(n, this.state?.snap ?? 32);
  }
  private selectedKeys() {
    const state = this.state;
    if (!state) return [];
    return unlockedSelection(
      this.catalog,
      state.world,
      state.placements,
      state.selectedKeys ?? (state.selection ? [state.selection] : []),
    );
  }
  private beginMove(item: Placement, point: { x: number; y: number }, additive = false) {
    this.pointerHit = true;
    if (this.state && isLayoutPlacement(this.catalog, this.state.world, item)) {
      if (!additive) this.callbacks.select(item.key);
      return;
    }
    const chosen = this.selectedKeys();
    if (additive) {
      this.callbacks.selectMany(
        chosen.includes(item.key)
          ? chosen.filter((key) => key !== item.key)
          : normalizedSelection(this.state?.placements ?? [], [...chosen, item.key]),
      );
      return;
    }
    this.moveKeys = chosen.includes(item.key) ? chosen : [item.key];
    this.start = { x: item.x, y: item.y, px: point.x, py: point.y, key: item.key };
    if (this.moveKeys.length <= 1) this.callbacks.select(item.key);
  }
  private moveDelta(point: { x: number; y: number }) {
    const start = this.start;
    if (!start || !this.state) return { dx: 0, dy: 0 };
    let dx = this.dragSnap(start.x + point.x - start.px) - start.x;
    let dy = this.dragSnap(start.y + point.y - start.py) - start.y;
    if (this.moveKeys.length > 1) {
      const bounds = selectionBounds(this.state.world, this.state.placements, this.moveKeys);
      if (bounds) {
        dx = Phaser.Math.Clamp(dx, -bounds.x, this.state.world.width - bounds.x - bounds.width);
        dy = Phaser.Math.Clamp(dy, -bounds.y, this.state.world.height - bounds.y - bounds.height);
      }
    }
    return { dx, dy };
  }
  private marqueeRect(point: { x: number; y: number }) {
    const start = this.marquee ?? point;
    const x = Phaser.Math.Clamp(point.x, 0, this.state?.world.width ?? 0);
    const y = Phaser.Math.Clamp(point.y, 0, this.state?.world.height ?? 0);
    return {
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    };
  }
  private deletingRegion() {
    return (
      this.state?.deleteRegionMode && ['zone', 'collider', 'interact'].includes(this.state.tool)
    );
  }
  private resizeTargets(): RegionTarget[] {
    const state = this.state;
    if (!state || state.walkMode) return [];
    let targets: RegionTarget[] = [];
    if (state.tool === 'interact')
      targets = state.world.interactions.map((rect) => ({
        kind: 'interact',
        key: `object:${rect.id}`,
        rect,
      }));
    if (state.tool === 'zone' && state.zoneAction === 'select')
      targets = state.world.zones.map((rect) => ({ kind: 'zone', key: `object:${rect.id}`, rect }));
    if (state.tool === 'collider' && state.colliderAction === 'select')
      targets = state.world.colliders.map((rect) => ({
        kind: 'collider',
        key: rect.id.includes(':') ? `collision:${rect.id}` : `object:${rect.id}`,
        rect,
      }));
    return targets.sort(
      (a, b) =>
        Number(b.key === state.selection) - Number(a.key === state.selection) ||
        a.rect.width * a.rect.height - b.rect.width * b.rect.height,
    );
  }
  private beginResize(point: { x: number; y: number }) {
    for (const target of this.resizeTargets()) {
      const handle = hitResizeHandle(target.rect, point, this.cameras.main.zoom);
      if (!handle) continue;
      this.resizing = { target, handle, preview: target.rect };
      this.callbacks.select(target.key);
      return true;
    }
    return false;
  }
  private drawTransform(rect: GridArea, color: number, handles = false, graphics = this.gesture) {
    const zoom = this.cameras.main.zoom;
    graphics
      .clear()
      .fillStyle(color, 0.12)
      .fillRect(rect.x, rect.y, rect.width, rect.height)
      .lineStyle(2 / zoom, color, 1)
      .strokeRect(rect.x, rect.y, rect.width, rect.height);
    if (handles)
      for (const handle of resizeHandles) {
        const at = handlePoint(rect, handle),
          size = 8 / zoom;
        graphics
          .fillStyle(0xffffff, 1)
          .fillRect(at.x - size / 2, at.y - size / 2, size, size)
          .lineStyle(1 / zoom, color, 1)
          .strokeRect(at.x - size / 2, at.y - size / 2, size, size);
      }
  }
  private refreshControls() {
    if (!this.ready || !this.state) return;
    this.controls.clear();
    const keys = this.selectedKeys();
    this.game.canvas.dataset.selectionKeys = JSON.stringify(keys);
    delete this.game.canvas.dataset.resizeHandles;
    if (this.state.walkMode) return;
    const target = this.resizeTargets().find((target) => target.key === this.state?.selection);
    if (target) {
      const rect = this.resizing?.preview ?? target.rect;
      this.drawTransform(
        rect,
        target.kind === 'interact' ? 0xe8b51c : target.kind === 'zone' ? 0x289ce9 : 0xd97951,
        true,
        this.controls,
      );
      this.game.canvas.dataset.resizeHandles = JSON.stringify(
        resizeHandles.map((handle) => ({ handle, ...handlePoint(rect, handle) })),
      );
    } else if (this.state.tool === 'select' && keys.length > 1) {
      const bounds = selectionBounds(this.state.world, this.state.placements, keys);
      if (bounds) this.drawTransform(bounds, 0x41b9ff, false, this.controls);
    }
  }
  dispose() {
    this.disposed = true;
    this.ready = false;
    this.state = undefined;
    this.start = undefined;
    this.marquee = undefined;
    this.resizing = undefined;
    this.moveKeys = [];
    this.fill = undefined;
    this.drawing = undefined;
    this.panning = false;
    this.spacePressed = false;
    this.walker?.destroy();
    this.walker = undefined;
    this.scale?.off('resize', this.fit, this);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
  }
  private dragSnap(n: number) {
    const step = gridStep(this.state?.snap ?? 32);
    if (!step) return gridPosition(n, 0);
    return Math.round(n / step) * step;
  }
  private keyDown = (event: KeyboardEvent) => {
    if (this.state?.suspended || isEditingTarget(event.target)) return;
    if (event.key === 'Shift') this.shiftPressed = true;
    if (!event.ctrlKey && !event.metaKey && !event.altKey && this.walker?.key(event.code, true)) {
      event.preventDefault();
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      if (!this.spacePressed) this.cancelGesture();
      this.spacePressed = true;
      if (this.input.activePointer.isDown) this.panning = true;
      this.hideGhost();
      this.game.canvas.style.cursor = this.panning ? 'grabbing' : 'grab';
    } else if (
      event.key === 'Escape' ||
      ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()))
    ) {
      this.cancelGesture();
      if (this.state) this.render(this.state);
    }
  };
  private keyUp = (event: KeyboardEvent) => {
    if (event.key === 'Shift') this.shiftPressed = false;
    this.walker?.key(event.code, false);
    if (event.code === 'Space') {
      this.spacePressed = false;
      this.game.canvas.style.cursor = this.panning ? 'grabbing' : '';
    }
  };
  private blur = () => {
    this.shiftPressed = false;
    this.walker?.release();
    this.spacePressed = false;
    this.panning = false;
    this.cancelGesture();
    this.game.canvas.style.cursor = '';
    if (this.state) this.render(this.state);
  };
  cancelGesture() {
    // React can send a command before Phaser has attached the scene to its game.
    if (!this.ready) return;
    for (const view of this.regionViews.values()) view.setVisible(true);
    for (const object of this.state?.world.objects ?? [])
      this.sprites.get(object.id)?.setPosition(object.x, object.y);
    for (const zone of this.state?.world.zones ?? [])
      this.regionViews.get(zone.id)?.setPosition(zone.x, zone.y);
    for (const rect of this.state?.world.interactions ?? [])
      this.regionViews.get(rect.id)?.setPosition(rect.x, rect.y);
    for (const rect of this.state ? this.editableColliders(this.state) : [])
      this.regionViews.get(rect.id)?.setPosition(rect.x, rect.y);
    this.fill = undefined;
    this.fillGhost?.destroy(true);
    this.fillGhost = undefined;
    this.start = undefined;
    this.marquee = undefined;
    this.marqueeBase = [];
    this.pointerHit = false;
    this.resizing = undefined;
    this.moveKeys = [];
    this.drawing = undefined;
    this.gesture?.clear();
    this.hideGhost();
    delete this.game.canvas.dataset.dragPreview;
    delete this.game.canvas.dataset.marqueePreview;
    delete this.game.canvas.dataset.resizePreview;
    this.refreshControls();
  }
  private refreshFill(pointer: Phaser.Input.Pointer) {
    const fill = this.fill,
      state = this.state;
    if (!fill || !state) return;
    this.hideGhost();
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const end = {
      x: this.snap(Phaser.Math.Clamp(point.x, 0, state.world.width - 1)),
      y: this.snap(Phaser.Math.Clamp(point.y, 0, state.world.height - 1)),
    };
    const cells = rectangleCells(fill.start, end, fill.stride, state.world);
    const area = cellArea(cells, fill.stride);
    const key = JSON.stringify(area);
    if (key === fill.key) return;
    fill.key = key;
    fill.cells = cells;
    this.fillGhost?.destroy(true);
    this.fillGhost = undefined;
    this.gesture.clear();
    if (!area) return;
    const color = fill.kind === 'erase' ? 0xff8177 : 0x76c8a9;
    this.gesture
      .lineStyle(2 / this.cameras.main.zoom, color, 1)
      .fillStyle(color, 0.12)
      .fillRect(area.x, area.y, area.width, area.height)
      .strokeRect(area.x, area.y, area.width, area.height);
    let count = cells.length;
    if (fill.kind === 'erase') {
      const objects = erasableObjectsInArea(this.catalog, state.world.objects, area);
      count = objects.length;
      for (const o of objects)
        this.gesture.fillStyle(color, 0.38).fillRect(o.x, o.y, o.width, o.height);
    } else {
      const shape = placementShape(
        this.catalog,
        state.asset!,
        state.snap,
        fill.kind === 'paint',
        state.world.tileSize,
      );
      if (shape) {
        this.fillGhost = this.add.container(0, 0).setDepth(200002).setAlpha(0.42);
        for (const cell of cells)
          for (const part of shape.parts)
            this.fillGhost.add(
              this.add
                .image(cell.x + part.x, cell.y + part.y, part.texture)
                .setOrigin(0)
                .setDisplaySize(part.width, part.height),
            );
      }
    }
    this.game.canvas.dataset.dragPreview = JSON.stringify({
      kind: fill.kind,
      ...area,
      count,
      alpha: 0.42,
    });
  }
  private hideGhost() {
    this.ghost?.setVisible(false);
    this.ghostOutline?.clear();
    this.game.canvas.dataset.previewVisible = 'false';
  }
  private refreshGhost(pointer: Phaser.Input.Pointer) {
    const state = this.state;
    if (
      !this.ready ||
      !state ||
      this.fill ||
      this.spacePressed ||
      state.walkMode ||
      this.panning ||
      !this.pointerInside ||
      !state.asset ||
      (state.tool !== 'place' && state.tool !== 'paint')
    ) {
      this.hideGhost();
      return undefined;
    }
    const key = `${state.asset}:${state.snap}:${state.tool}`;
    const shape =
      key === this.ghostKey && this.ghostShape
        ? this.ghostShape
        : placementShape(
            this.catalog,
            state.asset,
            state.snap,
            state.tool === 'paint',
            state.world.tileSize,
          );
    if (!shape) {
      this.hideGhost();
      return undefined;
    }
    if (key !== this.ghostKey || !this.ghost) {
      this.ghost?.destroy(true);
      this.ghost = this.add.container(0, 0).setDepth(200002).setAlpha(0.42);
      for (const part of shape.parts)
        this.ghost.add(
          this.add
            .image(part.x, part.y, part.texture)
            .setOrigin(0)
            .setDisplaySize(part.width, part.height),
        );
      this.ghostKey = key;
      this.ghostShape = shape;
    }
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const rect = gridPlacement(
      point.x,
      point.y,
      shape.width,
      shape.height,
      state.tool === 'paint' ? Math.max(state.world.tileSize, state.snap) : state.snap,
      state.world,
    );
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= state.world.width ||
      point.y >= state.world.height
    ) {
      this.hideGhost();
      return undefined;
    }
    this.ghost.setPosition(rect.x, rect.y).setVisible(true);
    this.ghostOutline
      ?.clear()
      .lineStyle(2 / this.cameras.main.zoom, rect.valid ? 0x76c8a9 : 0xff8177, 1)
      .fillStyle(rect.valid ? 0x76c8a9 : 0xff8177, 0.08)
      .fillRect(rect.x, rect.y, rect.width, rect.height)
      .strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.game.canvas.dataset.placementPreview = JSON.stringify({
      asset: state.asset,
      ...rect,
      alpha: 0.42,
    });
    this.game.canvas.dataset.previewVisible = 'true';
    return rect;
  }
  walkDirection(direction: Direction, pressed: boolean) {
    this.walker?.press(direction, pressed);
  }
  update(time: number, delta: number) {
    if (this.state?.walkMode) {
      this.walker?.update(this.state.world, time, delta);
      return;
    }
    if (this.pointerInside && !this.fill) this.refreshGhost(this.input.activePointer);
  }
  private drawnRectangle(pointer: Phaser.Input.Pointer) {
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const start = this.drawing || point;
    const x = this.snap(point.x),
      y = this.snap(point.y);
    return {
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    };
  }
  private prepareBlueprint(blueprint?: Blueprint) {
    if (!blueprint) {
      this.blueprintSource = undefined;
      return;
    }
    if (this.blueprintSource === blueprint.url) return;
    this.blueprintSource = blueprint.url;
    if (this.textures.exists(this.blueprintKey)) this.textures.remove(this.blueprintKey);
    const image = new Image();
    image.src = blueprint.url;
    void image
      .decode()
      .then(() => {
        if (!this.ready || this.blueprintSource !== blueprint.url) return;
        if (this.textures.exists(this.blueprintKey)) this.textures.remove(this.blueprintKey);
        this.textures.addImage(this.blueprintKey, image);
        if (this.state) this.render(this.state);
      })
      .catch(() => this.ready && this.callbacks.error('โหลดภาพ blueprint ไม่สำเร็จ'));
  }
  private editableColliders(state: EditorState) {
    return state.placements
      .filter((item) => item.kind === 'collider')
      .flatMap((item) => {
        const id = item.objectIds[0];
        const rect = state.world.colliders.find((rect) => rect.id === String(id));
        return rect && id !== undefined ? [{ ...rect, id, label: item.name }] : [];
      });
  }
  private regionView(
    rect: GridArea & { id: number; label: string },
    selected: boolean,
    collider = false,
    interact = false,
  ) {
    const view = this.add.container(rect.x, rect.y).setDepth(selected ? 200005 : 200004);
    const graphics = this.add
      .graphics()
      .fillStyle(interact ? 0xffe47a : collider ? 0xffad88 : 0x69c7ff, selected ? 0.26 : 0.16)
      .fillRect(0, 0, rect.width, rect.height)
      .lineStyle(
        (selected ? 3 : 2) / this.cameras.main.zoom,
        interact ? 0xe8b51c : collider ? 0xd97951 : 0x289ce9,
        1,
      )
      .strokeRect(0, 0, rect.width, rect.height);
    const label = this.add.text(
      4 / this.cameras.main.zoom,
      4 / this.cameras.main.zoom,
      rect.label,
      {
        fontFamily: 'Tahoma, sans-serif',
        fontSize: `${Math.round(12 / this.cameras.main.zoom)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: interact ? '#856409' : collider ? '#a84f30' : '#237db3',
        padding: { x: 5 / this.cameras.main.zoom, y: 3 / this.cameras.main.zoom },
        wordWrap: {
          width: Math.max(80 / this.cameras.main.zoom, rect.width - 16 / this.cameras.main.zoom),
        },
      },
    );
    view.add([graphics, label]);
    this.regionViews.set(rect.id, view);
    return view;
  }
  zoom(delta: number) {
    if (!this.state || !this.ready) return;
    const camera = this.cameras.main;
    const fitZoom = Math.max(
      0.001,
      Math.min(
        (camera.width - 80) / this.state.world.width,
        (camera.height - 80) / this.state.world.height,
      ),
    );
    camera.setZoom(
      Phaser.Math.Clamp(
        camera.zoom * (1 + delta),
        Math.min(0.15, fitZoom / 2),
        Math.max(2, fitZoom * 2),
      ),
    );
    if (this.state && ['zone', 'collider', 'interact'].includes(this.state.tool))
      this.render(this.state);
  }
  fit() {
    if (!this.state || !this.ready) return;
    const c = this.cameras.main,
      w = this.state.world;
    c.setSize(this.scale.width, this.scale.height);
    if (this.state.walkMode) {
      this.walker?.focus(w);
      return;
    }
    c.setZoom(Math.max(0.001, Math.min((c.width - 80) / w.width, (c.height - 80) / w.height)));
    c.centerOn(w.width / 2, w.height / 2);
    if (['zone', 'collider', 'interact'].includes(this.state.tool)) this.render(this.state);
  }
  render(state: EditorState) {
    if (this.disposed) return;
    if (
      this.state &&
      (this.state.tool !== state.tool ||
        this.state.suspended !== state.suspended ||
        this.state.walkMode !== state.walkMode ||
        this.state.asset !== state.asset ||
        this.state.snap !== state.snap ||
        this.state.zoneAction !== state.zoneAction ||
        this.state.colliderAction !== state.colliderAction ||
        this.state.deleteRegionMode !== state.deleteRegionMode ||
        this.state.world !== state.world)
    )
      this.cancelGesture();
    this.state = state;
    if (state.suspended) {
      this.spacePressed = false;
      this.shiftPressed = false;
    }
    if (!this.ready) return;
    if (state.walkMode) {
      this.walker ??= new WalkPreview(this, this.callbacks.error);
      this.walker.sync(state.world);
      this.hideGhost();
    } else if (this.walker) {
      this.walker.destroy();
      this.walker = undefined;
      this.fit();
    }
    this.content.forEach((o) => o.destroy());
    this.content = [];
    this.sprites.clear();
    this.regionViews.clear();
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      this.content.push(o);
      return o;
    };
    this.prepareBlueprint(state.blueprint);
    for (const f of state.world.floors)
      keep(
        this.add
          .tileSprite(f.x, f.y, f.width, f.height, f.texture)
          .setOrigin(0)
          .setAlpha(f.opacity)
          .setDepth(-10000),
      );
    for (const o of state.world.objects) {
      const sprite = keep(
        this.add
          .image(o.x, o.y, o.texture)
          .setOrigin(0)
          .setDisplaySize(o.width, o.height)
          .setAlpha(o.opacity)
          .setDepth(o.ground ? -1000 : o.depth),
      );
      this.sprites.set(o.id, sprite);
      if (state.tool === 'select')
        sprite.setInteractive().on('pointerdown', (p: Phaser.Input.Pointer) => {
          if (state.walkMode || p.rightButtonDown() || this.spacePressed || this.panning) return;
          const item = state.placements.find((i) => i.objectIds.includes(o.id));
          if (!item) return;
          const point = this.cameras.main.getWorldPoint(p.x, p.y);
          this.beginMove(item, point, this.shiftPressed || p.event?.shiftKey === true);
        });
    }
    if (state.blueprint?.visible && this.textures.exists(this.blueprintKey))
      keep(
        this.add
          .image(state.blueprint.x, state.blueprint.y, this.blueprintKey)
          .setOrigin(0)
          .setDisplaySize(state.blueprint.width, state.blueprint.height)
          .setAlpha(state.blueprint.opacity)
          .setDepth(90000),
      );
    for (const item of state.placements.filter((p) => p.kind === 'collider' || p.kind === 'zone')) {
      if (item.kind === 'collider' && !state.showCollision) continue;
      const rect =
        item.kind === 'zone'
          ? state.world.zones.find((r) => r.id === item.objectIds[0])
          : state.world.colliders.find((r) => r.id === String(item.objectIds[0]));
      if (!rect || state.walkMode || state.tool !== 'select') continue;
      const hitArea = new Phaser.Geom.Rectangle(0, 0, rect.width, rect.height);
      keep(
        this.add
          .zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height)
          .setDepth(100001)
          .setInteractive(hitArea, (_shape: unknown, x: number, y: number) => {
            if (!Phaser.Geom.Rectangle.Contains(hitArea, x, y)) return false;
            const edge = 4 / this.cameras.main.zoom;
            return (
              state.selection === item.key ||
              x < edge ||
              y < edge ||
              x > rect.width - edge ||
              y > rect.height - edge
            );
          })
          .on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (p.rightButtonDown() || this.spacePressed || this.panning) return;
            const point = this.cameras.main.getWorldPoint(p.x, p.y);
            this.beginMove(item, point, this.shiftPressed || p.event?.shiftKey === true);
          }),
      );
    }
    for (const item of state.placements.filter(
      (p) => !state.walkMode && (p.kind === 'spawn' || p.kind === 'npc'),
    )) {
      const marker = keep(
        this.add
          .text(item.x, item.y, `${item.kind === 'spawn' ? '⊕' : '●'} ${item.name}`, {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: item.kind === 'spawn' ? '#167c80' : '#7348b8',
            padding: { x: 6, y: 5 },
          })
          .setDepth(100000),
      );
      if (state.tool === 'select')
        marker.setInteractive().on('pointerdown', (p: Phaser.Input.Pointer) => {
          if (p.rightButtonDown() || this.spacePressed || this.panning) return;
          const point = this.cameras.main.getWorldPoint(p.x, p.y);
          this.beginMove(item, point, this.shiftPressed || p.event?.shiftKey === true);
        });
    }
    this.overlay.clear();
    for (const rect of state.walkMode ? [] : state.world.interactions) {
      const selected = state.selection === `object:${rect.id}`;
      if (state.tool === 'interact') keep(this.regionView(rect, selected, false, true));
      else
        this.overlay
          .lineStyle((selected ? 3 : 1) / this.cameras.main.zoom, 0xe8b51c, selected ? 1 : 0.65)
          .strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    this.game.canvas.dataset.interactionLabels = JSON.stringify(
      state.world.interactions.map((r) => r.label),
    );
    this.overlay
      .lineStyle(2 / this.cameras.main.zoom, 0x7193a8, 0.7)
      .strokeRect(0, 0, state.world.width, state.world.height);
    const colliders = this.editableColliders(state);
    const editableIds = new Set(colliders.map((rect) => String(rect.id)));
    if (state.showCollision || state.tool === 'collider')
      for (const rect of state.world.colliders) {
        if (state.tool === 'collider' && editableIds.has(rect.id)) continue;
        const selected = state.selection === `collision:${rect.id}`;
        this.overlay
          .fillStyle(0xe78072, selected ? 0.4 : 0.22)
          .fillRect(rect.x, rect.y, rect.width, rect.height);
        this.overlay
          .lineStyle((selected ? 3 : 1) / this.cameras.main.zoom, 0xf49387, 0.9)
          .strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
    if (state.tool === 'collider')
      for (const rect of colliders)
        keep(this.regionView(rect, state.selection === `object:${rect.id}`, true));
    this.game.canvas.dataset.colliderLabels = JSON.stringify(
      state.tool === 'collider' ? colliders.map((rect) => rect.label) : [],
    );
    for (const rect of state.world.zones) {
      if (state.tool === 'zone') {
        const selected = state.selection === `object:${rect.id}`;
        keep(this.regionView(rect, selected));
      } else {
        this.overlay
          .lineStyle(1 / this.cameras.main.zoom, 0x289ce9, 0.45)
          .strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
    this.game.canvas.dataset.zoneLabels = JSON.stringify(
      state.tool === 'zone' ? state.world.zones.map((z) => z.label) : [],
    );
    if (
      !state.walkMode &&
      state.snap > 0 &&
      (state.grid ||
        state.tool === 'place' ||
        state.tool === 'paint' ||
        state.tool === 'erase-layout')
    ) {
      this.overlay.lineStyle(1, 0x487895, 0.2);
      for (let x = 0; x <= state.world.width; x += gridStep(state.snap))
        this.overlay.lineBetween(x, 0, x, state.world.height);
      for (let y = 0; y <= state.world.height; y += gridStep(state.snap))
        this.overlay.lineBetween(0, y, state.world.width, y);
    }
    if (!state.walkMode) this.refreshGhost(this.input.activePointer);
    this.refreshControls();
    const selected = state.placements.find((p) => p.key === state.selection);
    if (
      selected &&
      this.selectedKeys().length <= 1 &&
      !(
        (selected.kind === 'zone' && state.tool === 'zone') ||
        (selected.kind === 'collider' && state.tool === 'collider')
      )
    ) {
      this.overlay.lineStyle(
        3 / this.cameras.main.zoom,
        state.world.interactions.some((r) => selected.objectIds.includes(r.id))
          ? 0xe8b51c
          : 0x41b9ff,
        1,
      );
      const objects = state.world.objects.filter((o) => selected.objectIds.includes(o.id));
      if (objects.length) {
        const x = Math.min(...objects.map((o) => o.x)),
          y = Math.min(...objects.map((o) => o.y)),
          r = Math.max(...objects.map((o) => o.x + o.width)),
          b = Math.max(...objects.map((o) => o.y + o.height));
        this.overlay.strokeRect(x, y, r - x, b - y);
      } else {
        const rect =
          selected.kind === 'zone'
            ? state.world.zones.find((r) => r.id === selected.objectIds[0])
            : selected.kind === 'collider'
              ? state.world.colliders.find((r) => r.id === String(selected.objectIds[0]))
              : undefined;
        if (rect) this.overlay.strokeRect(rect.x, rect.y, rect.width, rect.height);
        else this.overlay.strokeCircle(selected.x, selected.y, 24);
      }
    }
  }
}
export function createEditor(parent: HTMLElement, catalog: Catalog, callbacks: EditorEvents) {
  const scene = new EditorScene(catalog, callbacks);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#805b3d',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    scene: [scene],
    render: { antialias: false, pixelArt: true, roundPixels: true },
    audio: { noAudio: true },
  });
  if (gameConfig.debug) window.__EXHIBITION_EDITOR__ = game;
  return {
    render: (state: EditorState) => scene.render(state),
    walkDirection: (direction: Direction, pressed: boolean) =>
      scene.walkDirection(direction, pressed),
    fit: () => scene.fit(),
    zoom: (delta: number) => scene.zoom(delta),
    cancel: () => {
      scene.cancelGesture();
    },
    destroy: () => {
      // Phaser defers Game.destroy to the next frame and emits DESTROY without SHUTDOWN.
      // Release external listeners immediately so detached editors cannot handle shortcuts.
      scene.dispose();
      if (window.__EXHIBITION_EDITOR__ === game) delete window.__EXHIBITION_EDITOR__;
      game.destroy(true);
    },
  };
}
