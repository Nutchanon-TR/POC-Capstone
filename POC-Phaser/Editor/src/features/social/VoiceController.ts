import type { LocalAudioTrack, Room } from 'livekit-client';
import type { VoiceCredentials } from '../../../shared/realtime/protocol';
export type VoiceState = {
  phase: 'idle' | 'connecting' | 'connected' | 'reconnecting';
  micEnabled: boolean;
  micBusy: boolean;
  audioBlocked: boolean;
  participants: { id: string; name: string; mic: boolean; speaking: boolean }[];
  error?: string;
};
const empty: VoiceState = {
  phase: 'idle',
  micEnabled: false,
  micBusy: false,
  audioBlocked: false,
  participants: [],
};
export class VoiceController {
  private state: VoiceState = { ...empty };
  private listeners = new Set<() => void>();
  private room?: Room;
  private micTrack?: LocalAudioTrack;
  private generation = 0;
  private audioHost?: HTMLDivElement;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<VoiceState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  async join(credentials: () => Promise<VoiceCredentials>) {
    if (this.state.phase !== 'idle') return;
    const generation = ++this.generation;
    this.update({ ...empty, phase: 'connecting', error: undefined });
    try {
      const { Room, RoomEvent, Track } = await import('livekit-client');
      if (generation !== this.generation) return;
      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        publishDefaults: { stopMicTrackOnMute: true },
      });
      this.room = room;
      const host = document.createElement('div');
      host.hidden = true;
      host.dataset.voiceAudio = 'true';
      document.body.append(host);
      this.audioHost = host;
      const active = () => this.room === room && generation === this.generation;
      const refresh = () => {
        if (active())
          this.update({
            micEnabled: room.localParticipant.isMicrophoneEnabled,
            audioBlocked: !room.canPlaybackAudio,
            participants: [room.localParticipant, ...room.remoteParticipants.values()].map((p) => ({
              id: p.identity,
              name: p.name || p.identity,
              mic: p.isMicrophoneEnabled,
              speaking: p.isSpeaking,
            })),
          });
      };
      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (active() && track.kind === Track.Kind.Audio) {
          const audio = track.attach();
          audio.dataset.participant = participant.identity;
          host.append(audio);
          refresh();
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) =>
        track.detach().forEach((element) => element.remove()),
      );
      for (const event of [
        RoomEvent.ParticipantConnected,
        RoomEvent.ParticipantDisconnected,
        RoomEvent.TrackMuted,
        RoomEvent.TrackUnmuted,
        RoomEvent.TrackPublished,
        RoomEvent.TrackUnpublished,
        RoomEvent.ActiveSpeakersChanged,
        RoomEvent.AudioPlaybackStatusChanged,
        RoomEvent.LocalTrackPublished,
        RoomEvent.LocalTrackUnpublished,
      ])
        room.on(event, refresh);
      room.on(RoomEvent.Reconnecting, () => {
        if (active()) this.update({ phase: 'reconnecting' });
      });
      room.on(RoomEvent.Reconnected, () => {
        if (active()) {
          this.update({ phase: 'connected' });
          refresh();
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        if (active()) {
          this.leave();
          this.update({ error: 'การเชื่อมต่อเสียงสิ้นสุดแล้ว กดเข้าร่วมใหม่ได้' });
        }
      });
      const config = await credentials();
      if (!active()) {
        await room.disconnect();
        return;
      }
      await room.connect(config.url, config.token, { autoSubscribe: true });
      if (!active()) {
        await room.disconnect();
        return;
      }
      await room.startAudio().catch(() => undefined);
      if (!active()) return;
      this.update({ phase: 'connected' });
      refresh();
    } catch (error) {
      if (generation === this.generation) {
        this.leave();
        this.update({
          error: this.message(
            error,
            'เชื่อมต่อห้องเสียงไม่ได้ ตรวจสอบว่า LiveKit เปิดอยู่แล้วลองใหม่',
          ),
        });
      }
    }
  }
  async setMic(enabled: boolean) {
    const room = this.room;
    if (!room || this.state.phase !== 'connected' || this.state.micBusy) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.update({ error: 'ไมค์ต้องใช้ localhost หรือเว็บไซต์ HTTPS' });
      return;
    }
    this.update({ micBusy: true, error: undefined });
    let acquired: LocalAudioTrack | undefined;
    try {
      if (enabled) {
        const { createLocalAudioTrack, Track } = await import('livekit-client');
        if (this.room !== room) return;
        // Own capture before publishing so a late permission response cannot leak a live mic.
        acquired = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        if (this.room !== room) {
          acquired.stop();
          return;
        }
        this.micTrack = acquired;
        await room.localParticipant.publishTrack(acquired, { source: Track.Source.Microphone });
      } else {
        const track = this.micTrack;
        this.micTrack = undefined;
        if (track) {
          track.stop();
          await room.localParticipant.unpublishTrack(track, true);
        }
      }
      if (this.room !== room) {
        acquired?.stop();
        room.localParticipant.audioTrackPublications.forEach((p) => p.track?.stop());
        await room.disconnect();
        return;
      }
      this.update({ micEnabled: room.localParticipant.isMicrophoneEnabled });
    } catch (error) {
      acquired?.stop();
      if (this.micTrack === acquired) this.micTrack = undefined;
      if (this.room === room)
        this.update({ error: this.message(error, 'เปิดไมค์ไม่สำเร็จ ตรวจสอบอุปกรณ์แล้วลองใหม่') });
    } finally {
      if (this.room === room) this.update({ micBusy: false });
    }
  }
  async resumeAudio() {
    try {
      await this.room?.startAudio();
    } catch {
      this.update({ error: 'ยังเล่นเสียงไม่ได้ กรุณาตรวจสอบสิทธิ์เสียงของเบราว์เซอร์' });
    }
  }
  leave() {
    ++this.generation;
    const room = this.room;
    this.room = undefined;
    this.micTrack?.stop();
    this.micTrack = undefined;
    this.audioHost?.remove();
    this.audioHost = undefined;
    if (room) {
      room.localParticipant.audioTrackPublications.forEach((p) => p.track?.stop());
      void room.disconnect().catch(() => undefined);
    }
    this.update({ ...empty, error: undefined });
  }
  private message(error: unknown, fallback: string) {
    const name = error instanceof Error ? error.name : '';
    return name === 'NotAllowedError'
      ? 'ไม่ได้รับสิทธิ์ไมค์ อนุญาตไมค์ในเบราว์เซอร์แล้วกดเปิดไมค์อีกครั้ง'
      : name === 'NotFoundError'
        ? 'ไม่พบไมโครโฟน เชื่อมต่ออุปกรณ์แล้วลองใหม่'
        : fallback;
  }
}
