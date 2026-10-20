export const propertiesOf = (object) =>
  Object.fromEntries((object.properties || []).map((p) => [p.name, p.value]));
const assert = (condition, message) => {
  if (!condition) throw new Error(`Tiled map: ${message}`);
};

// Merge equal horizontal runs across rows; preserves tile painting without thousands of sprites.
export function mergeFloorTiles(layer, tileWidth, tileHeight, offsetX, offsetY) {
  const rectangles = [],
    open = new Map();
  for (let y = 0; y < layer.height; y++) {
    const next = new Map();
    for (let x = 0; x < layer.width;) {
      const gid = layer.data[y * layer.width + x];
      let end = x + 1;
      while (end < layer.width && layer.data[y * layer.width + end] === gid) end++;
      if (gid) {
        const key = `${gid}:${x}:${end}`;
        const previous = open.get(key);
        if (previous) {
          previous.height += tileHeight;
          next.set(key, previous);
        } else {
          const rect = {
            gid,
            x: offsetX + x * tileWidth,
            y: offsetY + y * tileHeight,
            width: (end - x) * tileWidth,
            height: tileHeight,
          };
          rectangles.push(rect);
          next.set(key, rect);
        }
      }
      x = end;
    }
    open.clear();
    for (const [key, value] of next) open.set(key, value);
  }
  return rectangles;
}

export function compileDocument(map, entries, textures, options = {}) {
  assert(map.orientation === 'orthogonal' && !map.infinite, 'use a finite orthogonal map.');
  assert(
    Number.isInteger(map.width) &&
      map.width > 0 &&
      map.width <= 256 &&
      Number.isInteger(map.height) &&
      map.height > 0 &&
      map.height <= 256,
    'map dimensions must be 1–256 tiles.',
  );
  assert(
    [16, 32, 64, 128].includes(map.tilewidth) && map.tileheight === map.tilewidth,
    'use square 16, 32, 64 or 128px tiles.',
  );
  const catalog = new Map(entries.map((t) => [t.gid, t]));
  const floors = [],
    objects = [],
    colliders = [],
    zones = [],
    interactions = [],
    npcs = [],
    spawns = [],
    boothIds = new Set(),
    usedAssets = new Set();
  const ids = new Set();
  const usedTextures = new Set();
  function resolve(gid) {
    assert(Number.isInteger(gid) && gid > 0, 'GID must be a positive integer.');
    assert(gid < 0x10000000, 'flipped/rotated tiles are not supported; keep tiles unflipped.');
    const t = catalog.get(gid);
    assert(t, `unknown GID ${gid}.`);
    usedAssets.add(t.meta.assetKey);
    usedTextures.add(t.key);
    return t;
  }
  let layerCount = 0;
  const layerIds = new Set();
  function walk(layers, ox = 0, oy = 0, opacity = 1, level = 0) {
    assert(level < 10 && Array.isArray(layers), 'invalid or deeply nested layers.');
    for (const layer of layers) {
      assert(
        ++layerCount <= 2000 && Number.isInteger(layer.id) && !layerIds.has(layer.id),
        'invalid/duplicate layer ID or too many layers.',
      );
      layerIds.add(layer.id);
      assert(
        [layer.offsetx ?? 0, layer.offsety ?? 0, layer.opacity ?? 1].every(Number.isFinite),
        'invalid layer position.',
      );
      if (layer.visible === false && !(options.editor && layer.type === 'objectgroup')) continue;
      const x = ox + (layer.offsetx || 0),
        y = oy + (layer.offsety || 0),
        alpha = opacity * (layer.opacity ?? 1);
      const lp = propertiesOf(layer);
      if (lp.boothId) boothIds.add(lp.boothId);
      if (layer.type === 'group') {
        walk(layer.layers, x, y, alpha, level + 1);
        continue;
      }
      if (layer.type === 'tilelayer') {
        assert(
          Number.isInteger(layer.width) &&
            layer.width > 0 &&
            layer.width <= 256 &&
            Number.isInteger(layer.height) &&
            layer.height > 0 &&
            layer.height <= 256 &&
            Array.isArray(layer.data) &&
            layer.data.length === layer.width * layer.height,
          `${layer.name}: use CSV/JSON tile data, not compressed base64.`,
        );
        for (const r of mergeFloorTiles(
          layer,
          map.tilewidth,
          map.tileheight,
          x + (layer.x || 0) * map.tilewidth,
          y + (layer.y || 0) * map.tileheight,
        )) {
          const t = resolve(r.gid);
          assert(
            t.meta.ground && t.imagewidth === map.tilewidth && t.imageheight === map.tileheight,
            'tile layers only accept the small ground tiles; place props as tile objects.',
          );
          floors.push({ ...r, texture: t.key, opacity: alpha });
        }
      } else if (layer.type === 'objectgroup') {
        for (const o of layer.objects) {
          assert(
            ids.size < 10000 &&
              Number.isInteger(o.id) &&
              [o.x, o.y, o.width, o.height].every(Number.isFinite),
            'invalid object coordinates/ID or too many objects.',
          );
          assert(!ids.has(o.id), `duplicate object ID ${o.id}.`);
          ids.add(o.id);
          if (o.visible === false) continue;
          assert(
            !o.rotation,
            `${o.name}: rotation is not supported by rectangular collision; keep rotation 0.`,
          );
          const px = x + o.x,
            py = y + o.y,
            p = propertiesOf(o);
          if (o.gid) {
            if (layer.visible === false) continue;
            const t = resolve(o.gid),
              sx = o.width / t.imagewidth,
              sy = o.height / t.imageheight;
            assert(sx > 0 && sy > 0, `${o.name}: size must be positive.`);
            const depthY = p.depthY ?? t.meta.depthY;
            const depth = p.renderDepth ?? py + depthY * sy;
            assert(Number.isFinite(depth), `${o.name}: renderDepth must be a finite number.`);
            objects.push({
              id: o.id,
              name: o.name,
              asset: t.meta.assetKey,
              texture: t.key,
              x: px,
              y: py,
              width: o.width,
              height: o.height,
              depth,
              ground: p.ground ?? t.meta.ground,
              opacity: alpha,
            });
            const defaults = propertiesOf(t);
            if ((p.interactEnabled ?? defaults.interactable) === true) {
              const value = (name, fallback) => p[name] ?? defaults[name] ?? fallback;
              const ix = value('interactX', 0),
                iy = value('interactY', 0),
                iw = value('interactWidth', t.imagewidth),
                ih = value('interactHeight', t.imageheight);
              assert(
                [ix, iy, iw, ih].every(Number.isFinite) && iw > 0 && ih > 0,
                `${o.name}: interaction bounds must be finite and positive.`,
              );
              interactions.push({
                id: o.id,
                label: String(p.label || p.title || o.name),
                kind: String(value('interactKind', 'custom')),
                actionKey: String(value('interactAction', '')),
                x: px + ix * sx,
                y: py + iy * sy,
                width: iw * sx,
                height: ih * sy,
              });
            }
            for (const c of p.collisionEnabled === false ? [] : t.objectgroup?.objects || []) {
              assert(
                !c.polygon && !c.polyline && !c.ellipse && !c.rotation,
                `${o.name}: use rectangular collision shapes.`,
              );
              colliders.push({
                id: `${o.id}:${c.id}`,
                x: px + c.x * sx,
                y: py + c.y * sy,
                width: c.width * sx,
                height: c.height * sy,
              });
            }
          } else {
            const type = o.class || o.type;
            if (type === 'Spawn') spawns.push({ x: px, y: py });
            if (type === 'Npc' && !options.editor) {
              assert(p.character === 'internwitch', 'NPC must use InternWitch.');
              const npc = {
                id: o.id,
                x: px,
                y: py,
                character: p.character,
                boothId: String(p.boothId || ''),
                title: String(p.title || o.name),
                dialogue: String(p.dialogue || ''),
                range: Number(p.range ?? 100),
                patrolRadius: Number(p.patrolRadius ?? 40),
                speed: Number(p.speed ?? 45),
              };
              assert(
                npc.range > 0 &&
                  npc.range <= 200 &&
                  npc.patrolRadius >= 0 &&
                  npc.patrolRadius <= 200 &&
                  npc.speed > 0 &&
                  npc.speed <= 100,
                'invalid NPC movement settings.',
              );
              npcs.push(npc);
            }
            if (type === 'Collider') {
              assert(!o.polygon && !o.polyline && !o.ellipse, `${o.name}: use a rectangle.`);
              assert(o.width > 0 && o.height > 0, `${o.name}: collision size must be positive.`);
              colliders.push({ id: String(o.id), x: px, y: py, width: o.width, height: o.height });
            }
            if (type === 'Zone' || type === 'Area') {
              if (p.kind === 'booth') boothIds.add(o.name);
              assert(o.width > 0 && o.height > 0, `${o.name}: zone size must be positive.`);
              zones.push({
                id: o.id,
                label: p.label || p.title || o.name,
                x: px,
                y: py,
                width: o.width,
                height: o.height,
              });
            }
          }
        }
      } else
        throw new Error(
          `Unsupported layer ${layer.type}. Use groups, tile layers and object layers.`,
        );
    }
  }
  walk(map.layers);
  assert(
    Number.isInteger(map.nextobjectid) &&
      map.nextobjectid > Math.max(0, ...ids) &&
      Number.isInteger(map.nextlayerid) &&
      map.nextlayerid > Math.max(0, ...layerIds),
    'nextobjectid/nextlayerid must exceed existing IDs.',
  );
  assert(npcs.length <= 1, 'this map supports one booth host.');
  assert(
    options.editor ? spawns.length <= 1 : spawns.length === 1,
    'define exactly one visible point object with class Spawn.',
  );
  const spawn = spawns[0] ?? { x: 32, y: 32 },
    width = map.width * map.tilewidth,
    height = map.height * map.tileheight;
  assert(
    options.editor ||
      (spawn.x >= 13 && spawn.x <= width - 13 && spawn.y >= 12 && spawn.y <= height),
    'spawn must be inside the map.',
  );
  assert(
    options.editor ||
      !colliders.some(
        (c) =>
          spawn.x + 13 > c.x &&
          spawn.x - 13 < c.x + c.width &&
          spawn.y > c.y &&
          spawn.y - 12 < c.y + c.height,
      ),
    'spawn overlaps a collision shape.',
  );
  for (const npc of npcs) {
    assert(boothIds.has(npc.boothId), 'NPC must reference a booth in the map.');
    const left = npc.x - npc.patrolRadius - 13,
      right = npc.x + npc.patrolRadius + 13;
    assert(
      left >= 0 && right <= width && npc.y >= 12 && npc.y <= height,
      'NPC patrol must stay inside the map.',
    );
    assert(
      !colliders.some(
        (c) => right > c.x && left < c.x + c.width && npc.y > c.y && npc.y - 12 < c.y + c.height,
      ),
      'NPC patrol overlaps an obstacle; move the host or obstacle.',
    );
  }
  return {
    schemaVersion: 1,
    tileSize: map.tilewidth,
    title: String(propertiesOf(map).title || 'Exhibition Hall'),
    width,
    height,
    textures: textures.filter((t) => usedTextures.has(t.key)),
    floors,
    objects,
    colliders,
    zones,
    interactions,
    npcs,
    spawn,
    summary: {
      booths: boothIds.size,
      propDesigns: [...usedAssets].filter(
        (key) => [...catalog.values()].find((t) => t.meta.assetKey === key)?.meta.family === 'Prop',
      ).length,
      assets: [...usedAssets],
    },
  };
}
