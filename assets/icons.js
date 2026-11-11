/** Small inline icon set for the canvas. All icons inherit currentColor. */
import { h } from './runtime.js?v=1'

const PATHS = {
  upload: [
    ['path', { d: 'M12 16V4' }],
    ['path', { d: 'm7 9 5-5 5 5' }],
    ['path', { d: 'M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' }],
  ],
  download: [
    ['path', { d: 'M12 4v12' }],
    ['path', { d: 'm7 11 5 5 5-5' }],
    ['path', { d: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' }],
  ],
  repo: [
    ['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z' }],
    ['path', { d: 'M4 18.5A2.5 2.5 0 0 1 6.5 16H20' }],
    ['path', { d: 'M9 7h7' }],
  ],
  note: [
    ['path', { d: 'M5 4h11l3 3v13H5z' }],
    ['path', { d: 'M16 4v4h4' }],
    ['path', { d: 'M8 12h8M8 16h6' }],
  ],
  paper: [
    ['path', { d: 'M6 3h8l4 4v14H6z' }],
    ['path', { d: 'M14 3v5h5' }],
    ['path', { d: 'M9 13h6M9 17h6' }],
  ],
  answer: [
    ['path', { d: 'M4 5h16v11H9l-5 4z' }],
    ['path', { d: 'M8 9h8M8 12h5' }],
  ],
  question: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 1.8' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  fit: [
    ['path', { d: 'M4 9V5a1 1 0 0 1 1-1h4' }],
    ['path', { d: 'M15 4h4a1 1 0 0 1 1 1v4' }],
    ['path', { d: 'M20 15v4a1 1 0 0 1-1 1h-4' }],
    ['path', { d: 'M9 20H5a1 1 0 0 1-1-1v-4' }],
  ],
  trash: [
    ['path', { d: 'M4 7h16' }],
    ['path', { d: 'M9 7V4h6v3' }],
    ['path', { d: 'M6 7l1 13h10l1-13' }],
    ['path', { d: 'M10 11v5M14 11v5' }],
  ],
  help: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 1.8' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  minus: [['path', { d: 'M5 12h14' }]],
  close: [['path', { d: 'm6 6 12 12M18 6 6 18' }]],
  expand: [
    ['path', { d: 'm7 10 5 5 5-5' }],
  ],
  collapse: [
    ['path', { d: 'm7 14 5-5 5 5' }],
  ],
  send: [
    ['path', { d: 'M4 12 20 4l-4 16-4.5-6z' }],
    ['path', { d: 'm11.5 14 8.5-10' }],
  ],
  copy: [
    ['rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }],
    ['path', { d: 'M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3' }],
  ],
  check: [['path', { d: 'm5 13 4 4L19 7' }]],
  link: [
    ['path', { d: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1' }],
    ['path', { d: 'M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1' }],
  ],
  chevronLeft: [['path', { d: 'm15 6-6 6 6 6' }]],
  chevronRight: [['path', { d: 'm9 6 6 6-6 6' }]],
  refresh: [
    ['path', { d: 'M20 11a8 8 0 1 0-1.5 5.5' }],
    ['path', { d: 'M20 4v7h-7' }],
  ],
  spark: [
    ['path', { d: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8' }],
  ],
  stop: [
    ['rect', { x: 7, y: 7, width: 10, height: 10, rx: 2 }],
  ],
  more: [
    ['circle', { cx: 6, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 12, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 18, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }],
  ],
}

/**
 * Render one icon.
 * @param {{name: keyof PATHS, size?: number, className?: string}} props
 */
export function Icon({ name, size = 16, className }) {
  const parts = PATHS[name] ?? PATHS.spark
  return h('svg', {
    className: className === undefined ? 'dc-icon' : `dc-icon ${className}`,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
  }, parts.map(([tag, attrs], index) => h(tag, { ...attrs, key: index })))
}
