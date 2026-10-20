import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
@Injectable()
export class VoiceService {
  private settings() {
    const url = process.env.LIVEKIT_URL,
      key = process.env.LIVEKIT_API_KEY,
      secret = process.env.LIVEKIT_API_SECRET;
    if (!url || !key || !secret)
      throw Error('ยังไม่ได้ตั้งค่าห้องเสียง กรุณารัน npm run voice:setup');
    return { url, key, secret, internal: process.env.LIVEKIT_INTERNAL_URL || url };
  }
  roomName(sessionKey: string) {
    return `hall-${sessionKey.replaceAll(':', '-')}`;
  }
  async token(id: string, name: string, sessionKey: string) {
    const { url, key, secret } = this.settings(),
      room = this.roomName(sessionKey);
    const token = new AccessToken(key, secret, { identity: id, name, ttl: 120 });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
    });
    return { url, token: await token.toJwt(), room };
  }
  async remove(id: string, sessionKey: string) {
    try {
      const { internal, key, secret } = this.settings();
      await new RoomServiceClient(internal.replace(/^ws/, 'http'), key, secret).removeParticipant(
        this.roomName(sessionKey),
        id,
      );
    } catch {
      /* Presence teardown must still complete if media is unavailable or already left. */
    }
  }
}
