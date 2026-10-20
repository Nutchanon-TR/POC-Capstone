import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';
import { catalogFromTileset } from '../shared/map/bundle.ts';
import { splitCounterRecipe, splitExpoCounters } from '../shared/map/expo-upgrade.ts';

const sizes = {
  'expo-cloth-table': [116, 43, 'โต๊ะคลุมผ้า'],
  'expo-computer': [32, 36, 'คอมพิวเตอร์'],
  'expo-documents': [20, 18, 'เอกสารกระดาษ'],
};
const prop = (name, value) => ({
  name,
  type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'float' : 'string',
  value,
});
for (const directory of ['public/starter', '../Project/public/assets/expo']) {
  const set = JSON.parse(await readFile(path.join(directory, 'expo.tsj'), 'utf8'));
  for (const [key, [w, h, label]] of Object.entries(sizes)) {
    if (
      !set.tiles.some((t) => t.properties.some((p) => p.name === 'assetKey' && p.value === key))
    ) {
      set.tiles.push({
        id: Math.max(...set.tiles.map((t) => t.id)) + 1,
        image: `props/${key}.png`,
        imagewidth: w,
        imageheight: h,
        properties: [
          prop('assetKey', key),
          prop('kind', 'prop'),
          prop('depthY', h - 1),
          prop('label', label),
        ],
        ...(key === 'expo-cloth-table'
          ? {
              objectgroup: {
                type: 'objectgroup',
                objects: [
                  {
                    id: 1,
                    name: 'Table footprint',
                    x: 4,
                    y: 12,
                    width: 108,
                    height: 28,
                    rotation: 0,
                  },
                ],
              },
            }
          : {}),
      });
    }
  }
  for (const tile of set.tiles) {
    const key = tile.properties.find((p) => p.name === 'assetKey')?.value;
    const kind =
      key === 'board-front'
        ? 'board'
        : key === 'expo-computer'
          ? 'computer'
          : key === 'expo-documents'
            ? 'document'
            : key?.startsWith('chair-')
              ? 'chair'
              : key?.startsWith('sofa-')
                ? 'sofa'
                : undefined;
    const fields = [
      ...(kind ? [prop('interactable', true), prop('interactKind', kind)] : []),
      ...(key === 'expo-booth-counter' ? [prop('editorHidden', true)] : []),
    ];
    tile.properties = [
      ...tile.properties.filter((p) => !fields.some((f) => f.name === p.name)),
      ...fields,
    ];
  }
  set.tilecount = set.tiles.length;
  set.nexttileid = Math.max(...set.tiles.map((t) => t.id)) + 1;
  const catalog = catalogFromTileset(set, (image) => image);
  const document = JSON.parse(await readFile(path.join(directory, 'expo.tmj'), 'utf8'));
  splitExpoCounters(document, catalog);
  await writeFile(path.join(directory, 'expo.tsj'), JSON.stringify(set, null, 2) + '\n');
  await writeFile(path.join(directory, 'expo.tmj'), JSON.stringify(document, null, 2) + '\n');
  if (directory === 'public/starter') {
    const recipes = JSON.parse(await readFile(path.join(directory, 'prefabs.json'), 'utf8'));
    for (const recipe of recipes) splitCounterRecipe(recipe, catalog);
    await writeFile(path.join(directory, 'prefabs.json'), JSON.stringify(recipes, null, 2) + '\n');
  } else {
    const files = {};
    for (const name of ['expo.tmj', 'expo.tsj', ...set.tiles.map((t) => t.image)])
      files[name] = new Uint8Array(await readFile(path.join(directory, name)));
    await writeFile(path.join(directory, 'expo-tiled.zip'), zipSync(files));
  }
  console.log(directory, set.tilecount, 'assets; counters decomposed');
}
