import { Inject, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AssetsService } from './assets';
@Injectable()
export class CatalogService {
  constructor(@Inject(AssetsService) private assets: AssetsService) {}
  async get() {
    const tileset = JSON.parse(await readFile('maps/tilesets/exhibition.tsj', 'utf8'));
    const custom = await this.assets.list();
    for (const asset of custom) {
      const id = 100000 + asset.id;
      tileset.tiles.push({
        id,
        image: `../../public/world/pieces/custom-${asset.id}.png`,
        imagewidth: asset.width,
        imageheight: asset.height,
        properties: [
          { name: 'assetKey', type: 'string', value: `custom-${asset.id}` },
          { name: 'label', type: 'string', value: asset.name },
          { name: 'family', type: 'string', value: asset.family },
          { name: 'ground', type: 'bool', value: asset.family === 'Floor' },
          { name: 'depthY', type: 'float', value: asset.depth_y },
        ],
        ...(asset.collision
          ? {
              objectgroup: {
                objects: [
                  {
                    id: 1,
                    name: 'Footprint',
                    ...asset.collision,
                    rotation: 0,
                  },
                ],
              },
            }
          : {}),
      });
    }
    tileset.tilecount = tileset.tiles.length;
    tileset.nexttileid = Math.max(...tileset.tiles.map((t: { id: number }) => t.id)) + 1;
    tileset.tilewidth = Math.max(...tileset.tiles.map((t: { imagewidth: number }) => t.imagewidth));
    tileset.tileheight = Math.max(
      ...tileset.tiles.map((t: { imageheight: number }) => t.imageheight),
    );
    const tiles = tileset.tiles.map(
      (tile: { id: number; image: string; properties: { name: string; value: unknown }[] }) => ({
        ...tile,
        gid: tile.id + 1,
        key: `tile-${tile.id + 1}`,
        meta: Object.fromEntries(tile.properties.map((p) => [p.name, p.value])),
      }),
    );
    const textures = tiles.map(
      (t: { key: string; image: string; imagewidth: number; imageheight: number }) => ({
        key: t.key,
        url: path.basename(t.image).startsWith('custom-')
          ? `/api/backend/assets/${path.basename(t.image).slice(7, -4)}/image`
          : '/world/pieces/' + path.basename(t.image),
        width: t.imagewidth,
        height: t.imageheight,
      }),
    );
    const map = JSON.parse(await readFile('maps/exhibition.tmj', 'utf8'));
    const defaultSizes: Record<string, { width: number; height: number }> = {};
    const collect = (
      layers: { layers?: unknown[]; objects?: { gid?: number; width: number; height: number }[] }[],
    ) => {
      for (const layer of layers) {
        for (const o of layer.objects || []) {
          const tile = tiles.find((t: { gid: number }) => t.gid === o.gid);
          if (tile && !defaultSizes[tile.meta.assetKey])
            defaultSizes[tile.meta.assetKey] = { width: o.width, height: o.height };
        }
        if (layer.layers) collect(layer.layers as Parameters<typeof collect>[0]);
      }
    };
    collect(map.layers);
    for (const asset of custom)
      defaultSizes[`custom-${asset.id}`] = {
        width: asset.display_width,
        height: (asset.display_width * asset.height) / asset.width,
      };
    return {
      defaultSizes,
      tiles,
      textures,
      tileset,
      prefabs: JSON.parse(await readFile('assets/booth-parts.json', 'utf8')),
    };
  }
}
