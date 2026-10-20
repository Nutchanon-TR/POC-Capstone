import type { MapDocument, CatalogTile, Property } from './types';
import type { WorldData } from '../../src/game/types';
export function compileDocument(
  map: MapDocument,
  entries: CatalogTile[],
  textures: WorldData['textures'],
  options?: { editor?: boolean },
): WorldData;
export function propertiesOf(object: {
  properties?: Property[];
}): Record<string, string | number | boolean>;
