import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('../Project/public/assets/expo');
const target = path.resolve('public/starter');
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
const map = JSON.parse(await readFile(path.join(target, 'expo.tmj'), 'utf8'));
const set = JSON.parse(await readFile(path.join(target, 'expo.tsj'), 'utf8'));
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const tiles = new Map(set.tiles.map((t) => [t.id + 1, t]));
const fixtures = map.layers.flatMap((l) => l.objects ?? []).filter((o) => o.gid);
const areas = map.layers
  .flatMap((l) => l.objects ?? [])
  .filter((o) => o.type === 'Area' && props(o).kind === 'booth');
const prefabs = areas.map((area) => {
  const objects = fixtures.filter((o) => props(o).areaId === area.name);
  const minY = Math.min(area.y, ...objects.map((o) => o.y));
  const parts = [];
  const floor = set.tiles.find((t) => props(t).assetKey === 'floor-wood-center');
  for (let y = 0; y < area.height; y += 32)
    for (let x = 0; x < area.width; x += 32)
      parts.push({ key: props(floor).assetKey, x, y: area.y - minY + y, w: 32, h: 32 });
  for (const o of objects)
    parts.push({
      key: props(tiles.get(o.gid)).assetKey,
      x: o.x - area.x,
      y: o.y - minY,
      w: o.width,
      h: o.height,
    });
  return { key: area.name, width: area.width, height: area.y - minY + area.height, parts };
});
await writeFile(path.join(target, 'prefabs.json'), JSON.stringify(prefabs, null, 2));
console.log(
  `Starter: ${areas.length} booths, ${set.tiles.length} native assets. Original Project files unchanged.`,
);
