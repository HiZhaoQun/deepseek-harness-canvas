/**
 * Canvas mode root.
 *
 * Canvas is a Conversation View, but it no longer owns a composer. The normal
 * Harness input box sends messages; this view observes the session and turns
 * every human turn into a connected card.
 */
import {
  h,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from './runtime.js?v=1'
import { CanvasStore } from './store.js?v=1'
import { registerUiLocale, useT } from './locale.js?v=1'
import { CardShell, ReaderOverlay } from './cards.js?v=1'
import { Icon } from './icons.js?v=1'
import {
  CanvasControls,
  CanvasHint,
  EmptyState,
  ModeBar,
  Toast,
} from './ask.js?v=1'
import { CSS } from './styles.js?v=1'
import { CARD_WIDTH, cardTitle } from './model.js?v=1'

// Kept on globalThis so a client hot reload reuses the same store and
// observer. A module-local map would leave the old hub alive with an old
// `selection`, which silently detached the next card from its parent.
const STORES = globalThis.__DEEPSEEK_CANVAS_STORES__ ??= new Map()

function storeFor(ctx, sessionId) {
  const key = sessionId === undefined || sessionId === null ? '__absent__' : String(sessionId)
  let store = STORES.get(key)
  if (store === undefined) {
    store = new CanvasStore(ctx, sessionId)
    STORES.set(key, store)
  }
  return store
}

function Boot() {
  return h('div', { className: 'dc-root dc-boot' },
    h('span', { className: 'dc-spinner', style: { width: '20px', height: '20px' } }),
    h('span', null, 'Loading canvas…'),
  )
}

function Edges({ store }) {
  const viewport = store.viewport
  const markerId = useId().replace(/:/g, '')
  const paths = []
  for (const card of store.cards) {
    if (card.parentId === null) continue
    const parent = store.cardById(card.parentId)
    if (parent === undefined) continue
    const parentHeight = store.heights.get(parent.id) ?? 260
    const sx = (parent.x + (parent.width ?? CARD_WIDTH) / 2) * viewport.zoom + viewport.x
    const sy = (parent.y + parentHeight) * viewport.zoom + viewport.y
    const tx = (card.x + (card.width ?? CARD_WIDTH) / 2) * viewport.zoom + viewport.x
    const ty = card.y * viewport.zoom + viewport.y
    const gap = Math.max(36, Math.abs(ty - sy) * 0.4)
    const selected = store.selection === card.id || store.selection === parent.id
    let d
    if (ty >= sy) {
      d = `M ${sx} ${sy} C ${sx} ${sy + gap}, ${tx} ${ty - gap}, ${tx} ${ty}`
    } else {
      const side = tx >= sx ? 1 : -1
      d = `M ${sx} ${sy} C ${sx + side * 120} ${sy + 90}, ${tx + side * 120} ${ty - 90}, ${tx} ${ty}`
    }
    paths.push({ key: `${parent.id}-${card.id}`, d, selected })
  }
  if (paths.length === 0) return null
  return h('svg', { className: 'dc-edges', 'aria-hidden': true },
    h('defs', null,
      h('marker', {
        id: `dc-arrow-${markerId}`,
        viewBox: '0 0 10 10',
        refX: 8,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto-start-reverse',
        markerUnits: 'strokeWidth',
      }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', className: 'dc-arrow-normal' })),
      h('marker', {
        id: `dc-arrow-sel-${markerId}`,
        viewBox: '0 0 10 10',
        refX: 8,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto-start-reverse',
        markerUnits: 'strokeWidth',
      }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', className: 'dc-arrow-selected' })),
    ),
    paths.map((path) => h('path', {
      key: path.key,
      d: path.d,
      className: path.selected ? 'dc-edge dc-edge-selected' : 'dc-edge',
      markerEnd: path.selected ? `url(#dc-arrow-sel-${markerId})` : `url(#dc-arrow-${markerId})`,
    })),
  )
}

const NO_STATUS = () => undefined

function CanvasBoard({ store, t, pendingInteraction, onOpenChat }) {
  const rootRef = useRef(null)
  const panRef = useRef(undefined)

  useEffect(() => {
    const element = rootRef.current
    if (element === null) return undefined
    const measure = () => {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      store.setCanvasSize(rect.width, rect.height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [store])

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const editing = target instanceof Element
        && target.closest('input, textarea, select, [contenteditable="true"]') !== null
      if (event.key === 'Escape') {
        if (store.readerCardId !== undefined) {
          store.closeReader()
          return
        }
        if (store.helpOpen) {
          store.setHelpOpen(false)
          return
        }
        store.select(undefined)
        return
      }
      if (store.readerCardId !== undefined) return
      if (editing) return
      if ((event.ctrlKey || event.metaKey) && (event.key === '0' || event.key === '1')) {
        event.preventDefault()
        if (event.key === '0') store.resetZoom()
        else store.fit()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && store.selection !== undefined) {
        event.preventDefault()
        const card = store.cardById(store.selection)
        if (card !== undefined && window.confirm(t('card.delete') + '?')) store.deleteCard(card.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store, t])

  useEffect(() => {
    const root = rootRef.current
    if (root === null) return undefined
    const onWheel = (event) => {
      const target = event.target
      if (target instanceof Element && target.closest('.dc-scroll, textarea, input, .dc-menu-popover, .dc-controls, .dc-reader-backdrop')) {
        return
      }
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        const rect = root.getBoundingClientRect()
        store.zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0018), rect)
        return
      }
      event.preventDefault()
      store.panBy(-event.deltaX, -event.deltaY)
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [store])

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest('.dc-card, .dc-controls, .dc-mode-bar, .dc-help-popover, .dc-menu-popover, .dc-reader-backdrop, button, summary, input, textarea, a')) {
      return
    }
    const root = rootRef.current
    if (root === null) return
    root.setPointerCapture(event.pointerId)
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: store.viewport.x,
      panY: store.viewport.y,
    }
    store.select(undefined)
    window.getSelection()?.removeAllRanges()
  }

  const onPointerMove = (event) => {
    const pan = panRef.current
    if (pan === undefined) return
    store.setViewport({
      x: pan.panX + (event.clientX - pan.startX),
      y: pan.panY + (event.clientY - pan.startY),
    })
  }

  const onPointerUp = (event) => {
    if (panRef.current === undefined) return
    panRef.current = undefined
    try {
      rootRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    store.touch(false)
  }

  const onMouseUp = (event) => {
    const root = rootRef.current
    if (root === null) return
    if (event.target instanceof Element && event.target.closest('.dc-controls, .dc-menu-popover, .dc-mode-bar, .dc-reader-header, .dc-reader-footer, input, textarea')) return
    if (event.target instanceof Element
      && event.target.closest('.dc-reader-backdrop') !== null
      && event.target.closest('.dc-reader-body') === null) return
    if (event.detail >= 2) {
      window.getSelection()?.removeAllRanges()
      return
    }
    setTimeout(() => {
      const selection = window.getSelection()
      if (selection === null || selection.rangeCount === 0) return
      const text = selection.toString().replace(/\s+$/, '').trim()
      if (text.length < 2) return
      const anchor = selection.anchorNode
      const element = anchor instanceof Element ? anchor : anchor?.parentElement
      const readerBody = element?.closest?.('.dc-reader-body')
      if (readerBody !== null && readerBody !== undefined) {
        const card = store.readerCardId === undefined ? undefined : store.cardById(store.readerCardId)
        if (card === undefined) return
        store.select(card.id)
        store.insertQuote(text, cardTitle(card, t('card.untitled')), card.id)
        selection.removeAllRanges()
        return
      }
      const body = element?.closest?.('.dc-card-body')
      const cardElement = body?.closest?.('.dc-card')
      if (!(cardElement instanceof Element)) return
      const cardId = cardElement.getAttribute('data-card-id')
      const card = cardId === null ? undefined : store.cardById(cardId)
      if (card === undefined) return
      store.select(card.id)
      store.insertQuote(text, cardTitle(card, t('card.untitled')), card.id)
      selection.removeAllRanges()
    }, 0)
  }

  return h('div', {
    ref: rootRef,
    className: 'dc-root',
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onMouseUp,
  },
  h('style', null, CSS),
  h('div', {
    className: 'dc-grid',
    style: {
      backgroundSize: `${24 * store.viewport.zoom}px ${24 * store.viewport.zoom}px`,
      backgroundPosition: `${store.viewport.x}px ${store.viewport.y}px`,
    },
  }),
  h(Edges, { store }),
  store.cards.map((card) => h(CardShell, {
    key: card.id,
    store,
    card,
    t,
    zoom: store.viewport.zoom,
  })),
  store.cards.length === 0 ? h(EmptyState, { t, store }) : null,
  pendingInteraction !== undefined && pendingInteraction !== null
    ? h('div', { className: 'dc-pending', role: 'status' },
      h(Icon, { name: 'question', size: 15 }),
      h('span', null, t('pending.hint')),
      typeof onOpenChat === 'function'
        ? h('button', {
          type: 'button',
          className: 'dc-pending-button',
          onClick: onOpenChat,
        }, t('pending.openChat'))
        : null,
    )
    : null,
  h(CanvasControls, { store, t }),
  h(ModeBar, { store, t }),
  h(CanvasHint, { store, t }),
  h(Toast, { store }),
  h(ReaderOverlay, { store, t }),
  )
}

/**
 * Per-Session Canvas body.
 */
function CanvasSession(props) {
  const ctx = props.pluginCtx
  const sessionId = props.sessionId
  const store = storeFor(ctx, sessionId)
  const t = useT(ctx)
  useSyncExternalStore(store.subscribe, store.getRevision)

  useEffect(() => {
    registerUiLocale(ctx)
  }, [ctx])

  useEffect(() => {
    store.setInputActions(props.inputActions)
  }, [store, props.inputActions])

  useEffect(() => {
    if (sessionId === undefined || sessionId === null) return undefined
    let alive = true
    store.activate().catch((error) => {
      if (!alive) return
      store.setNotice(error?.message ?? String(error), 'error')
    })
    return () => {
      alive = false
      // Keep the observer alive so an answer already in flight can finish its
      // card while the user is on the Chat tab. New Chat messages are ignored
      // because `active` is false.
      store.deactivate()
    }
  }, [store, sessionId])

  const useStatus = props.useSessionStatus ?? NO_STATUS
  const watched = new Set()
  if (sessionId !== undefined && sessionId !== null) watched.add(sessionId)
  for (const card of store.cards) {
    if (typeof card.sessionId === 'string') watched.add(card.sessionId)
  }
  const pendingInteraction = useStatus((snapshot) => {
    for (const [id, status] of snapshot) {
      if (watched.has(id) && status?.pendingInteraction !== undefined) return status.pendingInteraction
    }
    return undefined
  })
  const pendingSessionId = useStatus((snapshot) => {
    for (const [id, status] of snapshot) {
      if (watched.has(id) && status?.pendingInteraction !== undefined) return id
    }
    return undefined
  })

  if (sessionId === undefined || sessionId === null) {
    return h('div', { className: 'dc-root dc-boot' }, t('error.noSession'))
  }
  if (!store.loaded) return h(Boot)
  const hasPending = pendingInteraction !== undefined && pendingInteraction !== null
  const onOpenChat = !hasPending || pendingSessionId === undefined
    ? undefined
    : pendingSessionId === sessionId
      ? (props.openView === undefined ? undefined : () => props.openView('chat', ''))
      : () => ctx.get('uiWorkspace')?.openSession(pendingSessionId)
  return h(CanvasBoard, {
    store,
    t,
    pendingInteraction,
    onOpenChat,
  })
}

export function CanvasView(props) {
  return h(CanvasSession, { ...props, key: props.sessionId })
}
