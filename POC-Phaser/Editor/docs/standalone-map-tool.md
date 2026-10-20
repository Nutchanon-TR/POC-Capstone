# Map Studio as a reusable map authoring tool

The active application at `/` and `/editor` is a standalone map editor. Run `npm run dev -- --port 3001` or `npm run build` then `npm run start -- --port 3001`. It requires neither PostgreSQL nor the Nest API. The former exhibition gameplay/server sources remain available as inactive legacy code and are not part of the active tool path.

## Placement

Select a prop or booth in the asset library. The canvas displays its actual prepared artwork at 42% opacity under the pointer. A green outline shows the occupied grid cells. Clicking stamps the same artwork at the same snapped origin. Hover alone never edits the document. The preview disappears outside the canvas or when switching away from placement. A red outline means the occupied blocks exceed the map bounds; clicking then does not stamp.

The default block size is 32px. 16px, 64px and 128px blocks are also supported. There is no free-placement switch. Mouse placement and inspector coordinates use the containing grid cell. Dragging snaps to the nearest grid point, handling fractional pointer coordinates after camera zoom. A 116px-wide image occupies four 32px cells without stretching the artwork. Each map has a real Tile size of 16, 32, 64 or 128px chosen before creation. Floor previews and brushes cover at least one complete native map tile and align to that tile; larger block brushes repeat the native tile. Props and regions can use smaller snap steps. Floor PNGs are normalized to the actual tile size for Tiled export. Changing block size affects future edits and does not distort existing imported geometry.

The document/history is held by React. `shared/map/grid.ts` owns pure placement math; the scene uses that math for the disposable ghost, and the edit handler uses it for the actual document change. Per-frame pointer updates do not create document history or React renders. Ghost artwork is cached for the selected asset; no new sprite container is allocated on each mouse move.

## Rectangular gestures and shortcuts

Floor and Layout assets support inclusive rectangular dragging: five columns by three rows previews fifteen stamps. The document stays unchanged while held; release commits the complete rectangle as one undo operation. Moving back shrinks the pending rectangle. Layout stamps repeat at their grid-rounded artwork footprint, avoiding overlaps for tall or wide pieces. Props and booth prefabs keep single-click placement.

Choose **ลบ Layout / Prop** and drag a rectangle to preview intersecting Layout and Prop artwork in red. Release removes all highlighted pieces, including nested pieces and uploaded props, while preserving floor tiles and logical markers. Tile-derived collision disappears with its artwork; explicit collision/zone markers remain editable separately. Ctrl+Z restores the whole erase operation. Esc, releasing outside the canvas, or leaving the browser cancels pending gestures. Hold Space and drag to pan in every tool; right-button panning remains available. Ctrl+Shift+Z or Ctrl+Y redo. Shortcuts do not override text entry or dialog controls.

## Pixel room UI

Names in the inspector and object picker use the same display name, including imported `label`/`title` aliases. Typing a name creates only a local draft. Press **ยืนยันชื่อ** or Enter to apply it immediately to the picker, map badge and exported object name/aliases as one undo operation; blur does not commit. Empty names are rejected.

In **กรอบชน** mode, clicking a stored Collider rectangle selects it without drawing another rectangle. It can be dragged, resized in the inspector, renamed or removed with **ลบกรอบชน**. **สร้างกรอบชนใหม่** draws additional or nested rectangles. Asset-supplied colliders can also be selected: editing materializes that asset instance's collision geometry into explicit Collider objects and disables its inherited collision, keeping the artwork in place. Deleting removes only the chosen collision rectangle and preserves the asset's remaining collision shapes. These changes can be undone together.

In **พื้นที่** mode every zone has a blue border, translucent light-blue fill and an on-map name. Clicking anywhere inside selects it; dragging moves its name and fill together on the current grid and commits one history operation on release. **ลบพื้นที่** removes the selected region, and Undo restores it. **แก้ไขพื้นที่** opens the inspector for its name and dimensions. **สร้างพื้นที่ใหม่** explicitly draws a new rectangle, including inside another zone; blank-space dragging also creates a zone. Overlaps select the smallest containing region, then the selected or newest region when sizes match. Space panning and Esc/outside cancellation preserve the document. Zone colors and name badges are editor visuals; the portable TMJ remains standard region objects.

The reference-inspired theme uses brown surroundings, cream inventory surfaces, orange tool selection, green Save and crisp SVG pixel icons. The eight editing tools and undo/redo live in a centered bottom dock. Names appear on hover or keyboard focus, with accessible button names and pressed states. The right shelf switches between the asset library and inspector; selecting an object opens its inspector. File import/export, PNG upload and map settings remain available in **ไฟล์ / ตั้งค่า**. On small screens, the shelf is closed initially and selecting an asset returns to the map. The camera canvas reserves space for the dock so its controls do not cover the editable map.

## Persistence

The collapsible left map library provides a single activity icon, actual map thumbnails, names and last-modified times. Create chooses columns, rows and Tile size; Duplicate copies the latest available draft into a new independent map. Switching keeps per-map drafts and Undo/Redo in this page. Save commits the selected map. Reopening restores the last active saved map. See [map-library.md](map-library.md) for the storage and tile-size contract.

The Save button stores the map and its catalog, including uploaded PNG data, in IndexedDB for this browser and origin. Reopening the same URL restores the saved revision. Revision checks prevent another tab silently overwriting a newer saved project. A different browser/origin has separate storage. Export ZIP is the portable copy to keep or transfer; browser storage is not a replacement for that file.

Importing a ZIP changes both the map and catalog and starts a fresh undo history. TMJ alone uses the current catalog. ZIP import carries the actual PNGs, so a fresh instance can open exported work without the original server, filesystem path or database. Uploaded assets are retained in browser storage; save the map after editing to keep its latest positions.

## Output

Use **Export ชุด Tiled ZIP** for a self-contained deliverable:

```text
map.tmj
tilesets/map.tsj
images/tile-1.png
images/tile-2.png
...
studio/prefabs.json
README.txt
```

TMJ references `tilesets/map.tsj`; the TSJ references PNGs relative to itself. GIDs and tile IDs stay stable. Exported PNG names derive from the tile ID, so repeated input basenames cannot overwrite another image. Actual PNG bytes are included for the original library and uploaded assets. No local drive path, asset API URL or runtime map JSON is required by the exported bundle. Prefab recipes are optional editor metadata; Tiled uses the expanded group/object data directly.

Export TMJ downloads `map.tmj` only and must accompany the corresponding TSJ/images from a ZIP export. Tiled is a data format, so behavior properties and collision rectangles are data; each consuming game provides its own loading, physics and interactions. This tool does not insert a character to make an export valid. The Editor-mode compiler supports maps without gameplay spawn/NPC requirements while keeping the legacy runtime compiler strict.

Current supported profile: finite orthogonal maps with square 16/32/64/128px tiles, up to 256×256 tiles, one external image-collection TSJ with firstgid=1 and top-left object alignment, PNG images, groups, uncompressed JSON tile data and axis-aligned rectangular collision. Infinite maps, sprite-atlas tilesets, multiple tilesets, tile flips, rotated/polygon collision and compressed tile data are not yet supported. This is a Tiled-compatible output contract, not a claim to implement all Tiled features.

## Verification

`npm test` exercises inclusive rectangle counts, reverse dragging, bulk Layout/Prop deletion preserving floors/markers, grid origins and bounds, ghost/commit geometry, real prefab parts, block-sized floor brushes, optional gameplay markers, complete ZIP roundtrips, duplicate image basenames and invalid bundle rejection. `npm run typecheck`, lint of the touched source, and the production build verify integration.

After `npm run build`, run `npm run test:studio` for the standalone tool's browser regression test. It uses installed Chrome and starts or reuses the production server on port 3001, with no API/database. It verifies pending 15-to-4-to-15 Layout previews, one-operation undo/redo, combined Layout/Prop eraser undo, exactly fifteen changed floor tiles in the exported TMJ, Escape/outside cancellation, Space panning over assets in both placement and selection tools, text-field shortcut isolation, a centered dock and mobile inventory interaction. Screenshots are in `artifacts/layout-drag-preview.png`, `artifacts/layout-erase-preview.png` and `artifacts/floor-drag-preview.png`.

Browser checks recorded in `artifacts/tool-verification.json` cover hovering without edits, exact ghost/click positions, invalid edge rejection, undo/redo, coordinate snapping, block-size switching, preview hiding, real ZIP download/import, save/reload, uploaded PNG export and the absence of backend requests. The downloaded ZIPs were inspected for every PNG reference and actual PNG dimensions. Native Tiled desktop opening was not tested because its executable was not available; no character physics/playtest is claimed for this authoring tool.
