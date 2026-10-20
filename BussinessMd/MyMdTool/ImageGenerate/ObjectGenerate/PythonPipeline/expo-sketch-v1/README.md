# Expo sketch v1

The user's sketch is preserved in source/layout-reference.png. This pack follows ObjectAssetGuide.md, MapComponentGuide.md and PixelPipelineGuide.md. It reuses native sample-source furniture/structural sprites and adds two image_gen props: expo-booth-counter and expo-registration-desk. New structural ivory floor art is constructed on the sample pack grid and palette in Python.

The map has five booths, two doors, a left-side registration counter and decorative table, four central sofas, a lower-left table with four chairs, and a northeastern tree. The world uses 42 × 26 tiles, 32px per tile. The sketch has no physical scale; these are authoring choices, not measurements of a real venue.

Open bundle/expo.tmj in Tiled or use expo-tiled.zip. The runtime copy is in POC-Phaser/Project/public/assets/expo/. TMJ is the editable map source; PNG previews only show the assembly. This generic Tiled bundle is not automatically compatible with Editor's old exhibition.tsj import contract.

- source/: preserved raw PNGs, sketch and exact prompts.
- bundle/props/: prepared native props, with binary alpha and the shared 24-color palette.
- bundle/structure/: native structural modules, separate from furniture.
- inventory.json: image sizes, footprints, ground/foot anchors and provenance.
- file-audit.json: measured palette/alpha results and raw hashes.
- props-native.png / structure-native.png: separate inventory sheets.
- assembly-preview-native.png / assembly-preview-2x.png: assembly from actual prepared pieces.
- floor-*-repeat.png: nearest-neighbor 3×3 repeat checks.
- prepare-map.py: repeatable authoring script, using Pillow and NumPy.

Run prepare-map.py with --project set to the Project directory to regenerate the baseline, prepare sprites, create the map bundle and export the ZIP. It replaces generated baseline files, so preserve manual Tiled edits before running it again. Ordinary Project dev/build commands do not run this authoring script.

Project's map parser/file checks and browser playtest cover map loading, navigation-probe connectivity and camera/UI behavior. Actual character collision, character depth and NPC behavior remain pending because this stage contains only the map.
