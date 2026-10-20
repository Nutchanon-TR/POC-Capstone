// Run Tiled's export first; this checks semantic equivalence after its serialization.
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { compileMap } from './lib/compile-map.mjs';

const original = await compileMap(path.resolve('maps/exhibition.tmj'), path.resolve('public'));
const exported = await compileMap(
  path.resolve('artifacts/tiled-roundtrip.tmj'),
  path.resolve('public'),
);
const normalize = (value) =>
  JSON.parse(
    JSON.stringify(value, (_, n) => (typeof n === 'number' ? Math.round(n * 1e6) / 1e6 : n)),
  );
if (!isDeepStrictEqual(normalize(original), normalize(exported)))
  throw new Error('Tiled export changed the world data.');
console.log(
  'Tiled round-trip passed: equivalent objects, collision, spawn and texture paths within 0.000001px.',
);
