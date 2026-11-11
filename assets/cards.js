/** Card surfaces for answer and note cards. */
import {
  h,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from './runtime.js?v=2'
import { Icon } from './icons.js?v=2'
import { Markdown, copyText } from './markdown.js?v=2'
import { CARD_WIDTH, cardTitle, truncate } from './model.js?v=2'

function typeIcon(type) {
  return type === 'note' ? 'note' : 'answer'
}

function typeLabel(type, t) {
  return type === 'note' ? t('card.note') : t('card.answer')
}

function statusLabel(card, t) {
  switch (card.status) {
    case 'waiting': return t('card.waiting')
    case 'streaming': return t('card.streaming')
    case 'error': return t('card.error')
    case 'interrupted': return t('card.interrupted')
    default: return t('card.done')
  }
}

function Spinner({ size = 14 }) {
  return h('span', {
    className: 'dc-spinner',
    style: { width: size, height: size },
    'aria-hidden': true,
  })
}

function closeDetails(event) {
  const details = event.currentTarget.closest('details')
  if (details !== null) details.open = false
}

/**
 * Restore one card surface's reading position after mount and record it while
 * the user scrolls, so collapsing a card, switching views, or reloading the
 * page resumes where reading stopped instead of jumping back to the top.
 *
 * @param {object} store - canvas store.
 * @param {string | undefined} cardId
 * @param {'body' | 'reader'} surface
 * @param {{top: number, ratio: number} | undefined} seed - fallback position
 *   used only when this surface has never been scrolled.
 */
function useReadingPosition(store, cardId, surface, seed) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null || cardId === undefined) return
    const max = Math.max(0, element.scrollHeight - element.clientHeight)
    const memory = store.scrollMemory(cardId, surface)
    if (memory !== undefined) {
      if (memory.top > 0) element.scrollTop = Math.min(memory.top, max)
      return
    }
    // A surface that was never scrolled starts from the other surface's
    // relative position, so "read in full" continues the current reading.
    if (seed !== undefined && seed.ratio > 0 && max > 0) {
      element.scrollTop = Math.round(seed.ratio * max)
    }
  }, [store, cardId, surface])

  return {
    ref,
    onScroll: (event) => {
      // React can dispatch scroll from a descendant (code blocks, tables);
      // only the surface's own scroll position is reading progress.
      if (event.target !== event.currentTarget) return
      store.rememberScroll(cardId, surface, event.currentTarget)
    },
  }
}

function CardMenu({ store, card, t }) {
  const hasText = card.content.length > 0 || card.question.length > 0
  return h('details', { className: 'dc-card-menu' },
    h('summary', {
      className: 'dc-icon-button',
      title: t('card.menu'),
      'aria-label': t('card.menu'),
    }, h(Icon, { name: 'more', size: 16 })),
    h('div', { className: 'dc-menu-popover', role: 'menu' },
      h('button', {
        type: 'button',
        className: 'dc-menu-item',
        disabled: !hasText,
        onClick: (event) => {
          closeDetails(event)
          store.openReader(card.id)
        },
      }, h(Icon, { name: 'expand', size: 14 }), t('card.read')),
      h('button', {
        type: 'button',
        className: 'dc-menu-item',
        disabled: !hasText,
        onClick: (event) => {
          closeDetails(event)
          store.quoteCard(card)
        },
      }, h(Icon, { name: 'copy', size: 14 }), t('card.quote')),
      h('button', {
        type: 'button',
        className: 'dc-menu-item',
        onClick: (event) => {
          closeDetails(event)
          store.addNote(card.id)
        },
      }, h(Icon, { name: 'note', size: 14 }), t('card.newNote')),
      h('button', {
        type: 'button',
        className: 'dc-menu-item',
        disabled: !hasText,
        onClick: (event) => {
          closeDetails(event)
          copyText(card.content.length > 0 ? card.content : card.question).then((ok) => {
            store.setNotice(ok ? t('toast.copied') : t('toast.copyFailed'), ok ? 'success' : 'error')
          })
        },
      }, h(Icon, { name: 'copy', size: 14 }), t('card.copy')),
      h('button', {
        type: 'button',
        className: 'dc-menu-item',
        onClick: (event) => {
          closeDetails(event)
          store.updateCard(card.id, { collapsed: !card.collapsed })
        },
      }, h(Icon, { name: card.collapsed ? 'expand' : 'collapse', size: 14 }),
      card.collapsed ? t('card.expand') : t('card.collapse')),
      h('div', { className: 'dc-menu-sep' }),
      h('button', {
        type: 'button',
        className: 'dc-menu-item dc-menu-danger',
        onClick: (event) => {
          closeDetails(event)
          if (window.confirm(t('card.delete') + '?')) store.deleteCard(card.id)
        },
      }, h(Icon, { name: 'trash', size: 14 }), t('card.delete')),
    ),
  )
}

function AnswerBody({ store, card, t }) {
  const streaming = card.status === 'waiting' || card.status === 'streaming'
  const display = card.status === 'streaming' && card.streamText.length > 0
    ? card.streamText
    : card.content
  const reading = useReadingPosition(store, card.id, 'body')
  return h('div', {
    ref: reading.ref,
    onScroll: reading.onScroll,
    className: 'dc-card-body dc-answer-body dc-scroll',
  },
    card.question.length > 0 ? h('div', { className: 'dc-question-quote' },
      h('span', { className: 'dc-question-mark' }, 'Q'),
      h('span', null, truncate(card.question, 600)),
    ) : null,
    streaming ? h('div', { className: 'dc-answer-status' },
      h(Spinner, { size: 13 }),
      h('span', null, card.status === 'waiting' ? t('card.waiting') : t('card.streaming')),
      card.activity !== undefined ? h('span', { className: 'dc-activity' }, t('card.usingTool', { name: card.activity })) : null,
    ) : null,
    card.status === 'error' ? h('div', { className: 'dc-inline-error' }, card.error ?? t('card.error')) : null,
    card.status === 'interrupted' ? h('div', { className: 'dc-inline-warn' }, card.note ?? t('card.interrupted')) : null,
    display.length > 0
      ? h(Markdown, { text: display, className: streaming ? 'dc-markdown-streaming' : undefined })
      : (!streaming && card.status !== 'error'
        ? h('div', { className: 'dc-muted' }, t('card.empty'))
        : null),
    card.reasoning.length > 0
      ? h('details', { className: 'dc-reasoning' },
        h('summary', null, t('card.reasoning')),
        h(Markdown, { text: card.reasoning }),
      )
      : null,
  )
}

function NoteBody({ store, card, t }) {
  const [draft, setDraft] = useState(card.content)
  useEffect(() => {
    setDraft(card.content)
  }, [card.id])
  return h('div', { className: 'dc-card-body dc-note-body' },
    h('textarea', {
      className: 'dc-note-input',
      value: draft,
      placeholder: t('note.placeholder'),
      rows: 5,
      onChange: (event) => {
        setDraft(event.target.value)
        store.updateCardLive(card.id, { content: event.target.value })
      },
      onBlur: () => store.touch(),
      onPointerDown: (event) => event.stopPropagation(),
    }),
  )
}

/**
 * One card on the canvas.
 */
export function CardShell({ store, card, t, zoom }) {
  const viewport = store.viewport
  const selected = store.selection === card.id
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(undefined)
  const cardRef = useRef(null)
  const parent = card.parentId === null ? undefined : store.cardById(card.parentId)
  const children = store.childrenOf(card.id).length

  useLayoutEffect(() => {
    const element = cardRef.current
    if (element === null) return undefined
    const measure = () => {
      const height = element.getBoundingClientRect().height / Math.max(0.01, zoom)
      if (Number.isFinite(height) && height > 0) store.setHeight(card.id, height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [card.id, store, zoom])

  const onHeaderPointerDown = (event) => {
    if (event.button !== 0) return
    if (event.target.closest('button, summary, a, input, textarea, select')) return
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      cardX: card.x,
      cardY: card.y,
    }
    setDragging(true)
    store.select(card.id)
  }

  const onHeaderPointerMove = (event) => {
    const drag = dragRef.current
    if (drag === undefined) return
    store.updateCardLive(card.id, {
      x: drag.cardX + (event.clientX - drag.startX) / zoom,
      y: drag.cardY + (event.clientY - drag.startY) / zoom,
    })
  }

  const endDrag = (event) => {
    if (dragRef.current === undefined) return
    dragRef.current = undefined
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    store.touch()
  }

  const anchorStyle = {
    left: `${card.x * zoom + viewport.x}px`,
    top: `${card.y * zoom + viewport.y}px`,
    zIndex: selected ? 30 : 10,
  }
  const surfaceStyle = {
    zoom: String(zoom),
    width: `${card.width ?? CARD_WIDTH}px`,
  }

  return h('div', { className: 'dc-card-anchor', style: anchorStyle },
    h('article', {
      ref: cardRef,
      className: `dc-card dc-card-${card.type}${selected ? ' dc-card-selected' : ''}${card.collapsed ? ' dc-card-collapsed' : ''}${dragging ? ' dc-card-dragging' : ''}`,
      style: surfaceStyle,
      'data-card-id': card.id,
      'aria-label': `${typeLabel(card.type, t)}: ${cardTitle(card, t('card.untitled'))}`,
      onPointerDown: (event) => {
        if (event.target.closest('button, summary, a, input, textarea, select')) return
        store.select(card.id)
      },
      onClick: (event) => {
        if (event.target.closest('button, summary, a, textarea, input, .dc-menu-popover')) return
        store.select(card.id)
      },
      onDoubleClick: (event) => {
        if (event.target.closest('button, summary, a, textarea, input, select, .dc-menu-popover')) return
        event.stopPropagation()
        store.openReader(card.id)
      },
    },
    h('header', {
      className: 'dc-card-header',
      onPointerDown: onHeaderPointerDown,
      onPointerMove: onHeaderPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    h('div', { className: 'dc-card-type' }, h(Icon, { name: typeIcon(card.type), size: 14 }), h('span', null, typeLabel(card.type, t))),
    h('div', { className: 'dc-card-heading' },
      h('div', { className: 'dc-card-title' }, cardTitle(card, t('card.untitled'))),
      h('div', { className: 'dc-card-subtitle' },
        parent !== undefined ? t('card.parent', { title: cardTitle(parent, t('card.untitled')) }) : null,
        children > 0 ? ` · ${t('card.children', { count: children })}` : null,
        card.type === 'answer' ? ` · ${statusLabel(card, t)}` : null,
      ),
    ),
    h('div', { className: 'dc-card-header-actions' },
      h('button', {
        type: 'button',
        className: 'dc-icon-button',
        title: card.collapsed ? t('card.expand') : t('card.collapse'),
        'aria-label': card.collapsed ? t('card.expand') : t('card.collapse'),
        'aria-expanded': !card.collapsed,
        onClick: (event) => {
          event.stopPropagation()
          store.updateCard(card.id, { collapsed: !card.collapsed })
        },
      }, h(Icon, { name: card.collapsed ? 'expand' : 'collapse', size: 16 })),
      h(CardMenu, { store, card, t }),
    ),
  ),
  card.collapsed ? null : (card.type === 'note'
    ? h(NoteBody, { store, card, t })
    : h(AnswerBody, { store, card, t })),
    ),
  )
}

export function ReaderOverlay({ store, t }) {
  const card = store.readerCardId === undefined ? undefined : store.cardById(store.readerCardId)
  const cardId = card === undefined ? undefined : card.id
  const reading = useReadingPosition(store, cardId, 'reader',
    cardId === undefined ? undefined : store.scrollMemory(cardId, 'body'))
  if (card === undefined) return null
  return h('div', {
    className: 'dc-reader-backdrop',
    onPointerDown: (event) => {
      if (event.target === event.currentTarget) store.closeReader()
    },
  },
  h('article', {
    className: 'dc-reader',
    role: 'dialog',
    'aria-modal': true,
    'aria-label': cardTitle(card, t('card.untitled')),
    'data-card-id': card.id,
  },
    h('div', {
      ref: reading.ref,
      onScroll: reading.onScroll,
      className: 'dc-reader-body dc-scroll',
    },
      card.type === 'note'
        ? h('div', { className: 'dc-reader-note' }, card.content.length > 0 ? card.content : t('note.placeholder'))
        : h('div', { className: 'dc-reader-thread' },
          h('div', { className: 'dc-reader-user' },
            h('div', { className: 'dc-reader-role' }, t('reader.you')),
            h('div', { className: 'dc-reader-question' }, card.question),
          ),
          h('div', { className: 'dc-reader-assistant' },
            h('div', { className: 'dc-reader-role' }, t('reader.assistant')),
            card.content.length > 0
              ? h(Markdown, { text: card.content })
              : h('div', { className: 'dc-muted' }, statusLabel(card, t)),
            card.error !== undefined && card.error.length > 0
              ? h('div', { className: 'dc-inline-error' }, card.error)
              : null,
            card.reasoning.length > 0
              ? h('details', { className: 'dc-reader-reasoning' },
                h('summary', null, t('card.reasoning')),
                h(Markdown, { text: card.reasoning }),
              )
              : null,
          ),
        ),
    ),
  ))
}
