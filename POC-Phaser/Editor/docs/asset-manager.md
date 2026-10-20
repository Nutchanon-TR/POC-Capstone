# Shared asset manager

The second icon in the left rail opens the image gallery without discarding map
drafts or their undo history. Choose an asset to change its library name, default
placement dimensions, collision rectangles and default interaction bounds/action.
Frames support both numeric input and direct drag/resize. Floor image dimensions
follow each map's tile size; their default size controls are read-only.

Saving an asset writes immediately to `.studio/workspace.json`. The asset library
is shared by every map, with per-asset revision checks. Default sizes and names
apply to future placements; existing object names and sizes remain per-instance.
Default frame changes are shared unless the placed object overrides them.

Deleting removes the asset from placement pickers and this gallery. Its texture,
GID and existing placements remain available to saved maps and Tiled exports.
Revisioned deletion markers prevent older map snapshots, cached catalogs or
starter migrations from reintroducing it to the picker. Files on disk are not
physically deleted. Asset bounds are stored as image-relative fractions so the
same definitions scale correctly across native floor variants.
