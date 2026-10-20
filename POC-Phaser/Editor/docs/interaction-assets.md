# Interact assets

หมวด Interact มีบอร์ด คอม เอกสารกระดาษ เก้าอี้ และโซฟา เลือกภาพเพื่อวางตามกริด จากนั้นใช้ไอคอน Interact ในแถบล่างเพื่อคลิกกรอบสีเหลืองและลากย้าย asset เลือกชื่อ ประเภท Action key และขอบเขตในรายละเอียด ยืนยันชื่อ/Action ก่อนนำไปใช้ ปิด Interact หรือลบกรอบเพื่อเก็บภาพไว้แต่เอาข้อมูลปฏิสัมพันธ์ออก Undo ย้อนกลับได้

Editor เก็บข้อมูลสำหรับเกมอื่น ไม่มีการเปิดเอกสาร นั่ง หรือเปิดโปรแกรมจริงใน Editor

## Tiled contract

| Property                       | Location                      | Meaning                                             |
| ------------------------------ | ----------------------------- | --------------------------------------------------- |
| interactable                   | TSJ tile, bool                | Default interaction enabled                         |
| interactKind                   | TSJ tile / TMJ object, string | board / computer / document / chair / sofa / custom |
| interactEnabled                | TMJ object, bool              | Override enabled state for one placed asset         |
| interactAction                 | TSJ tile / TMJ object, string | Consumer-defined action key, empty by default       |
| interactX / interactY          | TSJ tile / TMJ object, float  | Bounds offset in native image pixels, default 0     |
| interactWidth / interactHeight | TSJ tile / TMJ object, float  | Positive native bounds size, default full image     |

Object properties override tile defaults. `object.name` is the interaction label; existing label/title aliases are respected and renamed together. Interaction IDs are the placed Tiled object IDs. Layer offsets and sprite scaling apply:

```text
scaleX = object.width / tile.imagewidth
scaleY = object.height / tile.imageheight
interaction.x = accumulatedLayerOffsetX + object.x + interactX * scaleX
interaction.y = accumulatedLayerOffsetY + object.y + interactY * scaleY
interaction.width = interactWidth * scaleX
interaction.height = interactHeight * scaleY
```

TMJ/TSJ use ordinary Tiled custom properties. ZIP exports include all PNGs and studio prefab recipes. Interaction bounds follow moved/scaled assets and disappear when an asset is deleted; no detached trigger objects are left behind. Gameplay systems choose when to detect these bounds and what `interactAction` means.

## Separate booth counters

`expo-cloth-table`, `expo-computer`, `expo-documents` are distinct native transparent PNGs. Existing `expo-booth-counter` remains available for old-file compatibility but is hidden in the palette. The starter map and prefab recipes use the three separate assets. Desk devices use per-instance native `depthY` so they render above the cloth table and keep that ordering when a booth moves.

Saved legacy workspaces receive new assets by asset key, allocate unused GIDs, preserve uploaded textures/custom recipes, and decompose only known counters. Map migration is undoable and stays unsaved until the user saves. Offline/unavailable starter files leave saved work accessible. A repeat migration creates no duplicate assets or objects.

Asset preparation: `node --import tsx scripts/prepare-interact.mjs` after native PNG generation. This updates Editor and Project starter maps and rebuilds Project's Tiled ZIP without touching browser workspaces.
