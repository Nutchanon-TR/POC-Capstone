# Verification — phase 3, 2026-10-05

- Local LiveKit v1.13.7 container runs alongside the existing PostgreSQL container. Credentials were generated locally and are excluded from version control.
- Next production build, Nest TypeScript build, frontend typecheck, ESLint and formatting checks passed. Production dependency audit reports zero vulnerabilities.
- Existing unit tests: 9/9 passed; database integration: 1/1 passed. Original supplied artwork hashes and all 48 character crop pixels remain unchanged.
- New realtime integration: 2/2 passed for server-owned identity, revision gating, microphone-only signed tokens, pose validation, disconnection and rejection of untrusted browser origins.
- Browser regression: 10/11 passed initially. The remaining test assumed a hardcoded seed-map spawn (1280,2190), while the user's persisted map has a different spawn. Updated that test to read the loaded map's spawn; its targeted rerun passed. All 11 scenarios are now verified, without changing the user's saved spawn.
- The two new Chrome voice scenarios passed, including real WebRTC audio transport through LiveKit in both directions (increasing inbound RTP bytes), remote avatar motion and skin sync, starting muted, stop/unpublish on mute, explicit leave/rejoin, presence reconnect cleanup, editor navigation and denied microphone permission.
- A late microphone permission response after leaving originally exposed a live capture track. VoiceController now owns the acquired track before publication and stops stale captures; the regression test passed. Automated tests use Chromium synthetic audio devices, not the user's physical microphone.
- Production smoke passed with the built Next app: hall/editor load, muted LiveKit join/leave, no page errors, exactly one canvas and no game/editor/social debug handles.
- Desktop voice UI and 390px mobile screenshots were visually inspected. Voice controls fit within the viewport and do not overlap movement controls.
- Evidence: `artifacts/voice-two-players.png`, `artifacts/mobile.png`, `artifacts/production-hall.png`, `artifacts/production-editor.png`.

This verifies two local browser participants. Human microphone audibility, separate physical devices, internet NAT/TURN traversal, sustained load and proximity audio were not tested or implemented in this phase. Map/API tests restore their own saved changes with revision guards; revisions advance normally.

## Map Studio — 2026-10-11

- Typecheck, ESLint, formatting, Nest TypeScript build and Next production build passed.
- Unit tests: 13/13 passed, including blueprint persistence/aspect fit, blank-map floor resizing and Tiled roundtrip, aspect-preserving image/collider scaling, instance collision disabling, and editable rectangle regions.
- API integration: 2/2 passed. PNG uploads validate real file content, image bounds, floor rules and collision geometry; repeated identical uploads reuse the asset. Images and definitions persist in PostgreSQL and are resolved through the merged catalog.
- Chrome regression: 10/10 passed for hall movement/collision/depth/mobile/load recovery, existing editor save/import/export, and the new blueprint → PNG upload → placement/resize → Collider/Zone → playable preview → save/reload → ZIP flow.
- The exported ZIP was extracted and recompiled with the file-based map loader. Its relative image paths, PNG dimensions, map size, object size, collision count, Zone and spawn were checked. Native Tiled was not available for a new native-app check in this run.
- Existing map contents were restored using revision guards; revisions advance normally. Temporary uploaded test assets were removed. Original supplied asset pixels and character crop tests still pass.
- Evidence: `artifacts/map-studio.png`, `artifacts/studio-tiled.zip`, `artifacts/studio-bundle-verification.json`. User flow and current limits: `docs/map-studio.md`.

## Previous phase 2 — 2026-10-03

- Frontend production build and NestJS TypeScript build passed.
- Typecheck, ESLint (including shared/backend), and formatting checks passed.
- Unit tests: 9/9 passed. Existing asset coverage and source hashes, floor compaction, Tiled transforms, editor prefab mutations, NPC movement with its booth, invalid map/spawn/patrol rejection, and exact RGBA crop preservation across all 48 character frames.
- API integration: 1/1 passed against the new PostgreSQL database. Invalid documents rejected; two concurrent saves produce one 200 and one 409; saved document/runtime reload correctly. Tests restore the original document using the revision they own. Revisions advance normally.
- Chrome E2E: 9/9 passed. Four-direction movement and frame changes, diagonal speed, counter collision/front-back occlusion, six Pavilion doors, blur/reset/resize, mobile controls, load-error retry; character switching preserves exact coordinates and hitbox; one NPC patrols and pauses while talking; editor drag/save/reload, undo/redo, draft preview, TMJ import/export and portable ZIP.
- Native Tiled opened the browser-exported ZIP contents, rasterized the map and exported it again. The recompiled native export preserves 386 image pieces, 357 collision rectangles and one NPC within 0.000001 pixel numeric tolerance.
- Kaguya head-landmark horizontal spread: 11 source pixels per direction before registration, 0 after registration. Frame rate changed from 9 to 6. Both source PNG hashes match and every packed crop has exactly the original RGBA values.
- Production smoke uses Next start + NestJS + PostgreSQL: hall and editor load with one canvas each, no browser page errors and no debug handles. Editor readiness is awaited before its screenshot.
- npm audit --omit=dev: zero advisories with NestJS 11.2.7. The pre-existing five development-tool entries remain under the Next ESLint braces dependency.

## Evidence

- artifacts/frame-alignment-before.json / frame-alignment-after.json
- artifacts/production-hall.png / production-editor.png
- artifacts/editor.png / npc-dialogue.png
- artifacts/depth-behind.png / depth-front.png / mobile.png
- artifacts/exhibition-tiled.zip / tiled-bundle/native-roundtrip.tmj
- artifacts/tiled-bundle-preview.png

## Scope

Local guest multiplayer/voice POC, one active saved map, one roaming booth host, two player skins. Editor changes use revision guards, not realtime co-editing. PNG asset uploads and blueprint references are supported. No authentication/multi-user permissions, character uploads, ZIP import, rotated/flipped tile objects, polygon collisions or infinite maps. TMJ import uses the catalog registered in this database. Browser edits persist in DB, not the seed TMJ on disk. Voice/presence architecture and deployment boundaries are documented in `voice-architecture.md`.
