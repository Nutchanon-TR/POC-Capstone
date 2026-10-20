import type { GameCommand, GameStatus } from './types';
import type { AvatarPose } from '../../shared/realtime/protocol';

// One bridge per mounted game, so HMR/unmount never retains another game's listeners.
export class GameBridge {
  private status: GameStatus = {
    phase: 'loading',
    progress: 0,
    zone: 'โถงต้อนรับ',
    view: 'follow',
    zoom: 1,
    booths: 0,
    props: 0,
  };
  private listeners = new Set<() => void>();
  private commands = new Set<(command: GameCommand) => void>();
  private poseListeners = new Set<(pose: AvatarPose) => void>();
  private pose?: AvatarPose;
  publishPose(pose: AvatarPose) {
    this.pose = pose;
    this.poseListeners.forEach((listener) => listener(pose));
  }
  getPose = () => this.pose;
  onPose(listener: (pose: AvatarPose) => void) {
    this.poseListeners.add(listener);
    return () => {
      this.poseListeners.delete(listener);
    };
  }
  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  update(patch: Partial<GameStatus>) {
    if (
      Object.entries(patch).every(([key, value]) => this.status[key as keyof GameStatus] === value)
    )
      return;
    this.status = { ...this.status, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  send = (command: GameCommand) => {
    this.commands.forEach((listener) => listener(command));
  };
  onCommand(listener: (command: GameCommand) => void) {
    this.commands.add(listener);
    return () => {
      this.commands.delete(listener);
    };
  }
}
