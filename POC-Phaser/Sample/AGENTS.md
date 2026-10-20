# Working in Sample

This project is a local Next.js App Router + Tailwind + Ant Design + Phaser 4 learning POC.

- Read `README.md`, `docs/ARCHITECTURE.md`, and `docs/ASSETS.md` before changing game architecture or asset loading.
- Keep changes scoped to Sample unless the user requests work in sibling projects.
- `src/game/domain` must not import React, Phaser, DOM, or networking code.
- `src/game/tiled` validates external JSON and produces serializable World data.
- `src/game/phaser` adapts input and domain state into disposable renderer objects.
- `src/features/playground` owns React UI and mounts/disposes the runtime.
- Communicate between UI and game through the typed per-instance bridge. Do not expose sprites to UI or introduce a global bridge singleton.
- Preserve supplied files in `public/assets/map` and the original character source. The map uses the ProjectExpo32-v1 top-left export contract, not standard Tiled tile-object coordinates.
- Keep comments focused on why code exists. Update Thai learning docs when lifecycle, interfaces, or asset contracts change.
- Run `npm run typecheck`, `npm test`, and `npm run build` for code changes. Use the real browser tests for input, lifecycle, UI, or renderer changes. Browser setup is documented in README.
- `npm run format` formats maintained source and docs. It excludes original map and character assets.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
