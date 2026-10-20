# Expo Interact v2

Generated with the built-in imagegen tool: three separate transparent sprites. Exact prompts and reference roles are preserved in source/*.prompt.json; raw PNGs remain in source/.

- expo-cloth-table: 116 x 43 native pixels, ivory cloth with muted green side panels and hem; empty tabletop.
- expo-computer: 32 x 36 native pixels, standalone monitor and keyboard.
- expo-documents: 20 x 18 native pixels, standalone cream paper stack.

prepare-assets.py crops to the alpha bounds, keeps aspect ratio, normalizes to the existing 24-color palette using nearest-neighbor resampling, and thresholds alpha to 0/255. Padding is two native pixels. inventory.json records source crops, dimensions, palette, binary alpha and SHA256. Runtime PNGs are copied to Editor/public/starter/props and Project/public/assets/expo/props.

assembly-native.png and assembly-preview-6x.png are composed from the actual three PNGs, not another room generation. Each asset remains a separate file in bundle/props. Native pixel unit is 1; world tile is 32 with editor snap 16/32/64/128. Do not resize non-uniformly.

ObjectGenerate/ObjectAssetGuide.md and Standard/ReferenceImageGuide.md control the reference roles: existing expo sprite is camera/palette/pixel style; the two user photographs supply cloth-table shape/material only. No logos, registration text or unrelated props are transferred.

The new Interact library category describes metadata. Tiled objects use interactEnabled, interactKind, interactAction and native interactX/Y/Width/Height; TSJ defaults are interactable and interactKind. Editor/docs/interaction-assets.md explains consuming these properties. Target games supply their own actions.

