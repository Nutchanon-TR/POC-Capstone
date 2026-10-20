# Local multiplayer + voice

## Components and ownership

- **HallSession** owns Socket.IO presence and coordinates its lifetime with the game bridge. One session per hall viewport. Movement stays in Phaser; position messages do not update React state.
- **VoiceController** owns a LiveKit Room, microphone capture and remote audio elements. The SDK loads on joining voice. React subscribes to a small state snapshot, calls join/setMic/leave, and does not manage media tracks itself.
- **VoicePanel** renders participation, microphone, speaking and error controls. No automatic microphone capture. A user joins muted and explicitly enables the microphone.
- **GameBridge → WorldScene → RemotePlayer** renders remote avatars using the supplied character sprites. Remote movement interpolates; avatars use the same foot anchor, animation definitions and y-depth as local players. Network/animation tuning lives in `src/game/config.ts`.
- **HallGateway (NestJS)** owns guest identity, room membership and pose validation. **VoiceService** creates a microphone-only LiveKit token for that member and removes the media participant when presence disconnects.
- **LiveKit (Docker)** relays audio over WebRTC. Nest/WebSocket carries avatar positions and connection setup, never microphone audio. PostgreSQL still stores maps; it stores neither audio nor transient player positions.

## Room flow

1. Runtime API returns a `sessionKey` derived from the saved map UUID and revision.
2. Web connects directly to the Nest Socket.IO WebSocket endpoint (default port 3102), sends `hall:join`, receives its server-owned id/name and a peer snapshot.
3. Phaser samples its pose at most 10 times per second. Unchanged poses are not sent. Server checks finite numbers, allowed character/direction, map bounds and a per-member rate limit; clients interpolate remote sprites.
4. Clicking join requests `voice:token` on that same socket. Server selects room and identity; it does not accept arbitrary client-selected identities or room names. Token lifetime is 120 seconds for initial admission and allows microphone publication/subscription, not camera/screen/data publication. Expiry does not end an already connected call; leaving explicitly disconnects it.
5. VoiceController connects to LiveKit without opening a microphone. Remote audio attaches to owned HTML audio elements outside the canvas. If autoplay is blocked, a button resumes playback.
6. Enabling the mic acquires a local audio track, checks that the same room is still active, then publishes. Muting stops and unpublishes the track; enabling again acquires a new track. The controller also stops a track returned after leaving during a pending permission request.
7. Leaving voice stops capture, removes audio elements and disconnects LiveKit. Walking remains available. Leaving the hall or losing presence also leaves voice. Presence reconnects with a new identity; voice requires explicit rejoining.

## Map edits and preview

Editor draft previews never create HallSession. Saving increments map revision; already open players keep their loaded revision until refreshing. New arrivals use the new revision, keeping physically different maps out of one shared presence/voice room. The old room naturally empties as its players leave. Editor changes are not broadcast to active players.

## Local setup and environment

Run `npm run db:setup`, `npm run voice:setup`, `npm run voice:up`, then start API and Next as described in README. Setup generates a cryptographically random API secret, preserves an existing local key and refuses to overwrite a different configured LiveKit URL.

| Variable                             | Owner                             | Purpose                                                                                         |
| ------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| LIVEKIT_URL                          | Nest env                          | WebSocket URL accessible to the browser; local default ws://127.0.0.1:7880                      |
| LIVEKIT_API_KEY / LIVEKIT_API_SECRET | Nest env + generated LiveKit YAML | Server credentials; never NEXT_PUBLIC values                                                    |
| LIVEKIT_INTERNAL_URL                 | Nest env, optional                | Internal URL for participant cleanup; defaults to LIVEKIT_URL                                   |
| NEXT_PUBLIC_REALTIME_URL             | Next build/dev env, optional      | Public Nest Socket.IO endpoint; defaults to current hostname on port 3102                       |
| WEB_ORIGINS                          | Nest env, optional                | Exact comma-separated allowed web origins; local default accepts localhost/127.0.0.1 HTTP ports |

Compose exposes 7880 signaling, 7881 RTC TCP and 7882 RTC UDP on **127.0.0.1 only**. Generated config advertises localhost as the RTC IP. It is intentionally a same-machine demo, not a ready-to-share internet deployment. Public deployment needs reachable media addresses/ports, HTTPS/WSS, appropriate TURN support and explicit trusted origins. Keep keys in deployment secrets and add authentication/room authorization before public use. API server currently listens on localhost as well.

## Deliberate POC boundaries

- Guest users, one saved map, shared room audio regardless of distance. No authentication, proximity volume, booth rooms, recording or NPC speech.
- Each browser/tab is a distinct participant, even on the same machine. Names are assigned by the server; they are not persistent accounts.
- Local movement collides with map props/NPCs; remote avatars do not collide with other players. The server validates pose shape and bounds but does not simulate collisions or prevent teleport cheating. An authoritative movement simulation belongs to a later multiplayer scope.
- Membership and guest sequence are process-local. Multi-instance Nest deployment would require shared room state/adapter.
- Clients cannot obtain tokens until joining the current map revision. Browser origin checks and token grants restrict this demo, but they are not user authentication.
- Media uses LiveKit SFU transport encryption; this implementation does not enable LiveKit end-to-end encryption.
- Pinned livekit-client 2.21.0 supports the current Node 20 toolchain; newer client versions must be checked against their dependency engine requirements before upgrading.

## Verification

`npm run test:realtime` exercises two Socket.IO clients against Nest: server identity, stale revision rejection, invalid poses, mic-only signed tokens, departure and untrusted origin rejection. It does not modify map data.

`npm run test:voice` opens Chrome pages with synthetic microphone devices and measures increasing inbound audio RTP bytes in both directions through the actual local LiveKit server. It also checks avatar motion/skin sync, joining muted, track stop on mute/leave, rejoining, presence reconnection, editor navigation, denied microphone permission and a permission response arriving after leaving. No human microphone recording is involved.
