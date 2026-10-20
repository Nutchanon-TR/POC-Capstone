import { io, type Socket } from 'socket.io-client';
import type { GameBridge } from '@/game/GameBridge';
import type {
  AvatarPose,
  HallPeer,
  HallWelcome,
  VoiceCredentials,
} from '../../../shared/realtime/protocol';
import { VoiceController } from './VoiceController';
type PresenceState = {
  phase: 'connecting' | 'connected' | 'offline';
  id?: string;
  name?: string;
  count: number;
  error?: string;
};
export class HallSession {
  readonly voice = new VoiceController();
  private state: PresenceState = { phase: 'connecting', count: 1 };
  private listeners = new Set<() => void>();
  private peers = new Map<string, HallPeer>();
  private socket?: Socket;
  private cleanup: (() => void)[] = [];
  private disposed = false;
  private generation = 0;
  private lastPose?: string;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<PresenceState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  constructor(
    private bridge: GameBridge,
    private sessionKey: string,
  ) {}
  start() {
    if (this.socket) this.dispose();
    this.disposed = false;
    const generation = ++this.generation;
    const active = () => !this.disposed && this.generation === generation;
    this.update({
      phase: 'connecting',
      count: 1,
      id: undefined,
      name: undefined,
      error: undefined,
    });
    const endpoint =
      process.env.NEXT_PUBLIC_REALTIME_URL || `${location.protocol}//${location.hostname}:3102`;
    const socket = io(endpoint, {
      transports: ['websocket'],
      autoConnect: false,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket = socket;
    socket.on('connect', () => {
      if (!active()) return;
      const connectionId = socket.id;
      this.update({ phase: 'connecting', error: undefined });
      void socket
        .timeout(8000)
        .emitWithAck('hall:join', { sessionKey: this.sessionKey })
        .then((welcome: HallWelcome) => {
          if (!active() || !socket.connected || socket.id !== connectionId) return;
          if (welcome.error) throw Error(welcome.error);
          this.peers.clear();
          this.bridge.send({ type: 'clear-peers' });
          this.update({
            phase: 'connected',
            id: welcome.id,
            name: welcome.name,
            count: welcome.peers.length,
          });
          for (const peer of welcome.peers) this.receive(peer);
          this.lastPose = undefined;
          const pose = this.bridge.getPose();
          if (pose) this.sendPose(pose);
        })
        .catch((error) => {
          if (active() && socket.connected && socket.id === connectionId)
            this.update({ phase: 'offline', error: error.message || 'เข้าห้องไม่สำเร็จ' });
        });
    });
    socket.on('hall:peer', (peer: HallPeer) => {
      this.receive(peer);
      this.update({ count: this.peers.size });
    });
    socket.on('hall:pose', (peer: HallPeer) => this.receive(peer));
    socket.on('hall:left', (id: string) => {
      this.peers.delete(id);
      this.bridge.send({ type: 'peer-left', id });
      this.update({ count: this.peers.size });
    });
    const offline = () => {
      if (!active()) return;
      this.peers.clear();
      this.bridge.send({ type: 'clear-peers' });
      this.voice.leave();
      this.update({
        phase: 'offline',
        count: 1,
        error: 'กำลังเชื่อมต่อผู้เล่นใหม่ คุณยังเดินสำรวจได้',
      });
    };
    socket.on('disconnect', offline);
    socket.on('connect_error', offline);
    this.cleanup.push(
      this.bridge.onPose((pose) => this.sendPose(pose)),
      this.voice.subscribe(() =>
        this.bridge.send({
          type: 'speakers',
          ids: this.voice
            .getSnapshot()
            .participants.filter((p) => p.speaking)
            .map((p) => p.id),
        }),
      ),
    );
    socket.connect();
  }
  private receive(peer: HallPeer) {
    this.peers.set(peer.id, peer);
    if (peer.id !== this.state.id) this.bridge.send({ type: 'peer', peer });
  }
  private sendPose(pose: AvatarPose) {
    if (this.state.phase !== 'connected' || !this.socket?.connected) return;
    const serialized = JSON.stringify(pose);
    if (serialized === this.lastPose) return;
    this.lastPose = serialized;
    this.socket.emit('hall:pose', pose);
  }
  joinVoice = () =>
    this.voice.join(async () => {
      if (this.state.phase !== 'connected' || !this.socket?.connected)
        throw Error('ยังไม่ได้เชื่อมต่อแมป');
      const response: VoiceCredentials = await this.socket.timeout(8000).emitWithAck('voice:token');
      if (response.error) throw Error(response.error);
      return response;
    });
  retry = () => {
    this.socket?.disconnect();
    this.socket?.connect();
  };
  dispose() {
    this.disposed = true;
    ++this.generation;
    this.cleanup.splice(0).forEach((fn) => fn());
    this.voice.leave();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = undefined;
    this.bridge.send({ type: 'clear-peers' });
    this.peers.clear();
  }
}
