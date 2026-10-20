import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compileDocument, propertiesOf } from '../../shared/map/compile.mjs';
export { propertiesOf, mergeFloorTiles } from '../../shared/map/compile.mjs';
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
export async function compileMap(mapPath, publicRoot) {
  const map = JSON.parse(await readFile(mapPath, 'utf8'));
  assert(map.orientation === 'orthogonal' && !map.infinite, 'use a finite orthogonal map.');
  const catalog = new Map();
  const textures = [];
  for (const entry of map.tilesets) {
    const sourcePath = entry.source ? path.resolve(path.dirname(mapPath), entry.source) : mapPath;
    const set = entry.source ? JSON.parse(await readFile(sourcePath, 'utf8')) : entry;
    assert(set.objectalignment === 'topleft', `${set.name}: set Object Alignment to Top Left.`);
    assert(Array.isArray(set.tiles), 'use the supplied image collection tileset.');
    for (const t of set.tiles) {
      const imagePath = path.resolve(path.dirname(sourcePath), t.image);
      const relative = path.relative(publicRoot, imagePath);
      assert(
        !relative.startsWith('..') && !path.isAbsolute(relative),
        `${t.image}: image must be in public/.`,
      );
      await readFile(imagePath); // Fail early with a useful missing-file path.
      const p = propertiesOf(t);
      const key = `tile-${entry.firstgid + t.id}`;
      assert(
        Number.isFinite(t.imagewidth) && Number.isFinite(t.imageheight),
        `${key}: missing image dimensions.`,
      );
      assert(Number.isFinite(p.depthY), `${key}: depthY must be a number.`);
      catalog.set(entry.firstgid + t.id, { ...t, meta: p, key });
      textures.push({
        key,
        url: '/' + relative.split(path.sep).join('/'),
        width: t.imagewidth,
        height: t.imageheight,
      });
    }
  }
  return compileDocument(
    map,
    [...catalog].map(([gid, t]) => ({ ...t, gid })),
    textures,
  );
}
