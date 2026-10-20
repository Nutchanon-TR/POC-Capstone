import Phaser from 'phaser';
import { GameBridge } from '../GameBridge';
import { Player } from '../entities/Player';
import { BoothNpc } from '../entities/BoothNpc';
import { RemotePlayer } from '../entities/RemotePlayer';
import { gameConfig } from '../config';
import { MovementInput } from '../systems/MovementInput';
import { WorldCamera } from '../systems/WorldCamera';
import { loadWorld } from '../world/loadWorld';
import type { WorldData } from '../types';

export class WorldScene extends Phaser.Scene {
  player!: Player;
  private movement!: MovementInput;
  private view!: WorldCamera;
  private loadFailed = false;
  private lastZoneCheck = 0;
  private lastPoseSent = 0;
  readonly remotePlayers = new Map<string, RemotePlayer>();
  npcs: BoothNpc[] = [];
  private talking?: BoothNpc;
  private interact = () => {
    const npc = this.npcs.find((n) => n.isNear(this.player));
    if (!npc || this.talking) return;
    this.talking = npc;
    this.movement.release();
    this.player.move(0, 0);
    this.bridge.update({ dialogue: npc.dataSource });
  };
  constructor(
    private bridge: GameBridge,
    readonly worldData: WorldData,
  ) {
    super('ExhibitionWorld');
  }
  preload() {
    this.load.on('progress', (progress: number) =>
      this.bridge.update({ progress: Math.round(progress * 100) }),
    );
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.loadFailed = true;
      this.bridge.update({ phase: 'error', error: `โหลดไฟล์ไม่สำเร็จ: ${file.key}` });
    });
    for (const texture of this.worldData.textures) this.load.image(texture.key, texture.url);
    Player.preload(this);
  }
  create() {
    if (this.loadFailed) return;
    const collision = loadWorld(this, this.worldData);
    this.player = new Player(this, this.worldData.spawn.x, this.worldData.spawn.y);
    this.physics.add.collider(this.player, collision);
    this.npcs = (this.worldData.npcs || []).map((data) => new BoothNpc(this, data));
    for (const npc of this.npcs) {
      this.physics.add.collider(npc, collision);
      this.physics.add.collider(this.player, npc);
    }
    this.movement = new MovementInput(this);
    this.view = new WorldCamera(this.cameras.main, this.player, this.worldData);
    const publishView = () =>
      this.bridge.update({ view: this.view.mode, zoom: this.view.zoomValue });
    const unsubscribe = this.bridge.onCommand((command) => {
      if (command.type === 'peer') {
        const peer = this.remotePlayers.get(command.peer.id);
        if (peer) peer.receive(command.peer);
        else this.remotePlayers.set(command.peer.id, new RemotePlayer(this, command.peer));
      }
      if (command.type === 'peer-left') {
        this.remotePlayers.get(command.id)?.destroy();
        this.remotePlayers.delete(command.id);
      }
      if (command.type === 'clear-peers') {
        this.remotePlayers.forEach((p) => p.destroy());
        this.remotePlayers.clear();
      }
      if (command.type === 'speakers')
        this.remotePlayers.forEach((p, id) => p.speaking(command.ids.includes(id)));
      if (command.type === 'character') {
        this.player.setCharacter(command.id);
        this.bridge.update({ character: command.id });
      }
      if (command.type === 'interact') this.interact();
      if (command.type === 'close-dialogue') {
        this.talking = undefined;
        this.movement.release();
        this.bridge.update({ dialogue: undefined });
      }
      if (command.type === 'zoom') {
        this.view.zoom(command.delta);
        publishView();
      }
      if (command.type === 'view') {
        this.view.setMode(command.mode);
        publishView();
      }
      if (command.type === 'reset') {
        this.movement.release();
        this.player.resetTo(this.worldData.spawn.x, this.worldData.spawn.y);
        this.view.setMode('follow');
        publishView();
      }
      if (command.type === 'direction')
        this.movement.setDirection(command.direction, command.pressed);
      if (command.type === 'release-input') this.movement.release();
    });
    const resize = () => {
      this.view.refresh();
      publishView();
    };
    const blur = () => {
      this.movement.release();
      this.player.move(0, 0);
    };
    const visible = () => {
      if (document.hidden) blur();
    };
    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'แผนที่ Exhibition Hall กด WASD หรือปุ่มลูกศรเพื่อเดิน');
    const focus = () => canvas.focus({ preventScroll: true });
    const preventArrows = (event: KeyboardEvent) => {
      if (event.key.startsWith('Arrow')) event.preventDefault();
      if (event.code === 'KeyE' && !event.repeat) this.interact();
    };
    canvas.addEventListener('pointerdown', focus);
    canvas.addEventListener('keydown', preventArrows);
    canvas.addEventListener('blur', blur);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visible);
    this.scale.on('resize', resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.remotePlayers.clear();
      this.movement.destroy();
      this.scale.off('resize', resize);
      canvas.removeEventListener('pointerdown', focus);
      canvas.removeEventListener('keydown', preventArrows);
      canvas.removeEventListener('blur', blur);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visible);
    });
    this.bridge.update({
      sessionKey: this.worldData.sessionKey,
      phase: 'ready',
      progress: 100,
      booths: this.worldData.summary.booths,
      props: this.worldData.summary.propDesigns,
      character: this.player.characterId,
      dialogue: undefined,
      nearbyNpc: undefined,
    });
    publishView();
  }
  update(time: number, delta: number) {
    if (!this.player) return;
    const input = this.movement.read();
    this.player.move(this.talking ? 0 : input.x, this.talking ? 0 : input.y);
    for (const npc of this.npcs) npc.patrol(time, this.talking === npc);
    this.remotePlayers.forEach((p) => p.step(delta));
    if (time - this.lastPoseSent >= gameConfig.multiplayer.poseIntervalMs) {
      this.lastPoseSent = time;
      this.bridge.publishPose(this.player.getPose());
    }
    if (time - this.lastZoneCheck > 150) {
      this.lastZoneCheck = time;
      const zone = this.worldData.zones.find(
        (z) =>
          this.player.x >= z.x &&
          this.player.x < z.x + z.width &&
          this.player.y >= z.y &&
          this.player.y < z.y + z.height,
      );
      this.bridge.update({
        zone: zone?.label || 'ทางเดินกลาง',
        nearbyNpc: this.npcs.find((n) => n.isNear(this.player))?.dataSource.title,
      });
    }
  }
}
