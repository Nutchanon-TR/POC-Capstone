# Booth library and durable saves

In the **Booth** palette, **เพิ่มบูธ** opens a popup to name and size a recipe.
Frame width and height are entered as whole floor-cell counts. Four by four cells
at 32px produce a 128×128px frame. Mixed floor sizes use a common multiple, and
the frame cannot shrink through existing pieces.
Choose Prop, Layout, Floor or Interact, then select an image and add a part.
Floor skips the add button: choosing a floor starts a brush, hovering shows a
translucent stamp, clicking places it, and dragging previews an inclusive rectangle
which commits on release. Reversing the drag shrinks the preview. Escape, pointer
cancellation or release outside the frame discards the stroke. Painting an existing
cell replaces its pattern without adding duplicates; native floor tile dimensions
are preserved. Select/Move returns to editing existing floor pieces.
The contents list starts collapsed and groups thumbnails by those four categories.
Drag a part to move it; drag any of its eight blue handles to resize it.
Part coordinate/size inputs are replaced by these direct controls; the booth's
overall frame dimensions remain in the heading. Escape cancels a live transform.
Use Select/Move and Backspace to delete a selected part, or use separate floor
and asset erasers. Each eraser ignores the other type, including when they overlap.
Text input keeps native Backspace behavior. New assets start foremost; Front,
Forward, Backward and Back buttons reorder parts within their ground/asset plane.
The order is encoded with native depthY properties and retained in saved recipes,
placed TMJ objects and ZIP exports. Moving/resizing a part preserves its stack
position. Editing an existing recipe uses the same popup. Saved recipes use
exactly those pixel sizes when placed.

Select a placed booth and use **แก้ไขบูธนี้** in its inspector to edit that one
instance. Booth XY inputs are replaced by this action; dragging on the map still
moves the booth. Instance edits are one map-history operation and require saving
the map. They preserve surviving child IDs, action/collision overrides, names and
logical markers. Other booths and the library recipe remain unchanged.

Recipes are shared across maps. Editing a recipe changes future placements;
already placed booths keep their objects, layout, collision and actions. Deleting
a recipe removes it from the library while keeping its placed instances. Revisioned
overrides and deletion markers prevent old map snapshots from restoring deleted
recipes. Tiled ZIPs preserve recipe labels and explicit sizes.

The **บันทึกแมป** button now writes the map and its catalog to the local server's
`.studio/workspace.json`. This file lives beside the project, outside `.next`, so
stopping and restarting Next.js keeps saved edits. Uploaded PNGs are stored as
data URLs; bundled assets retain their project paths. Saved maps and recipes can
also open in another browser profile that connects to the same server.

Existing browser maps are migrated onto disk when the Editor starts. IndexedDB
remains a local cache; unsaved edits and undo history stay in the current page.
A successful save is reported after the server writes the file. Server requests
are serialized and the whole JSON file is atomically replaced after flushing;
revision checks reject stale map and recipe writes. Keep `.studio/` when copying
or backing up this project. `MAP_STUDIO_DATA_DIR` can select another persistent
folder. This local file store expects one running writer server per data folder.

Tests use a separate server on port 3005 and temporary storage isolated per test;
they do not write the user's `.studio/workspace.json`. After a production build,
`node --import tsx scripts/test-studio-restart.mjs` verifies actual server restart
durability on port 3006 with a separate temporary workspace.
