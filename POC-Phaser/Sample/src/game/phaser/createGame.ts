import Phaser from 'phaser';
import type { GameBridge } from '../bridge';
import { parseWorld } from '../tiled/parseWorld';
import { assets } from './manifest';
import { WorldScene } from './WorldScene';

/** Interface เล็ก: mount(host, bridge) แล้วใช้ dispose เมื่อ React unmount */
export async function mountGame(host: HTMLElement, bridge: GameBridge, signal: AbortSignal) {
  const responses = await Promise.all([
    fetch(assets.map, { signal }),
    fetch(assets.tileset, { signal }),
  ]);
  if (responses.some((response) => !response.ok))
    throw new Error('โหลดแมปไม่สำเร็จ ตรวจ public/assets/map แล้วรีเฟรช');
  const [map, tileset]: unknown[] = await Promise.all(responses.map((response) => response.json()));
  const world = parseWorld(map, tileset);
  if (signal.aborted) return null;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    width: host.clientWidth,
    height: host.clientHeight,
    backgroundColor: '#dbece7',
    pixelArt: true,
    // Phaser 4 เปลี่ยนค่าเริ่มต้นของ roundPixels จึงกำหนดเองสำหรับ pixel art
    render: { roundPixels: true, antialias: false },
    // Keyboard ของ Phaser ปิดไว้ ใช้ host-local input เพื่อเคารพ focus ของ UI
    input: { keyboard: false },
    scene: [new WorldScene(world, bridge, host)],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
  // ตรวจรุ่น runtime ที่โหลดจริง โดยไม่ให้ React import Phaser ระหว่าง SSR
  host.dataset.phaserVersion = Phaser.VERSION;
  return {
    dispose: () => {
      game.destroy(true);
      delete host.dataset.gameState;
      delete host.dataset.phaserVersion;
    },
  };
}
