import Phaser from 'phaser';
import { gameConfig } from './config';
import { WorldScene } from './scenes/WorldScene';
import type { GameBridge } from './GameBridge';
import type { WorldData } from './types';

declare global {
  interface Window {
    __EXHIBITION_GAME__?: Phaser.Game;
  }
}

export function createGame(parent: HTMLElement, bridge: GameBridge, world: WorldData) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: gameConfig.background,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true, roundPixels: true },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [new WorldScene(bridge, world)],
    audio: { noAudio: true },
  });
  if (gameConfig.debug) window.__EXHIBITION_GAME__ = game;
  return {
    destroy() {
      if (window.__EXHIBITION_GAME__ === game) delete window.__EXHIBITION_GAME__;
      game.destroy(true);
    },
  };
}
