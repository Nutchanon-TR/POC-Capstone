import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { compileMap } from './lib/compile-map.mjs';

const map = await compileMap(path.resolve('maps/exhibition.tmj'), path.resolve('public'));
await mkdir('public/world', { recursive: true });
await writeFile('public/world/map.json', JSON.stringify(map));
console.log(
  `Map synced: ${map.summary.booths} booths, ${map.summary.propDesigns} prop designs, ${map.objects.length} pieces, ${map.colliders.length} collision rectangles.`,
);
