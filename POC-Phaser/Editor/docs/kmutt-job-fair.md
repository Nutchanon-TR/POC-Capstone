# kmutt · authored job-fair map

The new library entry `kmutt` follows the supplied `job-fair-map.webp` zoning: registration southwest, refreshments northwest, interviews north, recruiting booths in the central band, workshop southeast, and the main stage northeast. The map preserves the six-zone programme using the project's orthogonal top-down camera.

80×56 tiles at 32px contain 12 separately editable booth groups, six interview stations, six workshop tables, 70 audience chairs and cafe/waiting areas. The main booth aisle is 128px, booth panels have 60px clear spacing and the audience's central aisle is 60px. The actor foot rectangle is 26×12px. Floor, images, collision, depth and interaction metadata remain independent.

`public/maps/kmutt/map.tmj` and `expo.tsj` are the source documents for this authored preset. `kmutt-tiled.zip` contains all resources with relative paths. `overview.png` is an annotated Python assembly; `preview-native.png` is the unannotated native assembly. Consumers supply actions for the namespaced `interactAction` values and honor `renderDepth` on tabletop objects.

Five transparent props were created with built-in imagegen: stage, stage screen, podium, buffet counter and booth panel. Existing native furniture was reused where its camera, material and scale fit. Python normalization uses a shared 24-color palette, binary alpha and proportion-preserving nearest-neighbor resampling. Map components are separate modular floor/trim PNGs. Raw images, prompts, inventories, separate prop/component contact sheets and assembly scripts live in:

`D:/A_SIT04/SIT4-TERM1/a_M_CapStone/BussinessMd/MyMdTool/ImageGenerate/ObjectGenerate/PythonPipeline/kmutt-job-fair-v1/`

Reproduce the data with `node --import tsx scripts/build-kmutt-map.mjs` after running that folder's `prepare-assets.py`, then run its `assemble-preview.py`. `design-report.json` records a flood fill on 8px samples with the real character foot rectangle; all 30 public approaches are reachable from the entrance. The map also passes the gameplay compiler's spawn validation.

Initialization seeds ID `preset-kmutt-jobfair-v1` once, without activating it. Existing saved edits to this entry remain authoritative. Starter regression fixtures deliberately exclude bundled examples; `kmutt-map.spec.mjs` exercises the real preset seeding, active-map preservation, editing, saving, reload, ZIP export and mobile walking.

Validated on 2026-10-16: 31 unit/file checks, 20 browser checks, TypeScript and production build. Browser evidence is in `artifacts/kmutt-editor-*.png`.
