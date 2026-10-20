import type { WorldData } from '../../src/game/types';
export type Property = { name: string; type: string; value: string | number | boolean };
export type TileObject = {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  gid?: number;
  class?: string;
  type?: string;
  point?: boolean;
  rotation?: number;
  visible?: boolean;
  properties?: Property[];
};
export type Layer = {
  id: number;
  name: string;
  type: string;
  offsetx?: number;
  offsety?: number;
  opacity?: number;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  data?: number[];
  objects?: TileObject[];
  layers?: Layer[];
  properties?: Property[];
};
export type MapDocument = {
  type: string;
  orientation: string;
  infinite: boolean;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  nextlayerid: number;
  nextobjectid: number;
  layers: Layer[];
  tilesets: { firstgid: number; source: string }[];
  properties?: Property[];
};
export type CatalogTile = {
  gid: number;
  id: number;
  image: string;
  imagewidth: number;
  imageheight: number;
  key: string;
  meta: {
    assetKey: string;
    family: string;
    ground?: boolean;
    depthY: number;
    label?: string;
    interactable?: boolean;
    editorHidden?: boolean;
  };
  objectgroup?: { objects: TileObject[] };
  properties: Property[];
};
export type Prefab = {
  key: string;
  label?: string;
  sizing?: 'explicit';
  width: number;
  height: number;
  parts: {
    key: string;
    x: number;
    y: number;
    w: number;
    h: number;
    depthY?: number;
    sourceId?: number;
  }[];
};
export type Catalog = {
  defaultSizes?: Record<string, { width: number; height: number }>;
  tiles: CatalogTile[];
  textures: WorldData['textures'];
  prefabs: Prefab[];
  tileset: Record<string, unknown>;
};
export type MapRecord = {
  migrationBaseline?: string;
  id: string;
  name: string;
  revision: number;
  document: MapDocument;
  updatedAt: string;
};
export type WorkspaceSnapshot = { record: MapRecord; catalog: Catalog };
export type MapSummary = Pick<MapRecord, 'id' | 'name' | 'revision' | 'updatedAt'> & {
  width: number;
  height: number;
  tileSize: number;
  thumbnail?: string;
};
