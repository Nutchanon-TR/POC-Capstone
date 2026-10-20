# Select, move and resize on the map

- In **เลือก / ย้าย**, drag from empty space to draw a selection rectangle.
  Release to select the objects it touches. A booth remains one unit, including
  its child pieces. Regions are included when fully enclosed by the selection.
- Drag a selected object or the space inside the combined blue frame to move
  the entire selection. Relative spacing stays fixed and the group stays inside
  the map. Click empty space to clear the selection.
- **Shift+click** toggles items; Shift while drawing a marquee extends the selection.
  **Ctrl+C / Ctrl+V** copy and paste the current selection, including complete
  booths, within this Editor page and between its maps. New IDs and per-map GIDs
  are assigned without changing the original objects. The unique spawn is skipped.
- Individual **Layout** assets are locked in Select/Move, including marquee moves.
  Booths remain logical units even if their recipes contain structural pieces.
- Right-click the selection for Copy, Paste, Delete, Layer, Align and Space evenly.
  Alignment uses the selection bounds (or map bounds for one item); distribution
  needs at least three items. Tidy lays them out in an even grid.
  **Delete / Backspace**, **Ctrl+[ / ]**, **Ctrl+Alt+[ / ]**, and **Alt+Shift+T** are supported.
  Layout can be deleted while its move lock stays active. The unique spawn is protected.
- In **กรอบชน**, **พื้นที่** or **แก้ไข Interact**, select a frame to see eight
  handles. Drag any edge or corner to resize it; drag its interior to move it.
  Edges can also be dragged directly before selecting a frame.
- Use the arrow menu on each region tool to switch between editing and deleting.
  In delete mode, click a frame to remove that kind of region only. Backspace also
  removes the selected region in these tools. Deleting an Interact frame or an
  asset-supplied collider preserves its asset image.
- **Ctrl+Z / Ctrl+ผ** undo with either keyboard language; **Ctrl+Shift+Z** redoes.
  Text fields retain their native editing shortcuts, including Backspace and Undo.
- Grid snapping follows **ขนาดบล็อก**. **อิสระ** allows fractional coordinates.
  Resize handles keep a consistent screen size when zooming.
- Release commits one edit. **Esc**, losing focus, or releasing outside the
  canvas cancels the current preview. **Ctrl+Z** undoes the entire move or resize.

Selection is temporary editor state. Moving several objects changes their map
coordinates without adding a permanent group. Resizing Interact changes native
relative interaction properties, preserving the image's position, size and action.
Resizing a TSJ-supplied collider creates a local editable collider and disables
that asset instance's original footprint, leaving the asset image unchanged.
All committed geometry survives TMJ/ZIP export and saving/reopening the map.
