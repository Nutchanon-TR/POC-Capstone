// Tuning belongs here; map-specific placement belongs in Tiled.
export const gameConfig = {
  mapUrl: '/api/backend/maps/default/runtime',
  background: '#152c43',
  debug: process.env.NEXT_PUBLIC_GAME_DEBUG === '1',
  camera: {
    initialZoom: 1,
    minZoom: 0.65,
    maxZoom: 1.8,
    step: 0.2,
    followLerp: 0.12,
    overviewPadding: 36,
  },
  depth: { floor: -10000, groundObjects: -1000 },
  multiplayer: { poseIntervalMs: 100, interpolationMs: 60, staleAnimationMs: 450, nameOffsetY: 88 },
} as const;

export const characterConfig = {
  key: 'kaguya',
  name: 'Kaguya',
  texture: '/world/characters/kaguya-walk.png',
  frameWidth: 288,
  frameHeight: 256,
  scale: 0.4,
  origin: { x: 0.5, y: 240 / 256 },
  speed: 235,
  frameRate: 6,
  body: { width: 64, height: 30, offsetX: 112, offsetY: 210 },
  animations: {
    up: { start: 0, end: 5, idle: 0 },
    down: { start: 6, end: 11, idle: 6 },
    left: { start: 12, end: 17, idle: 12 },
    right: { start: 18, end: 23, idle: 18 },
  },
} as const;

export const characters = {
  kaguya: characterConfig,
  internwitch: {
    ...characterConfig,
    key: 'internwitch',
    name: 'InternWitch',
    texture: '/world/characters/internwitch-walk.png',
  },
} as const;
export type CharacterId = keyof typeof characters;
