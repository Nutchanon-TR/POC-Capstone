# Editor architecture

## Data ownership

PostgreSQL maps.document owns the editable Tiled document after first seed. The browser holds an unsaved draft and bounded undo/redo history. Saving replaces the document only when the supplied revision matches. A 409 keeps the draft available for export. No disk/DB dual write or manual runtime sync is involved.

maps/exhibition.tmj is the initial seed and reference for default asset display sizes. Startup never overwrites saved maps. public/world/map.json remains a CLI verification artifact.

## Boundaries

| Module                         | Responsibility                                                           |
| ------------------------------ | ------------------------------------------------------------------------ |
| shared/map/editor.ts           | Pure document mutations, IDs, nested offsets                             |
| shared/map/compile.mjs         | Validate Tiled features; derive images, collisions, depth, spawn and NPC |
| server/catalog.ts              | Trusted local catalog; never reads client-provided paths                 |
| server/maps.ts                 | Request validation, loading, atomic revision update                      |
| server/database.ts             | Pool lifecycle and ordered transactional SQL migrations                  |
| MapEditor                      | Draft/history, loading/errors, save and preview orchestration            |
| AssetPalette / PropertiesPanel | Selection and controls                                                   |
| EditorScene / EditorViewport   | Phaser drawing/input and client-only mount/cleanup                       |
| export.ts                      | Portable Tiled package from the draft and existing catalog               |
| Player                         | Shared animation and fixed footprint across skins                        |
| BoothNpc                       | Bounded patrol, interaction range and pause using Tiled data             |

React receives committed edits and meaningful game status changes, not each frame. Phaser owns physics, animation and depth sorting. Each game has its own bridge and destroy path. Production builds omit debug handles.

## API

- GET /catalog: tiles, textures, prefabs, default display sizes.
- GET /maps/default or /maps/:id: document and revision.
- GET /maps/:id/runtime: derived playable data.
- PUT /maps/:id: {name, document, revision}; 400 for unsupported data, 409 for stale revision.

Next proxies /api/backend/* to Nest on localhost. JSON requests are capped at 4 MB. SQL values are parameterized. Credentials stay in ignored local configuration. This is a single-user local POC; authentication/authorization must be designed before shared deployment.

## Tiled contract

Finite orthogonal square 16/32/64/128px map grid (32px starter), maximum 256×256 tiles, existing image collection with GID base 1, top-left object alignment, JSON-array tile layers, rectangle collisions, no rotation/flip. Group offsets propagate to art, collision and NPC. Unknown document metadata survives editing; runtime uses supported fields only.

One visible Spawn must have an unobstructed foot rectangle. At most one Npc is supported; its booth must exist and patrol corridor must be clear and inside the map. Position, title, dialogue, range, speed and patrol radius are object properties. Deleting the containing booth removes its NPC.

ZIP exports TMJ, merged TSJ and supplied/uploaded images with relative paths. Import accepts TMJ using the database's current catalog, not modified/new TSJ definitions from the browser. AssetsService stores validated PNGs and immutable definitions in editor_assets; CatalogService merges them with the trusted local tileset. Collision/depth definitions originate in that merged TSJ; instances can override depthY and disable their footprint with collisionEnabled=false.

StudioControls stores blueprint references as a Tiled string property; shared/map/studio.ts owns map creation/resizing, proportion-preserving size edits and rectangle region creation. Blueprint graphics stay in EditorScene, outside playable WorldData. Runtime texture lists include only used assets. See map-studio.md for the user flow and current limits.

## Asset stacking

`shared/map/order.ts` changes image stacking without changing position, dimensions or collision. The inspector provides front/back and one-step controls; booth groups preserve member order and ground tiles stay below props. Each committed action participates in Undo/Redo.

TMJ tile objects store manual order in the standard Tiled custom float property `renderDepth`; larger values draw in front. Save and ZIP/TMJ roundtrips preserve it. This is an application rendering convention, not a native Tiled layer: consumers must read `renderDepth` when assigning Phaser image depth. The editor compiler and Project expo importer already do so. Resetting to automatic order removes the selected overrides and restores Y plus scaled `depthY` sorting.

## Characters

The editor's temporary walking preview uses `WalkPreview.ts` for input, camera and sprite animation, with pure movement/collision in `shared/map/walk.ts`. It reads the compiled draft's colliders without mutating TMJ or history. The 26×12 foot rectangle matches the map compiler's spawn footprint. `scripts/prepare-editor-student.mjs <Student02.png>` copies the supplied PNG unchanged and creates sixteen atlas rectangles with a common foot anchor; the atlas records the PNG hash. The temporary actor and controls are disposed on toggle-off or map change.

Measure blue hair/red hat rather than lantern glow, align the horizontal landmark and central opaque foot baseline, then pack original crops into transparent 288×256 frames. Final packing copies RGBA rows directly to avoid alpha-compositing rounding. assets/characters.json records hashes, crop rectangles and offsets. Both skins share the same world footprint and run at 6 fps.
