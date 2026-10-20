# Generation prompts

Tool: built-in image_gen. Both assets were created with transparent backgrounds.
Reference selection: all three images in ObjectGenerate, opened before generation.
Example01.png supplies furniture design/construction vocabulary. Example02.png supplies structural materials and relative scale. Example03.png is the primary flat-cluster, selective-outline style reference. The user's sketch is a layout reference only and is preserved as layout-reference.png.

## Common prompt, used for both calls

Create one isolated production-source pixel-art furniture sprite for a Phaser exhibition hall. IMAGE ROLES: Example01.png is furniture construction/design vocabulary only, NOT its soft edge defects; Example02.png is architectural material/relative scale vocabulary only, NOT its room sheet, gradient or text; Example03.png is primary visual style and construction reference: restrained flat connected pixel clusters, thin selective outline, warm wood, muted green, cream trim, shared cool shadows. Use ALL three references only in these roles. Camera is high-angle top-down orthographic RPG, screen axes parallel, facing lower screen edge. Large top plane, short front plane, no side rotation, no vanishing point, no isometric, no front elevation. Warm oak, sage green and ivory using the same material colors as the references. Light from upper left, cool desaturated shadows. Low-resolution native art, consistent one-pixel units, 4-5 flat shades per material, thin contours, no gradients, no anti-aliasing, no shiny bevels, no texture noise, no ground shadows. Genuine transparent alpha, complete silhouette with generous padding, no people, no floor, no labels, no letters, no watermark. Do not make a room or a booth building. One sprite only, centered. This is a NEW asset, referenced images are STYLE REFERENCES, not edit targets.

## Booth counter, appended to the common prompt

ASSET ID: expo-booth-counter. One straight exhibition demo counter, native intended footprint 112x48 world pixels, about 112x82 full visible silhouette. Warm oak countertop seen from above, muted sage-green front panel with cream slender sides, small dark screen on a short stand placed on the rear-right edge and a neatly stacked pair of cream brochures on the left. The screen faces visitors at the lower screen edge and is integrated at correct small scale, it must not dominate the tabletop. No legs sticking randomly out, coherent single design. The total artwork should have the detail budget of a roughly 112x82 native sprite enlarged by integer nearest-neighbor, placed on transparent canvas. Do not add typography.

## Registration desk, appended to the common prompt

ASSET ID: expo-registration-desk. One horizontal visitor registration desk, elongated two-station design, intended native visible silhouette around 192x84 world pixels. Warm oak desktop, muted sage front cabinets with slim cream end posts. Two small laptop terminals integrated along rear edge, a tidy cream clipboard and badge tray between them. Furniture is a straight long rectangle, warm welcoming design matching the booth counter. The desktop is broad in the top-down view; the front panel is compressed to a short height. All edges parallel with screen axes. The whole visible sprite has the limited detail budget of a 192x84 native game sprite enlarged at one integer scale. No typography, no symbols masquerading as text, no queue rails, no chairs, no room.

## Preparation and measurements

Prompt dimensions are generation targets, not measured results. `prepare-map.py` crops the actual alpha silhouette, uniformly resizes it to the declared native width, remaps colors to the shared palette without dithering, and adds two pixels of padding. It preserves the originals. Measured PNG sizes and palette/alpha checks are in inventory.json and file-audit.json.
