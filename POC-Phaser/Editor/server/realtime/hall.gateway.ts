import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { MapsService } from '../maps';
import { VoiceService } from './voice.service';
import type { HallPeer } from '../../shared/realtime/protocol';
// This POC serves local browsers. Shared deployments must supply explicit allowed origins.
function allowed(origin: string | undefined) {
  return (
    !origin ||
    (process.env.WEB_ORIGINS
      ? process.env.WEB_ORIGINS.split(',').includes(origin)
      : /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  );
}
const poseSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  character: z.enum(['kaguya', 'internwitch']),
  direction: z.enum(['up', 'down', 'left', 'right']),
  moving: z.boolean(),
});
type Member = {
  peer: HallPeer;
  room: string;
  width: number;
  height: number;
  lastUpdate: number;
  tokens: number[];
};
@WebSocketGateway({
  transports: ['websocket'],
  maxHttpBufferSize: 4096,
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) =>
      callback(null, allowed(origin)),
  },
  allowRequest: (
    req: { headers: { origin?: string } },
    callback: (err: string | null, ok: boolean) => void,
  ) => callback(null, allowed(req.headers.origin)),
})
export class HallGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private members = new Map<string, Member>();
  private nextGuest = 1;
  constructor(
    @Inject(MapsService) private maps: MapsService,
    @Inject(VoiceService) private voice: VoiceService,
  ) {}
  @SubscribeMessage('hall:join') async join(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ) {
    try {
      if (this.members.has(socket.id)) return { error: 'เข้าห้องแล้ว' };
      const parsed = z.object({ sessionKey: z.string().max(100) }).parse(body);
      const record = await this.maps.get('default');
      const room = `${record.id}:${record.revision}`;
      if (parsed.sessionKey !== room) return { error: 'แมปมีฉบับใหม่ กรุณารีเฟรชก่อนเข้าร่วม' };
      const world = await this.maps.compile(record.document);
      if (!socket.connected) return { error: 'การเชื่อมต่อสิ้นสุดแล้ว' };
      if (this.members.has(socket.id)) return { error: 'เข้าห้องแล้ว' };
      const peer: HallPeer = {
        id: socket.id,
        name: `ผู้เล่น ${this.nextGuest++}`,
        ...world.spawn,
        character: 'kaguya',
        direction: 'down',
        moving: false,
      };
      this.members.set(socket.id, {
        peer,
        room,
        width: world.width,
        height: world.height,
        lastUpdate: 0,
        tokens: [],
      });
      await socket.join(room);
      socket.to(room).emit('hall:peer', peer);
      return {
        id: peer.id,
        name: peer.name,
        peers: [...this.members.values()].filter((m) => m.room === room).map((m) => m.peer),
      };
    } catch {
      return { error: 'เข้าห้องไม่สำเร็จ กรุณาตรวจสอบ API และลองใหม่' };
    }
  }
  @SubscribeMessage('hall:pose') pose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ) {
    const member = this.members.get(socket.id),
      pose = poseSchema.safeParse(body);
    if (!member || !pose.success) return;
    const now = Date.now();
    if (now - member.lastUpdate < 40) return;
    const p = pose.data;
    if (p.x < 0 || p.y < 0 || p.x > member.width || p.y > member.height) return;
    member.lastUpdate = now;
    member.peer = { ...member.peer, ...p };
    socket.to(member.room).emit('hall:pose', member.peer);
  }
  @SubscribeMessage('voice:token') async token(@ConnectedSocket() socket: Socket) {
    const member = this.members.get(socket.id);
    if (!member) return { error: 'กรุณารอเชื่อมต่อแมปก่อน' };
    const now = Date.now();
    member.tokens = member.tokens.filter((t) => now - t < 60000);
    if (member.tokens.length >= 10) return { error: 'ขอเข้าห้องถี่เกินไป รอสักครู่แล้วลองใหม่' };
    member.tokens.push(now);
    try {
      return await this.voice.token(socket.id, member.peer.name, member.room);
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'เตรียมห้องเสียงไม่สำเร็จ' };
    }
  }
  handleDisconnect(socket: Socket) {
    const member = this.members.get(socket.id);
    if (!member) return;
    this.members.delete(socket.id);
    this.server.to(member.room).emit('hall:left', socket.id);
    void this.voice.remove(socket.id, member.room);
  }
}
