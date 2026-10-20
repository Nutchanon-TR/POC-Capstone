# Exhibition Hall — design decisions

## Scope

One editable Tiled exhibition hall, all 24 booth variants, all 12 Prop objects, all 16 Layout designs, walking with collisions and depth sorting. Phase 2 adds registered character frames, Kaguya/InternWitch switching, one booth host with dialogue, and a web editor backed by NestJS/PostgreSQL. See [next-goals.md](next-goals.md) and [editor-architecture.md](editor-architecture.md). Multiplayer remains outside scope.

## Screen inventory

- One exploration screen: compact identity/header, hall canvas, desktop information rail, zoom/overview/reset controls, movement help, loading and retry state.
- Small screens: canvas first; information becomes a collapsible panel; touch direction buttons coexist with keyboard movement.
- Editor: asset palette on the left, canvas in the center, inspector on the right; toolbar for draft history, preview, save and Tiled interchange.

## Visual language

- Ink `#152C43`, paper `#F5F7F9`, muted `#738191`, line `#DCE3EA`, blue `#246BCE`, sea green `#167C80`.
- Typography: local/system Tahoma for readable Thai; system sans-serif for English. No font network dependency.
- Large open canvas, quiet light information rail, dark compact header. Left aligned text. Clear focus rings and compact control groups.
- Artwork is exclusively derived from supplied PNGs. No new raster/vector game art. Source crops and hashes are recorded in assets/provenance.json.

## Architecture

React owns interface state and mounts/destroys one Phaser game. Phaser owns frames, movement, camera, physics and drawing. A typed per-game bridge carries only user commands/status, never frame-by-frame React state.

The canonical Tiled document in PostgreSQL owns map placement, spawn, zones and NPC settings. The trusted external TSJ image collection owns collision footprints and depth anchors. Booths are grouped layers containing floor/back/sides/front pieces; floors stay below actors and vertical pieces sort by their footline.

Modules: map compiler/validator → Tiled world loader → collision/depth systems → Player → WorldScene. Configuration owns character frames, speed, hitbox and camera limits. No branches by prop name or coordinate arrays in runtime code.

## Versions

Pinned Phaser 4.2.1, Next.js 16.3.8, React 19.3.0, Ant Design 6.6.5, NestJS 11.2.7. Verified on Node 20.19.2; Nest 11 avoids Nest 12's transitive Node 22 requirement while retaining current fixes in its release line. Phaser stays behind client-only dynamic imports. AntdRegistry handles initial style extraction.

Sources: https://phaser.io/download/release/v4.2.1 ; https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know ; https://ant.design/docs/react/use-with-next/ ; https://doc.mapeditor.org/en/stable/manual/objects/
