import type { Catalog, MapDocument } from '../../../shared/map/types';
import { buildBundle, portableDocument } from '../../../shared/map/bundle';
export function download(data: Blob, name: string) {
  const url = URL.createObjectURL(data),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportTmj(document: MapDocument) {
  download(
    new Blob([JSON.stringify(portableDocument(document), null, 2)], { type: 'application/json' }),
    'map.tmj',
  );
}
export async function exportBundle(document: MapDocument, catalog: Catalog) {
  download(
    new Blob([new Uint8Array(await buildBundle(document, catalog))], { type: 'application/zip' }),
    'map-tiled.zip',
  );
}
