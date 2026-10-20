export type Direction = 'up' | 'down' | 'left' | 'right';
export type ViewMode = 'follow' | 'overview';
export type GameCommand =
  | { type: 'peer'; peer: import('../../shared/realtime/protocol').HallPeer }
  | { type: 'peer-left'; id: string }
  | { type: 'clear-peers' }
  | { type: 'speakers'; ids: string[] }
  | { type: 'zoom'; delta: number }
  | { type: 'view'; mode: ViewMode }
  | { type: 'reset' }
  | { type: 'character'; id: import('./config').CharacterId }
  | { type: 'interact' }
  | { type: 'close-dialogue' }
  | { type: 'direction'; direction: Direction; pressed: boolean }
  | { type: 'release-input' };
export type GameStatus = {
  phase: 'loading' | 'ready' | 'error';
  progress: number;
  zone: string;
  view: ViewMode;
  zoom: number;
  booths: number;
  props: number;
  sessionKey?: string;
  error?: string;
  character?: import('./config').CharacterId;
  nearbyNpc?: string;
  dialogue?: NpcData;
};
export type NpcData = {
  id: number;
  x: number;
  y: number;
  character: 'internwitch';
  boothId: string;
  title: string;
  dialogue: string;
  range: number;
  patrolRadius: number;
  speed: number;
};
export type Rect = { x: number; y: number; width: number; height: number };
export type WorldData = {
  sessionKey?: string;
  schemaVersion: number;
  tileSize: number;
  title: string;
  width: number;
  height: number;
  textures: { key: string; url: string; width: number; height: number }[];
  floors: (Rect & { texture: string; opacity: number })[];
  objects: (Rect & {
    id: number;
    name: string;
    asset: string;
    texture: string;
    depth: number;
    ground: boolean;
    opacity: number;
  })[];
  colliders: (Rect & { id: string })[];
  zones: (Rect & { id: number; label: string })[];
  interactions: (Rect & { id: number; label: string; kind: string; actionKey: string })[];
  spawn: { x: number; y: number };
  npcs: NpcData[];
  summary: { booths: number; propDesigns: number; assets: string[] };
};
