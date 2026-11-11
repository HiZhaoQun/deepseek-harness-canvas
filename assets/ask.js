/** Floating canvas chrome: toolbar, zoom, history import, mode indicator. */
import { h } from './runtime.js?v=1'
import { Icon } from './icons.js?v=1'
import { cardTitle, formatNumber, truncate } from './model.js?v=1'

function ImportMenu({ store, t }) {
  return h('details', { className: 'dc-import' },
    h('summary', {
      className: 'dc-tool-button dc-controls-button',
      title: t('toolbar.import'),
      'aria-label': t('toolbar.import'),
      'aria-disabled': store.importing,
    }, h(Icon, { name: 'download', size: 15 }), h('span', null, store.importing ? t('toolbar.importing') : t('toolbar.import'))),
    h('div', { className: 'dc-menu-popover', role: 'menu' },
      h('button', {
        type: 'button',
        className: 'dc-menu-item',
        disabled: store.importing,
        onClick: (event) => {
          const details = event.currentTarget.closest('details')
          if (details !== null) details.open = false
          store.importHistory('recent')
        },
      }, t('toolbar.importRecent')),
      h('button', {
        type: 'button',
        className: 'dc-menu-item',
        disabled: store.importing,
        onClick: (event) => {
          const details = event.currentTarget.closest('details')
          if (details !== null) details.open = false
          store.importHistory('all')
        },
      }, t('toolbar.importAll')),
    ),
  )
}

export function CanvasControls({ store, t }) {
  const percent = Math.round(store.viewport.zoom * 100)
  if (!store.controlsOpen) {
    return h('div', { className: 'dc-controls dc-controls-collapsed' },
      h('button', {
        type: 'button',
        className: 'dc-controls-toggle',
        title: t('controls.expand'),
        'aria-label': t('controls.expand'),
        onClick: () => store.setControlsOpen(true),
      }, h(Icon, { name: 'chevronLeft', size: 16 })),
    )
  }
  return h('div', { className: 'dc-controls', role: 'toolbar', 'aria-label': t('app.title') },
    h('div', { className: 'dc-controls-brand' },
      h('div', { className: 'dc-brand-mark' }, h(Icon, { name: 'spark', size: 16 })),
      h('div', { className: 'dc-controls-brand-text' }, t('app.title')),
      h('button', {
        type: 'button',
        className: 'dc-icon-button dc-controls-collapse',
        title: t('controls.collapse'),
        'aria-label': t('controls.collapse'),
        onClick: () => store.setControlsOpen(false),
      }, h(Icon, { name: 'chevronRight', size: 15 })),
    ),
    h('div', { className: 'dc-controls-sep' }),
    h(ImportMenu, { store, t }),
    h('button', {
      type: 'button',
      className: 'dc-tool-button dc-controls-button',
      onClick: () => store.addNote(),
    }, h(Icon, { name: 'note', size: 15 }), h('span', null, t('toolbar.note'))),
    h('button', {
      type: 'button',
      className: 'dc-tool-button dc-controls-button',
      onClick: () => store.fit(),
    }, h(Icon, { name: 'fit', size: 15 }), h('span', null, t('toolbar.fit'))),
    h('button', {
      type: 'button',
      className: 'dc-tool-button dc-controls-button',
      onClick: () => store.setHelpOpen(!store.helpOpen),
    }, h(Icon, { name: 'help', size: 15 }), h('span', null, t('toolbar.help'))),
    h('div', { className: 'dc-controls-sep' }),
    h('div', { className: 'dc-controls-zoom', role: 'group', 'aria-label': 'Zoom' },
      h('button', {
        type: 'button',
        className: 'dc-icon-button',
        title: t('toolbar.zoomOut'),
        'aria-label': t('toolbar.zoomOut'),
        onClick: () => store.zoomBy(0.85),
      }, h(Icon, { name: 'minus', size: 15 })),
      h('button', {
        type: 'button',
        className: 'dc-zoom-value',
        title: t('toolbar.zoomReset'),
        onClick: () => store.resetZoom(),
      }, `${percent}%`),
      h('button', {
        type: 'button',
        className: 'dc-icon-button',
        title: t('toolbar.zoomIn'),
        'aria-label': t('toolbar.zoomIn'),
        onClick: () => store.zoomBy(1.18),
      }, h(Icon, { name: 'plus', size: 15 })),
    ),
    store.helpOpen ? h('div', { className: 'dc-help-popover', role: 'dialog' },
      h('div', { className: 'dc-help-title' }, t('toolbar.helpTitle')),
      h('p', null, t('toolbar.helpBody')),
      h('button', {
        type: 'button',
        className: 'dc-secondary-button',
        onClick: () => store.setHelpOpen(false),
      }, t('common.close')),
    ) : null,
  )
}

export function ModeBar({ store, t }) {
  const card = store.selection === undefined ? undefined : store.cardById(store.selection)
  return h('div', { className: 'dc-mode-bar', role: 'status' },
    h(Icon, { name: card === undefined ? 'spark' : card.type === 'note' ? 'note' : 'answer', size: 14 }),
    card === undefined
      ? h('span', null, t('mode.none'))
      : h('span', { className: 'dc-mode-current' },
        t('mode.current', { title: truncate(cardTitle(card, t('card.untitled')), 42) }),
        card.type === 'note' ? h('span', { className: 'dc-mode-extra' }, t('mode.noteHint')) : null,
      ),
    h('span', { className: 'dc-mode-hint' }, t('mode.hint')),
  )
}

export function EmptyState({ t, store }) {
  return h('div', { className: 'dc-empty' },
    h('div', { className: 'dc-empty-mark' }, h(Icon, { name: 'spark', size: 28 })),
    h('div', { className: 'dc-empty-title' }, t('empty.title')),
    h('p', { className: 'dc-empty-desc' }, t('empty.desc')),
    h('div', { className: 'dc-empty-actions' },
      h('button', {
        type: 'button',
        className: 'dc-primary-button',
        disabled: store.importing,
        onClick: () => store.importHistory('recent'),
      }, h(Icon, { name: 'download', size: 15 }), t('empty.importRecent')),
      h('button', {
        type: 'button',
        className: 'dc-secondary-button',
        onClick: () => store.addNote(),
      }, h(Icon, { name: 'note', size: 15 }), t('empty.note')),
    ),
  )
}

export function CanvasHint({ store, t }) {
  return h('div', { className: 'dc-hint', role: 'note' },
    h('span', null, t('hint.pan')),
    h('span', { className: 'dc-dot' }, '·'),
    h('span', null, t('hint.zoom')),
    h('span', { className: 'dc-dot' }, '·'),
    h('span', null, t('hint.select')),
    h('span', { className: 'dc-dot' }, '·'),
    h('span', null, t('hint.reader')),
    h('span', { className: 'dc-dot' }, '·'),
    h('span', null, t('hint.cards', { count: formatNumber(store.cards.length) })),
  )
}

export function Toast({ store }) {
  const notice = store.notice
  if (notice === undefined) return null
  return h('div', { className: `dc-toast dc-toast-${notice.kind}`, role: 'status' },
    h(Icon, { name: notice.kind === 'error' ? 'close' : 'check', size: 14 }),
    h('span', null, notice.message),
  )
}
