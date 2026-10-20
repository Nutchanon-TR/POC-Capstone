import Phaser from 'phaser';
import { gameConfig } from '../config';
import type { ViewMode, WorldData } from '../types';

export class WorldCamera {
  mode: ViewMode = 'follow';
  private followZoom: number = gameConfig.camera.initialZoom;
  constructor(
    private camera: Phaser.Cameras.Scene2D.Camera,
    private target: Phaser.GameObjects.Sprite,
    private world: WorldData,
  ) {
    this.refresh();
  }
  setMode(mode: ViewMode) {
    this.mode = mode;
    this.refresh();
  }
  zoom(delta: number) {
    this.mode = 'follow';
    this.followZoom = Phaser.Math.Clamp(
      this.followZoom + delta,
      gameConfig.camera.minZoom,
      gameConfig.camera.maxZoom,
    );
    this.refresh();
  }
  refresh() {
    const camera = this.camera;
    if (this.mode === 'overview') {
      camera.stopFollow().removeBounds();
      camera.setZoom(
        Math.min(
          (camera.width - gameConfig.camera.overviewPadding) / this.world.width,
          (camera.height - gameConfig.camera.overviewPadding) / this.world.height,
        ),
      );
      camera.centerOn(this.world.width / 2, this.world.height / 2);
    } else {
      camera.setBounds(0, 0, this.world.width, this.world.height).setZoom(this.followZoom);
      camera.startFollow(
        this.target,
        true,
        gameConfig.camera.followLerp,
        gameConfig.camera.followLerp,
      );
      camera.centerOn(this.target.x, this.target.y);
    }
  }
  get zoomValue() {
    return this.camera.zoom;
  }
}
