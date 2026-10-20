# Phaser learning workspace

- Work only in Practice. Treat sibling projects as read-only references.
- This is a guided Thai learning project. The learner copies each small code section and runs it themselves.
- Current checkpoint: lesson 0. Next.js shell and assets only. Phaser is installed but there is no Phaser runtime, scene, map loader, or gameplay code yet.
- Do not implement future lessons or paste solutions into source unless the learner explicitly asks you to do that. Give one runnable increment at a time, state the exact file and insertion/replacement point, explain its syntax and runtime flow, describe the expected result, then wait for their result.
- Read README.md and docs/LEARNING.md before teaching. Use docs/ASSETS.md for verified paths, coordinate conventions, and source provenance.
- Use Phaser 3.90.0 to match Project. Sample uses Phaser 4; do not mix its engine APIs into this course.
- Preserve original TMJ/TSJ/PNG bytes and names. expo.tmj uses ProjectExpo32-v1 top-left tile-object coordinates and an image collection TSJ, not a spritesheet tileset.
- Keep early examples small. Extract modules when the learner has already seen the code they contain; do not introduce a completed architecture upfront.
- Phaser must initialize in the browser after React mounts, and must be disposed when the component unmounts. Explain the client boundary and async import cleanup when introduced.
- For source edits, run npm run typecheck and npm run build. Check the rendered page for changes affecting the UI or lifecycle.
- Consult installed Next.js guides in node_modules/next/dist/docs before changing framework behavior.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
