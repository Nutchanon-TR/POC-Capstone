import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { TokenVerifier, TrackSource } from 'livekit-server-sdk';

process.loadEnvFile('server/.env.local');
const base = process.env.API_TEST_URL || 'http://127.0.0.1:3102';
test('presence owns identities, validates poses/revisions, restricts microphone tokens and cleans disconnects', async (t) => {
  const connect = async () => {
    const socket = io(base, { transports: ['websocket'], autoConnect: false });
    t.after(() => socket.disconnect());
    const connected = once(socket, 'connect');
    socket.connect();
    await connected;
    return socket;
  };
  const a = await connect(),
    b = await connect();
  const ack = (socket, event, body) => socket.timeout(5000).emitWithAck(event, body);
  assert.match((await ack(a, 'voice:token')).error, /เชื่อมต่อแมป/);
  assert.match((await ack(a, 'hall:join', { sessionKey: 'wrong-revision' })).error, /รีเฟรช/);
  const world = await fetch(`${base}/maps/default/runtime`).then((r) => r.json());
  const first = await ack(a, 'hall:join', { sessionKey: world.sessionKey, id: 'spoofed' });
  const second = await ack(b, 'hall:join', { sessionKey: world.sessionKey });
  assert.equal(first.id, a.id);
  assert.equal(second.id, b.id);
  assert.notEqual(first.id, second.id);
  assert(second.peers.some((p) => p.id === first.id));
  const credential = await ack(a, 'voice:token');
  const claims = await new TokenVerifier(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
  ).verify(credential.token);
  assert.equal(claims.sub, first.id);
  assert.equal(claims.video.room, credential.room);
  assert.equal(claims.video.roomJoin, true);
  assert.equal(claims.video.canPublishData, false);
  assert.deepEqual(claims.video.canPublishSources, ['microphone']);
  assert.equal(TrackSource.MICROPHONE, 2);
  assert(claims.exp - Math.floor(Date.now() / 1000) <= 120);
  const updates = [];
  b.on('hall:pose', (peer) => updates.push(peer));
  const pose = { ...world.spawn, character: 'internwitch', direction: 'left', moving: true };
  a.emit('hall:pose', { ...pose, x: -100 });
  a.emit('hall:pose', { ...pose, x: 'NaN' });
  a.emit('hall:pose', { ...pose, character: 'unknown' });
  await delay(100);
  assert.equal(updates.length, 0);
  const delivered = once(b, 'hall:pose');
  a.emit('hall:pose', { ...pose, id: second.id, name: 'spoofed' });
  const [peer] = await delivered;
  assert.equal(peer.id, first.id);
  assert.equal(peer.name, first.name);
  assert.equal(peer.character, 'internwitch');
  const departed = once(b, 'hall:left');
  a.disconnect();
  assert.equal((await departed)[0], first.id);
});

test('untrusted browser origins cannot connect', async (t) => {
  const socket = io(base, {
    transports: ['websocket'],
    reconnection: false,
    autoConnect: false,
    extraHeaders: { origin: 'https://untrusted.invalid' },
  });
  t.after(() => socket.disconnect());
  const failed = once(socket, 'connect_error');
  socket.connect();
  await failed;
  assert.equal(socket.connected, false);
});
