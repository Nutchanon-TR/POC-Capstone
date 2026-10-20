# Shared assets in Map Studio

The asset palette is shared across every map in this project's local server.
Existing map libraries (including `kmutt`) are collected automatically on startup.
Uploaded PNGs and assets imported through a Tiled ZIP enter the library immediately,
even before saving the current map. New, duplicated, saved and cached draft maps
all receive missing assets when opened. Returning to a browser tab refreshes its
palette without replacing its document or undo history.

`.studio/workspace.json` stores the durable library; `workspace.sharedAssets`
in IndexedDB caches it locally. Server requests serialize updates so concurrent uploads survive.
This does not change map revisions or save unsaved map edits.

`shared/map/catalog.ts` merges by `assetKey`. Each map retains existing tile IDs,
texture references, local definitions and prefab recipes. Missing tiles receive
new local IDs and unique image paths. Thus different map-local GIDs cannot replace
each other's images. An existing assetKey means the same logical asset; import
distinct assets with distinct keys. The catalog limit remains 2,000 tiles.

Native uploaded floor PNGs are kept in the library. Each map gets a nearest-neighbor
copy matching its own tile size. Tiled ZIP exports contain the map's TSJ, recipes
and PNGs, including shared assets, so another project can use the bundle directly.
Another browser using the same server loads the library from disk. ZIP is the
transfer mechanism for other projects or computers. Booth edits and deletions
apply through the separate revisioned recipe registry.
