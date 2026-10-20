export type PixelIconName =
  | 'select'
  | 'place'
  | 'paint'
  | 'spawn'
  | 'collider'
  | 'zone'
  | 'interact'
  | 'erase-layout'
  | 'undo'
  | 'redo'
  | 'library'
  | 'assets'
  | 'inspect'
  | 'save'
  | 'settings'
  | 'close';

const paths: Record<PixelIconName, string> = {
  assets: 'M3 5H21V21H3Z M7 5V2H17V5 M6 17L10 12L14 16L17 12L20 17 M7 8H10V11H7Z',
  interact:
    'M4 4H10 M4 4V10 M20 4H14 M20 4V10 M4 20H10 M4 20V14 M20 20H14 M20 20V14 M10 8H14V11H17V15H14V18H10Z',
  select: 'M12 3V21 M3 12H21 M9 6L12 3L15 6 M9 18L12 21L15 18 M6 9L3 12L6 15 M18 9L21 12L18 15',
  place: 'M4 9H20V20H4Z M9 4H15V9 M12 12V17 M9 15H15',
  paint: 'M3 5H14V10H3Z M14 7H18V13H10V21H13V14',
  spawn: 'M7 3H17V5H19V13H17V15H15V17H13V20H11V17H9V15H7V13H5V5H7Z M9 7H15V11H9Z',
  collider: 'M3 8V3H8 M16 3H21V8 M21 16V21H16 M8 21H3V16 M8 8H16V16H8Z',
  zone: 'M4 4H10V10H4Z M14 4H20V10H14Z M4 14H10V20H4Z M14 14H20V20H14Z',
  'erase-layout': 'M6 7H18V20H6Z M4 7H20 M9 3H15V7 M10 10V17 M14 10V17',
  undo: 'M9 4L3 10L9 16 M3 10H15V12H18V15H20V19H13',
  redo: 'M15 4L21 10L15 16 M21 10H9V12H6V15H4V19H11',
  library: 'M3 8H21V20H3Z M6 8V4H18V8 M8 13H16V16H8Z',
  inspect: 'M4 4H20V20H4Z M8 8H16 M8 12H16 M8 16H12',
  save: 'M4 12H7V15H10V18H13V15H16V12H19V9H21',
  settings: 'M4 6H20 M4 12H20 M4 18H20 M8 3V9 M16 9V15 M10 15V21',
  close: 'M5 5L19 19 M19 5L5 19',
};

export function PixelIcon({ name }: { name: PixelIconName }) {
  return (
    <svg
      className="pixel-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="miter"
      strokeLinecap="square"
      shapeRendering="crispEdges"
    >
      <path d={paths[name]} />
    </svg>
  );
}
